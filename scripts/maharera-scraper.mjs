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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

// Portal A (Drupal — primary, simpler)
const PORTAL_A = {
  base: 'https://maharera.maharashtra.gov.in',
  projectSearch: 'https://maharera.maharashtra.gov.in/projects-search-result',
  promoterSearch: 'https://maharera.maharashtra.gov.in/promoters-search-result',
  mapSearch: 'https://maharera.maharashtra.gov.in/map-projects-search-result',
  statistics: 'https://maharera.maharashtra.gov.in/statistics'
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

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // If not direct lookup, fill the search form
    if (!query.startsWith('P') || !/^P\d+/.test(query)) {
      // Try various input selectors (Drupal Views forms vary)
      const selectors = [
        'input[name*="project_name"]',
        'input[name*="field_project_name"]',
        '#edit-field-project-name-value',
        'input[type="text"]'
      ];

      for (const sel of selectors) {
        const input = await page.$(sel);
        if (input) {
          await input.fill(query);
          break;
        }
      }

      // Set district filter if provided
      if (options.district) {
        const districtSelectors = [
          'select[name*="district"]',
          '#edit-field-district-target-id',
          'select[name*="field_district"]'
        ];
        for (const sel of districtSelectors) {
          const select = await page.$(sel);
          if (select) {
            try {
              await select.selectOption({ label: new RegExp(options.district, 'i') });
            } catch {
              // Try by value if label fails
              const optionTexts = await page.$$eval(`${sel} option`, opts =>
                opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
              );
              const match = optionTexts.find(o =>
                o.text.toLowerCase().includes(options.district.toLowerCase())
              );
              if (match) await select.selectOption(match.value);
            }
            break;
          }
        }
      }

      // Submit the form
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        '#edit-submit-projects-search',
        '.form-submit'
      ];
      for (const sel of submitSelectors) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      }
    }

    await page.waitForTimeout(2000);

    // Extract results from table
    const results = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const data = [];

      for (const table of tables) {
        const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
          .map(th => th.textContent.trim().toLowerCase());

        if (headers.length < 3) continue;

        const rows = table.querySelectorAll('tbody tr');
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) continue;

          const entry = {};
          cells.forEach((cell, i) => {
            const header = headers[i] || `col_${i}`;
            entry[header.replace(/[^a-z0-9_]/g, '_')] = cell.textContent.trim();

            // Capture links
            const link = cell.querySelector('a');
            if (link) entry[`${header.replace(/[^a-z0-9_]/g, '_')}_url`] = link.href;
          });

          data.push(entry);
        }
      }

      // If no table found, try Drupal Views rows
      if (data.length === 0) {
        const viewRows = document.querySelectorAll('.views-row, .view-content > div');
        for (const row of viewRows) {
          const fields = {};
          row.querySelectorAll('.views-field, .field').forEach(field => {
            const label = field.querySelector('.views-label, .field--label')?.textContent?.trim() || '';
            const value = field.querySelector('.field-content, .field--item')?.textContent?.trim()
              || field.textContent.replace(label, '').trim();
            if (label) fields[label.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = value;
          });
          if (Object.keys(fields).length > 0) data.push(fields);
        }
      }

      return data;
    });

    // Normalize field names across different table formats
    const normalized = results.map(r => ({
      certificate_no: r.certificate_no_ || r.certificate_no || r.registration_no || r.col_0 || '',
      project_name: r.project_name || r.name_of_the_project || r.col_1 || '',
      promoter_name: r.promoter_name || r.name_of_the_promoter || r.col_2 || '',
      district: r.district || r.col_3 || '',
      taluka: r.taluka || r.col_4 || '',
      division: r.division || r.col_5 || '',
      pincode: r.pincode || '',
      proposed_completion: r.proposed_date_of_completion || r.completion_date || r.col_6 || '',
      certificate_status: r.certificate_status || r.status || '',
      last_modified: r.last_modified || r.last_modified_date || '',
      detail_url: r.certificate_no__url || r.project_name_url || ''
    }));

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

  // Try Portal A first (simpler, Drupal)
  try {
    result = await searchProjectsPortalA(query, options);
    if (result.results_count > 0) {
      console.error(`[Portal A] Found ${result.results_count} results`);
    } else {
      console.error(`[Portal A] No results, trying Portal B...`);
      result = await searchProjectsPortalB(query, options);
    }
  } catch (err) {
    console.error(`[Portal A] Error: ${err.message}. Trying Portal B...`);
    try {
      result = await searchProjectsPortalB(query, options);
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
    await page.goto(PORTAL_A.promoterSearch, { waitUntil: 'networkidle', timeout: 30000 });

    // Fill promoter name
    const selectors = [
      'input[name*="promoter"]',
      '#edit-field-promoter-name-value',
      'input[type="text"]'
    ];
    for (const sel of selectors) {
      const input = await page.$(sel);
      if (input) { await input.fill(name); break; }
    }

    // Submit
    const submitSelectors = ['input[type="submit"]', 'button[type="submit"]', '.form-submit'];
    for (const sel of submitSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        await page.waitForLoadState('networkidle');
        break;
      }
    }
    await page.waitForTimeout(2000);

    // Extract results
    const results = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return Array.from(rows).map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) return null;
        const getText = i => cells[i]?.textContent?.trim() || '';
        return {
          promoter_name: getText(0),
          registration_no: getText(1),
          district: cells.length > 2 ? getText(2) : '',
          projects_count: cells.length > 3 ? getText(3) : '',
          detail_url: cells[0]?.querySelector('a')?.href || ''
        };
      }).filter(Boolean);
    });

    const output = {
      query: name,
      source: 'MahaRERA',
      source_url: PORTAL_A.promoterSearch,
      scraped_at: new Date().toISOString(),
      results_count: results.length,
      results
    };

    if (results.length > 0) writeCache('promoter-search', name, output);
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
