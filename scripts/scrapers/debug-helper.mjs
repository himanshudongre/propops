#!/usr/bin/env node

/**
 * PropOps Scraper Debug Helper
 *
 * Shared utilities for debugging scraper failures. When a scraper returns
 * zero results or encounters an unexpected page structure, these helpers
 * capture enough context to diagnose the issue without manual inspection.
 *
 * Usage (from any scraper):
 *   import { saveDebugSnapshot, logPageStructure } from './debug-helper.mjs';
 *
 *   // When zero results:
 *   await saveDebugSnapshot(page, 'krera-list-empty');
 *
 *   // Log what tables/forms exist on the page:
 *   const structure = await logPageStructure(page);
 *   console.error(structure);
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DEBUG_DIR = resolve(ROOT, 'data/debug');

/**
 * Save HTML content, a screenshot, and page metadata when a scraper
 * encounters an unexpected state. This lets you diagnose failures
 * after the fact without re-running the scraper.
 */
export async function saveDebugSnapshot(page, tag) {
  if (!existsSync(DEBUG_DIR)) {
    mkdirSync(DEBUG_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `${tag}-${timestamp}`;

  try {
    // 1. Save HTML content
    const html = await page.content();
    writeFileSync(resolve(DEBUG_DIR, `${baseName}.html`), html);

    // 2. Save screenshot
    await page.screenshot({
      path: resolve(DEBUG_DIR, `${baseName}.png`),
      fullPage: true
    });

    // 3. Save page metadata
    const metadata = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      table_count: document.querySelectorAll('table').length,
      form_count: document.querySelectorAll('form').length,
      select_count: document.querySelectorAll('select').length,
      input_count: document.querySelectorAll('input').length,
      table_headers: Array.from(document.querySelectorAll('table thead th, table tr:first-child th, table tr:first-child td'))
        .map(h => h.textContent?.trim() || ''),
      form_names: Array.from(document.querySelectorAll('form'))
        .map(f => ({ name: f.name, action: f.action, method: f.method })),
      select_names: Array.from(document.querySelectorAll('select'))
        .map(s => ({ name: s.name, id: s.id, optionCount: s.options.length })),
      input_names: Array.from(document.querySelectorAll('input'))
        .map(i => ({ name: i.name, id: i.id, type: i.type, placeholder: i.placeholder }))
        .filter(i => i.type !== 'hidden')
    }));

    writeFileSync(
      resolve(DEBUG_DIR, `${baseName}.json`),
      JSON.stringify(metadata, null, 2)
    );

    console.error(`[DEBUG] Snapshot saved: ${baseName}`);
    console.error(`[DEBUG]   HTML: data/debug/${baseName}.html`);
    console.error(`[DEBUG]   PNG:  data/debug/${baseName}.png`);
    console.error(`[DEBUG]   JSON: data/debug/${baseName}.json`);
    console.error(`[DEBUG]   Tables: ${metadata.table_count}, Forms: ${metadata.form_count}, Selects: ${metadata.select_count}`);

    if (metadata.table_headers.length > 0) {
      console.error(`[DEBUG]   First table headers: ${metadata.table_headers.slice(0, 8).join(' | ')}`);
    }

    return {
      html_path: `data/debug/${baseName}.html`,
      png_path: `data/debug/${baseName}.png`,
      metadata_path: `data/debug/${baseName}.json`,
      metadata
    };
  } catch (err) {
    console.error(`[DEBUG] Failed to save snapshot: ${err.message}`);
    return null;
  }
}

/**
 * Log the structure of the current page without saving files.
 * Useful for quick inspection during development.
 */
export async function logPageStructure(page) {
  const structure = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table')).map((t, i) => ({
      index: i,
      rows: t.querySelectorAll('tr').length,
      headers: Array.from(t.querySelectorAll('thead th, tr:first-child th, tr:first-child td'))
        .map(h => h.textContent?.trim() || '')
        .slice(0, 10),
      sample_row: (() => {
        const row = t.querySelectorAll('tr')[1];
        if (!row) return null;
        return Array.from(row.querySelectorAll('td')).map(c => (c.textContent?.trim() || '').slice(0, 40));
      })()
    }));

    return {
      url: window.location.href,
      title: document.title,
      body_text_length: (document.body?.textContent || '').length,
      tables
    };
  });

  return structure;
}

/**
 * Retry a browser operation with exponential backoff.
 * Useful for flaky government portals.
 */
export async function retryOperation(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
        console.error(`[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);
        console.error(`[RETRY] Waiting ${delay}ms before retry...`);
        if (onRetry) await onRetry(error, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wait for any of multiple selectors to appear.
 * Useful when different versions of a portal use different selectors.
 */
export async function waitForAnySelector(page, selectors, timeout = 10000) {
  const promises = selectors.map(sel =>
    page.waitForSelector(sel, { timeout }).then(() => sel).catch(() => null)
  );
  const results = await Promise.all(promises);
  return results.find(r => r !== null) || null;
}

/**
 * Try multiple selectors and return the first one that finds an element.
 */
export async function findElementWithFallback(page, selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) return { element: el, selector: sel };
  }
  return null;
}

// CLI mode — useful for testing the helpers standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
PropOps Debug Helper

This module provides utilities for debugging scraper failures:
- saveDebugSnapshot(page, tag)  — save HTML + screenshot + metadata
- logPageStructure(page)         — inspect page structure
- retryOperation(fn, options)   — retry with exponential backoff
- waitForAnySelector(page, [..]) — wait for any of multiple selectors
- findElementWithFallback(page, [..]) — try selectors in order

Snapshots saved to: data/debug/

Import from scrapers:
  import { saveDebugSnapshot } from './debug-helper.mjs';
  `);
}
