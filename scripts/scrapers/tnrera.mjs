#!/usr/bin/env node

/**
 * PropOps TNRERA Scraper (Tamil Nadu RERA)
 *
 * Scrapes https://www.rera.tn.gov.in/ — the Tamil Nadu Real Estate
 * Regulatory Authority portal.
 *
 * This is the EASIEST RERA portal to scrape in India:
 * - Pure PHP, no CAPTCHA, no login
 * - Static annual pages organized by year:
 *   /cms/reg_projects_tamilnadu/Building/{year}.php
 * - Direct URL scraping works
 *
 * Coverage:
 * - Tamil Nadu + Andaman & Nicobar Islands
 * - 2017 onwards
 * - Annual project listings
 *
 * Usage:
 *   node scripts/scrapers/tnrera.mjs list --year 2024
 *   node scripts/scrapers/tnrera.mjs list --year 2024 --type Building
 *   node scripts/scrapers/tnrera.mjs search --name "Prestige"
 *   node scripts/scrapers/tnrera.mjs builder --name "Shriram Properties"
 *   node scripts/scrapers/tnrera.mjs years   # List available years
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const TNRERA = {
  base: 'https://www.rera.tn.gov.in',
  cms: 'https://www.rera.tn.gov.in/cms',
  home: 'https://rera.tn.gov.in/',

  // Annual listing URL pattern
  buildingProjectUrl: (year) => `https://www.rera.tn.gov.in/cms/reg_projects_tamilnadu/Building/${year}.php`,
  layoutProjectUrl: (year) => `https://www.rera.tn.gov.in/cms/reg_projects_tamilnadu/Layout/${year}.php`,

  // Default: latest 5 years
  defaultYears: [2021, 2022, 2023, 2024, 2025, 2026]
};

// ─── Cache Helpers ──────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `tnrera-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: tnrera/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── List Projects by Year ──────────────────────────────────

async function listProjectsByYear(year, type = 'Building') {
  const cacheKey = `${year}-${type}`;
  const cached = readCache('list', cacheKey);
  if (cached) return cached;

  const url = type === 'Layout' ? TNRERA.layoutProjectUrl(year) : TNRERA.buildingProjectUrl(year);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.error(`Fetching TNRERA ${type} projects for ${year}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check for 404 / empty page
    const title = await page.title();
    if (title.toLowerCase().includes('not found') || title.toLowerCase().includes('404')) {
      return {
        year,
        type,
        source: 'TNRERA',
        source_url: url,
        scraped_at: new Date().toISOString(),
        results_count: 0,
        results: [],
        note: 'Page not found — year may not have data yet'
      };
    }

    // Extract from HTML table (typical TNRERA format)
    const projects = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      let data = [];

      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        // Get headers
        const headerRow = rows[0];
        const headers = Array.from(headerRow.querySelectorAll('th, td'))
          .map(c => c.textContent?.trim().toLowerCase() || '');

        // Check if this looks like a project table
        const isProjectTable = headers.some(h =>
          h.includes('project') || h.includes('promoter') || h.includes('registration')
        );

        if (!isProjectTable) continue;

        // Extract rows
        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length < 3) continue;

          const entry = {};
          cells.forEach((cell, idx) => {
            const header = headers[idx] || `col_${idx}`;
            const key = header.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
            entry[key] = cell.textContent?.trim() || '';

            // Capture links for detail pages
            const link = cell.querySelector('a');
            if (link?.href) entry[`${key}_url`] = link.href;
          });

          data.push(entry);
        }

        if (data.length > 0) break; // Found the project table
      }

      return data;
    });

    // Normalize common field names
    const normalized = projects.map(p => ({
      sr_no: p.sr_no || p.sno || p.s_no || p.col_0 || '',
      project_name: p.project_name || p.name_of_the_project || p.project || p.col_1 || '',
      promoter_name: p.name_of_the_promoter || p.promoter_name || p.promoter || p.col_2 || '',
      registration_no: p.registration_no || p.registration_number || p.rera_no || p.col_3 || '',
      district: p.district || p.col_4 || '',
      status: p.status || p.project_status || '',
      detail_url: p.project_name_url || p.sr_no_url || '',
      _raw: p
    }));

    const output = {
      year,
      type,
      source: 'TNRERA',
      source_url: url,
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
      year,
      type,
      source: 'TNRERA',
      error: error.message,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Search Across Years ────────────────────────────────────

async function searchProjects(name, options = {}) {
  const years = options.years || TNRERA.defaultYears;
  const type = options.type || 'Building';

  console.error(`Searching TNRERA for "${name}" across years: ${years.join(', ')}`);

  const allResults = [];

  for (const year of years) {
    const yearResults = await listProjectsByYear(year, type);
    if (yearResults.results && yearResults.results.length > 0) {
      const matches = yearResults.results.filter(p => {
        const projectLower = (p.project_name || '').toLowerCase();
        const promoterLower = (p.promoter_name || '').toLowerCase();
        const searchLower = name.toLowerCase();
        return projectLower.includes(searchLower) || promoterLower.includes(searchLower);
      });

      matches.forEach(m => {
        m.registration_year = year;
        allResults.push(m);
      });
    }
  }

  return {
    query: name,
    source: 'TNRERA',
    years_searched: years,
    scraped_at: new Date().toISOString(),
    results_count: allResults.length,
    results: allResults
  };
}

// ─── Builder Project Lookup ─────────────────────────────────

async function getBuilderProjects(builderName, years = TNRERA.defaultYears) {
  const cached = readCache('builder', builderName);
  if (cached) return cached;

  const allProjects = [];

  for (const year of years) {
    const yearResults = await listProjectsByYear(year, 'Building');
    if (yearResults.results) {
      const builderProjects = yearResults.results.filter(p => {
        const promoter = (p.promoter_name || '').toLowerCase();
        return promoter.includes(builderName.toLowerCase());
      });

      builderProjects.forEach(p => {
        p.registration_year = year;
        allProjects.push(p);
      });
    }
  }

  const output = {
    builder: builderName,
    source: 'TNRERA',
    years_searched: years,
    scraped_at: new Date().toISOString(),
    total_projects: allProjects.length,
    projects: allProjects,
    summary: {
      by_district: {},
      by_year: {}
    }
  };

  // Group by district
  for (const p of allProjects) {
    const d = p.district || 'Unknown';
    output.summary.by_district[d] = (output.summary.by_district[d] || 0) + 1;

    const y = p.registration_year || 'Unknown';
    output.summary.by_year[y] = (output.summary.by_year[y] || 0) + 1;
  }

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
PropOps TNRERA Scraper

Scrapes https://www.rera.tn.gov.in/ — Tamil Nadu RERA.
EASIEST RERA portal in India (pure PHP, no CAPTCHA, static annual pages).

Usage:
  node scripts/scrapers/tnrera.mjs list --year 2024 [--type Building|Layout]
    List all projects registered in a specific year

  node scripts/scrapers/tnrera.mjs search --name "Prestige"
    Search for projects across default years (2021-2026)

  node scripts/scrapers/tnrera.mjs builder --name "Shriram Properties"
    Get all projects by a specific builder

  node scripts/scrapers/tnrera.mjs years
    List available years

Options:
  --name      Project or builder name
  --year      Registration year (2017+)
  --type      Building (default) or Layout
  --years     Comma-separated years for search (e.g., "2022,2023,2024")

Coverage: Tamil Nadu + Andaman & Nicobar, from 2017 onwards
Cache: 30 days in data/builder-cache/
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'list':
      result = await listProjectsByYear(
        parseInt(getArg('--year') || new Date().getFullYear()),
        getArg('--type') || 'Building'
      );
      break;

    case 'search': {
      const yearsArg = getArg('--years');
      const years = yearsArg ? yearsArg.split(',').map(y => parseInt(y.trim())) : TNRERA.defaultYears;
      result = await searchProjects(getArg('--name') || '', { years, type: getArg('--type') || 'Building' });
      break;
    }

    case 'builder':
      result = await getBuilderProjects(
        getArg('--name') || '',
        (getArg('--years') || TNRERA.defaultYears.join(',')).split(',').map(y => parseInt(y))
      );
      break;

    case 'years':
      result = {
        available_years: TNRERA.defaultYears,
        coverage_start: 2017,
        base_url: TNRERA.base,
        note: 'TNRERA covers 2017 onwards. Data organized by annual pages.'
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
