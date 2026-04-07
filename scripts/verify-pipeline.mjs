#!/usr/bin/env node

/**
 * PropOps Pipeline Health Check
 * Validates data/properties.md for:
 * - Canonical statuses
 * - No duplicate project+builder entries
 * - Valid report links
 * - Valid score format
 * - Proper row formatting
 * - No pending TSVs
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load canonical statuses
function loadStatuses() {
  const statesPath = resolve(ROOT, 'templates/states.yml');
  if (!existsSync(statesPath)) {
    console.error('ERROR: templates/states.yml not found');
    process.exit(1);
  }
  const content = readFileSync(statesPath, 'utf-8');
  const statuses = [];
  const aliases = [];
  const lines = content.split('\n');
  let currentName = '';
  for (const line of lines) {
    const nameMatch = line.match(/^\s+- name:\s*"(.+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      statuses.push(currentName);
      aliases.push(currentName.toLowerCase());
    }
    const aliasMatch = line.match(/aliases:\s*\[(.+)\]/);
    if (aliasMatch) {
      const parts = aliasMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
      aliases.push(...parts);
    }
  }
  return { statuses, aliases };
}

function main() {
  const trackerPath = resolve(ROOT, 'data/properties.md');

  if (!existsSync(trackerPath)) {
    console.log('No properties.md found. Nothing to verify.');
    process.exit(0);
  }

  const content = readFileSync(trackerPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().startsWith('|'));

  // Skip header and separator
  const dataLines = lines.slice(2);
  const { statuses } = loadStatuses();

  let errors = 0;
  let warnings = 0;
  const seen = new Set();

  console.log(`Checking ${dataLines.length} entries in properties.md\n`);

  for (const line of dataLines) {
    const cols = line.split('|').map(c => c.trim()).filter(c => c);

    if (cols.length < 13) {
      console.error(`ERROR: Row has ${cols.length} columns (expected 13): ${cols[0]}`);
      errors++;
      continue;
    }

    const [num, date, project, builder, location, config, area, price, rsSqft, score, status, report, notes] = cols;

    // Check status is canonical
    if (!statuses.includes(status)) {
      console.error(`ERROR: Non-canonical status "${status}" in row ${num}`);
      errors++;
    }

    // Check for duplicates (project + builder)
    const key = `${project.toLowerCase().trim()}|${builder.toLowerCase().trim()}`;
    if (seen.has(key)) {
      console.warn(`WARNING: Duplicate project+builder: ${project} / ${builder}`);
      warnings++;
    }
    seen.add(key);

    // Check report link validity
    const reportMatch = report.match(/\[.+\]\((.+)\)/);
    if (reportMatch) {
      const reportFile = resolve(ROOT, reportMatch[1]);
      if (!existsSync(reportFile)) {
        console.error(`ERROR: Report file not found: ${reportMatch[1]} (row ${num})`);
        errors++;
      }
    }

    // Check score format
    if (score !== 'N/A' && score !== 'DUP' && !/^\d+(\.\d)?\/10$/.test(score)) {
      console.error(`ERROR: Invalid score format "${score}" in row ${num} (expected X.X/10)`);
      errors++;
    }

    // Check no bold in status
    if (status.includes('**')) {
      console.error(`ERROR: Bold markers in status field, row ${num}`);
      errors++;
    }
  }

  // Check for pending TSVs
  const additionsDir = resolve(ROOT, 'batch/tracker-additions');
  if (existsSync(additionsDir)) {
    const pending = readdirSync(additionsDir).filter(f => f.endsWith('.tsv'));
    if (pending.length > 0) {
      console.warn(`WARNING: ${pending.length} pending TSV(s) in batch/tracker-additions/. Run 'node scripts/merge-tracker.mjs'`);
      warnings++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Pipeline Health: ${errors} errors, ${warnings} warnings`);
  if (errors === 0 && warnings === 0) {
    console.log('Pipeline is clean!');
  } else if (errors > 0) {
    console.log('Pipeline has issues. Fix errors before proceeding.');
  }
  process.exit(errors > 0 ? 1 : 0);
}

main();
