#!/usr/bin/env node

/**
 * PropOps K-RERA Scraper (Karnataka RERA)
 *
 * Scrapes https://rera.karnataka.gov.in/ — the Karnataka Real Estate
 * Regulatory Authority portal. Covers the Bangalore real estate market.
 *
 * Difficulty: LOW
 * - Public HTML tables, no authentication
 * - No CAPTCHA on project listing pages
 * - NIC-style Java/JSP server-rendered
 *
 * Note: The Karnataka IGRS (Kaveri) portal is HIGH difficulty and covered
 * separately. K-RERA only has project/promoter data, not transaction prices.
 *
 * Usage:
 *   node scripts/scrapers/krera-karnataka.mjs list
 *   node scripts/scrapers/krera-karnataka.mjs list --district "Bangalore Urban"
 *   node scripts/scrapers/krera-karnataka.mjs search --project "Prestige"
 *   node scripts/scrapers/krera-karnataka.mjs builder --name "Prestige Group"
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { saveDebugSnapshot, logPageStructure } from './debug-helper.mjs';
import { textMatchesName } from './name-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const KRERA = {
  base: 'https://rera.karnataka.gov.in',
  home: 'https://rera.karnataka.gov.in/home?language=en',
  project_listing: 'https://rera.karnataka.gov.in/viewAllProjects?language=en'
};

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `krera-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: krera/${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── List All Projects ──────────────────────────────────────

async function listProjects(options = {}) {
  const { district, maxPages = 5, projectName, firmName, regNo } = options;
  const cacheKey = `list-${district || 'all'}-${projectName || firmName || regNo || ''}`;
  const cached = readCache('list', cacheKey);
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.error(`Fetching K-RERA projects${district ? ` in ${district}` : ''}${projectName ? ` matching "${projectName}"` : ''}...`);
    // Use domcontentloaded instead of networkidle — K-RERA is a large SPA
    // that keeps fetching for a long time. The data is embedded in the
    // initial HTML, so we don't need to wait for all network activity.
    await page.goto(KRERA.project_listing, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // K-RERA viewAllProjects page is actually a SEARCH FORM, not a listing.
    // You must submit the form (POST to /projectViewDetails) to get results.
    // Form fields (verified via debug snapshot 2026-04-10):
    //   #projectDist     - district select (32 options)
    //   #projectName     - project name text input (name="project")
    //   #firmName        - firm/promoter text input (name="firm")
    //   #regNo           - application number text input (name="appNo")
    //   #regNo2          - registration number text input (name="regNo")
    //   submit button    - name="btn1"

    // Fill district if specified
    if (district) {
      const districtSelect = await page.$('#projectDist, select[name="district"]');
      if (districtSelect) {
        try {
          await districtSelect.selectOption({ label: new RegExp(district, 'i') });
          await page.waitForTimeout(1500);
        } catch {
          console.error(`District filter "${district}" not applied`);
        }
      }
    }

    // Fill project name if specified
    if (projectName) {
      const projectInput = await page.$('#projectName, input[name="project"]');
      if (projectInput) await projectInput.fill(projectName);
    }

    // Fill firm name if specified
    if (firmName) {
      const firmInput = await page.$('#firmName, input[name="firm"]');
      if (firmInput) await firmInput.fill(firmName);
    }

    // Fill registration number if specified
    if (regNo) {
      const regInput = await page.$('#regNo2, input[name="regNo"]');
      if (regInput) await regInput.fill(regNo);
    }

    // Submit the form — K-RERA requires this to get any results
    const submitBtn = await page.$('input[type="submit"][name="btn1"], input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      try {
        await submitBtn.click({ timeout: 5000 });
      } catch (error) {
        console.error(`[K-RERA] Submit click blocked (${error.message}); using form submit() fallback.`);
        await page.evaluate(() => {
          const form = document.querySelector('form[name="registrationForm"], form');
          if (form) form.submit();
        });
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    } else {
      console.error(`[K-RERA] Submit button not found. Using form submit() fallback.`);
      await page.evaluate(() => {
        const form = document.querySelector('form[name="registrationForm"], form');
        if (form) form.submit();
      });
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    // Collect projects across pages
    const allProjects = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const projects = await page.evaluate(() => {
        // K-RERA CRITICAL FINDING (verified 2026-04-10):
        // Projects are NOT in HTML tables. They are embedded as JavaScript
        // array push() calls in inline <script> tags. Pattern:
        //   applicationNameList1.push('...');      // seems to be some ID
        //   applicationNameList2.push('PRM/KA/RERA/...');  // RERA registration number
        //   applicationNameList3.push('Project Name');       // project name
        //   applicationNameList4.push('Promoter Name');      // promoter
        //
        // We parse these out of the raw HTML using regex.

        const html = document.documentElement.outerHTML;

        // Extract all .push('...') calls per array index
        const extractArray = (arrayName) => {
          const pattern = new RegExp(`${arrayName}\\s*\\.push\\s*\\(\\s*['"]([^'"]*)['"]\\s*\\)`, 'g');
          const matches = [];
          let m;
          while ((m = pattern.exec(html)) !== null) {
            matches.push(m[1]);
          }
          return matches;
        };

        const list1 = extractArray('applicationNameList1');
        const list2 = extractArray('applicationNameList2');
        const list3 = extractArray('applicationNameList3');
        const list4 = extractArray('applicationNameList4');

        // Combine by index
        const maxLen = Math.max(list1.length, list2.length, list3.length, list4.length);
        const data = [];

        for (let i = 0; i < maxLen; i++) {
          const entry = {
            _field_1: list1[i] || '',
            rera_number: list2[i] || '',
            project_name: list3[i] || '',
            promoter_name: list4[i] || ''
          };

          // Only include entries that have at least a project name or RERA number
          if (entry.project_name || entry.rera_number) {
            data.push(entry);
          }
        }

        // Fallback: if JS array extraction failed, try traditional table parsing
        if (data.length === 0) {
          const tables = document.querySelectorAll('table');
          const projectKeywords = ['project', 'promoter', 'registration', 'rera', 'developer', 'builder'];

          for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            if (rows.length < 2) continue;

            const headers = Array.from(rows[0].querySelectorAll('th, td'))
              .map(c => c.textContent?.trim().toLowerCase() || '');

            const isProjectTable = headers.some(h =>
              projectKeywords.some(kw => h.includes(kw))
            );

            if (!isProjectTable) continue;

            for (let i = 1; i < rows.length; i++) {
              const cells = Array.from(rows[i].querySelectorAll('td'));
              if (cells.length < 3) continue;

              const entry = { _source: 'table' };
              cells.forEach((cell, idx) => {
                const header = headers[idx] || `col_${idx}`;
                const key = header.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
                entry[key] = cell.textContent?.trim() || '';
              });

              data.push(entry);
            }

            if (data.length > 0) break;
          }
        }

        return data;
      });

      if (projects.length === 0) {
        // Debug: save snapshot so we can see why
        if (pageNum === 1) {
          const structure = await logPageStructure(page);
          console.error(`[K-RERA] Zero projects on page ${pageNum}. Structure:`, JSON.stringify(structure, null, 2));
          await saveDebugSnapshot(page, 'krera-zero-results');
        }
        break;
      }
      allProjects.push(...projects);

      // Try to navigate to next page
      if (pageNum < maxPages) {
        const nextBtn = await page.$('a:has-text("Next"), .pagination-next, button:has-text("Next")');
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

    // Normalize (JS-array extraction gives us rera_number, project_name, promoter_name directly)
    const normalized = allProjects.map(p => ({
      project_name: p.project_name || p.name_of_the_project || p.name || '',
      promoter_name: p.promoter_name || p.name_of_the_promoter || p.promoter || '',
      rera_number: p.rera_number || p.registration_number || p.rera_no || p.application_number || '',
      district: district || p.district || '',
      taluk: p.taluk || '',
      status: p.status || p.project_status || '',
      registration_date: p.registration_date || p.date || '',
      detail_url: p.project_name_url || p.name_url || '',
      _raw: p
    }));

    const output = {
      source: 'K-RERA',
      source_url: KRERA.project_listing,
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
      source: 'K-RERA',
      error: error.message,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Search by Project Name ────────────────────────────────

async function searchProjects(name) {
  const cached = readCache('project-search', name);
  if (cached) return cached;

  // K-RERA always returns ALL projects in JS arrays — filter client-side
  const listing = await listProjects({ projectName: name, maxPages: 10 });

  const matches = (listing.results || []).filter(p => {
    const projLower = p.project_name || '';
    const promoterLower = p.promoter_name || '';
    return textMatchesName(projLower, name) || textMatchesName(promoterLower, name);
  });

  const output = {
    query: name,
    source: 'K-RERA',
    scraped_at: new Date().toISOString(),
    total_projects_on_portal: (listing.results || []).length,
    results_count: matches.length,
    results: matches
  };

  if (output.results_count > 0) {
    writeCache('project-search', name, output);
  }

  return output;
}

// ─── Builder Projects ──────────────────────────────────────

async function getBuilderProjects(builderName) {
  const cached = readCache('builder', builderName);
  if (cached) return cached;

  // K-RERA returns all projects; filter client-side by promoter name
  const listing = await listProjects({ firmName: builderName, maxPages: 10 });

  const builderProjects = (listing.results || []).filter(p => {
    const promoter = p.promoter_name || '';
    return textMatchesName(promoter, builderName);
  });

  const output = {
    builder: builderName,
    source: 'K-RERA',
    scraped_at: new Date().toISOString(),
    total_projects: builderProjects.length,
    projects: builderProjects,
    summary: {
      by_district: builderProjects.reduce((acc, p) => {
        const d = p.district || 'Unknown';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {}),
      by_status: builderProjects.reduce((acc, p) => {
        const s = p.status || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {})
    }
  };

  if (builderProjects.length > 0) {
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
PropOps K-RERA Scraper (Karnataka)

Scrapes https://rera.karnataka.gov.in/ — Karnataka RERA.
LOW difficulty: public HTML tables, no auth, no CAPTCHA.

Usage:
  node scripts/scrapers/krera-karnataka.mjs list [--district "Bangalore Urban"]
    List all projects (optionally filtered by district)

  node scripts/scrapers/krera-karnataka.mjs search --project "Prestige"
    Search for projects by name

  node scripts/scrapers/krera-karnataka.mjs builder --name "Prestige Group"
    Get all projects by a specific builder

Options:
  --district   Filter by district (Bangalore Urban, Bangalore Rural, etc.)
  --project    Project name to search
  --name       Builder name

Coverage: Karnataka statewide, from 2017 onwards (K-RERA established post-RERA Act)
Note: For actual registration prices, use Karnataka Kaveri portal (HIGH difficulty).
Cache: 30 days in data/builder-cache/
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
