#!/usr/bin/env node

/**
 * PropOps eCourts Search
 *
 * Searches Indian eCourts (services.ecourts.gov.in) for litigation
 * against builders, developers, or specific properties.
 *
 * Uses Playwright to navigate the eCourts portal and extract case data.
 * No CAPTCHA on eCourts — relatively straightforward scraping.
 *
 * Usage:
 *   node scripts/ecourts-search.mjs party-name --name "Godrej Properties" --state "maharashtra"
 *   node scripts/ecourts-search.mjs party-name --name "Lodha Group" --state "maharashtra" --district "pune"
 *   node scripts/ecourts-search.mjs cnr --cnr "MHPU010012345672024"
 *
 * Output: JSON to stdout
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const ECOURTS_BASE = 'https://services.ecourts.gov.in/ecourtindia_v6/';
const ECOURTS_PARTY_SEARCH = `${ECOURTS_BASE}?p=casestatus/index&app_token=`;

// ─── Cache Helpers ──────────────────────────────────────────

function getCachePath(key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `ecourts-${slug}.json`);
}

function readCache(key) {
  const path = getCachePath(key);
  if (!existsSync(path)) return null;

  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);

  if (age > CACHE_VALIDITY_DAYS) return null;

  console.error(`Cache hit for ecourts/${key} (${Math.round(age)} days old)`);
  return data;
}

function writeCache(key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(key), JSON.stringify(enriched, null, 2));
}

// ─── Party Name Search ──────────────────────────────────────

async function searchByPartyName(name, options = {}) {
  const cacheKey = `party-${name}-${options.state || 'all'}-${options.district || 'all'}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.error(`Navigating to eCourts portal...`);
    await page.goto(ECOURTS_BASE, { waitUntil: 'networkidle', timeout: 30000 });

    // Click on "Case Status" or "Party Name" search tab
    const partyNameTab = await page.$('text=Party Name');
    if (partyNameTab) {
      await partyNameTab.click();
      await page.waitForTimeout(1000);
    }

    // Select state if available
    if (options.state) {
      const stateSelect = await page.$('select[name*="state"], #sess_state_code, #state_code');
      if (stateSelect) {
        try {
          await stateSelect.selectOption({ label: new RegExp(options.state, 'i') });
          await page.waitForTimeout(1000);
        } catch {
          console.error(`Could not select state: ${options.state}`);
        }
      }
    }

    // Select district if available
    if (options.district) {
      const districtSelect = await page.$('select[name*="district"], #sess_dist_code, #dist_code');
      if (districtSelect) {
        await page.waitForTimeout(1000); // Wait for district dropdown to populate
        try {
          await districtSelect.selectOption({ label: new RegExp(options.district, 'i') });
          await page.waitForTimeout(1000);
        } catch {
          console.error(`Could not select district: ${options.district}`);
        }
      }
    }

    // Enter party name
    const partyInput = await page.$('input[name*="party"], input[name*="petres_name"], #party_name, input[placeholder*="Party"]');
    if (partyInput) {
      await partyInput.fill(name);
    }

    // Select year range if available (last 10 years)
    const yearFrom = await page.$('select[name*="from_year"], #rgyear_from');
    if (yearFrom) {
      try {
        await yearFrom.selectOption({ value: String(new Date().getFullYear() - 10) });
      } catch { /* ignore if year not available */ }
    }

    // Submit search
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], #party_submit, .submit-btn');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Extract results from table
    const cases = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, .case-details-table tr, #dispTable tbody tr');
      const data = [];

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const getText = (idx) => cells[idx]?.textContent?.trim() || '';

          // Try to identify column meanings by header or position
          const entry = {
            sr_no: getText(0),
            case_number: '',
            parties: '',
            court: '',
            filing_date: '',
            status: '',
            case_type: '',
            next_hearing: ''
          };

          // Flexible parsing — eCourts tables vary
          if (cells.length >= 7) {
            entry.case_number = getText(1);
            entry.parties = getText(2);
            entry.court = getText(3);
            entry.filing_date = getText(4);
            entry.status = getText(5);
            entry.next_hearing = getText(6);
          } else if (cells.length >= 5) {
            entry.case_number = getText(1);
            entry.parties = getText(2);
            entry.status = getText(3);
            entry.filing_date = getText(4);
          } else {
            entry.case_number = getText(1);
            entry.parties = getText(2);
          }

          // Try to get case detail link
          const link = row.querySelector('a[href*="case"], a[onclick*="case"]');
          if (link) {
            entry.detail_url = link.href || '';
            entry.onclick = link.getAttribute('onclick') || '';
          }

          if (entry.case_number || entry.parties) {
            data.push(entry);
          }
        }
      });

      return data;
    });

    // Categorize cases
    const categorized = cases.map(c => ({
      ...c,
      case_category: categorizeCaseType(c.case_number + ' ' + c.parties + ' ' + c.court),
      severity: assessSeverity(c.case_number + ' ' + c.parties + ' ' + c.court)
    }));

    const output = {
      query: name,
      state: options.state || 'all',
      district: options.district || 'all',
      source: 'eCourts India',
      source_url: ECOURTS_BASE,
      scraped_at: new Date().toISOString(),
      total_cases: categorized.length,
      pending: categorized.filter(c => c.status?.toLowerCase().includes('pending')).length,
      disposed: categorized.filter(c => c.status?.toLowerCase().includes('disposed') || c.status?.toLowerCase().includes('decided')).length,
      summary: {
        consumer: categorized.filter(c => c.case_category === 'consumer').length,
        civil: categorized.filter(c => c.case_category === 'civil').length,
        criminal: categorized.filter(c => c.case_category === 'criminal').length,
        nclt: categorized.filter(c => c.case_category === 'nclt').length,
        other: categorized.filter(c => c.case_category === 'other').length,
      },
      cases: categorized
    };

    writeCache(cacheKey, output);
    return output;

  } catch (error) {
    console.error(`Error searching eCourts: ${error.message}`);
    return {
      query: name,
      source: 'eCourts India',
      error: error.message,
      total_cases: 0,
      cases: []
    };
  } finally {
    await browser.close();
  }
}

