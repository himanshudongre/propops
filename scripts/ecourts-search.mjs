#!/usr/bin/env node

/**
 * PropOps eCourts Search
 *
 * Searches Indian court records for litigation against builders/developers.
 *
 * Two backends (tried in order):
 *   1. ECIAPI / Kleopatra (court-api.kleopatra.io) — FREE REST API, no CAPTCHA
 *      Covers 700+ District Courts, High Courts, NCLT, Consumer Forum.
 *      Sign up at https://court-api.kleopatra.io for API key.
 *   2. Playwright fallback — scrapes services.ecourts.gov.in directly
 *      (slower, CAPTCHA may block, use only if API is unavailable)
 *
 * Usage:
 *   node scripts/ecourts-search.mjs party-name --name "Godrej Properties" --state "MH"
 *   node scripts/ecourts-search.mjs party-name --name "Lodha" --state "MH" --district "pune"
 *   node scripts/ecourts-search.mjs cnr --cnr "MHPU010012345672024"
 *   node scripts/ecourts-search.mjs states            # List state codes
 *   node scripts/ecourts-search.mjs districts --state "MH"  # List districts
 *
 * Environment:
 *   ECOURTS_API_KEY — API key for ECIAPI/Kleopatra (optional, enables API mode)
 *
 * Output: JSON to stdout
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const API_KEY = process.env.ECOURTS_API_KEY || '';
const API_BASE = 'https://court-api.kleopatra.io';
const ECOURTS_DIRECT = 'https://services.ecourts.gov.in/ecourtindia_v6/';

// ─── Cache Helpers ──────────────────────────────────────────

function getCachePath(key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `ecourts-${slug}.json`);
}

function readCache(key) {
  const path = getCachePath(key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit for ecourts/${key} (${Math.round(age)} days old)`);
    return data;
  } catch { return null; }
}

function writeCache(key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(key), JSON.stringify(enriched, null, 2));
}

// ─── HTTP Fetch Helper ──────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ─── API Mode: Party Name Search ────────────────────────────

async function apiSearchByPartyName(name, options = {}) {
  const cacheKey = `party-${name}-${options.state || 'all'}-${options.district || 'all'}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  console.error(`[API] Searching eCourts for party: "${name}"`);

  try {
    const body = {
      partyName: name,
      ...(options.state && { stateCode: options.state }),
      ...(options.district && { districtCode: options.district }),
      ...(options.year && { year: options.year }),
      ...(options.caseType && { caseType: options.caseType })
    };

    const result = await apiFetch('/collector/party-search', {
      method: 'POST',
      body
    });

    const cases = (result.data || result.cases || result || []).map(c => ({
      cnr: c.cnrNumber || c.cnr || '',
      case_number: c.caseNumber || c.case_number || c.registrationNumber || '',
      case_type: c.caseType || c.case_type || '',
      filing_date: c.filingDate || c.filing_date || '',
      registration_date: c.registrationDate || c.registration_date || '',
      status: c.caseStatus || c.status || '',
      court: c.courtName || c.court || c.courtEstablishment || '',
      petitioner: c.petitioner || c.petitioners || '',
      respondent: c.respondent || c.respondents || '',
      next_hearing: c.nextHearingDate || c.next_hearing || '',
      decision_date: c.decisionDate || c.disposal_date || '',
      category: categorizeCaseType(
        `${c.caseType || ''} ${c.courtName || ''} ${c.caseNumber || ''}`
      ),
      severity: assessSeverity(
        `${c.caseType || ''} ${c.courtName || ''} ${c.caseNumber || ''}`
      )
    }));

    const output = buildOutput(name, options, 'ECIAPI/Kleopatra', cases);
    writeCache(cacheKey, output);
    return output;

  } catch (error) {
    console.error(`[API] Error: ${error.message}. Falling back to Playwright scraper.`);
    return playwrightSearchByPartyName(name, options);
  }
}

// ─── API Mode: CNR Lookup ───────────────────────────────────

async function apiSearchByCNR(cnr) {
  const cached = readCache(`cnr-${cnr}`);
  if (cached) return cached;

  console.error(`[API] Looking up CNR: ${cnr}`);

  try {
    const result = await apiFetch('/collector/case-details', {
      method: 'POST',
      body: { cnrNumber: cnr }
    });

    const output = {
      cnr,
      source: 'ECIAPI/Kleopatra',
      scraped_at: new Date().toISOString(),
      details: result.data || result
    };

    writeCache(`cnr-${cnr}`, output);
    return output;

  } catch (error) {
    console.error(`[API] CNR lookup error: ${error.message}`);
    return { cnr, source: 'ECIAPI/Kleopatra', error: error.message, details: {} };
  }
}

// ─── API Mode: Phoenix Lookups (States/Districts) ───────────

async function getStates() {
  try {
    const result = await apiFetch('/phoenix/states');
    return result.data || result;
  } catch (error) {
    console.error(`Error fetching states: ${error.message}`);
    return getFallbackStates();
  }
}

async function getDistricts(stateCode) {
  try {
    const result = await apiFetch(`/phoenix/districts/${stateCode}`);
    return result.data || result;
  } catch (error) {
    console.error(`Error fetching districts: ${error.message}`);
    return [];
  }
}

function getFallbackStates() {
  return [
    { code: 'MH', name: 'Maharashtra' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'DL', name: 'Delhi' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'TG', name: 'Telangana' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'HR', name: 'Haryana' },
    { code: 'WB', name: 'West Bengal' }
  ];
}

// ─── Playwright Fallback: Party Name Search ─────────────────

async function playwrightSearchByPartyName(name, options = {}) {
  const cacheKey = `party-${name}-${options.state || 'all'}-${options.district || 'all'}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    console.error(`[Playwright] Navigating to eCourts portal...`);
    await page.goto(ECOURTS_DIRECT, { waitUntil: 'networkidle', timeout: 30000 });

    // Look for party name search tab
    const partyTab = await page.$('text=Party Name');
    if (partyTab) {
      await partyTab.click();
      await page.waitForTimeout(1000);
    }

    // Select state
    if (options.state) {
      const stateSelect = await page.$('select[name*="state"], #sess_state_code, #state_code');
      if (stateSelect) {
        try { await stateSelect.selectOption({ label: new RegExp(options.state, 'i') }); } catch {}
        await page.waitForTimeout(1000);
      }
    }

    // Select district
    if (options.district) {
      const districtSelect = await page.$('select[name*="district"], #sess_dist_code');
      if (districtSelect) {
        await page.waitForTimeout(1000);
        try { await districtSelect.selectOption({ label: new RegExp(options.district, 'i') }); } catch {}
        await page.waitForTimeout(1000);
      }
    }

    // Enter party name
    const partyInput = await page.$('input[name*="party"], #party_name, input[placeholder*="Party"]');
    if (partyInput) await partyInput.fill(name);

    // Submit
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], #party_submit');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Extract results
    const cases = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, #dispTable tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return null;
        const getText = idx => cells[idx]?.textContent?.trim() || '';
        return {
          sr_no: getText(0),
          case_number: getText(1),
          parties: getText(2),
          court: cells.length > 3 ? getText(3) : '',
          filing_date: cells.length > 4 ? getText(4) : '',
          status: cells.length > 5 ? getText(5) : '',
          next_hearing: cells.length > 6 ? getText(6) : ''
        };
      }).filter(Boolean);
    });

    const categorized = cases.map(c => ({
      ...c,
      category: categorizeCaseType(`${c.case_number} ${c.parties} ${c.court}`),
      severity: assessSeverity(`${c.case_number} ${c.parties} ${c.court}`)
    }));

    const output = buildOutput(name, options, 'eCourts Playwright', categorized);
    writeCache(cacheKey, output);
    return output;

  } catch (error) {
    console.error(`[Playwright] Error: ${error.message}`);
    return buildOutput(name, options, 'eCourts Playwright (failed)', [], error.message);
  } finally {
    if (browser) await browser.close();
  }
}

// ─── Shared Helpers ─────────────────────────────────────────

function buildOutput(name, options, source, cases, error = null) {
  return {
    query: name,
    state: options.state || 'all',
    district: options.district || 'all',
    source,
    source_url: source.includes('API') ? API_BASE : ECOURTS_DIRECT,
    scraped_at: new Date().toISOString(),
    ...(error && { error }),
    total_cases: cases.length,
    pending: cases.filter(c => {
      const s = (c.status || '').toLowerCase();
      return s.includes('pending') || (!s.includes('disposed') && !s.includes('decided') && !s.includes('closed'));
    }).length,
    disposed: cases.filter(c => {
      const s = (c.status || '').toLowerCase();
      return s.includes('disposed') || s.includes('decided') || s.includes('closed');
    }).length,
    summary: {
      consumer: cases.filter(c => c.category === 'consumer').length,
      civil: cases.filter(c => c.category === 'civil').length,
      criminal: cases.filter(c => c.category === 'criminal').length,
      nclt: cases.filter(c => c.category === 'nclt').length,
      writ: cases.filter(c => c.category === 'writ').length,
      other: cases.filter(c => c.category === 'other').length,
    },
    cases
  };
}

function categorizeCaseType(text) {
  const l = text.toLowerCase();
  if (l.includes('consumer') || l.includes('complaint') || l.includes('cc/')) return 'consumer';
  if (l.includes('criminal') || l.includes('fir') || l.includes('cr.') || l.includes('sessions')) return 'criminal';
  if (l.includes('nclt') || l.includes('insolvency') || l.includes('ib/') || l.includes('liquidation')) return 'nclt';
  if (l.includes('writ') || l.includes('wp/') || l.includes('pil')) return 'writ';
  if (l.includes('civil') || l.includes('suit') || l.includes('cs/') || l.includes('regular')) return 'civil';
  return 'other';
}

function assessSeverity(text) {
  const l = text.toLowerCase();
  if (l.includes('criminal') || l.includes('nclt') || l.includes('insolvency') || l.includes('liquidation')) return 'HIGH';
  if (l.includes('consumer') || l.includes('writ') || l.includes('rera')) return 'MEDIUM';
  return 'LOW';
}

// ─── Main CLI ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    const mode = API_KEY ? 'API (ECIAPI/Kleopatra)' : 'Playwright fallback (no API key)';
    console.log(`
PropOps eCourts Search — Mode: ${mode}

Usage:
  node scripts/ecourts-search.mjs party-name --name "Builder Name" [--state "MH"] [--district "pune"]
  node scripts/ecourts-search.mjs cnr --cnr "MHPU010012345672024"
  node scripts/ecourts-search.mjs states
  node scripts/ecourts-search.mjs districts --state "MH"

Set ECOURTS_API_KEY env var to enable API mode (recommended, free):
  export ECOURTS_API_KEY="your-key-from-court-api.kleopatra.io"
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'party-name': {
      const name = getArg('--name') || '';
      const opts = { state: getArg('--state'), district: getArg('--district') };
      result = API_KEY
        ? await apiSearchByPartyName(name, opts)
        : await playwrightSearchByPartyName(name, opts);
      break;
    }
    case 'cnr':
      result = await apiSearchByCNR(getArg('--cnr') || '');
      break;
    case 'states':
      result = await getStates();
      break;
    case 'districts':
      result = await getDistricts(getArg('--state') || '');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
