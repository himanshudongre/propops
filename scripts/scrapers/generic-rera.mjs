#!/usr/bin/env node

/**
 * PropOps Generic RERA Scraper
 *
 * Bootstrap scraper for Indian state RERA portals that don't have a
 * dedicated scraper yet. Uses the MoHUA unified portal to discover
 * the state's official RERA URL, then tries multiple extraction
 * strategies learned from existing state scrapers:
 *
 *   1. Card layout (MahaRERA style) — <strong> + adjacent <p>
 *   2. JavaScript arrays (K-RERA style) — regex extraction
 *   3. HTML tables (TNRERA style) — column parsing
 *   4. Drupal Views rows — .views-row elements
 *
 * This is a best-effort generic scraper. For production-quality data
 * for any state, a dedicated scraper will always be more reliable.
 *
 * Usage:
 *   node scripts/scrapers/generic-rera.mjs search --state "Gujarat" --name "Godrej"
 *   node scripts/scrapers/generic-rera.mjs explore --state "Punjab"
 *   node scripts/scrapers/generic-rera.mjs list-supported
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { saveDebugSnapshot, logPageStructure } from './debug-helper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');
const CACHE_VALIDITY_DAYS = 30;

// ─── Load State Portal URLs from MoHUA Cache ──────────────

function loadMohuaStateLinks() {
  const cachePath = resolve(CACHE_DIR, 'rera-national-state-links-all.json');
  if (!existsSync(cachePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(cachePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Map from state name to official RERA portal URL.
 * Populated from MoHUA cache on first run.
 */
function getStatePortalMap() {
  const cache = loadMohuaStateLinks();
  if (!cache || !cache.state_portal_links) {
    // Fallback: hardcoded URLs from our research
    return {
      'andhra pradesh': 'https://rera.ap.gov.in/RERA/Views/Home.aspx',
      'bihar': 'https://rera.bihar.gov.in/',
      'chhattisgarh': 'https://rera.cgstate.gov.in/',
      'goa': 'https://rera.goa.gov.in/',
      'gujarat': 'https://gujrera.gujarat.gov.in/',
      'haryana': 'https://haryanarera.gov.in/',
      'himachal pradesh': 'https://hprera.nic.in/',
      'jharkhand': 'https://rera.jharkhand.gov.in/',
      'karnataka': 'https://rera.karnataka.gov.in/',
      'kerala': 'https://rera.kerala.gov.in/',
      'madhya pradesh': 'https://rera.mp.gov.in/',
      'maharashtra': 'https://maharera.maharashtra.gov.in/',
      'odisha': 'https://rera.odisha.gov.in/',
      'punjab': 'https://rera.punjab.gov.in/',
      'rajasthan': 'https://rera.rajasthan.gov.in/',
      'tamil nadu': 'https://rera.tn.gov.in/',
      'telangana': 'https://rera.telangana.gov.in/',
      'uttar pradesh': 'https://up-rera.in/',
      'uttarakhand': 'https://rera.uk.gov.in/',
      'west bengal': 'https://hira.wb.gov.in/',
      'assam': 'https://rera.assam.gov.in/',
      'meghalaya': 'https://meghrera.org.in/',
      'tripura': 'https://rera.tripura.gov.in/',
      'delhi': 'https://www.rera.delhi.gov.in/',
      'jammu and kashmir': 'https://rera.jk.gov.in/',
      'puducherry': 'http://prera.py.gov.in/'
    };
  }

  // Parse from cached MoHUA data
  const map = {};
  for (const link of cache.state_portal_links) {
    // The state field from MoHUA cache often contains numeric IDs
    // (e.g., "2", "3") because the table structure uses them as sr_no.
    // Extract real state name from URL patterns.
    const url = link.portal_url || '';
    if (!url) continue;

    // Extract state from domain
    let stateName = null;
    const domain = url.match(/https?:\/\/(?:www\.)?([^.]+)/)?.[1]?.toLowerCase();
    if (!domain) continue;

    // Map common domain patterns to state names
    const patterns = {
      'rera.ap': 'andhra pradesh',
      'rera.bihar': 'bihar',
      'rera.cgstate': 'chhattisgarh',
      'rera.goa': 'goa',
      'gujrera': 'gujarat',
      'haryanarera': 'haryana',
      'hprera': 'himachal pradesh',
      'rera.jharkhand': 'jharkhand',
      'rera.karnataka': 'karnataka',
      'rera.kerala': 'kerala',
      'rera.mp': 'madhya pradesh',
      'maharera': 'maharashtra',
      'rera.odisha': 'odisha',
      'rera.punjab': 'punjab',
      'rera.rajasthan': 'rajasthan',
      'rera.tn': 'tamil nadu',
      'rera.telangana': 'telangana',
      'up-rera': 'uttar pradesh',
      'uprera': 'uttar pradesh',
      'rera.uk': 'uttarakhand',
      'hira.wb': 'west bengal',
      'rera.assam': 'assam',
      'meghrera': 'meghalaya',
      'rera.tripura': 'tripura',
      'rera.delhi': 'delhi',
      'rera.jk': 'jammu and kashmir',
      'prera.py': 'puducherry'
    };

    for (const [pattern, state] of Object.entries(patterns)) {
      if (url.includes(pattern)) {
        stateName = state;
        break;
      }
    }

    if (stateName && !map[stateName]) {
      map[stateName] = url.replace('#nolink', '').replace('#', '');
    }
  }

  return map;
}

