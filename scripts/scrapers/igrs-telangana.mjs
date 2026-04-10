#!/usr/bin/env node

/**
 * PropOps IGRS Telangana Scraper
 *
 * Scrapes the Telangana Registration and Stamps Department portal
 * for actual property registration data. One of the most comprehensive
 * historical datasets in India — digitized from 1983.
 *
 * Portal: https://registration.telangana.gov.in/
 * Alt: https://prereg.telangana.gov.in/
 * Difficulty: MEDIUM-HIGH
 *
 * Tech: Classic ASP/JSP NIC stack with image CAPTCHA
 *
 * Features:
 * - EC (Encumbrance Certificate) search — by document number or property
 * - Market value search — land rate vs apartment rate by location
 * - Deed details by SRO + document number
 *
 * CAPTCHA Strategy: Human-in-the-loop
 * Script screenshots the CAPTCHA, user types solution, script proceeds.
 * Same pattern as our IGRS Maharashtra scraper.
 *
 * Usage:
 *   node scripts/scrapers/igrs-telangana.mjs ec --district "Hyderabad" --mandal "Golconda" --village "Khajaguda"
 *   node scripts/scrapers/igrs-telangana.mjs ec --doc-no "12345" --year 2024 --sro "SR Hyderabad"
 *   node scripts/scrapers/igrs-telangana.mjs market-value --district "Hyderabad" --mandal "Serilingampally" --village "Gachibowli"
 *   node scripts/scrapers/igrs-telangana.mjs districts
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/registration-cache');
const CAPTCHA_DIR = resolve(ROOT, 'data');
const CACHE_VALIDITY_DAYS = 7;

const IGRS_TG = {
  base: 'https://registration.telangana.gov.in',
  home: 'https://registration.telangana.gov.in/',
  ec_search: 'https://registration.telangana.gov.in/ec-search',
  market_value: 'https://registration.telangana.gov.in/market-value',
  deed: 'https://registration.telangana.gov.in/deed-details',

  // Telangana districts (33 total, listing major ones)
  districts: [
    'Hyderabad',
    'Rangareddy',
    'Medchal-Malkajgiri',
    'Sangareddy',
    'Vikarabad',
    'Medak',
    'Warangal Urban',
    'Warangal Rural',
    'Karimnagar',
    'Nizamabad',
    'Khammam',
    'Mahabubnagar',
    'Nalgonda',
    'Adilabad',
    'Nirmal'
  ]
};

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `igrs-tg-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: igrs-tg/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── CAPTCHA Helper ────────────────────────────────────────

async function captureCaptcha(page) {
  const selectors = [
    'img[src*="captcha" i]',
    'img[src*="Captcha"]',
    'img[id*="captcha" i]',
    '#imgCaptcha',
    '.captcha-image img'
  ];

  let captchaEl = null;
  for (const sel of selectors) {
    captchaEl = await page.$(sel);
    if (captchaEl) break;
  }

  const captchaPath = resolve(CAPTCHA_DIR, 'igrs-tg-captcha.png');

  if (captchaEl) {
    await captchaEl.screenshot({ path: captchaPath });
    console.error(`CAPTCHA saved: ${captchaPath}`);
    return captchaPath;
  }

  return null;
}

// ─── EC Search ─────────────────────────────────────────────

async function searchEC(options) {
  const { district, mandal, village, survey_no, plot_no, doc_no, year, sro, captcha } = options;
  const cacheKey = `ec-${district || 'any'}-${village || 'any'}-${doc_no || survey_no || 'all'}`;
  const cached = readCache('ec-search', cacheKey);
  if (cached) return cached;

  const browser = await chromium.launch({
    headless: !options.interactive,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.error(`Navigating to IGRS Telangana...`);
    await page.goto(IGRS_TG.home, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Navigate to EC search
    const ecLink = await page.$('a:has-text("EC"), a:has-text("Encumbrance")');
    if (ecLink) {
      await ecLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Fill search form
    if (district) {
      const districtSel = await page.$('select[name*="District"], select[name*="district"], #ddlDistrict');
      if (districtSel) {
        try {
          await districtSel.selectOption({ label: new RegExp(district, 'i') });
          await page.waitForTimeout(1500);
        } catch {}
      }
    }

    if (mandal) {
      const mandalSel = await page.$('select[name*="Mandal"], select[name*="mandal"], #ddlMandal');
      if (mandalSel) {
        try {
          await mandalSel.selectOption({ label: new RegExp(mandal, 'i') });
          await page.waitForTimeout(1500);
        } catch {}
      }
    }

    if (village) {
      const villageSel = await page.$('select[name*="Village"], input[name*="village"]');
      if (villageSel) {
        try {
          const tagName = await villageSel.evaluate(el => el.tagName);
          if (tagName === 'SELECT') {
            await villageSel.selectOption({ label: new RegExp(village, 'i') });
          } else {
            await villageSel.fill(village);
          }
          await page.waitForTimeout(1000);
        } catch {}
      }
    }

    if (survey_no) {
      const surveyInput = await page.$('input[name*="Survey"], #txtSurvey');
      if (surveyInput) await surveyInput.fill(survey_no);
    }

    if (doc_no) {
      const docInput = await page.$('input[name*="Doc"], #txtDocNo');
      if (docInput) await docInput.fill(doc_no);
    }

    if (year) {
      const yearInput = await page.$('select[name*="Year"], input[name*="year"]');
      if (yearInput) {
        try {
          await yearInput.selectOption(String(year));
        } catch {
          await yearInput.fill(String(year));
        }
      }
    }

    // Handle CAPTCHA
    const captchaPath = await captureCaptcha(page);
    let captchaSolution = captcha;

    if (captchaPath && !captchaSolution) {
      await browser.close();
      return {
        status: 'captcha_required',
        captcha_image: captchaPath,
        message: 'CAPTCHA required. Solve and re-run with --captcha "SOLUTION"',
        command: `node scripts/scrapers/igrs-telangana.mjs ec ${process.argv.slice(3).join(' ')} --captcha "YOUR_SOLUTION"`,
        query: options
      };
    }

    if (captchaSolution) {
      const captchaInput = await page.$('input[name*="Captcha"], input[name*="captcha"], #txtCaptcha');
      if (captchaInput) await captchaInput.fill(captchaSolution);
    }

    // Submit
    const submit = await page.$('button[type="submit"], input[type="submit"], #btnSearch');
    if (submit) {
      await submit.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Check for errors
    const pageText = await page.textContent('body');
    if (pageText.includes('Invalid Captcha') || pageText.includes('wrong captcha')) {
      await browser.close();
      return {
        status: 'captcha_failed',
        message: 'CAPTCHA incorrect. Re-run with a new solution.',
        captcha_image: captchaPath,
        query: options
      };
    }

    if (pageText.includes('No Record') || pageText.includes('no records')) {
      const output = {
        status: 'no_results',
        source: 'IGRS Telangana',
        query: options,
        scraped_at: new Date().toISOString(),
        registrations_count: 0,
        registrations: []
      };
      writeCache('ec-search', cacheKey, output);
      await browser.close();
      return output;
    }

    // Extract results
    const registrations = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const data = [];

      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        const headers = Array.from(rows[0].querySelectorAll('th, td'))
          .map(c => c.textContent?.trim().toLowerCase() || '');

        const isResultTable = headers.some(h =>
          h.includes('doc') || h.includes('reg') || h.includes('date') || h.includes('party') || h.includes('amount')
        );

        if (!isResultTable) continue;

        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length < 3) continue;

          const entry = {};
          cells.forEach((cell, idx) => {
            const header = headers[idx] || `col_${idx}`;
            const key = header.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
            entry[key] = cell.textContent?.trim() || '';
          });

          data.push(entry);
        }

        if (data.length > 0) break;
      }

      return data;
    });

    // Normalize and parse amounts
    const normalized = registrations.map(r => {
      const allKeys = Object.keys(r);
      let amount = '';
      for (const key of allKeys) {
        if (key.includes('amount') || key.includes('consider') || key.includes('value')) {
          amount = r[key];
          break;
        }
      }
      const amountNum = parseInt((amount || '0').replace(/[^0-9]/g, '')) || 0;

      return {
        doc_no: r.doc_no || r.document_no || r.col_0 || '',
        registration_date: r.registration_date || r.reg_date || r.date || r.col_1 || '',
        document_type: r.document_type || r.doc_type || r.col_2 || '',
        parties: r.parties || r.executant || r.col_3 || '',
        consideration_amount: amount,
        consideration_lakhs: amountNum > 0 ? `${(amountNum / 100000).toFixed(2)}L` : '',
        _raw: r
      };
    });

    const amounts = normalized.map(r => parseInt((r.consideration_amount || '0').replace(/[^0-9]/g, ''))).filter(a => a > 0);
    const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

    const output = {
      status: 'success',
      source: 'IGRS Telangana',
      source_url: page.url(),
      query: options,
      scraped_at: new Date().toISOString(),
      registrations_count: normalized.length,
      summary: {
        total: normalized.length,
        with_amount: amounts.length,
        avg_amount: avgAmount > 0 ? `Rs ${(avgAmount / 100000).toFixed(2)}L` : 'N/A',
        avg_amount_raw: Math.round(avgAmount)
      },
      registrations: normalized
    };

    if (normalized.length > 0) {
      writeCache('ec-search', cacheKey, output);
    }

    return output;

  } catch (error) {
    console.error(`Error: ${error.message}`);
    return {
      status: 'error',
      source: 'IGRS Telangana',
      query: options,
      error: error.message,
      registrations: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Market Value ──────────────────────────────────────────

async function getMarketValue(options) {
  const { district, mandal, village, captcha } = options;
  const cacheKey = `mv-${district}-${mandal}-${village}`;
  const cached = readCache('market-value', cacheKey);
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(IGRS_TG.home, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const mvLink = await page.$('a:has-text("Market Value"), a:has-text("MV")');
    if (mvLink) {
      await mvLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Fill cascading dropdowns
    const districtSel = await page.$('select[name*="District"]');
    if (districtSel) {
      try {
        await districtSel.selectOption({ label: new RegExp(district, 'i') });
        await page.waitForTimeout(1500);
      } catch {}
    }

    const mandalSel = await page.$('select[name*="Mandal"]');
    if (mandalSel) {
      try {
        await mandalSel.selectOption({ label: new RegExp(mandal, 'i') });
        await page.waitForTimeout(1500);
      } catch {}
    }

    const villageSel = await page.$('select[name*="Village"]');
    if (villageSel) {
      try {
        await villageSel.selectOption({ label: new RegExp(village, 'i') });
        await page.waitForTimeout(1500);
      } catch {}
    }

    // CAPTCHA
    const captchaPath = await captureCaptcha(page);
    if (captchaPath && !captcha) {
      await browser.close();
      return {
        status: 'captcha_required',
        captcha_image: captchaPath,
        query: options
      };
    }

    if (captcha) {
      const captchaInput = await page.$('input[name*="Captcha"]');
      if (captchaInput) await captchaInput.fill(captcha);
    }

    const submit = await page.$('button[type="submit"], #btnSearch');
    if (submit) {
      await submit.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const data = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const landRate = text.match(/land\s*rate[^:]*:\s*rs?\.?\s*([\d,]+)/i)?.[1];
      const apartmentRate = text.match(/apartment[^:]*rate[^:]*:\s*rs?\.?\s*([\d,]+)/i)?.[1];
      const tableRows = Array.from(document.querySelectorAll('table tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
      );
      return { landRate, apartmentRate, tableRows };
    });

    const output = {
      status: 'success',
      source: 'IGRS Telangana Market Value',
      query: options,
      scraped_at: new Date().toISOString(),
      guidance_value: {
        land_rate: data.landRate ? parseInt(data.landRate.replace(/,/g, '')) : null,
        apartment_rate: data.apartmentRate ? parseInt(data.apartmentRate.replace(/,/g, '')) : null
      },
      raw_table: data.tableRows
    };

    writeCache('market-value', cacheKey, output);
    return output;

  } catch (error) {
    return {
      status: 'error',
      source: 'IGRS Telangana Market Value',
      query: options,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// ─── CLI ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps IGRS Telangana Scraper

Scrapes https://registration.telangana.gov.in/ — Telangana property
registration portal. Data digitized from 1983, covering all 33 districts.

Uses human-in-the-loop CAPTCHA (user solves, script processes).

Usage:
  node scripts/scrapers/igrs-telangana.mjs ec --district "Hyderabad" --mandal "Golconda" --village "Khajaguda"
    EC search by location (property details)

  node scripts/scrapers/igrs-telangana.mjs ec --doc-no "12345" --year 2024 --sro "SR Hyderabad" --captcha "ABC123"
    EC search by document number (with pre-solved CAPTCHA)

  node scripts/scrapers/igrs-telangana.mjs market-value --district "Hyderabad" --mandal "Serilingampally" --village "Gachibowli"
    Market value (guidance value) lookup

  node scripts/scrapers/igrs-telangana.mjs districts
    List available Telangana districts

Options:
  --district      District name (e.g., "Hyderabad", "Rangareddy")
  --mandal        Mandal name (e.g., "Serilingampally", "Golconda")
  --village       Village/area name (e.g., "Gachibowli", "Madhapur")
  --survey-no     Survey number
  --plot-no       Plot number
  --doc-no        Document number
  --year          Year
  --sro           Sub-Registrar Office
  --captcha       Pre-solved CAPTCHA

Cache: 7 days in data/registration-cache/
Data history: 1983 onwards
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'ec':
      result = await searchEC({
        district: getArg('--district'),
        mandal: getArg('--mandal'),
        village: getArg('--village'),
        survey_no: getArg('--survey-no'),
        plot_no: getArg('--plot-no'),
        doc_no: getArg('--doc-no'),
        year: getArg('--year'),
        sro: getArg('--sro'),
        captcha: getArg('--captcha')
      });
      break;

    case 'market-value':
      result = await getMarketValue({
        district: getArg('--district') || '',
        mandal: getArg('--mandal') || '',
        village: getArg('--village') || '',
        captcha: getArg('--captcha')
      });
      break;

    case 'districts':
      result = {
        source: 'IGRS Telangana',
        districts: IGRS_TG.districts,
        note: 'Complete data available for all 33 Telangana districts from 1983 onwards'
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
