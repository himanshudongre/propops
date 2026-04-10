#!/usr/bin/env node

/**
 * PropOps Unified RERA Portal Scraper
 *
 * Scrapes the National Unified RERA Portal at https://www.rera.mohua.gov.in/
 * Launched September 2025 by Ministry of Housing and Urban Affairs.
 * Aggregates RERA data from 35 states/UTs:
 * - 151,113+ registered projects
 * - 106,545+ registered agents
 * - Project approvals, timelines, developer history
 * - Compliance records, complaint status
 *
 * This is the HIGHEST LEVERAGE scraper in PropOps because it collapses
 * 35 state-specific RERA scrapers into one. If this portal has the data
 * PropOps needs, we avoid building scrapers for 30+ state portals.
 *
 * Strategy:
 * 1. Try to find JSON API endpoint (inspect network tab)
 * 2. Fall back to HTML scraping via Playwright
 *
 * Usage:
 *   node scripts/scrapers/rera-national.mjs search --project "Godrej Infinity"
 *   node scripts/scrapers/rera-national.mjs search --promoter "Lodha Group"
 *   node scripts/scrapers/rera-national.mjs search --state "Maharashtra" --project "Emerald"
 *   node scripts/scrapers/rera-national.mjs stats
 *   node scripts/scrapers/rera-national.mjs explore   # Explore portal structure
 *
 * Output: JSON to stdout
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

const RERA_NATIONAL = {
  base: 'https://www.rera.mohua.gov.in',
  home: 'https://www.rera.mohua.gov.in/',

  // Discovered endpoints (research 2026-04-10)
  key_features: 'https://rera.mohua.gov.in/key-features-of-RERA.html',
  rera_act: 'https://rera.mohua.gov.in/real-estate-regulation-and-development-act-2016.html',
  tracker: 'https://rera.mohua.gov.in/tracker.html',
  implementation_status: 'https://mohua.gov.in/cms/implementation-status.php',
  state_rera_list: 'https://mohua.gov.in/cms/rera.php',

  // Weekly tracker PDF (updated regularly)
  tracker_pdf: 'https://mohua.gov.in/upload/uploadfiles/files/RERA-Status-Tracker-08-04-2024.pdf',

  // IMPORTANT FINDING: The portal is mostly static HTML pages.
  // It doesn't have a true search JSON API. It aggregates stats and
  // REDIRECTS users to individual state RERA portals for project-level searches.
  //
  // This means for actual project searches, you still need state-specific scrapers.
  // The MoHUA portal is best used for:
  // - National-level statistics (total projects, agents, states)
  // - Weekly tracker updates
  // - Implementation status by state
  // - Finding links to each state's RERA portal
};

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(type, key) {
  const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return resolve(CACHE_DIR, `rera-national-${type}-${slug}.json`);
}

function readCache(type, key) {
  const path = getCachePath(type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    console.error(`Cache hit: ${type}/${key} (${Math.round(age)}d old)`);
    return data;
  } catch { return null; }
}

function writeCache(type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const enriched = { ...data, _cached_at: new Date().toISOString() };
  writeFileSync(getCachePath(type, key), JSON.stringify(enriched, null, 2));
}

// ─── Explore Mode: Discover Portal Structure ───────────────

async function explorePortal() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const discoveries = {
    url: RERA_NATIONAL.home,
    scraped_at: new Date().toISOString(),
    network_requests: [],
    links_found: [],
    forms_found: [],
    api_endpoints: [],
    json_responses: []
  };

  // Capture all network requests to find JSON API endpoints
  page.on('request', req => {
    const url = req.url();
    const type = req.resourceType();
    if (type === 'xhr' || type === 'fetch' || url.includes('/api/') || url.includes('.json')) {
      discoveries.network_requests.push({
        url,
        method: req.method(),
        type,
        headers: req.headers()
      });
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    const contentType = resp.headers()['content-type'] || '';
    if (contentType.includes('json') || url.includes('/api/')) {
      try {
        const body = await resp.json().catch(() => null);
        if (body) {
          discoveries.api_endpoints.push({ url, status: resp.status() });
          discoveries.json_responses.push({
            url,
            sample: JSON.stringify(body).slice(0, 500)
          });
        }
      } catch { /* not JSON */ }
    }
  });

  try {
    console.error(`Navigating to ${RERA_NATIONAL.home}...`);
    await page.goto(RERA_NATIONAL.home, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Let dynamic content load

    // Extract links and forms
    const pageInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.textContent?.trim().slice(0, 60), href: a.href }))
        .filter(l => l.href && !l.href.includes('mailto:') && !l.href.includes('tel:'))
        .slice(0, 50);

      const forms = Array.from(document.querySelectorAll('form'))
        .map(f => ({
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, select'))
            .map(i => ({ name: i.name, type: i.type || i.tagName.toLowerCase() }))
        }));

      const title = document.title;
      const h1 = document.querySelector('h1')?.textContent?.trim();

      return { title, h1, links, forms };
    });

    discoveries.page_title = pageInfo.title;
    discoveries.page_h1 = pageInfo.h1;
    discoveries.links_found = pageInfo.links;
    discoveries.forms_found = pageInfo.forms;

    // Try to find search/project pages
    const searchLinks = pageInfo.links.filter(l =>
      /project|search|rera|registr/i.test(l.text || l.href)
    );
    discoveries.search_candidates = searchLinks;

    return discoveries;

  } catch (error) {
    discoveries.error = error.message;
    return discoveries;
  } finally {
    await browser.close();
  }
}

