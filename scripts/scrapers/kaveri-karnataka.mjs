#!/usr/bin/env node

/**
 * PropOps Kaveri Karnataka IGRS Scraper
 *
 * Scrapes Kaveri Online Services 2.0 — the Karnataka property
 * registration portal operated by Department of Stamps & Registration.
 *
 * Portal: https://kaveri.karnataka.gov.in/
 * Difficulty: HIGH
 * - Mobile + OTP login required
 * - Image CAPTCHA on login and EC search
 * - Session-heavy JSP/.NET hybrid
 * - Rate limiting on authenticated endpoints
 *
 * STRATEGY: Human-in-the-loop session handoff
 *
 * Instead of automating the OTP login (which is fragile and against ToS),
 * we use a "session handoff" pattern:
 *
 * 1. First run: opens Kaveri in headful mode, user logs in manually
 *    (phone + OTP + CAPTCHA)
 * 2. Script saves the authenticated session (cookies + localStorage)
 *    to data/kaveri-session.json (gitignored)
 * 3. Subsequent runs reuse the saved session
 * 4. If the session expires, user is prompted to log in again
 *
 * This is the cleanest legal approach — the USER authenticates, we just
 * use the session they created. Same pattern Landeed and others use.
 *
 * Usage:
 *   node scripts/scrapers/kaveri-karnataka.mjs login
 *     Opens browser, user logs in manually, session saved
 *
 *   node scripts/scrapers/kaveri-karnataka.mjs ec --district "Bangalore Urban" --taluk "Bangalore East" --village "Whitefield" --survey "123/4"
 *     Encumbrance certificate search (requires login)
 *
 *   node scripts/scrapers/kaveri-karnataka.mjs deed --doc-no "12345" --year 2024 --sro "Bangalore Urban"
 *     Deed details lookup
 *
 *   node scripts/scrapers/kaveri-karnataka.mjs market-value --district "Bangalore Urban" --taluk "Bangalore East" --village "Whitefield"
 *     Market value (guidance value) lookup
 *
 *   node scripts/scrapers/kaveri-karnataka.mjs session-status
 *     Check if saved session is still valid
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/registration-cache');
const SESSION_FILE = resolve(ROOT, 'data/kaveri-session.json');
const CACHE_VALIDITY_DAYS = 7;
const SESSION_VALIDITY_HOURS = 8; // Kaveri sessions typically expire in 8 hours

const KAVERI = {
  base: 'https://kaveri.karnataka.gov.in',
  home: 'https://kaveri.karnataka.gov.in/',
  login: 'https://kaveri.karnataka.gov.in/Login.aspx',
  ec_search: 'https://kaveri.karnataka.gov.in/ec-search',
  deed_search: 'https://kaveri.karnataka.gov.in/deed-details',
  market_value: 'https://kaveri.karnataka.gov.in/market-value'
};

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `kaveri-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: kaveri/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── Session Management ────────────────────────────────────

function saveSession(context) {
  const session = {
    cookies: context.cookies,
    origins: context.origins || [],
    saved_at: new Date().toISOString()
  };

  if (!existsSync(dirname(SESSION_FILE))) {
    mkdirSync(dirname(SESSION_FILE), { recursive: true });
  }

  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
  console.error(`Session saved to ${SESSION_FILE}`);
}

function loadSession() {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
    const age = (Date.now() - new Date(session.saved_at).getTime()) / (1000 * 60 * 60);
    if (age > SESSION_VALIDITY_HOURS) {
      console.error(`Session expired (${Math.round(age)}h old). Re-login required.`);
      return null;
    }
    console.error(`Loaded Kaveri session (${Math.round(age * 60)}m old)`);
    return session;
  } catch { return null; }
}

function clearSession() {
  if (existsSync(SESSION_FILE)) {
    unlinkSync(SESSION_FILE);
    console.error('Session cleared');
  }
}

// ─── Login Flow (Human-in-the-loop) ────────────────────────

async function interactiveLogin() {
  console.error(`
========================================
KAVERI KARNATAKA — INTERACTIVE LOGIN
========================================

A browser window will open shortly. Please:

1. The portal will load at ${KAVERI.login}
2. Enter your mobile number
3. Solve the CAPTCHA shown on the page
4. Request OTP
5. Enter the OTP received on your phone
6. Complete the login

The script will automatically save your session
once you're successfully logged in.

DO NOT close the browser until you see the
"Login detected" message below.
========================================
`);

  const browser = await chromium.launch({
    headless: false, // MUST be headful for user to interact
    args: ['--no-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(KAVERI.login, { waitUntil: 'networkidle', timeout: 30000 });
    console.error('Waiting for you to complete login...');
    console.error('(Checking login status every 5 seconds)');

    // Poll for successful login
    // We detect login by URL change or presence of logged-in UI elements
    let loggedIn = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes total

    while (!loggedIn && attempts < maxAttempts) {
      await page.waitForTimeout(5000);
      attempts++;

      try {
        const currentUrl = page.url();
        const pageText = await page.textContent('body').catch(() => '');

        // Common indicators of successful login
        const hasLogout = /logout|sign out|log out/i.test(pageText);
        const hasWelcome = /welcome|dashboard|my account|my profile/i.test(pageText);
        const urlChanged = !currentUrl.includes('Login') && !currentUrl.includes('login');

        if ((hasLogout || hasWelcome) && urlChanged) {
          loggedIn = true;
          console.error('Login detected! Saving session...');
        } else {
          if (attempts % 6 === 0) { // Every 30 seconds
            console.error(`Still waiting for login... (${attempts * 5}s elapsed)`);
          }
        }
      } catch (err) {
        // Page might be navigating, keep polling
      }
    }

    if (!loggedIn) {
      console.error('Login timed out after 10 minutes. Please try again.');
      await browser.close();
      return { success: false, error: 'Login timeout' };
    }

    // Save session cookies and storage
    const cookies = await context.cookies();
    const storageState = await context.storageState();

    saveSession(storageState);

    console.error('Session saved successfully!');
    console.error('You can now run queries without logging in again.');
    console.error('Session will remain valid for approximately 8 hours.');

    await browser.close();
    return { success: true, session_saved: SESSION_FILE };

  } catch (error) {
    console.error(`Login error: ${error.message}`);
    await browser.close();
    return { success: false, error: error.message };
  }
}

// ─── Authenticated Query Helper ────────────────────────────

async function withAuthenticatedBrowser(callback) {
  const session = loadSession();

  if (!session) {
    return {
      status: 'login_required',
      message: 'No valid session. Please run: node scripts/scrapers/kaveri-karnataka.mjs login',
      login_command: 'node scripts/scrapers/kaveri-karnataka.mjs login'
    };
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // Load cookies
  const context = await browser.newContext();
  if (session.cookies && session.cookies.length > 0) {
    await context.addCookies(session.cookies);
  }

  const page = await context.newPage();

  try {
    const result = await callback(page);
    await browser.close();
    return result;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// ─── EC Search ──────────────────────────────────────────────

async function searchEC(options) {
  const { district, taluk, village, survey_number, date_from, date_to } = options;
  const cacheKey = `ec-${district}-${village}-${survey_number || 'all'}`;
  const cached = readCache('ec-search', cacheKey);
  if (cached) return cached;

  return withAuthenticatedBrowser(async (page) => {
    console.error(`Searching EC: ${district}/${taluk}/${village}/${survey_number || 'all'}`);

    try {
      await page.goto(KAVERI.ec_search, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Check if we were redirected to login (session invalid)
      if (page.url().toLowerCase().includes('login')) {
        return {
          status: 'session_expired',
          message: 'Session expired. Please re-login.',
          login_command: 'node scripts/scrapers/kaveri-karnataka.mjs login'
        };
      }

      // Fill the EC search form
      // Note: Exact selectors will need adjustment after inspecting the live form
      const fields = [
        { selectors: ['select[name*="district"]', '#ddlDistrict'], value: district, type: 'select' },
        { selectors: ['select[name*="taluk"]', '#ddlTaluk'], value: taluk, type: 'select' },
        { selectors: ['select[name*="village"]', 'input[name*="village"]', '#ddlVillage', '#txtVillage'], value: village, type: 'auto' },
        { selectors: ['input[name*="survey"]', '#txtSurvey'], value: survey_number, type: 'input' }
      ];

      for (const field of fields) {
        if (!field.value) continue;
        for (const selector of field.selectors) {
          const el = await page.$(selector);
          if (el) {
            if (field.type === 'select' || (field.type === 'auto' && selector.includes('select'))) {
              try {
                await el.selectOption({ label: new RegExp(field.value, 'i') });
                await page.waitForTimeout(1500); // Cascade wait
              } catch { /* selector exists but option not found */ }
            } else {
              await el.fill(field.value);
            }
            break;
          }
        }
      }

      // Handle CAPTCHA if present on search form (some Kaveri pages require it again)
      const captchaImg = await page.$('img[src*="captcha" i], img[src*="Captcha"]');
      if (captchaImg) {
        const captchaPath = resolve(ROOT, 'data/kaveri-captcha.png');
        await captchaImg.screenshot({ path: captchaPath });
        console.error(`\nCAPTCHA required. Screenshot saved: ${captchaPath}`);
        return {
          status: 'captcha_required',
          message: 'Kaveri requires CAPTCHA for this search. View the screenshot and re-run with --captcha "SOLUTION"',
          captcha_image: captchaPath
        };
      }

      // Submit
      const submit = await page.$('button[type="submit"], input[type="submit"], #btnSearch');
      if (submit) {
        await submit.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      }

      // Extract results
      const records = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr, .result-row, #gvResults tr');
        return Array.from(rows).map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) return null;
          const getText = i => cells[i]?.textContent?.trim() || '';
          return {
            doc_no: getText(0),
            registration_date: getText(1),
            document_type: getText(2),
            parties: cells.length > 3 ? getText(3) : '',
            consideration: cells.length > 4 ? getText(4) : '',
            area: cells.length > 5 ? getText(5) : ''
          };
        }).filter(Boolean);
      });

      // Parse amounts for summary stats
      const amounts = records
        .map(r => parseInt((r.consideration || '0').replace(/[^0-9]/g, '')))
        .filter(a => a > 0);

      const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

      const output = {
        status: 'success',
        query: { district, taluk, village, survey_number },
        source: 'Kaveri Karnataka IGRS',
        source_url: KAVERI.ec_search,
        scraped_at: new Date().toISOString(),
        results_count: records.length,
        summary: {
          total: records.length,
          with_amount: amounts.length,
          avg_amount: avgAmount > 0 ? `Rs ${(avgAmount / 100000).toFixed(2)}L` : 'N/A',
          avg_amount_raw: Math.round(avgAmount)
        },
        records
      };

      if (records.length > 0) {
        writeCache('ec-search', cacheKey, output);
      }

      return output;

    } catch (error) {
      console.error(`EC search error: ${error.message}`);
      return {
        status: 'error',
        query: { district, taluk, village, survey_number },
        source: 'Kaveri Karnataka IGRS',
        error: error.message,
        records: []
      };
    }
  });
}

