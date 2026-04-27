#!/usr/bin/env node

/**
 * PropOps UP-RERA Scraper
 *
 * Scrapes the Uttar Pradesh Real Estate Regulatory Authority portal.
 * Covers the Noida/Greater Noida/Ghaziabad markets — the biggest
 * NCR real estate segment.
 *
 * Portal: https://www.up-rera.in/
 * Legacy: https://uprera.azurewebsites.net/View_projects.aspx
 * Difficulty: LOW-MEDIUM
 *
 * Tech: ASP.NET WebForms on Azure
 * - Uses ViewState and EventValidation tokens
 * - No CAPTCHA on public project listings
 * - Pagination via postback events
 * - Filterable by district, project name, promoter
 *
 * Usage:
 *   node scripts/scrapers/uprera.mjs list --district "Noida"
 *   node scripts/scrapers/uprera.mjs list --district "Greater Noida"
 *   node scripts/scrapers/uprera.mjs search --project "Godrej"
 *   node scripts/scrapers/uprera.mjs builder --name "Lodha Group"
 *   node scripts/scrapers/uprera.mjs project --rera-id "UPRERAPRJ12345"
 *   node scripts/scrapers/uprera.mjs districts
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { textMatchesName } from './name-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const UPRERA = {
  base: 'https://www.up-rera.in',
  home: 'https://www.up-rera.in/',
  projects: 'https://uprera.azurewebsites.net/View_projects.aspx',
  legacy_projects: 'https://uprera.azurewebsites.net/View_projects.aspx',
  complaints: 'https://www.up-rera.in/complaints',

  // Key NCR districts
  ncr_districts: [
    'Gautam Budh Nagar',  // Noida + Greater Noida
    'Ghaziabad',
    'Meerut',
    'Bulandshahr',
    'Hapur'
  ],

  // Major UP districts with significant real estate
  major_districts: [
    'Gautam Budh Nagar',
    'Ghaziabad',
    'Lucknow',
    'Kanpur Nagar',
    'Agra',
    'Varanasi',
    'Allahabad',
    'Meerut',
    'Bareilly'
  ]
};

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `uprera-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: uprera/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── Browser Helper ────────────────────────────────────────

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// ─── List Projects ──────────────────────────────────────────

async function listProjects(options = {}) {
  const { district, maxPages = 5 } = options;
  const cacheKey = `list-${district || 'all'}`;
  const cached = readCache('list', cacheKey);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`Fetching UP-RERA projects${district ? ` in ${district}` : ''}...`);
    await page.goto(UPRERA.projects, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Apply district filter if specified
    if (district) {
      const districtSelectors = [
        'select[name*="district"]',
        'select[id*="district"]',
        '#ddlDistrict',
        'select[name*="ddl"]'
      ];

      for (const sel of districtSelectors) {
        const districtSel = await page.$(sel);
        if (districtSel) {
          try {
            await districtSel.selectOption({ label: new RegExp(district, 'i') });
            await page.waitForTimeout(2000);

            // Trigger search/filter
            const filterBtn = await page.$('button[type="submit"], input[type="submit"], #btnSearch, .btn-primary');
            if (filterBtn) {
              await filterBtn.click();
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(2000);
            }
            break;
          } catch {
            console.error(`District "${district}" filter not applied via ${sel}`);
          }
        }
      }
    }

    // Collect projects across pages
    const allProjects = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const projects = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        let data = [];

        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          if (rows.length < 2) continue;

          const headers = Array.from(rows[0].querySelectorAll('th, td'))
            .map(c => c.textContent?.trim().toLowerCase() || '');

          // Check if this is a project table
          const isProjectTable = headers.some(h =>
            h.includes('project') || h.includes('promoter') || h.includes('registration') || h.includes('rera')
          );

          if (!isProjectTable) continue;

          for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td'));
            if (cells.length < 3) continue;

            const entry = {};
            cells.forEach((cell, idx) => {
              const header = headers[idx] || `col_${idx}`;
              const key = header.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
              entry[key] = cell.textContent?.trim() || '';

              const link = cell.querySelector('a');
              if (link?.href) entry[`${key}_url`] = link.href;
            });

            data.push(entry);
          }

          if (data.length > 0) break;
        }

        return data;
      });

      if (projects.length === 0) break;
      allProjects.push(...projects);

      // Try to navigate to next page (ASP.NET postback pagination)
      if (pageNum < maxPages) {
        const nextBtn = await page.$('a:has-text("Next"), .pagination-next, a[onclick*="Page"], input[value*="Next"]');
        if (nextBtn) {
          try {
            await nextBtn.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
          } catch {
            break;
          }
        } else {
          break;
        }
      }
    }

    // Normalize field names
    const normalized = allProjects.map(p => ({
      rera_id: p.registration_number || p.rera_no || p.reg_no || p.col_0 || '',
      project_name: p.project_name || p.name_of_the_project || p.project || p.col_1 || '',
      promoter_name: p.promoter_name || p.name_of_the_promoter || p.promoter || p.col_2 || '',
      district: p.district || district || p.col_3 || '',
      status: p.status || p.project_status || '',
      registration_date: p.registration_date || p.date || '',
      proposed_completion: p.proposed_completion || p.completion || p.proposed_date || '',
      detail_url: p.registration_number_url || p.project_name_url || p.col_0_url || '',
      _raw: p
    }));

    const output = {
      source: 'UP-RERA',
      source_url: UPRERA.projects,
      district: district || 'all',
      scraped_at: new Date().toISOString(),
      results_count: normalized.length,
      results: normalized,
      note: district === 'Gautam Budh Nagar' ? 'Gautam Budh Nagar covers Noida and Greater Noida' : undefined
    };

    if (normalized.length > 0) {
      writeCache('list', cacheKey, output);
    }

    return output;

  } catch (error) {
    console.error(`Error: ${error.message}`);
    return {
      source: 'UP-RERA',
      error: error.message,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Promoter Registry Lookup ──────────────────────────────

async function listPromotersFromRegistry(name) {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`Fetching UP-RERA promoter registry for "${name}"...`);
    await page.goto(UPRERA.legacy_projects, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_ddl_prm option', { state: 'attached', timeout: 30000 });

    const matches = await page.$$eval('#ctl00_ContentPlaceHolder1_ddl_prm option', (options, searchName) => {
      const normalise = value => String(value || '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const needle = normalise(searchName);
      const firstToken = needle.split(' ')[0];

      return Array.from(options)
        .map(option => {
          const text = option.textContent?.replace(/\s+/g, ' ').trim() || '';
          const registration = text.match(/\((UPRERAPRM\d+)\)/i)?.[1] || '';
          const promoterName = text.replace(/\s*\(UPRERAPRM\d+\)\s*$/i, '').trim();
          return { promoter_name: promoterName, registration_no: registration };
        })
        .filter(row => {
          const promoter = normalise(row.promoter_name);
          return promoter.includes(needle) || (firstToken.length >= 3 && promoter.includes(firstToken));
        })
        .filter(row => row.promoter_name && row.registration_no);
    }, name);

    return {
      query: name,
      source: 'UP-RERA',
      source_url: UPRERA.legacy_projects,
      scraped_at: new Date().toISOString(),
      results_count: matches.length,
      results: matches.map(row => ({
        ...row,
        project_name: '',
        promoter_registry_match: true,
        status: 'promoter_registered',
        detail_url: UPRERA.legacy_projects
      }))
    };
  } catch (error) {
    console.error(`[UP-RERA] Promoter registry lookup failed: ${error.message}`);
    return {
      query: name,
      source: 'UP-RERA',
      source_url: UPRERA.legacy_projects,
      status: 'failed',
      error_code: 'SELECTOR_DRIFT',
      error: error.message,
      results_count: 0,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Search by Project Name ────────────────────────────────

async function searchProjects(name, options = {}) {
  const cached = readCache('project-search', name);
  if (cached) return cached;

  // Search strategy: first try NCR districts (biggest market), then other majors
  const districts = options.districts || UPRERA.ncr_districts;
  const allMatches = [];

  for (const district of districts) {
    const listing = await listProjects({ district, maxPages: 5 });
    if (listing.results) {
      const matches = listing.results.filter(p => {
        const projLower = p.project_name || '';
        const promoterLower = p.promoter_name || '';
        return textMatchesName(projLower, name) || textMatchesName(promoterLower, name);
      });
      allMatches.push(...matches);
    }
  }

  const output = {
    query: name,
    source: 'UP-RERA',
    districts_searched: districts,
    scraped_at: new Date().toISOString(),
    results_count: allMatches.length,
    results: allMatches
  };

  if (allMatches.length > 0) {
    writeCache('project-search', name, output);
  }

  return output;
}

// ─── Builder Projects ──────────────────────────────────────

async function getBuilderProjects(builderName) {
  const cached = readCache('builder', builderName);
  if (cached) return cached;

  const promoterRegistry = await listPromotersFromRegistry(builderName);
  const allProjects = promoterRegistry.results || [];

  const output = {
    builder: builderName,
    source: 'UP-RERA',
    source_url: promoterRegistry.source_url,
    districts_searched: UPRERA.ncr_districts,
    scraped_at: new Date().toISOString(),
    total_projects: allProjects.length,
    results_count: allProjects.length,
    projects: allProjects,
    results: allProjects,
    ...(promoterRegistry.error_code && { status: promoterRegistry.status, error_code: promoterRegistry.error_code, error: promoterRegistry.error }),
    note: 'UP-RERA project search is CAPTCHA-gated; this result is from the public promoter registry dropdown.',
    summary: {
      by_district: allProjects.reduce((acc, p) => {
        const d = p.district || 'Unknown';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {}),
      by_status: allProjects.reduce((acc, p) => {
        const s = p.status || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {})
    }
  };

  if (allProjects.length > 0) {
    writeCache('builder', builderName, output);
  }

  return output;
}

// ─── Project Details ──────────────────────────────────────

async function getProjectDetails(reraId) {
  const cached = readCache('project', reraId);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`Fetching UP-RERA project: ${reraId}`);

    // Try direct URL with registration number
    const searchUrl = `${UPRERA.projects}?reg_no=${encodeURIComponent(reraId)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // If not found, search the listing page
    const hasResults = await page.$('table tbody tr');
    if (!hasResults) {
      await page.goto(UPRERA.projects, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const searchInput = await page.$('input[name*="reg"], #txtRegNo, input[type="text"]');
      if (searchInput) {
        await searchInput.fill(reraId);
        const submit = await page.$('button[type="submit"], input[type="submit"]');
        if (submit) {
          await submit.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
        }
      }
    }

    // Click the first result to get details
    const firstLink = await page.$('table tbody tr:first-child a');
    if (firstLink) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Extract project details
    const details = await page.evaluate(() => {
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
      rera_id: reraId,
      source: 'UP-RERA',
      source_url: page.url(),
      scraped_at: new Date().toISOString(),
      details
    };

    writeCache('project', reraId, output);
    return output;

  } catch (error) {
    return {
      rera_id: reraId,
      source: 'UP-RERA',
      error: error.message,
      details: {}
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
PropOps UP-RERA Scraper (Uttar Pradesh)

Scrapes https://www.up-rera.in/ — Uttar Pradesh RERA.
Covers Noida, Greater Noida, Ghaziabad (biggest NCR market).

Usage:
  node scripts/scrapers/uprera.mjs list [--district "Gautam Budh Nagar"]
    List all projects (optionally filtered by district)
    Note: Gautam Budh Nagar = Noida + Greater Noida

  node scripts/scrapers/uprera.mjs search --project "Godrej"
    Search across NCR districts for projects matching name

  node scripts/scrapers/uprera.mjs builder --name "Lodha Group"
    Get all projects by a specific builder across NCR districts

  node scripts/scrapers/uprera.mjs project --rera-id "UPRERAPRJ12345"
    Get detailed info for a specific project

  node scripts/scrapers/uprera.mjs districts
    List NCR districts covered

Cache: 30 days in data/builder-cache/
Note: Noida alone has 69+ projects and 37,199+ units registered
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'list':
      result = await listProjects({ district: getArg('--district') });
      break;

    case 'search':
      result = await searchProjects(getArg('--project') || getArg('--name') || '');
      break;

    case 'builder':
      result = await getBuilderProjects(getArg('--name') || '');
      break;

    case 'project':
      result = await getProjectDetails(getArg('--rera-id') || '');
      break;

    case 'districts':
      result = {
        source: 'UP-RERA',
        ncr_districts: UPRERA.ncr_districts,
        major_districts: UPRERA.major_districts,
        note: 'Gautam Budh Nagar district covers both Noida and Greater Noida'
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
