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

  // Confirmed static pages (via Google index)
  key_features: 'https://rera.mohua.gov.in/key-features-of-RERA.html',
  rera_act: 'https://rera.mohua.gov.in/real-estate-regulation-and-development-act-2016.html',
  tracker: 'https://rera.mohua.gov.in/tracker.html',
  state_uts_list: 'https://rera.mohua.gov.in/real-estate-regulatory-authorities-of-states-uts.html', // Official list of all 35 state portals
  central_advisory_council: 'https://rera.mohua.gov.in/central-advisory-council.html',

  // MoHUA CMS pages
  mohua_rera_page: 'https://mohua.gov.in/cms/rera.php',
  implementation_status: 'https://mohua.gov.in/cms/implementation-status.php',
  tracker_pdf: 'https://mohua.gov.in/upload/uploadfiles/files/RERA-Status-Tracker-08-04-2024.pdf',
  faqs_pdf: 'https://mohua.gov.in/upload/uploadfiles/files/FAQs-on-RERA(1).pdf',
  pib_launch: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163844',

  // Potential OGD India (data.gov.in) dataset — NEEDS VERIFICATION
  // If this is a live RERA dataset, it's the highest-value endpoint.
  // data.gov.in typically requires API key registration (free).
  ogd_dataset: 'https://www.data.gov.in/apis/81242853-a9f9-44f4-a100-ea817d9c9ebe',

  // Main portal tabs (confirmed from news coverage, but exact URLs need live inspection)
  // The portal has 4 main tabs: Projects, Developers, Complaints, Orders
  // Each has a state dropdown + free-text search
  tabs: {
    projects: 'https://www.rera.mohua.gov.in/projects',     // hypothesized
    developers: 'https://www.rera.mohua.gov.in/developers', // hypothesized
    complaints: 'https://www.rera.mohua.gov.in/complaints', // hypothesized
    orders: 'https://www.rera.mohua.gov.in/orders'          // hypothesized
  },

  // KEY ARCHITECTURAL FINDING:
  // The unified portal aggregates stats natively BUT likely deep-links
  // back to individual state portals for full project details. This means:
  // - For national-level stats and discovery: use this scraper
  // - For full project details: use state-specific scrapers
  // - Zero prior scrapers exist for rera.mohua.gov.in (greenfield)
};

// 35 States/UTs with RERA (as of launch September 2025)
// Holdouts: Ladakh, Meghalaya, Nagaland, Sikkim
const RERA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Mizoram', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttarakhand', 'Uttar Pradesh', 'West Bengal',
  // UTs
  'Andaman and Nicobar', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Lakshadweep',
  'Puducherry'
];

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
    console.error(`Fetching state RERA portal links from official MoHUA list...`);
    await page.goto(RERA_NATIONAL.state_uts_list, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const links = await page.evaluate(() => {
      // Prefer table rows where state name and link are adjacent
      const tableLinks = [];
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length >= 2) {
            // Find the state name cell and the link cell
            const stateName = cells[0]?.textContent?.trim() || '';
            const link = row.querySelector('a[href]');
            if (stateName && link && stateName.length < 50) {
              tableLinks.push({
                state: stateName,
                portal_url: link.href,
                portal_text: link.textContent?.trim() || ''
              });
            }
          }
        }
      }

      if (tableLinks.length > 0) return tableLinks;

      // Fallback: extract all external RERA links
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks
        .map(a => ({
          state: a.textContent?.trim() || '',
          portal_url: a.href,
          portal_text: a.textContent?.trim() || ''
        }))
        .filter(l =>
          l.portal_url &&
          (l.portal_url.includes('rera') || /rera/i.test(l.state)) &&
          !l.portal_url.includes('mohua.gov.in') &&
          !l.portal_url.startsWith('mailto:')
        );
    });

    const output = {
      source: 'MoHUA State/UT RERA Authorities List',
      source_url: RERA_NATIONAL.state_uts_list,
      scraped_at: new Date().toISOString(),
      total_states: links.length,
      state_portal_links: links
    };

    writeCache('state-links', 'all', output);
    return output;

  } catch (error) {
    return {
      source: 'MoHUA State/UT RERA Authorities List',
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// ─── Try data.gov.in OGD Dataset ───────────────────────────

async function checkOGDDataset() {
  console.error(`Checking data.gov.in OGD dataset for RERA...`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(RERA_NATIONAL.ogd_dataset, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const datasetInfo = await page.evaluate(() => {
      const title = document.querySelector('h1, h2, .title, .api-title')?.textContent?.trim() || '';
      const description = document.querySelector('.description, .api-description, p')?.textContent?.trim() || '';

      // Look for common OGD metadata fields
      const metadata = {};
      document.querySelectorAll('dt, .meta-label').forEach(el => {
        const label = el.textContent?.trim().replace(/:/g, '') || '';
        const value = el.nextElementSibling?.textContent?.trim() || '';
        if (label && value) metadata[label.toLowerCase()] = value;
      });

      // Check for RERA/real estate mentions
      const text = (document.body.textContent || '').toLowerCase();
      const rera_related = /\brera\b|real\s*estate|property\s*registration|housing\s*regulation/i.test(text);

      return {
        title,
        description: description.slice(0, 500),
        metadata,
        rera_related,
        page_title: document.title
      };
    });

    return {
      source: 'OGD India (data.gov.in)',
      source_url: RERA_NATIONAL.ogd_dataset,
      scraped_at: new Date().toISOString(),
      ...datasetInfo,
      note: datasetInfo.rera_related
        ? 'This dataset appears to be RERA-related. Register for a free data.gov.in API key to access the data.'
        : 'Could not confirm this dataset is RERA-related. Manual inspection required.'
    };

  } catch (error) {
    return {
      source: 'OGD India (data.gov.in)',
      source_url: RERA_NATIONAL.ogd_dataset,
      error: error.message,
      note: 'Could not fetch. data.gov.in may require registration or the endpoint may have moved.'
    };
  } finally {
    await browser.close();
  }
}

// ─── List All RERA States ──────────────────────────────────

function listReraStates() {
  return {
    source: 'MoHUA Unified RERA Portal',
    total: RERA_STATES.length,
    states: RERA_STATES,
    holdouts: ['Ladakh', 'Meghalaya', 'Nagaland', 'Sikkim'],
    note: 'These 35 states/UTs have established RERA authorities. 4 holdouts remain (as of Sept 2025 unified portal launch).'
  };
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
    Get official list of all 35 state RERA portal URLs from MoHUA.
    This is the authoritative source — use this before falling back to state-specific scrapers.

  node scripts/scrapers/rera-national.mjs ogd
    Check the data.gov.in OGD dataset entry for potential official RERA API.
    If this is a live dataset, it's the highest-value endpoint (bypasses scraping).

  node scripts/scrapers/rera-national.mjs states
    List all 35 RERA-established states/UTs (plus the 4 holdouts).

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

    case 'ogd':
      result = await checkOGDDataset();
      break;

    case 'states':
      result = listReraStates();
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