// ─── Search Projects ────────────────────────────────────────

async function searchProjects(options = {}) {
  const { project, promoter, state, district, rera_id } = options;
  const cacheKey = `${project || promoter || rera_id || 'all'}-${state || 'any'}`;
  const cached = readCache('project-search', cacheKey);
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const apiResponses = [];

  // Intercept JSON responses — the portal likely has a JSON backend
  page.on('response', async resp => {
    const url = resp.url();
    const contentType = resp.headers()['content-type'] || '';
    if (contentType.includes('json')) {
      try {
        const body = await resp.json().catch(() => null);
        if (body) apiResponses.push({ url, data: body });
      } catch { /* skip */ }
    }
  });

  try {
    console.error(`Searching national RERA portal for: project="${project || ''}", promoter="${promoter || ''}", state="${state || ''}"`);

    // Start at home page, then navigate to search
    await page.goto(RERA_NATIONAL.home, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Look for a search/projects link
    const searchLink = await page.$('a[href*="project"], a[href*="search"], button:has-text("Search")');
    if (searchLink) {
      await searchLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Try to fill search fields
    if (project) {
      const projectInput = await page.$('input[name*="project"], input[placeholder*="project" i], input[placeholder*="name" i]');
      if (projectInput) await projectInput.fill(project);
    }

    if (promoter) {
      const promoterInput = await page.$('input[name*="promoter"], input[name*="developer"], input[placeholder*="promoter" i]');
      if (promoterInput) await promoterInput.fill(promoter);
    }

    if (state) {
      const stateSelect = await page.$('select[name*="state"]');
      if (stateSelect) {
        try {
          await stateSelect.selectOption({ label: new RegExp(state, 'i') });
        } catch { /* state not found in dropdown */ }
      }
    }

    // Submit
    const submit = await page.$('button[type="submit"], input[type="submit"], button:has-text("Search")');
    if (submit) {
      await submit.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // Extract results from HTML or API response
    let results = [];

    // Check if we captured a JSON API response with results
    if (apiResponses.length > 0) {
      console.error(`Captured ${apiResponses.length} JSON API response(s)`);
      for (const { url, data } of apiResponses) {
        // Try to find results array in various common locations
        const candidates = [
          data?.projects,
          data?.data,
          data?.results,
          data?.data?.projects,
          Array.isArray(data) ? data : null
        ];
        for (const candidate of candidates) {
          if (Array.isArray(candidate) && candidate.length > 0) {
            results = candidate.map(item => ({
              project_name: item.projectName || item.project_name || item.name || '',
              promoter_name: item.promoterName || item.promoter_name || item.developer || '',
              rera_id: item.reraId || item.rera_id || item.registrationNumber || item.certificateNo || '',
              state: item.state || item.stateName || '',
              district: item.district || item.districtName || '',
              status: item.status || item.projectStatus || '',
              registration_date: item.registrationDate || item.regDate || '',
              proposed_completion: item.proposedCompletion || item.completionDate || '',
              _source_url: url
            }));
            break;
          }
        }
        if (results.length > 0) break;
      }
    }

    // Fall back to HTML scraping if no API data found
    if (results.length === 0) {
      results = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr, .project-row, .project-card, [class*="project"]');
        return Array.from(rows).map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;
          return {
            project_name: cells[0]?.textContent?.trim() || '',
            promoter_name: cells[1]?.textContent?.trim() || '',
            state: cells[2]?.textContent?.trim() || '',
            rera_id: cells[3]?.textContent?.trim() || '',
            status: cells[4]?.textContent?.trim() || '',
            _source: 'html_scrape'
          };
        }).filter(Boolean);
      });
    }

    const output = {
      query: { project, promoter, state, district, rera_id },
      source: 'MoHUA Unified RERA Portal',
      source_url: RERA_NATIONAL.home,
      scraped_at: new Date().toISOString(),
      results_count: results.length,
      results,
      debug: {
        api_responses_captured: apiResponses.length,
        final_url: page.url()
      }
    };

    if (results.length > 0) {
      writeCache('project-search', cacheKey, output);
    }

    return output;

  } catch (error) {
    console.error(`Search error: ${error.message}`);
    return {
      query: { project, promoter, state },
      source: 'MoHUA Unified RERA Portal',
      error: error.message,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Get Tracker Data (Weekly MoHUA Report) ───────────────

async function getTrackerData() {
  const cached = readCache('tracker', 'national');
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.error(`Fetching MoHUA RERA tracker...`);
    await page.goto(RERA_NATIONAL.tracker, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Extract all state-level statistics from the tracker page
    const trackerData = await page.evaluate(() => {
      const data = {
        states: {},
        totals: {},
        updated_date: ''
      };

      // Look for tables with state-wise data
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        const headers = Array.from(rows[0].querySelectorAll('th, td'))
          .map(c => c.textContent?.trim() || '');

        // Check if this is a state-wise table
        const hasState = headers.some(h => /state|ut|region/i.test(h));
        if (!hasState) continue;

        for (let i = 1; i < rows.length; i++) {
          const cells = Array.from(rows[i].querySelectorAll('td'));
          if (cells.length < 2) continue;

          const stateName = cells[0]?.textContent?.trim() || '';
          if (!stateName || stateName.length > 50) continue;

          const entry = {};
          cells.forEach((cell, idx) => {
            const header = headers[idx] || `col_${idx}`;
            entry[header] = cell.textContent?.trim() || '';
          });

          data.states[stateName] = entry;
        }
      }

      // Look for total counts in text
      const text = document.body.textContent || '';
      const totalProjects = text.match(/([\d,]+)\s*(?:registered\s*)?projects/i)?.[1];
      const totalAgents = text.match(/([\d,]+)\s*(?:registered\s*)?agents/i)?.[1];
      const totalComplaints = text.match(/([\d,]+)\s*complaints/i)?.[1];
      const updatedDate = text.match(/(updated|as of|last updated)[:\s]*([\w\s\d,]+)/i)?.[2];

      data.totals = {
        total_projects: totalProjects ? parseInt(totalProjects.replace(/,/g, '')) : null,
        total_agents: totalAgents ? parseInt(totalAgents.replace(/,/g, '')) : null,
        total_complaints: totalComplaints ? parseInt(totalComplaints.replace(/,/g, '')) : null
      };
      data.updated_date = updatedDate?.trim() || '';

      return data;
    });

    const output = {
      source: 'MoHUA Unified RERA Portal — Tracker',
      source_url: RERA_NATIONAL.tracker,
      scraped_at: new Date().toISOString(),
      ...trackerData,
      states_covered: Object.keys(trackerData.states).length
    };

    writeCache('tracker', 'national', output);
    return output;

  } catch (error) {
    return {
      source: 'MoHUA Unified RERA Portal — Tracker',
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// ─── Get State Portal Links ────────────────────────────────

async function getStatePortalLinks() {
  const cached = readCache('state-links', 'all');
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.error(`Fetching state RERA portal links...`);
    await page.goto(RERA_NATIONAL.state_rera_list, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks
        .map(a => ({
          text: a.textContent?.trim() || '',
          href: a.href
        }))
        .filter(l =>
          l.href &&
          (l.href.includes('rera') || /\b(state|ut|portal)\b/i.test(l.text)) &&
          !l.href.startsWith('mailto:') &&
          !l.href.startsWith('tel:')
        )
        .slice(0, 100);
    });

    const output = {
      source: 'MoHUA Implementation Status',
      source_url: RERA_NATIONAL.state_rera_list,
      scraped_at: new Date().toISOString(),
      count: links.length,
      state_portal_links: links
    };

    writeCache('state-links', 'all', output);
    return output;

  } catch (error) {
    return {
      source: 'MoHUA Implementation Status',
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// ─── Get National Stats ────────────────────────────────────

async function getStats() {
  const cached = readCache('stats', 'national');
  if (cached) return cached;

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(RERA_NATIONAL.home, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const stats = await page.evaluate(() => {
      const text = document.body.textContent || '';

      // Look for common stat patterns
      const totalProjects = text.match(/(\d[\d,]+)\s*(?:registered\s*)?projects?/i)?.[1];
      const totalAgents = text.match(/(\d[\d,]+)\s*(?:registered\s*)?agents?/i)?.[1];
      const totalStates = text.match(/(\d+)\s*states?\s*(?:\/|and)?\s*(?:UTs?)?/i)?.[1];
      const totalComplaints = text.match(/(\d[\d,]+)\s*complaints?/i)?.[1];

      return {
        total_projects: totalProjects ? parseInt(totalProjects.replace(/,/g, '')) : null,
        total_agents: totalAgents ? parseInt(totalAgents.replace(/,/g, '')) : null,
        total_states: totalStates ? parseInt(totalStates) : null,
        total_complaints: totalComplaints ? parseInt(totalComplaints.replace(/,/g, '')) : null,
        raw_title: document.title,
        raw_h1: document.querySelector('h1')?.textContent?.trim() || ''
      };
    });

    const output = {
      source: 'MoHUA Unified RERA Portal',
      source_url: RERA_NATIONAL.home,
      scraped_at: new Date().toISOString(),
      stats
    };

    writeCache('stats', 'national', output);
    return output;

  } catch (error) {
    return { source: 'MoHUA Unified RERA Portal', error: error.message };
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
PropOps Unified RERA Portal Scraper (MoHUA)

Scrapes https://www.rera.mohua.gov.in/ — the national unified RERA portal
launched September 2025. Covers 35 states/UTs, 151,113+ projects.

Usage:
  node scripts/scrapers/rera-national.mjs explore
    Discover the portal structure (network requests, links, forms, API endpoints)

  node scripts/scrapers/rera-national.mjs search --project "Project Name"
  node scripts/scrapers/rera-national.mjs search --promoter "Builder Name"
  node scripts/scrapers/rera-national.mjs search --state "Karnataka" --project "Emerald"
  node scripts/scrapers/rera-national.mjs search --rera-id "P52100012345"

  node scripts/scrapers/rera-national.mjs stats
    Get national-level statistics

  node scripts/scrapers/rera-national.mjs tracker
    Get weekly MoHUA RERA tracker data (state-wise projects, agents, complaints)

  node scripts/scrapers/rera-national.mjs state-links
    Get links to all individual state RERA portals from MoHUA implementation page

Options:
  --project      Project name to search
  --promoter     Promoter/builder name
  --state        State filter
  --district     District filter
  --rera-id      RERA registration ID

Results are cached for 30 days in data/builder-cache/.

NOTE: This is the HIGHEST-LEVERAGE scraper in PropOps. It replaces 35
state-specific RERA scrapers with one national portal.
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'explore':
      result = await explorePortal();
      break;

    case 'search':
      result = await searchProjects({
        project: getArg('--project'),
        promoter: getArg('--promoter'),
        state: getArg('--state'),
        district: getArg('--district'),
        rera_id: getArg('--rera-id')
      });
      break;

    case 'stats':
      result = await getStats();
      break;

    case 'tracker':
      result = await getTrackerData();
      break;

    case 'state-links':
      result = await getStatePortalLinks();
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
