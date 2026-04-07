#!/usr/bin/env node

/**
 * PropOps IGRS Maharashtra Scraper
 *
 * Scrapes the IGRS (Inspector General of Registration & Stamps) portal
 * for actual property registration data — the KILLER feature of PropOps.
 *
 * This data shows what people ACTUALLY paid for properties, not asking prices.
 *
 * Portal: https://freesearchigrservice.maharashtra.gov.in/
 * Tech: ASP.NET with ViewState, __doPostBack, CAPTCHA via Handler.ashx
 *
 * CAPTCHA STRATEGY: Human-in-the-loop
 *   1. Playwright navigates to IGRS and fills the search form
 *   2. Screenshots the CAPTCHA image
 *   3. Saves screenshot for the user (Claude shows it in chat)
 *   4. User types CAPTCHA solution
 *   5. Script enters solution and extracts results
 *   6. Results cached for 7 days to minimize CAPTCHA solving
 *
 * Usage:
 *   node scripts/igrs-scraper.mjs search --district "Pune" --village "Hinjewadi" --year 2025
 *   node scripts/igrs-scraper.mjs search --district "Pune" --village "Baner" --year 2024 --captcha "ABC123"
 *   node scripts/igrs-scraper.mjs districts          # List available districts
 *   node scripts/igrs-scraper.mjs interactive         # Full interactive mode (prompts for CAPTCHA)
 *
 * Output: JSON to stdout
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/registration-cache');
const CAPTCHA_DIR = resolve(ROOT, 'data');
const CACHE_VALIDITY_DAYS = 7;

const IGRS_URL = 'https://freesearchigrservice.maharashtra.gov.in/';

// Known districts (Marathi names → English mapping)
const DISTRICTS = {
  'pune': { marathi: 'पुणे', index: null },
  'mumbai': { marathi: 'मुंबई जिल्हा', index: null },
  'mumbai_suburban': { marathi: 'मुंबई उपनगर जिल्हा', index: null },
  'thane': { marathi: 'ठाणे', index: null },
  'nagpur': { marathi: 'नागपूर', index: null },
  'nashik': { marathi: 'नाशिक', index: null },
  'aurangabad': { marathi: 'औरंगाबाद', index: null },
  'kolhapur': { marathi: 'कोल्हापूर', index: null },
  'sangli': { marathi: 'सांगली', index: null },
  'solapur': { marathi: 'सोलापूर', index: null },
  'satara': { marathi: 'सातारा', index: null },
  'raigad': { marathi: 'रायगड', index: null },
  'ratnagiri': { marathi: 'रत्नागिरी', index: null },
  'palghar': { marathi: 'पालघर', index: null },
  'navi_mumbai': { marathi: 'नवी मुंबई', index: null }
};

// ─── Cache Helpers ──────────────────────────────────────────

function getCachePath(district, village, year) {
  const slug = `${district}-${village}-${year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return resolve(CACHE_DIR, `igrs-${slug}.json`);
}

function readCache(district, village, year) {
  const path = getCachePath(district, village, year);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: ${district}/${village}/${year} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(district, village, year, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(district, village, year), JSON.stringify(enriched, null, 2));
}

// ─── CAPTCHA Screenshot Helper ──────────────────────────────

async function captureCaptcha(page) {
  // Find the CAPTCHA image element
  const captchaSelectors = [
    'img[src*="Handler.ashx"]',
    'img[src*="captcha"]',
    'img[src*="Captcha"]',
    '#imgCaptcha',
    '.captcha-image img'
  ];

  let captchaElement = null;
  for (const sel of captchaSelectors) {
    captchaElement = await page.$(sel);
    if (captchaElement) break;
  }

  if (!captchaElement) {
    // Try finding any image that looks like a CAPTCHA (small, near an input)
    captchaElement = await page.$('img[width][height]');
  }

  const captchaPath = resolve(CAPTCHA_DIR, 'igrs-captcha.png');

  if (captchaElement) {
    await captchaElement.screenshot({ path: captchaPath });
    console.error(`CAPTCHA screenshot saved: ${captchaPath}`);
  } else {
    // Fallback: screenshot the form area
    await page.screenshot({ path: captchaPath, fullPage: false });
    console.error(`Full page screenshot saved (CAPTCHA element not found): ${captchaPath}`);
  }

  return captchaPath;
}

// ─── Interactive CAPTCHA Prompt ─────────────────────────────

function promptUser(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Main Search Flow ───────────────────────────────────────

async function searchRegistrations(options) {
  const { district, village, year, captcha, interactive } = options;

  // Check cache first
  const cached = readCache(district, village, year);
  if (cached) {
    console.error(`Returning cached results (${cached.registrations?.length || 0} records)`);
    return cached;
  }

  const browser = await chromium.launch({
    headless: !interactive, // Show browser in interactive mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.error(`Navigating to IGRS portal...`);
    await page.goto(IGRS_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // ─── Step 1: Select Year ────────────────────────────
    console.error(`Setting year: ${year}`);
    const yearSelectors = [
      'select[name*="Year"]',
      'select[name*="year"]',
      '#ddlYear',
      'select:has(option[value="2025"])',
      'select'
    ];

    for (const sel of yearSelectors) {
      const yearSelect = await page.$(sel);
      if (yearSelect) {
        const optionValues = await page.$$eval(`${sel} option`, opts =>
          opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
        );

        // Find option matching the year
        const yearOption = optionValues.find(o =>
          o.value === String(year) || o.text.includes(String(year))
        );

        if (yearOption) {
          await yearSelect.selectOption(yearOption.value);
          await page.waitForTimeout(1000);
          console.error(`Year selected: ${year}`);
          break;
        }
      }
    }

    // ─── Step 2: Select District ────────────────────────
    console.error(`Setting district: ${district}`);
    const districtSelectors = [
      'select[name*="District"]',
      'select[name*="district"]',
      '#ddlDistrict',
      'select[id*="district"]'
    ];

    for (const sel of districtSelectors) {
      const districtSelect = await page.$(sel);
      if (districtSelect) {
        const optionValues = await page.$$eval(`${sel} option`, opts =>
          opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
        );

        // Try matching by English name, then Marathi name
        const districtLower = district.toLowerCase();
        const knownDistrict = DISTRICTS[districtLower];

        const districtOption = optionValues.find(o => {
          const text = o.text.toLowerCase();
          return text.includes(districtLower) ||
            (knownDistrict && text.includes(knownDistrict.marathi)) ||
            o.value.toLowerCase().includes(districtLower);
        });

        if (districtOption) {
          await districtSelect.selectOption(districtOption.value);
          await page.waitForTimeout(2000); // Wait for village dropdown to populate
          console.error(`District selected: ${districtOption.text}`);
          break;
        } else {
          console.error(`District "${district}" not found. Available: ${optionValues.map(o => o.text).join(', ')}`);
        }
      }
    }

    // ─── Step 3: Enter Village ──────────────────────────
    console.error(`Setting village: ${village}`);
    const villageSelectors = [
      'input[name*="Village"]',
      'input[name*="village"]',
      '#txtVillageName',
      'input[type="text"][placeholder*="village"]',
      'input[type="text"]'
    ];

    // Village might be a text field or a dynamic dropdown
    for (const sel of villageSelectors) {
      const villageInput = await page.$(sel);
      if (villageInput) {
        await villageInput.fill(village);
        await page.waitForTimeout(1000);

        // Check if an autocomplete dropdown appeared
        const autocomplete = await page.$('.ui-autocomplete, .ui-menu, [role="listbox"]');
        if (autocomplete) {
          const firstOption = await page.$('.ui-autocomplete li:first-child, .ui-menu-item:first-child');
          if (firstOption) {
            await firstOption.click();
            await page.waitForTimeout(500);
          }
        }

        console.error(`Village entered: ${village}`);
        break;
      }
    }

    // Also try village dropdown if it exists
    const villageDropdown = await page.$('select[name*="Village"], select[name*="village"], #ddlVillage');
    if (villageDropdown) {
      const villageOpts = await page.$$eval('select[name*="Village"] option, select[name*="village"] option, #ddlVillage option', opts =>
        opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
      );
      const villageMatch = villageOpts.find(o =>
        o.text.toLowerCase().includes(village.toLowerCase())
      );
      if (villageMatch) {
        await villageDropdown.selectOption(villageMatch.value);
        await page.waitForTimeout(1000);
        console.error(`Village dropdown selected: ${villageMatch.text}`);
      }
    }

    // ─── Step 4: Handle CAPTCHA ─────────────────────────
    const captchaPath = await captureCaptcha(page);
    let captchaSolution = captcha;

    if (!captchaSolution) {
      if (interactive) {
        console.error(`\nCAPTCHA image saved to: ${captchaPath}`);
        console.error(`Open the image and type the CAPTCHA text below.\n`);
        captchaSolution = await promptUser('Enter CAPTCHA: ');
      } else {
        // Non-interactive mode: return the captcha path for Claude to show the user
        const output = {
          status: 'captcha_required',
          captcha_image: captchaPath,
          message: 'CAPTCHA required. Please solve the CAPTCHA and re-run with --captcha "SOLUTION"',
          command: `node scripts/igrs-scraper.mjs search --district "${district}" --village "${village}" --year ${year} --captcha "YOUR_SOLUTION"`,
          district,
          village,
          year
        };
        await browser.close();
        return output;
      }
    }

    // Enter CAPTCHA solution
    const captchaInputSelectors = [
      'input[name*="Captcha"]',
      'input[name*="captcha"]',
      '#txtCaptcha',
      'input[placeholder*="captcha"]',
      'input[placeholder*="Captcha"]',
      'input[type="text"][maxlength]'
    ];

    for (const sel of captchaInputSelectors) {
      const captchaInput = await page.$(sel);
      if (captchaInput) {
        await captchaInput.fill(captchaSolution);
        console.error(`CAPTCHA entered`);
        break;
      }
    }

    // ─── Step 5: Submit Search ──────────────────────────
    const submitSelectors = [
      'input[type="submit"][value*="Search"]',
      'input[type="submit"][value*="search"]',
      'input[type="submit"]',
      'button[type="submit"]',
      '#btnSearch',
      'input[value*="शोधा"]'  // Marathi for "Search"
    ];

    for (const sel of submitSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        console.error(`Search submitted`);
        break;
      }
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // ─── Step 6: Check for errors ───────────────────────
    const pageText = await page.textContent('body');

    if (pageText.includes('Invalid Captcha') || pageText.includes('wrong captcha') || pageText.includes('Incorrect')) {
      await browser.close();
      return {
        status: 'captcha_failed',
        message: 'CAPTCHA was incorrect. Please try again.',
        captcha_image: captchaPath,
        command: `node scripts/igrs-scraper.mjs search --district "${district}" --village "${village}" --year ${year} --captcha "NEW_SOLUTION"`,
        district, village, year
      };
    }

    if (pageText.includes('No Record Found') || pageText.includes('No record') || pageText.includes('not found')) {
      const output = {
        status: 'no_results',
        district, village, year,
        source: 'IGRS Maharashtra',
        source_url: IGRS_URL,
        scraped_at: new Date().toISOString(),
        registrations_count: 0,
        registrations: [],
        message: `No registrations found for ${village}, ${district} in ${year}`
      };
      writeCache(district, village, year, output);
      await browser.close();
      return output;
    }

    // ─── Step 7: Extract Results ────────────────────────
    console.error(`Extracting registration data...`);

    const registrations = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const data = [];

      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        // Try to identify this as a results table (not navigation/layout)
        const headerRow = rows[0];
        const headerText = headerRow.textContent.toLowerCase();
        if (!headerText.includes('doc') && !headerText.includes('reg') &&
            !headerText.includes('date') && !headerText.includes('party') &&
            !headerText.includes('amount') && !headerText.includes('village')) {
          continue;
        }

        const headers = Array.from(headerRow.querySelectorAll('th, td'))
          .map(cell => cell.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));

        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length < 3) continue;

          const entry = {};
          cells.forEach((cell, j) => {
            const key = headers[j] || `col_${j}`;
            entry[key] = cell.textContent.trim();

            // Check for detail links
            const link = cell.querySelector('a');
            if (link) {
              entry[`${key}_url`] = link.href || '';
              entry[`${key}_onclick`] = link.getAttribute('onclick') || '';
            }
          });

          if (Object.keys(entry).length > 0) data.push(entry);
        }
      }

      // If no table found, try grid/div-based layout
      if (data.length === 0) {
        const gridRows = document.querySelectorAll('[class*="grid"] [class*="row"], .search-result, .result-item');
        for (const row of gridRows) {
          const fields = {};
          row.querySelectorAll('[class*="col"], span, div').forEach(el => {
            const text = el.textContent.trim();
            if (text.length > 0 && text.length < 200) {
              const label = el.getAttribute('data-label') || el.className || '';
              fields[label || `field_${Object.keys(fields).length}`] = text;
            }
          });
          if (Object.keys(fields).length > 2) data.push(fields);
        }
      }

      return data;
    });

    // ─── Step 8: Normalize & Enrich ─────────────────────
    const normalized = registrations.map(r => {
      // Try to extract key fields regardless of column names
      const allValues = Object.values(r).join(' ');
      const allKeys = Object.keys(r);

      // Find consideration/amount (the sale price)
      let amount = '';
      for (const key of allKeys) {
        if (key.includes('amount') || key.includes('consider') || key.includes('value') || key.includes('price') || key.includes('मूल्य')) {
          amount = r[key];
          break;
        }
      }
      if (!amount) {
        // Look for a numeric value that could be the price
        for (const val of Object.values(r)) {
          if (/^[\d,]+$/.test(val.replace(/\s/g, '')) && parseInt(val.replace(/[^0-9]/g, '')) > 100000) {
            amount = val;
            break;
          }
        }
      }

      // Find date
      let regDate = '';
      for (const key of allKeys) {
        if (key.includes('date') || key.includes('दिनांक')) {
          regDate = r[key];
          break;
        }
      }

      // Find document type
      let docType = '';
      for (const key of allKeys) {
        if (key.includes('doc') || key.includes('type') || key.includes('प्रकार')) {
          docType = r[key];
          break;
        }
      }

      // Find area
      let area = '';
      for (const key of allKeys) {
        if (key.includes('area') || key.includes('sqft') || key.includes('sq') || key.includes('क्षेत्र')) {
          area = r[key];
          break;
        }
      }

      // Find parties
      let parties = '';
      for (const key of allKeys) {
        if (key.includes('party') || key.includes('name') || key.includes('buyer') || key.includes('seller') || key.includes('नाव')) {
          parties = r[key];
          break;
        }
      }

      // Parse amount to number
      const amountNum = parseInt((amount || '0').replace(/[^0-9]/g, '')) || 0;
      const amountLakhs = amountNum > 0 ? (amountNum / 100000).toFixed(2) : '';

      return {
        registration_date: regDate,
        document_type: docType,
        parties: parties,
        consideration_amount: amount,
        consideration_lakhs: amountLakhs ? `${amountLakhs}L` : '',
        area: area,
        _raw: r
      };
    });

    // ─── Step 9: Calculate Summary Stats ────────────────
    const amounts = normalized
      .map(r => parseInt((r.consideration_amount || '0').replace(/[^0-9]/g, '')))
      .filter(a => a > 0);

    const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
    const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

    const output = {
      status: 'success',
      district,
      village,
      year: parseInt(year),
      source: 'IGRS Maharashtra',
      source_url: IGRS_URL,
      scraped_at: new Date().toISOString(),
      registrations_count: normalized.length,
      summary: {
        total_registrations: normalized.length,
        with_amount: amounts.length,
        avg_amount: avgAmount > 0 ? `Rs ${(avgAmount / 100000).toFixed(2)}L` : 'N/A',
        min_amount: minAmount > 0 ? `Rs ${(minAmount / 100000).toFixed(2)}L` : 'N/A',
        max_amount: maxAmount > 0 ? `Rs ${(maxAmount / 100000).toFixed(2)}L` : 'N/A',
        avg_amount_raw: Math.round(avgAmount),
        min_amount_raw: minAmount,
        max_amount_raw: maxAmount
      },
      registrations: normalized
    };

    writeCache(district, village, year, output);
    console.error(`Found ${normalized.length} registrations. Cached for ${CACHE_VALIDITY_DAYS} days.`);

    return output;

  } catch (error) {
    console.error(`IGRS search error: ${error.message}`);
    return {
      status: 'error',
      error: error.message,
      district, village, year,
      source: 'IGRS Maharashtra',
      registrations: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Multi-Year Search (for trends) ────────────────────────

async function searchMultiYear(district, village, years, captchas = {}) {
  const results = {};

  for (const year of years) {
    console.error(`\n--- Searching ${village}, ${district} (${year}) ---`);

    const cached = readCache(district, village, year);
    if (cached) {
      results[year] = cached;
      continue;
    }

    const result = await searchRegistrations({
      district,
      village,
      year,
      captcha: captchas[year],
      interactive: false
    });

    results[year] = result;

    // If CAPTCHA required, stop and return what we have
    if (result.status === 'captcha_required') {
      return {
        status: 'partial',
        message: `CAPTCHA required for year ${year}. Solve and continue.`,
        completed_years: Object.keys(results).filter(y => results[y].status === 'success'),
        pending_year: year,
        captcha_image: result.captcha_image,
        results
      };
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  // Calculate price trend from multi-year data
  const trend = {};
  for (const [year, data] of Object.entries(results)) {
    if (data.summary?.avg_amount_raw > 0) {
      trend[year] = {
        avg_amount: data.summary.avg_amount,
        avg_amount_raw: data.summary.avg_amount_raw,
        registrations: data.registrations_count
      };
    }
  }

  return {
    status: 'success',
    district,
    village,
    years_searched: years,
    source: 'IGRS Maharashtra',
    scraped_at: new Date().toISOString(),
    trend,
    results
  };
}

// ─── Main CLI ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  const hasFlag = flag => args.includes(flag);

  if (!command) {
    console.log(`
PropOps IGRS Maharashtra Scraper — Actual Registration Prices

This is the killer feature. Shows what people ACTUALLY paid, not asking prices.
Uses human-in-the-loop CAPTCHA: you solve it, the agent does the rest.

Usage:
  node scripts/igrs-scraper.mjs search --district "Pune" --village "Hinjewadi" --year 2025
  node scripts/igrs-scraper.mjs search --district "Pune" --village "Baner" --year 2024 --captcha "ABC123"
  node scripts/igrs-scraper.mjs trend --district "Pune" --village "Hinjewadi" --from 2021 --to 2025
  node scripts/igrs-scraper.mjs interactive --district "Pune" --village "Hinjewadi" --year 2025
  node scripts/igrs-scraper.mjs districts

Options:
  --district    District name (e.g., "Pune", "Mumbai", "Thane")
  --village     Village/area name (e.g., "Hinjewadi", "Baner")
  --year        Registration year (1985-2026)
  --captcha     Pre-solved CAPTCHA text (skips CAPTCHA prompt)
  --from/--to   Year range for trend analysis

Results cached for ${CACHE_VALIDITY_DAYS} days in data/registration-cache/.
CAPTCHA image saved to data/igrs-captcha.png for Claude to show you.
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'search':
      result = await searchRegistrations({
        district: getArg('--district') || 'Pune',
        village: getArg('--village') || '',
        year: getArg('--year') || new Date().getFullYear(),
        captcha: getArg('--captcha'),
        interactive: false
      });
      break;

    case 'interactive':
      result = await searchRegistrations({
        district: getArg('--district') || 'Pune',
        village: getArg('--village') || '',
        year: getArg('--year') || new Date().getFullYear(),
        interactive: true
      });
      break;

    case 'trend': {
      const from = parseInt(getArg('--from') || new Date().getFullYear() - 4);
      const to = parseInt(getArg('--to') || new Date().getFullYear());
      const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);

      result = await searchMultiYear(
        getArg('--district') || 'Pune',
        getArg('--village') || '',
        years
      );
      break;
    }

    case 'districts':
      result = {
        source: 'IGRS Maharashtra',
        note: 'Use English names with --district flag. Portal uses Marathi names internally.',
        districts: Object.entries(DISTRICTS).map(([key, val]) => ({
          english: key,
          marathi: val.marathi,
          usage: `--district "${key}"`
        }))
      };
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
