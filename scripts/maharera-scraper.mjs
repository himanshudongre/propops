#!/usr/bin/env node

/**
 * PropOps MahaRERA Scraper
 *
 * Scrapes the Maharashtra Real Estate Regulatory Authority for project
 * details, builder information, and complaint data.
 *
 * Two portals (tried in order):
 *   Portal A (Primary): maharera.maharashtra.gov.in — Drupal CMS, GET params,
 *     HTML tables, no CAPTCHA, simpler to scrape.
 *   Portal B (Fallback): maharerait.mahaonline.gov.in — ASP.NET MVC, anti-forgery
 *     tokens, session state. More detailed data but harder to scrape.
 *
 * Usage:
 *   node scripts/maharera-scraper.mjs search-project --name "Godrej Infinity"
 *   node scripts/maharera-scraper.mjs search-project --name "Godrej" --district "Pune"
 *   node scripts/maharera-scraper.mjs search-promoter --name "Godrej Properties"
 *   node scripts/maharera-scraper.mjs project-details --rera-id "P52100012345"
 *   node scripts/maharera-scraper.mjs complaints --promoter "Godrej Properties"
 *
 * Output: JSON to stdout (for piping) or saved to data/builder-cache/
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { saveDebugSnapshot, logPageStructure } from './scrapers/debug-helper.mjs';
import { buildNameVariants } from './scrapers/name-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

// Portal A (Drupal — primary, simpler)
// Verified 2026-04-10 by probing the live homepage navigation
const PORTAL_A = {
  base: 'https://maharera.maharashtra.gov.in',

  // Working URLs (verified)
  projectSearch: 'https://maharera.maharashtra.gov.in/projects-search-result',
  mapSearch: 'https://maharera.maharashtra.gov.in/map-projects-search-result',
  projectComplaints: 'https://maharera.maharashtra.gov.in/project-complaint-report',
  promoterComplaints: 'https://maharera.maharashtra.gov.in/promoter-complaint-report',
  lapsedProjects: 'https://maharera.maharashtra.gov.in/lapsed-project-underconstruction',
  ncltProjects: 'https://maharera.maharashtra.gov.in/nclt-projects',
  orders: 'https://maharera.maharashtra.gov.in/orders-judgements',
  deregistrationNotices: 'https://maharera.maharashtra.gov.in/project-de-registration-notices',

  // NOTE: The old /promoters-search-result URL redirects to the site-wide
  // search (search/node) which is useless. MahaRERA no longer has a
  // dedicated promoter search page. Use promoterComplaints + projectSearch
  // (filtered by promoter name) as alternatives.
  promoterSearch: 'https://maharera.maharashtra.gov.in/promoter-complaint-report'
};

// Portal B (ASP.NET — fallback, more detailed)
const PORTAL_B = {
  base: 'https://maharerait.mahaonline.gov.in',
  search: 'https://maharerait.mahaonline.gov.in/SearchList/Search',
  searchResults: 'https://maharerait.mahaonline.gov.in/searchlist/searchlist'
};

// ─── Cache Helpers ──────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `maharera-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit for maharera/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString(), _cache_key: `${type}/${key}` };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── Browser Helper ─────────────────────────────────────────

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// ─── Portal A: Project Search (Drupal — primary) ───────────

async function searchProjectsPortalA(query, options = {}) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    // Portal A supports GET params — try direct URL first
    let url = PORTAL_A.projectSearch;
    if (query.startsWith('P') && /^P\d+/.test(query)) {
      // Looks like a RERA certificate number — direct lookup
      url += `?certificate_no=${encodeURIComponent(query)}`;
      console.error(`[Portal A] Direct lookup: ${query}`);
    } else {
      console.error(`[Portal A] Searching projects: "${query}"`);
    }

    // Use domcontentloaded instead of networkidle — Drupal portal is slow
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // If not direct lookup, fill the search form
    if (!query.startsWith('P') || !/^P\d+/.test(query)) {
      // IMPORTANT: The MahaRERA page has 3 forms. We need the specific project
      // search form with id="projects-search-page-form" which contains
      // #edit-project-name. Do NOT use the site-wide search-block-form.
      // Verified 2026-04-10 via form inspection.

      const filled = await page.evaluate((searchQuery) => {
        // Target the exact form by id
        const form = document.getElementById('projects-search-page-form');
        if (!form) {
          // Fallback: any form containing #edit-project-name
          const input = document.getElementById('edit-project-name');
          if (!input) return { success: false, error: 'project_name field not found' };

          input.focus();
          input.value = searchQuery;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, form: 'fallback' };
        }

        const nameInput = form.querySelector('#edit-project-name, input[name="project_name"]');
        if (!nameInput) return { success: false, error: 'project_name input not in form' };

        nameInput.focus();
        nameInput.value = searchQuery;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, form: form.id };
      }, query);

      if (!filled.success) {
        console.error(`[Portal A] Form fill failed: ${filled.error}`);
      } else {
        console.error(`[Portal A] Filled form: ${filled.form}`);
      }

      // Set district filter if provided
      if (options.district) {
        await page.evaluate((dist) => {
          const form = document.getElementById('projects-search-page-form');
          if (!form) return;
          const selects = Array.from(form.querySelectorAll('select'))
            .filter(s => /district/i.test(s.name) || /district/i.test(s.id));
          for (const sel of selects) {
            const match = Array.from(sel.options).find(o =>
              o.text.toLowerCase().includes(dist.toLowerCase())
            );
            if (match) {
              sel.value = match.value;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              return;
            }
          }
        }, options.district);
      }

      // Submit the SPECIFIC search form (not the site-wide search)
      const submitted = await page.evaluate(() => {
        const form = document.getElementById('projects-search-page-form');
        if (!form) {
          // Fallback: find form containing #edit-project-name
          const input = document.getElementById('edit-project-name');
          if (input) {
            const parent = input.closest('form');
            if (parent) { parent.submit(); return 'fallback-submit'; }
          }
          return 'no-form';
        }

        // Try clicking submit button first (triggers JS handlers)
        const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return 'click';
        }

        // Fallback: form.submit()
        form.submit();
        return 'form-submit';
      });

      console.error(`[Portal A] Submit method: ${submitted}`);

      await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(5000); // Allow AJAX results to render
    }

    await page.waitForTimeout(2000);

    // Extract results from MahaRERA card layout
    // Verified 2026-04-10: results are rendered as <strong>PROJECT NAME</strong>
    // with adjacent <p class="darkBlue bold">Promoter Name</p> elements.
    // NOT as a table — the only <table> on the page is the jQuery UI datepicker.
    const results = await page.evaluate(() => {
      const data = [];

      // Strategy 1: Find all <strong> elements that look like project names
      // (all caps, contain actual project keywords, etc.)
      const strongEls = document.querySelectorAll('strong');
      const projectNameEls = Array.from(strongEls).filter(el => {
        const text = el.textContent?.trim() || '';
        // Project names on MahaRERA are typically ALL CAPS and 3+ chars
        return text.length >= 3 &&
               text === text.toUpperCase() &&
               !/^(SR|NO|#|&)/.test(text);
      });

      for (const nameEl of projectNameEls) {
        // Find the containing card — walk up until we find a container
        // with distinctive class or enough content
        let card = nameEl.parentElement;
        while (card && card.tagName !== 'BODY') {
          const classes = card.className || '';
          if (/project|row|card|result|item|box/i.test(classes)) break;
          if (card.parentElement && card.parentElement.tagName === 'BODY') break;
          card = card.parentElement;
        }
        if (!card) card = nameEl.parentElement;

        // Extract promoter — typically <p class="darkBlue bold"> near the name
        let promoterEl = null;
        const siblings = Array.from(card.querySelectorAll('p'));
        for (const p of siblings) {
          if (/darkBlue|bold/i.test(p.className) && p !== nameEl) {
            promoterEl = p;
            break;
          }
        }
        if (!promoterEl) {
          // Fallback: any <p> sibling after the strong element
          const nextP = nameEl.parentElement?.querySelector('p');
          if (nextP) promoterEl = nextP;
        }

        // Extract RERA ID — typically starts with P5 or has pattern Pxxxxxxxxxxx
        const cardText = card.textContent || '';
        const reraIdMatch = cardText.match(/P\d{11,15}/);

        // Extract district/location — look for "District:" label or location text
        const districtMatch = cardText.match(/district[:\s]+([a-zA-Z\s]+?)(?:pincode|taluka|\n|$)/i);
        const talukaMatch = cardText.match(/taluka[:\s]+([a-zA-Z\s]+?)(?:district|village|\n|$)/i);
        const pincodeMatch = cardText.match(/pincode[:\s]+(\d{6})/i);
        const completionMatch = cardText.match(/proposed[\s\w]*completion[\s\w]*[:\s]+([\d\/\-]+)/i);

        // Extract detail URL
        const link = card.querySelector('a[href*="project"], a[href*="certificate"]');

        const entry = {
          project_name: nameEl.textContent?.trim() || '',
          promoter_name: promoterEl?.textContent?.trim() || '',
          certificate_no: reraIdMatch?.[0] || '',
          district: districtMatch?.[1]?.trim() || '',
          taluka: talukaMatch?.[1]?.trim() || '',
          pincode: pincodeMatch?.[1] || '',
          proposed_completion: completionMatch?.[1]?.trim() || '',
          detail_url: link?.href || ''
        };

        // Dedupe by project name (MahaRERA may render the same project multiple times)
        if (!data.some(d => d.project_name === entry.project_name)) {
          data.push(entry);
        }
      }

      // Fallback to table parsing if card extraction failed (for legacy support)
      if (data.length === 0) {
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
          // Skip calendar tables
          if (/datepicker|calendar/i.test(table.className)) continue;

          const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
            .map(th => th.textContent.trim().toLowerCase());
          if (headers.length < 3) continue;

          const rows = table.querySelectorAll('tbody tr');
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length < 3) continue;

            const entry = { _from_table: true };
            cells.forEach((cell, i) => {
              const header = headers[i] || `col_${i}`;
              entry[header.replace(/[^a-z0-9_]/g, '_')] = cell.textContent.trim();
              const link = cell.querySelector('a');
              if (link) entry[`${header.replace(/[^a-z0-9_]/g, '_')}_url`] = link.href;
            });
            data.push(entry);
          }
        }
      }

      return data;
    });

    // Results are already normalized from card extraction — pass through
    const normalized = results;

    return {
      portal: 'A',
      source_url: PORTAL_A.projectSearch,
      results_count: normalized.length,
      results: normalized
    };

  } finally {
    await browser.close();
  }
}

// ─── Portal B: Project Search (ASP.NET — fallback) ─────────

async function searchProjectsPortalB(query, options = {}) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`[Portal B] Searching: "${query}"`);
    await page.goto(PORTAL_B.search, { waitUntil: 'networkidle', timeout: 30000 });

    // Portal B uses ASP.NET MVC — fill the search form
    const searchInput = await page.$('input[name*="search"], input[type="text"], #SearchString');
    if (searchInput) await searchInput.fill(query);

    const submitBtn = await page.$('input[type="submit"], button[type="submit"], .btn-primary');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Extract results
    const results = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, .table tbody tr');
      return Array.from(rows).map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) return null;
        const getText = i => cells[i]?.textContent?.trim() || '';
        return {
          certificate_no: getText(0),
          project_name: getText(1),
          promoter_name: getText(2),
          district: cells.length > 3 ? getText(3) : '',
          taluka: cells.length > 4 ? getText(4) : '',
          proposed_completion: cells.length > 5 ? getText(5) : '',
          detail_url: cells[0]?.querySelector('a')?.href || ''
        };
      }).filter(Boolean);
    });

    return {
      portal: 'B',
      source_url: PORTAL_B.search,
      results_count: results.length,
      results
    };

  } finally {
    await browser.close();
  }
}

// ─── Combined Search (A → B fallback) ──────────────────────

async function searchProjects(query, options = {}) {
  const cacheKey = `${query}-${options.district || 'all'}`;
  const cached = readCache('project-search', cacheKey);
  if (cached) return cached;

  let result;
  let queryVariantUsed = query;
  const queryVariants = buildNameVariants(query);
  if (queryVariants.length === 0) queryVariants.push(query);

  // Try Portal A first (simpler, Drupal)
  try {
    for (const queryVariant of queryVariants) {
      result = await searchProjectsPortalA(queryVariant, options);
      queryVariantUsed = queryVariant;
      if (result.results_count > 0) {
        console.error(`[Portal A] Found ${result.results_count} results for "${queryVariant}"`);
        break;
      }
    }

    if (!result || result.results_count === 0) {
      console.error(`[Portal A] No results, trying Portal B...`);
      for (const queryVariant of queryVariants) {
        result = await searchProjectsPortalB(queryVariant, options);
        queryVariantUsed = queryVariant;
        if (result.results_count > 0) {
          console.error(`[Portal B] Found ${result.results_count} results for "${queryVariant}"`);
          break;
        }
      }
    }
  } catch (err) {
    console.error(`[Portal A] Error: ${err.message}. Trying Portal B...`);
    try {
      for (const queryVariant of queryVariants) {
        result = await searchProjectsPortalB(queryVariant, options);
        queryVariantUsed = queryVariant;
        if (result.results_count > 0) break;
      }
    } catch (err2) {
      console.error(`[Portal B] Also failed: ${err2.message}`);
      result = { portal: 'none', error: `Portal A: ${err.message}; Portal B: ${err2.message}`, results: [] };
    }
  }

  const output = {
    query,
    district: options.district || null,
    source: 'MahaRERA',
    portal: result.portal,
    source_url: result.source_url || '',
    scraped_at: new Date().toISOString(),
    results_count: result.results?.length || 0,
    results: result.results || [],
    ...(queryVariantUsed !== query && { query_variant_used: queryVariantUsed }),
    ...(result.error && { error: result.error })
  };

  if (output.results_count > 0) writeCache('project-search', cacheKey, output);
  return output;
}

// ─── Promoter Search ────────────────────────────────────────

async function searchPromoters(name) {
  const cached = readCache('promoter-search', name);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`[Portal A] Searching promoters: "${name}"`);
    // Use domcontentloaded — the portal has slow network idle
    await page.goto(PORTAL_A.promoterSearch, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const promoterInputSelector = '#promoter-complaint-form input[name="promoter_complaint_name"], #maharerapromoter';
    const promoterSubmitSelector = '#promoter-complaint-form input[type="submit"][value="Search"], #promoter-complaint-form button[type="submit"]:has-text("Search")';

    const promoterInput = page.locator(promoterInputSelector).first();
    if ((await promoterInput.count()) === 0) {
      console.error(`[Portal A] Promoter complaint form input not found`);
      await saveDebugSnapshot(page, 'maharera-promoter-no-input');
      return {
        query: name,
        source: 'MahaRERA',
        source_url: PORTAL_A.promoterSearch,
        status: 'failed',
        error_code: 'SELECTOR_DRIFT',
        error: 'Promoter complaint form input not found',
        results_count: 0,
        results: []
      };
    }

    await promoterInput.fill(name);

    const submitButton = page.locator(promoterSubmitSelector).first();
    if ((await submitButton.count()) === 0) {
      console.error(`[Portal A] Promoter complaint form submit button not found`);
      await saveDebugSnapshot(page, 'maharera-promoter-no-submit');
      return {
        query: name,
        source: 'MahaRERA',
        source_url: PORTAL_A.promoterSearch,
        status: 'failed',
        error_code: 'SELECTOR_DRIFT',
        error: 'Promoter complaint form submit button not found',
        results_count: 0,
        results: []
      };
    }

    await submitButton.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await page.waitForSelector('table tbody tr, text=/Showing\\s+Final\\s+0\\s+Result|No\\s+records|No\\s+Record/i', { timeout: 15000 }).catch(() => {});

    if (/\/search\/node/i.test(page.url())) {
      await saveDebugSnapshot(page, 'maharera-promoter-wrong-form-submit');
      return {
        query: name,
        source: 'MahaRERA',
        source_url: page.url(),
        status: 'failed',
        error_code: 'SELECTOR_DRIFT',
        error: 'Promoter search submitted the site-wide search form instead of promoter complaint form',
        results_count: 0,
        results: []
      };
    }

    // Extract results — try multiple table patterns
    const results = await page.evaluate(() => {
      const promoterKeywords = ['promoter', 'name', 'complaint', 'view'];
      const tables = document.querySelectorAll('table');
      let data = [];

      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        // Check header row
        const headers = Array.from(rows[0].querySelectorAll('th, td'))
          .map(c => c.textContent?.trim().toLowerCase() || '');
        const isPromoterTable = headers.some(h =>
          promoterKeywords.some(kw => h.includes(kw))
        );
        if (!isPromoterTable && data.length === 0) continue;

        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length < 2) continue;
          const getText = j => cells[j]?.textContent?.trim() || '';
          const viewCell = cells.find(cell => cell.querySelector('a')) || cells.at(-1);
          data.push({
            promoter_name: getText(1) || getText(0),
            registration_no: '',
            district: '',
            complaints_count: cells.length > 2 ? getText(2) : '',
            projects_count: '',
            detail_url: viewCell?.querySelector('a')?.href || ''
          });
        }

        if (data.length > 0) break;
      }

      return data;
    });

    const output = {
      query: name,
      source: 'MahaRERA',
      source_url: PORTAL_A.promoterSearch,
      scraped_at: new Date().toISOString(),
      results_count: results.length,
      results
    };

    if (results.length > 0) {
      writeCache('promoter-search', name, output);
    } else {
      // Save debug snapshot for inspection
      await saveDebugSnapshot(page, 'maharera-promoter-zero-results');
      const structure = await logPageStructure(page);
      console.error(`[MahaRERA] Zero results. Structure:`, JSON.stringify(structure, null, 2));
      output.status = 'ok';
      output.error_code = 'EMPTY_RESULTS_AFTER_SEARCH';
    }

    return output;

  } catch (error) {
    console.error(`Promoter search error: ${error.message}`);
    return { query: name, source: 'MahaRERA', error: error.message, results: [] };
  } finally {
    await browser.close();
  }
}

// ─── Project Details (by RERA ID) ───────────────────────────

async function getProjectDetails(reraId) {
  const cached = readCache('project-details', reraId);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    // Try Portal A direct URL with certificate_no param
    const url = `${PORTAL_A.projectSearch}?certificate_no=${encodeURIComponent(reraId)}`;
    console.error(`[Portal A] Direct lookup: ${reraId}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click through to detail page if available
    const detailLink = await page.$('table tbody tr:first-child a, .views-row:first-child a');
    if (detailLink) {
      await detailLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Extract all key-value pairs from the detail page
    const details = await page.evaluate(() => {
      const data = {};

      // Method 1: Drupal field display
      document.querySelectorAll('.field, .field--item').forEach(field => {
        const label = field.querySelector('.field--label, .field__label');
        const value = field.querySelector('.field--item, .field__item');
        if (label && value) {
          const key = label.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
          data[key] = value.textContent.trim();
        }
      });

      // Method 2: Table rows with label-value pairs
      document.querySelectorAll('table tr, dl dt').forEach(el => {
        if (el.tagName === 'DT') {
          const dd = el.nextElementSibling;
          if (dd && dd.tagName === 'DD') {
            const key = el.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
            data[key] = dd.textContent.trim();
          }
        } else {
          const cells = el.querySelectorAll('td, th');
          if (cells.length === 2) {
            const key = cells[0].textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
            data[key] = cells[1].textContent.trim();
          }
        }
      });

      // Also grab the page title
      const title = document.querySelector('h1, .page-title, .node-title');
      if (title) data._page_title = title.textContent.trim();

      return data;
    });

    const output = {
      rera_id: reraId,
      source: 'MahaRERA',
      source_url: page.url(),
      scraped_at: new Date().toISOString(),
      details: {
        project_name: details.project_name || details.name_of_the_project || details._page_title || '',
        rera_id: details.certificate_no || details.registration_no || reraId,
        promoter_name: details.promoter_name || details.name_of_the_promoter || '',
        district: details.district || '',
        taluka: details.taluka || '',
        village: details.village || '',
        pincode: details.pincode || '',
        proposed_completion: details.proposed_date_of_completion || details.proposed_completion || '',
        registration_date: details.registration_date || details.date_of_registration || '',
        total_units: details.total_units || details.number_of_units || '',
        total_buildings: details.total_buildings || details.number_of_buildings || '',
        total_area: details.total_area || details.plot_area || '',
        project_type: details.project_type || details.type || '',
        project_status: details.status || details.project_status || details.certificate_status || '',
        last_modified: details.last_modified || details.modified_date || '',
        _all_fields: details
      }
    };

    writeCache('project-details', reraId, output);
    return output;

  } catch (error) {
    console.error(`Project details error: ${error.message}`);
    return { rera_id: reraId, source: 'MahaRERA', error: error.message, details: {} };
  } finally {
    await browser.close();
  }
}

// ─── Complaint Search ───────────────────────────────────────

async function searchComplaints(promoterName) {
  const cached = readCache('complaints', promoterName);
  if (cached) return cached;

  // First find all projects by this promoter
  const promoterResults = await searchProjects(promoterName, {});

  const output = {
    promoter: promoterName,
    source: 'MahaRERA',
    scraped_at: new Date().toISOString(),
    projects_found: promoterResults.results_count,
    note: 'Complaint details require visiting individual project pages on MahaRERA. ' +
          'This search returns project metadata. For complaints, use Playwright in ' +
          'Claude Code to navigate each project page and look for complaint sections.',
    projects: promoterResults.results
  };

  writeCache('complaints', promoterName, output);
  return output;
}

// ─── Main CLI ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps MahaRERA Scraper

Scrapes Portal A (maharera.maharashtra.gov.in, Drupal) with Portal B
(maharerait.mahaonline.gov.in, ASP.NET) as fallback.

Usage:
  node scripts/maharera-scraper.mjs search-project --name "Project Name" [--district "Pune"]
  node scripts/maharera-scraper.mjs search-promoter --name "Builder Name"
  node scripts/maharera-scraper.mjs project-details --rera-id "P52100012345"
  node scripts/maharera-scraper.mjs complaints --promoter "Godrej Properties"

Options:
  --name        Search query (project or promoter name)
  --rera-id     RERA registration/certificate number (starts with P)
  --district    Filter by district (optional)
  --promoter    Promoter/builder name for complaint search

Results are cached for ${CACHE_VALIDITY_DAYS} days in data/builder-cache/.
    `);
    process.exit(0);
  }

  let result;
  switch (command) {
    case 'search-project':
      result = await searchProjects(getArg('--name') || '', { district: getArg('--district') });
      break;
    case 'search-promoter':
      result = await searchPromoters(getArg('--name') || '');
      break;
    case 'project-details':
      result = await getProjectDetails(getArg('--rera-id') || '');
      break;
    case 'complaints':
      result = await searchComplaints(getArg('--promoter') || '');
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