// ─── Market Value (Guidance Value) ─────────────────────────

async function getMarketValue(options) {
  const { district, taluk, village } = options;
  const cacheKey = `mv-${district}-${taluk}-${village}`;
  const cached = readCache('market-value', cacheKey);
  if (cached) return cached;

  return withAuthenticatedBrowser(async (page) => {
    console.error(`Fetching market value: ${district}/${taluk}/${village}`);

    try {
      await page.goto(KAVERI.market_value, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      if (page.url().toLowerCase().includes('login')) {
        return { status: 'session_expired' };
      }

      // Fill dropdowns
      const districtSel = await page.$('select[name*="district"], #ddlDistrict');
      if (districtSel) {
        try {
          await districtSel.selectOption({ label: new RegExp(district, 'i') });
          await page.waitForTimeout(1500);
        } catch {}
      }

      const talukSel = await page.$('select[name*="taluk"], #ddlTaluk');
      if (talukSel) {
        try {
          await talukSel.selectOption({ label: new RegExp(taluk, 'i') });
          await page.waitForTimeout(1500);
        } catch {}
      }

      const villageSel = await page.$('select[name*="village"], #ddlVillage');
      if (villageSel) {
        try {
          await villageSel.selectOption({ label: new RegExp(village, 'i') });
          await page.waitForTimeout(1500);
        } catch {}
      }

      // Submit
      const submit = await page.$('button[type="submit"], #btnSearch');
      if (submit) {
        await submit.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      }

      // Extract guidance value
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
        query: { district, taluk, village },
        source: 'Kaveri Karnataka Market Value',
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
        query: { district, taluk, village },
        source: 'Kaveri Karnataka Market Value',
        error: error.message
      };
    }
  });
}