// ─── Cache ──────────────────────────────────────────────────

function getCachePath(state, type, key) {
  const slug = `${state}-${type}-${key}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return resolve(CACHE_DIR, `generic-rera-${slug}.json`);
}

function readCache(state, type, key) {
  const path = getCachePath(state, type, key);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const age = (Date.now() - new Date(data._cached_at).getTime()) / (1000 * 60 * 60 * 24);
    if (age > CACHE_VALIDITY_DAYS) return null;
    return data;
  } catch { return null; }
}

function writeCache(state, type, key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(getCachePath(state, type, key), JSON.stringify({ ...data, _cached_at: new Date().toISOString() }, null, 2));
}

// ─── Extraction Strategies ─────────────────────────────────

/**
 * Try all known extraction patterns in order of reliability.
 */
async function extractProjectsMultiStrategy(page, query) {
  return page.evaluate((searchQuery) => {
    const results = { strategy: null, data: [] };

    // Strategy 1: MahaRERA card layout
    // <strong>PROJECT NAME</strong> + <p class="darkBlue bold">Promoter</p>
    const strongEls = document.querySelectorAll('strong');
    const cardCandidates = Array.from(strongEls).filter(el => {
      const text = el.textContent?.trim() || '';
      return text.length >= 3 &&
             text === text.toUpperCase() &&
             !/^(SR|NO|#|&|^\d+$)/.test(text);
    });

    if (cardCandidates.length > 0) {
      for (const nameEl of cardCandidates) {
        let card = nameEl.parentElement;
        while (card && card.tagName !== 'BODY') {
          const classes = card.className || '';
          if (/project|row|card|result|item|box/i.test(classes)) break;
          if (card.parentElement?.tagName === 'BODY') break;
          card = card.parentElement;
        }
        if (!card) card = nameEl.parentElement;

        const promoterEl = Array.from(card.querySelectorAll('p'))
          .find(p => /darkBlue|bold/i.test(p.className) && p !== nameEl);

        const cardText = card.textContent || '';
        const reraIdMatch = cardText.match(/[A-Z]{1,3}\d{10,15}|PR\/[A-Z]+\/[A-Z]+\/\d+\/\d+\/[A-Z]+\/\d+\/\d+/);

        results.data.push({
          project_name: nameEl.textContent?.trim() || '',
          promoter_name: promoterEl?.textContent?.trim() || '',
          rera_id: reraIdMatch?.[0] || '',
          _extraction: 'card-strong'
        });
      }

      if (results.data.length > 0) {
        results.strategy = 'MahaRERA card layout';
        // Dedupe by project name
        const seen = new Set();
        results.data = results.data.filter(d => {
          if (seen.has(d.project_name)) return false;
          seen.add(d.project_name);
          return true;
        });
        return results;
      }
    }

    // Strategy 2: K-RERA JavaScript arrays
    const html = document.documentElement.outerHTML;
    const extractArray = (arrayName) => {
      const pattern = new RegExp(`${arrayName}\\s*\\.push\\s*\\(\\s*['"]([^'"]*)['"]\\s*\\)`, 'g');
      const matches = [];
      let m;
      while ((m = pattern.exec(html)) !== null) matches.push(m[1]);
      return matches;
    };

    // Try common array patterns
    const jsArrayNames = [
      ['applicationNameList2', 'applicationNameList3', 'applicationNameList4'], // K-RERA
      ['projectList1', 'projectList2', 'projectList3'],
      ['regList1', 'regList2', 'regList3']
    ];

    for (const [idField, nameField, promoterField] of jsArrayNames) {
      const ids = extractArray(idField);
      const names = extractArray(nameField);
      const promoters = extractArray(promoterField);

      if (ids.length > 0 || names.length > 0) {
        const maxLen = Math.max(ids.length, names.length, promoters.length);
        for (let i = 0; i < maxLen; i++) {
          const entry = {
            rera_id: ids[i] || '',
            project_name: names[i] || '',
            promoter_name: promoters[i] || '',
            _extraction: `js-array (${nameField})`
          };
          if (entry.project_name || entry.rera_id) results.data.push(entry);
        }
        if (results.data.length > 0) {
          results.strategy = `JS arrays (${idField}/${nameField}/${promoterField})`;
          return results;
        }
      }
    }

    // Strategy 3: HTML tables with project/promoter columns
    const projectKeywords = ['project', 'promoter', 'registration', 'rera', 'developer', 'builder', 'certificate'];
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      // Skip calendar/datepicker tables
      if (/datepicker|calendar|ui-datepicker/i.test(table.className)) continue;

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

        const entry = { _extraction: 'html-table' };
        cells.forEach((cell, idx) => {
          const header = headers[idx] || `col_${idx}`;
          const key = header.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
          entry[key] = cell.textContent?.trim() || '';
        });

        // Guess normalized field names
        const normalized = {
          project_name: entry.project_name || entry.name_of_the_project || entry.project || entry.col_1 || '',
          promoter_name: entry.promoter_name || entry.name_of_the_promoter || entry.promoter || entry.developer || '',
          rera_id: entry.registration_number || entry.certificate_no || entry.rera_no || entry.reg_no || ''
        };

        if (normalized.project_name || normalized.rera_id) {
          results.data.push({ ...normalized, _extraction: 'html-table', _raw: entry });
        }
      }

      if (results.data.length > 0) {
        results.strategy = 'HTML table';
        return results;
      }
    }

    // Strategy 4: Drupal Views rows
    const viewRows = document.querySelectorAll('.views-row, .view-content > div');
    for (const row of viewRows) {
      const fields = { _extraction: 'drupal-views' };
      row.querySelectorAll('.views-field, .field').forEach(field => {
        const label = field.querySelector('.views-label, .field--label')?.textContent?.trim() || '';
        const value = field.querySelector('.field-content, .field--item')?.textContent?.trim()
          || field.textContent.replace(label, '').trim();
        if (label) fields[label.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = value;
      });
      if (Object.keys(fields).length > 1) results.data.push(fields);
    }
    if (results.data.length > 0) {
      results.strategy = 'Drupal Views';
      return results;
    }

    // Nothing worked
    results.strategy = 'none';
    return results;
  }, query);
}

// ─── Main Search Function ──────────────────────────────────

async function searchState(state, query) {
  const stateNorm = state.toLowerCase();
  const cached = readCache(stateNorm, 'search', query);
  if (cached) return cached;

  const portalMap = getStatePortalMap();
  const portalUrl = portalMap[stateNorm];

  if (!portalUrl) {
    return {
      state,
      query,
      error: `No known portal URL for state "${state}". Available states: ${Object.keys(portalMap).join(', ')}`,
      results: []
    };
  }

  console.error(`[Generic RERA] State: ${state}`);
  console.error(`[Generic RERA] Portal: ${portalUrl}`);
  console.error(`[Generic RERA] Query: ${query}`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Try to find and fill a search box
    const filled = await page.evaluate((searchQuery) => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"]'));
      const visible = inputs.filter(i => {
        const rect = i.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !i.disabled && !i.readOnly;
      });

      const target = visible.find(i =>
        (i.name && /project|name|search|promoter/i.test(i.name)) ||
        (i.id && /project|name|search|promoter/i.test(i.id)) ||
        (i.placeholder && /project|name|search/i.test(i.placeholder))
      ) || visible[0];

      if (!target) return false;
      target.focus();
      target.value = searchQuery;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, query);

    if (filled) {
      // Submit
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"]'));
        const visible = buttons.filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !b.disabled;
        });
        if (visible.length > 0) visible[0].click();
      });

      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    // Try all extraction strategies
    const extraction = await extractProjectsMultiStrategy(page, query);

    // Filter results by query (since we may have loaded all projects)
    const queryLower = query.toLowerCase();
    const filtered = extraction.data.filter(d => {
      const project = (d.project_name || '').toLowerCase();
      const promoter = (d.promoter_name || '').toLowerCase();
      return project.includes(queryLower) || promoter.includes(queryLower);
    });

    const output = {
      state,
      query,
      source: `Generic RERA Scraper (${state})`,
      source_url: portalUrl,
      scraped_at: new Date().toISOString(),
      extraction_strategy: extraction.strategy,
      total_found: extraction.data.length,
      results_count: filtered.length,
      results: filtered.slice(0, 50) // Cap at 50 for report readability
    };

    if (output.results_count === 0 && extraction.data.length === 0) {
      await saveDebugSnapshot(page, `generic-rera-${stateNorm.replace(/\s+/g, '-')}`);
    }

    if (output.results_count > 0) {
      writeCache(stateNorm, 'search', query, output);
    }

    return output;

  } catch (error) {
    return {
      state,
      query,
      source: `Generic RERA Scraper (${state})`,
      error: error.message,
      results: []
    };
  } finally {
    await browser.close();
  }
}

// ─── Explore Mode ───────────────────────────────────────────

async function exploreState(state) {
  const portalMap = getStatePortalMap();
  const url = portalMap[state.toLowerCase()];

  if (!url) {
    return { state, error: `No URL for ${state}` };
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const structure = await logPageStructure(page);
    const metadata = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      form_count: document.querySelectorAll('form').length,
      table_count: document.querySelectorAll('table').length,
      input_count: document.querySelectorAll('input').length,
      inputs: Array.from(document.querySelectorAll('input')).slice(0, 10).map(i => ({
        name: i.name, id: i.id, type: i.type, placeholder: i.placeholder
      }))
    }));

    return {
      state,
      url,
      structure,
      metadata
    };
  } finally {
    await browser.close();
  }
}

// ─── List Supported States ─────────────────────────────────

function listSupported() {
  const map = getStatePortalMap();
  const dedicated = [
    'maharashtra (MahaRERA + IGRS)',
    'karnataka (K-RERA + Kaveri IGRS)',
    'telangana (TG-RERA + IGRS)',
    'tamil nadu (TNRERA)',
    'uttar pradesh (UP-RERA)'
  ];

  return {
    dedicated_scrapers: dedicated,
    generic_bootstrap: Object.keys(map).sort(),
    total_states_with_portals: Object.keys(map).length,
    note: 'Dedicated scrapers are production-quality. Generic bootstrap is a best-effort fallback that tries multiple extraction strategies.'
  };
}

// ─── CLI ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps Generic RERA Bootstrap Scraper

Best-effort scraper for any Indian state RERA portal. Uses MoHUA's
official state-URL list and tries multiple extraction strategies
learned from dedicated scrapers (MahaRERA cards, K-RERA JS arrays,
HTML tables, Drupal Views).

Usage:
  node scripts/scrapers/generic-rera.mjs search --state "Gujarat" --name "Godrej"
    Search a specific state's RERA portal for a project or builder.

  node scripts/scrapers/generic-rera.mjs explore --state "Rajasthan"
    Explore the state's portal structure to inform future scraper work.

  node scripts/scrapers/generic-rera.mjs list-supported
    List states with dedicated vs bootstrap scrapers.

Supported states (bootstrap + dedicated):
  Andhra Pradesh, Assam, Bihar, Chhattisgarh, Delhi, Gujarat, Goa,
  Haryana, Himachal Pradesh, Jharkhand, Karnataka, Kerala, Madhya
  Pradesh, Maharashtra, Meghalaya, Odisha, Puducherry, Punjab,
  Rajasthan, Tamil Nadu, Telangana, Tripura, Uttar Pradesh,
  Uttarakhand, West Bengal, Jammu and Kashmir

For production-quality data, dedicated scrapers are always better.
Use this bootstrap to rapidly add new states or fill gaps.
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'search':
      result = await searchState(getArg('--state') || '', getArg('--name') || '');
      break;
    case 'explore':
      result = await exploreState(getArg('--state') || '');
      break;
    case 'list-supported':
      result = listSupported();
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
