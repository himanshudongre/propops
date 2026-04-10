#!/usr/bin/env node

/**
 * PropOps TG-RERA Scraper (Telangana RERA)
 *
 * Scrapes the Telangana Real Estate Regulatory Authority portal.
 * Covers the Hyderabad real estate market — one of India's fastest
 * growing Tier-1 cities.
 *
 * Portals:
 * - Home: https://rera.telangana.gov.in/
 * - Search: https://rerait.telangana.gov.in/SearchList/Search
 *
 * Difficulty: LOW-MEDIUM
 * Tech: ASP.NET MVC (rerait subdomain)
 * - No CAPTCHA on search (only on login)
 * - Public project search works
 * - Pagination via query parameters
 *
 * Usage:
 *   node scripts/scrapers/tsrera.mjs list --district "Hyderabad"
 *   node scripts/scrapers/tsrera.mjs search --project "Prestige"
 *   node scripts/scrapers/tsrera.mjs builder --name "My Home Constructions"
 *   node scripts/scrapers/tsrera.mjs districts
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const TSRERA = {
  base: 'https://rera.telangana.gov.in',
  home: 'https://rera.telangana.gov.in/',
  search: 'https://rerait.telangana.gov.in/SearchList/Search',
  search_alt: 'https://rera.telangana.gov.in/ProjectDetails',

  // Major Telangana districts
  hyderabad_districts: [
    'Hyderabad',
    'Rangareddy',
    'Medchal-Malkajgiri',
    'Sangareddy',
    'Vikarabad',
    'Medak'
  ],

  major_districts: [
    'Hyderabad',
    'Rangareddy',
    'Medchal-Malkajgiri',
    'Sangareddy',
    'Warangal Urban',
    'Karimnagar',
    'Nizamabad',
    'Khammam'
  ]
};

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `tsrera-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: tsrera/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── Browser ───────────────────────────────────────────────

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// ─── List Projects ─────────────────────────────────────────

async function listProjects(options = {}) {
  const { district, maxPages = 5 } = options;
  const cacheKey = `list-${district || 'all'}`;
  const cached = readCache('list', cacheKey);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`Fetching TG-RERA projects${district ? ` in ${district}` : ''}...`);

    // Try primary search URL
    await page.goto(TSRERA.search, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // If redirected to login, try alternate URL
    if (page.url().toLowerCase().includes('login')) {
      console.error('Primary URL requires login, trying alternate...');
      await page.goto(TSRERA.search_alt, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    // Apply district filter if specified
    if (district) {
      const districtSelectors = [
        'select[name*="District"]',
        'select[name*="district"]',
        '#ddlDistrict',
        'select[id*="district"]'
      ];

      for (const sel of districtSelectors) {
        const districtSel = await page.$(sel);
        if (districtSel) {
          try {
            await districtSel.selectOption({ label: new RegExp(district, 'i') });
            await page.waitForTimeout(2000);

            const filterBtn = await page.$('button[type="submit"], input[type="submit"], .btn-primary, #btnSearch');
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

      // Try next page (ASP.NET pagination)
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

    // Normalize fields
    const normalized = allProjects.map(p => ({
      rera_id: p.registration_number || p.rera_no || p.reg_no || p.col_0 || '',
      project_name: p.project_name || p.name_of_the_project || p.project || p.col_1 || '',
      promoter_name: p.promoter_name || p.name_of_the_promoter || p.promoter || p.col_2 || '',
      district: p.district || district || p.col_3 || '',
      mandal: p.mandal || '',
      status: p.status || p.project_status || '',
      registration_date: p.registration_date || p.date || '',
      proposed_completion: p.proposed_completion || p.completion || '',
      detail_url: p.registration_number_url || p.project_name_url || '',
      _raw: p
    }));

    const output = {
      source: 'TG-RERA',
      source_url: TSRERA.search,
      district: district || 'all',
      scraped_at: new Date().toISOString(),
      results_count: normalized.length,
      results: normalized
    };

    if (normalized.length > 0) {
      writeCache('list', cacheKey, output);
    }

    return output;

  } catch (error) {
    console.error(`Error: ${error.message}`);
    return {
      source: 'TG-RERA',
      error: error.message,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Search by Project ─────────────────────────────────────

async function searchProjects(name) {
  const cached = readCache('project-search', name);
  if (cached) return cached;

  // Search Hyderabad metro districts (where most activity is)
  const allMatches = [];

  for (const district of TSRERA.hyderabad_districts) {
    const listing = await listProjects({ district, maxPages: 5 });
    if (listing.results) {
      const matches = listing.results.filter(p => {
        const projLower = (p.project_name || '').toLowerCase();
        const promoterLower = (p.promoter_name || '').toLowerCase();
        const nameLower = name.toLowerCase();
        return projLower.includes(nameLower) || promoterLower.includes(nameLower);
      });
      allMatches.push(...matches);
    }
  }

  const output = {
    query: name,
    source: 'TG-RERA',
    districts_searched: TSRERA.hyderabad_districts,
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

  const allProjects = [];

  for (const district of TSRERA.hyderabad_districts) {
    const listing = await listProjects({ district, maxPages: 10 });
    if (listing.results) {
      const builderProjects = listing.results.filter(p => {
        const promoter = (p.promoter_name || '').toLowerCase();
        return promoter.includes(builderName.toLowerCase());
      });
      allProjects.push(...builderProjects);
    }
  }

  const output = {
    builder: builderName,
    source: 'TG-RERA',
    districts_searched: TSRERA.hyderabad_districts,
    scraped_at: new Date().toISOString(),
    total_projects: allProjects.length,
    projects: allProjects,
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

// ─── CLI ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps TG-RERA Scraper (Telangana)

Scrapes https://rera.telangana.gov.in/ — Telangana RERA.
Covers Hyderabad metro (Hyderabad, Rangareddy, Medchal-Malkajgiri,
Sangareddy, Vikarabad, Medak districts).

Usage:
  node scripts/scrapers/tsrera.mjs list [--district "Hyderabad"]
    List all projects (optionally filtered by district)

  node scripts/scrapers/tsrera.mjs search --project "Prestige"
    Search across Hyderabad metro districts

  node scripts/scrapers/tsrera.mjs builder --name "My Home Constructions"
    Get all projects by a specific builder

  node scripts/scrapers/tsrera.mjs districts
    List Telangana districts covered

Cache: 30 days in data/builder-cache/
Difficulty: LOW-MEDIUM (ASP.NET MVC, public search, no CAPTCHA)
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

    case 'districts':
      result = {
        source: 'TG-RERA',
        hyderabad_metro: TSRERA.hyderabad_districts,
        major_districts: TSRERA.major_districts
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
