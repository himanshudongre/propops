#!/usr/bin/env node

/**
 * PropOps Tracker Merge
 * Reads TSV files from batch/tracker-additions/ and merges into data/properties.md
 * Handles deduplication by project+builder matching
 * Moves processed TSVs to merged/ directory
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TRACKER_PATH = resolve(ROOT, 'data/properties.md');
const ADDITIONS_DIR = resolve(ROOT, 'batch/tracker-additions');
const MERGED_DIR = resolve(ADDITIONS_DIR, 'merged');

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function parseTracker() {
  if (!existsSync(TRACKER_PATH)) {
    return { header: '', separator: '', entries: [] };
  }
  const content = readFileSync(TRACKER_PATH, 'utf-8');
  const lines = content.split('\n');

  let header = '';
  let separator = '';
  const entries = [];

  for (const line of lines) {
    if (line.trim().startsWith('| #') || line.trim().startsWith('| Date')) {
      header = line;
    } else if (line.trim().match(/^\|[-\s|]+\|$/)) {
      separator = line;
    } else if (line.trim().startsWith('|') && line.includes('|')) {
      const cols = line.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 13) {
        entries.push({
          num: parseInt(cols[0]) || 0,
          date: cols[1],
          project: cols[2],
          builder: cols[3],
          location: cols[4],
          config: cols[5],
          area: cols[6],
          price: cols[7],
          rsSqft: cols[8],
          score: cols[9],
          status: cols[10],
          report: cols[11],
          notes: cols[12],
          raw: line
        });
      }
    }
  }

  return { header, separator, entries };
}

function parseTSV(content) {
  const line = content.trim().split('\n')[0]; // First non-empty line
  if (!line) return null;

  const cols = line.split('\t');
  if (cols.length < 13) {
    console.warn(`WARNING: TSV has ${cols.length} columns (expected 13), skipping`);
    return null;
  }

  return {
    num: parseInt(cols[0]) || 0,
    date: cols[1],
    project: cols[2],
    builder: cols[3],
    location: cols[4],
    config: cols[5],
    area: cols[6],
    price: cols[7],
    rsSqft: cols[8],
    score: cols[9],
    status: cols[10],
    report: cols[11],
    notes: cols[12]
  };
}

function entryToRow(e, num) {
  return `| ${num} | ${e.date} | ${e.project} | ${e.builder} | ${e.location} | ${e.config} | ${e.area} | ${e.price} | ${e.rsSqft} | ${e.score} | ${e.status} | ${e.report} | ${e.notes} |`;
}

function isDuplicate(existing, incoming) {
  const existKey = normalize(existing.project) + '|' + normalize(existing.builder);
  const incomKey = normalize(incoming.project) + '|' + normalize(incoming.builder);
  return existKey === incomKey;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!existsSync(ADDITIONS_DIR)) {
    console.log('No tracker-additions directory. Nothing to merge.');
    process.exit(0);
  }

  const tsvFiles = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
  if (tsvFiles.length === 0) {
    console.log('No pending TSV files. Nothing to merge.');
    process.exit(0);
  }

  console.log(`Found ${tsvFiles.length} TSV file(s) to merge\n`);

  const { header, separator, entries } = parseTracker();
  let maxNum = entries.reduce((max, e) => Math.max(max, e.num), 0);
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of tsvFiles) {
    const content = readFileSync(resolve(ADDITIONS_DIR, file), 'utf-8');
    const incoming = parseTSV(content);

    if (!incoming) {
      console.warn(`SKIP: Could not parse ${file}`);
      skipped++;
      continue;
    }

    // Check for duplicates
    const existingIdx = entries.findIndex(e => isDuplicate(e, incoming));

    if (existingIdx >= 0) {
      // Update existing entry if new score is higher
      const existing = entries[existingIdx];
      const existScore = parseFloat(existing.score) || 0;
      const incomScore = parseFloat(incoming.score) || 0;

      if (incomScore > existScore) {
        console.log(`UPDATE: ${incoming.project} (${existing.score} -> ${incoming.score})`);
        entries[existingIdx] = { ...incoming, num: existing.num };
        updated++;
      } else {
        console.log(`SKIP (dup): ${incoming.project} (existing score ${existing.score} >= ${incoming.score})`);
        skipped++;
      }
    } else {
      // New entry
      maxNum++;
      incoming.num = maxNum;
      entries.push(incoming);
      console.log(`ADD: #${maxNum} ${incoming.project} (${incoming.score})`);
      added++;
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would add ${added}, update ${updated}, skip ${skipped}`);
    process.exit(0);
  }

  // Write updated tracker
  const headerLine = header || '| # | Date | Project | Builder | Location | Config | Area | Price(L) | Rs/sqft | Score | Status | Report | Notes |';
  const sepLine = separator || '|---|------|---------|---------|----------|--------|------|----------|---------|-------|--------|--------|-------|';

  const rows = entries
    .sort((a, b) => a.num - b.num)
    .map(e => entryToRow(e, e.num));

  const output = `# Property Tracker\n\n${headerLine}\n${sepLine}\n${rows.join('\n')}\n`;
  writeFileSync(TRACKER_PATH, output);

  // Move processed TSVs
  if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });
  for (const file of tsvFiles) {
    renameSync(resolve(ADDITIONS_DIR, file), resolve(MERGED_DIR, file));
  }

  console.log(`\nMerged: ${added} added, ${updated} updated, ${skipped} skipped`);
  console.log(`Processed TSVs moved to batch/tracker-additions/merged/`);
}

main();