// ─── Deed Details ──────────────────────────────────────────

async function getDeedDetails(options) {
  const { doc_no, year, sro } = options;
  const cacheKey = `deed-${sro}-${doc_no}-${year}`;
  const cached = readCache('deed', cacheKey);
  if (cached) return cached;

  return withAuthenticatedBrowser(async (page) => {
    console.error(`Fetching deed: ${sro}/${doc_no}/${year}`);

    try {
      await page.goto(KAVERI.deed_search, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      if (page.url().toLowerCase().includes('login')) {
        return { status: 'session_expired' };
      }

      // Fill form
      const docInput = await page.$('input[name*="doc"], #txtDocNo');
      if (docInput) await docInput.fill(String(doc_no));

      const yearInput = await page.$('select[name*="year"], #ddlYear, input[name*="year"]');
      if (yearInput) {
        try {
          await yearInput.selectOption(String(year));
        } catch {
          await yearInput.fill(String(year));
        }
      }

      const sroSelect = await page.$('select[name*="sro"], #ddlSRO');
      if (sroSelect) {
        try {
          await sroSelect.selectOption({ label: new RegExp(sro, 'i') });
          await page.waitForTimeout(1500);
        } catch {}
      }

      // Submit
      const submit = await page.$('button[type="submit"], #btnSearch');
      if (submit) {
        await submit.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      }

      // Extract deed details
      const deed = await page.evaluate(() => {
        const data = {};
        document.querySelectorAll('table tr, dl dt').forEach(el => {
          if (el.tagName === 'DT') {
            const dd = el.nextElementSibling;
            if (dd && dd.tagName === 'DD') {
              const key = el.textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
              data[key] = dd.textContent?.trim() || '';
            }
          } else {
            const cells = el.querySelectorAll('td, th');
            if (cells.length === 2) {
              const key = cells[0].textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
              data[key] = cells[1].textContent?.trim() || '';
            }
          }
        });
        return data;
      });

      const output = {
        status: 'success',
        query: { doc_no, year, sro },
        source: 'Kaveri Karnataka Deed',
        scraped_at: new Date().toISOString(),
        deed
      };

      writeCache('deed', cacheKey, output);
      return output;

    } catch (error) {
      return {
        status: 'error',
        query: { doc_no, year, sro },
        source: 'Kaveri Karnataka Deed',
        error: error.message
      };
    }
  });
}

// ─── Session Status Check ──────────────────────────────────

async function sessionStatus() {
  const session = loadSession();
  if (!session) {
    return {
      status: 'no_session',
      message: 'No saved session. Run login first.',
      login_command: 'node scripts/scrapers/kaveri-karnataka.mjs login'
    };
  }

  const age = (Date.now() - new Date(session.saved_at).getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, SESSION_VALIDITY_HOURS - age);

  return {
    status: 'valid',
    saved_at: session.saved_at,
    age_hours: age.toFixed(1),
    hours_remaining: hoursRemaining.toFixed(1),
    cookies_count: session.cookies?.length || 0
  };
}

// ─── CLI ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps Kaveri Karnataka IGRS Scraper

Scrapes https://kaveri.karnataka.gov.in/ — Karnataka property registration portal.
Covers the Bangalore property market and all Karnataka districts.

Uses human-in-the-loop session handoff (you log in, script uses the session).
Session expires after ~8 hours, then re-login required.

Usage:
  node scripts/scrapers/kaveri-karnataka.mjs login
    Interactive login: opens browser, you enter phone + OTP + CAPTCHA,
    session is saved for subsequent queries.

  node scripts/scrapers/kaveri-karnataka.mjs session-status
    Check if current saved session is still valid.

  node scripts/scrapers/kaveri-karnataka.mjs ec --district "Bangalore Urban" --taluk "Bangalore East" --village "Whitefield" [--survey "123/4"]
    Encumbrance Certificate search — finds registered transactions.

  node scripts/scrapers/kaveri-karnataka.mjs market-value --district "Bangalore Urban" --taluk "Bangalore East" --village "Whitefield"
    Market value (guidance value) lookup for an area.

  node scripts/scrapers/kaveri-karnataka.mjs deed --doc-no "12345" --year 2024 --sro "Bangalore Urban"
    Lookup specific deed details by document number.

  node scripts/scrapers/kaveri-karnataka.mjs logout
    Clear saved session.

Cache: 7 days in data/registration-cache/
Session: 8 hours, stored in data/kaveri-session.json (gitignored)

IMPORTANT: Kaveri is rate-limited. Add delays between queries. This
scraper respects that by using caching aggressively.
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'login':
      result = await interactiveLogin();
      break;

    case 'session-status':
      result = await sessionStatus();
      break;

    case 'logout':
      clearSession();
      result = { status: 'logged_out' };
      break;

    case 'ec':
      result = await searchEC({
        district: getArg('--district') || '',
        taluk: getArg('--taluk') || '',
        village: getArg('--village') || '',
        survey_number: getArg('--survey'),
        date_from: getArg('--from'),
        date_to: getArg('--to')
      });
      break;

    case 'market-value':
      result = await getMarketValue({
        district: getArg('--district') || '',
        taluk: getArg('--taluk') || '',
        village: getArg('--village') || ''
      });
      break;

    case 'deed':
      result = await getDeedDetails({
        doc_no: getArg('--doc-no') || '',
        year: getArg('--year') || new Date().getFullYear(),
        sro: getArg('--sro') || ''
      });
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