// ─── CNR Search ─────────────────────────────────────────────

async function searchByCNR(cnr) {
  const cached = readCache(`cnr-${cnr}`);
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.error(`Looking up CNR: ${cnr}`);
    await page.goto(`${ECOURTS_BASE}?p=casestatus/index&search_by=cnr`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const cnrInput = await page.$('input[name*="cnr"], #cnr_number, input[placeholder*="CNR"]');
    if (cnrInput) {
      await cnrInput.fill(cnr);
    }

    const submitBtn = await page.$('button[type="submit"], input[type="submit"], #cnr_submit');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Extract case details
    const details = await page.evaluate(() => {
      const getText = (label) => {
        const elements = document.querySelectorAll('td, th, dt, dd, .field, label');
        for (const el of elements) {
          if (el.textContent?.includes(label)) {
            const next = el.nextElementSibling;
            if (next) return next.textContent?.trim() || '';
          }
        }
        return '';
      };

      return {
        cnr: getText('CNR') || getText('Case Number'),
        case_type: getText('Case Type'),
        filing_date: getText('Filing Date') || getText('Date of Filing'),
        registration_date: getText('Registration Date'),
        status: getText('Status') || getText('Case Status'),
        court: getText('Court') || getText('Court Name'),
        judge: getText('Judge') || getText('Bench'),
        petitioner: getText('Petitioner') || getText('Complainant'),
        respondent: getText('Respondent') || getText('Opponent'),
        next_hearing: getText('Next Hearing') || getText('Next Date'),
        disposal_date: getText('Disposal Date') || getText('Decision Date'),
        nature: getText('Nature') || getText('Nature of Disposal')
      };
    });

    const output = {
      cnr,
      source: 'eCourts India',
      scraped_at: new Date().toISOString(),
      details
    };

    writeCache(`cnr-${cnr}`, output);
    return output;

  } catch (error) {
    return { cnr, source: 'eCourts India', error: error.message, details: {} };
  } finally {
    await browser.close();
  }
}

// ─── Case Categorization ────────────────────────────────────

function categorizeCaseType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('consumer') || lower.includes('complaint') || lower.includes('cc/')) return 'consumer';
  if (lower.includes('criminal') || lower.includes('fir') || lower.includes('cr.')) return 'criminal';
  if (lower.includes('nclt') || lower.includes('insolvency') || lower.includes('ib/')) return 'nclt';
  if (lower.includes('civil') || lower.includes('suit') || lower.includes('cs/')) return 'civil';
  if (lower.includes('writ') || lower.includes('wp/') || lower.includes('pil')) return 'writ';
  return 'other';
}

function assessSeverity(text) {
  const lower = text.toLowerCase();
  if (lower.includes('criminal') || lower.includes('nclt') || lower.includes('insolvency')) return 'HIGH';
  if (lower.includes('consumer') || lower.includes('writ')) return 'MEDIUM';
  return 'LOW';
}

// ─── Main CLI ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  if (!command) {
    console.log(`
PropOps eCourts Search

Usage:
  node scripts/ecourts-search.mjs party-name --name "Builder Name" [--state "maharashtra"] [--district "pune"]
  node scripts/ecourts-search.mjs cnr --cnr "MHPU010012345672024"

Options:
  --name        Party name to search for (builder/developer/company)
  --state       Filter by state (e.g., "maharashtra")
  --district    Filter by district (e.g., "pune")
  --cnr         Case Number Register (16-digit identifier)
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'party-name':
      result = await searchByPartyName(
        getArg('--name') || '',
        { state: getArg('--state'), district: getArg('--district') }
      );
      break;
    case 'cnr':
      result = await searchByCNR(getArg('--cnr') || '');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
