#!/usr/bin/env node

/**
 * PropOps MahaRERA Scraper
 *
 * Scrapes the Maharashtra Real Estate Regulatory Authority portal
 * for project details, builder information, and complaint data.
 *
 * Data sources:
 * - Project search: https://maharera.maharashtra.gov.in/projects-search-result
 * - Promoter search: https://maharera.maharashtra.gov.in/promoters-search-result
 *
 * Usage:
 *   node scripts/maharera-scraper.mjs search-project --name "Godrej Infinity"
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

const MAHARERA_BASE = 'https://maharera.maharashtra.gov.in';
const MAHARERA_PROJECT_SEARCH = `${MAHARERA_BASE}/projects-search-result`;
const MAHARERA_PROMOTER_SEARCH = `${MAHARERA_BASE}/promoters-search-result`;

// ─── Cache Helpers ──────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;

  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);

  if (age > CACHE_VALIDITY_DAYS) {
    console.error(`Cache expired for ${type}/${key} (${Math.round(age)} days old)`);
    return null;
  }

  console.error(`Cache hit for ${type}/${key} (${Math.round(age)} days old)`);
  return data;
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString(), _cache_key: key };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── Browser Helpers ────────────────────────────────────────

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

async function waitAndRetry(page, selector, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      return true;
    } catch {
      console.error(`Retry ${i + 1}/${maxRetries} waiting for ${selector}`);
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
  }
  return false;
}

// ─── Project Search ─────────────────────────────────────────

async function searchProjects(query, options = {}) {
  const cached = readCache('project-search', query);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`Navigating to MahaRERA project search...`);
    await page.goto(MAHARERA_PROJECT_SEARCH, { waitUntil: 'networkidle', timeout: 30000 });

    // Look for search input and enter query
    const searchInput = await page.$('input[type="text"], input[name*="search"], input[name*="project"], #edit-field-project-name-value');
    if (searchInput) {
      await searchInput.fill(query);
    }

    // If district filter available
    if (options.district) {
      const districtSelect = await page.$('select[name*="district"], #edit-field-district-target-id');
      if (districtSelect) {
        await districtSelect.selectOption({ label: options.district });
      }
    }

    // Submit search
    const submitBtn = await page.$('input[type="submit"], button[type="submit"], .form-submit');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // Wait for results
    await page.waitForTimeout(3000);

    // Extract results from table
    const results = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, .views-table tbody tr, .view-content .views-row');
      const data = [];

      rows.forEach(row => {
        const cells = row.querySelectorAll('td, .views-field');
        if (cells.length >= 4) {
          const getText = (idx) => cells[idx]?.textContent?.trim() || '';
          data.push({
            certificate_no: getText(0),
            project_name: getText(1),
            promoter_name: getText(2),
            district: getText(3),
            taluka: cells.length > 4 ? getText(4) : '',
            completion_date: cells.length > 5 ? getText(5) : '',
            project_url: cells[0]?.querySelector('a')?.href || ''
          });
        }
      });

      return data;
    });

    const output = {
      query,
      source: 'MahaRERA',
      source_url: MAHARERA_PROJECT_SEARCH,
      scraped_at: new Date().toISOString(),
      results_count: results.length,
      results
    };

    writeCache('project-search', query, output);
    return output;

  } catch (error) {
    console.error(`Error searching MahaRERA projects: ${error.message}`);
    return { query, source: 'MahaRERA', error: error.message, results: [] };
  } finally {
    await browser.close();
  }
}

// ─── Promoter Search ────────────────────────────────────────

async function searchPromoters(name, options = {}) {
  const cached = readCache('promoter-search', name);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    console.error(`Navigating to MahaRERA promoter search...`);
    await page.goto(MAHARERA_PROMOTER_SEARCH, { waitUntil: 'networkidle', timeout: 30000 });

    // Look for promoter name input
    const nameInput = await page.$('input[type="text"], input[name*="promoter"], input[name*="search"], #edit-field-promoter-name-value');
    if (nameInput) {
      await nameInput.fill(name);
    }

    // Submit search
    const submitBtn = await page.$('input[type="submit"], button[type="submit"], .form-submit');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    await page.waitForTimeout(3000);

    // Extract promoter results
    const results = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr, .views-table tbody tr, .view-content .views-row');
      const data = [];

      rows.forEach(row => {
        const cells = row.querySelectorAll('td, .views-field');
        if (cells.length >= 2) {
          const getText = (idx) => cells[idx]?.textContent?.trim() || '';
          data.push({
            promoter_name: getText(0),
            registration_no: getText(1),
            district: cells.length > 2 ? getText(2) : '',
            projects_count: cells.length > 3 ? getText(3) : '',
            promoter_url: cells[0]?.querySelector('a')?.href || ''
          });
        }
      });

      return data;
    });

    const output = {
      query: name,
      source: 'MahaRERA',
      source_url: MAHARERA_PROMOTER_SEARCH,
      scraped_at: new Date().toISOString(),
      results_count: results.length,
      results
    };

    writeCache('promoter-search', name, output);
    return output;

  } catch (error) {
    console.error(`Error searching MahaRERA promoters: ${error.message}`);
    return { query: name, source: 'MahaRERA', error: error.message, results: [] };
  } finally {
    await browser.close();
  }
}

// ─── Project Details ────────────────────────────────────────

async function getProjectDetails(reraId) {
  const cached = readCache('project-details', reraId);
  if (cached) return cached;

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    // Search by RERA ID
    console.error(`Looking up RERA project: ${reraId}`);
    await page.goto(MAHARERA_PROJECT_SEARCH, { waitUntil: 'networkidle', timeout: 30000 });

    const searchInput = await page.$('input[type="text"]');
    if (searchInput) {
      await searchInput.fill(reraId);
    }

    const submitBtn = await page.$('input[type="submit"], button[type="submit"], .form-submit');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
    }

    await page.waitForTimeout(3000);

    // Click on the first result to get details
    const firstLink = await page.$('table tbody tr:first-child a, .views-row:first-child a');
    if (firstLink) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Extract project details from detail page
    const details = await page.evaluate(() => {
      const getData = (label) => {
        const allElements = document.querySelectorAll('.field, .field--label, tr, dt, dd, .views-field');
        for (const el of allElements) {
          if (el.textContent?.includes(label)) {
            const value = el.nextElementSibling?.textContent?.trim()
              || el.querySelector('.field--item, dd, td:last-child')?.textContent?.trim()
              || '';
            if (value && value !== label) return value;
          }
        }
        return '';
      };

      return {
        project_name: getData('Project Name') || getData('Name of the Project') || document.querySelector('h1, .page-title')?.textContent?.trim(),
        rera_id: getData('Certificate No') || getData('Registration No') || getData('RERA ID'),
        promoter_name: getData('Promoter Name') || getData('Name of the Promoter'),
        district: getData('District'),
        taluka: getData('Taluka'),
        village: getData('Village'),
        pincode: getData('Pincode'),
        proposed_completion: getData('Proposed Date of Completion') || getData('Proposed Completion'),
        registration_date: getData('Registration Date') || getData('Date of Registration'),
        total_units: getData('Total Units') || getData('Number of Units'),
        total_buildings: getData('Total Buildings') || getData('Number of Buildings'),
        total_area: getData('Total Area') || getData('Plot Area'),
        project_type: getData('Project Type') || getData('Type'),
        project_status: getData('Status') || getData('Project Status'),
        last_modified: getData('Last Modified') || getData('Modified Date')
      };
    });

    const output = {
      rera_id: reraId,
      source: 'MahaRERA',
      source_url: page.url(),
      scraped_at: new Date().toISOString(),
      details
    };

    writeCache('project-details', reraId, output);
    return output;

  } catch (error) {
    console.error(`Error fetching project details: ${error.message}`);
    return { rera_id: reraId, source: 'MahaRERA', error: error.message, details: {} };
  } finally {
    await browser.close();
  }
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
PropOps MahaRERA Scraper

Usage:
  node scripts/maharera-scraper.mjs search-project --name "Project Name" [--district "Pune"]
  node scripts/maharera-scraper.mjs search-promoter --name "Builder Name"
  node scripts/maharera-scraper.mjs project-details --rera-id "P52100012345"

Options:
  --name        Search query (project or promoter name)
  --rera-id     RERA registration/certificate number
  --district    Filter by district (optional)
  --json        Output raw JSON (default: formatted)
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
