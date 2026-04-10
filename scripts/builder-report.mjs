#!/usr/bin/env node

/**
 * PropOps End-to-End Builder Report
 *
 * Runs a complete builder evaluation across all configured state scrapers,
 * promoter resolver, and eCourts. This is the production integration of
 * everything PropOps offers.
 *
 * Pipeline:
 *   1. Query each state-specific RERA scraper in parallel (MahaRERA, K-RERA,
 *      TNRERA, TG-RERA, UP-RERA)
 *   2. Run promoter resolver on cached data to find related legal entities
 *   3. Run eCourts search for litigation (national, via Kleopatra API)
 *   4. Aggregate everything into a single Builder Report
 *
 * Usage:
 *   node scripts/builder-report.mjs --name "Sobha Limited"
 *   node scripts/builder-report.mjs --name "Lodha Group" --output report.md
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORTS_DIR = resolve(ROOT, 'reports');

// ─── Spawn Helper ──────────────────────────────────────────

function runScraper(scraperPath, args, timeoutSec = 120) {
  return new Promise((resolve) => {
    const proc = spawn('node', [scraperPath, ...args], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({ success: false, error: `Timeout after ${timeoutSec}s`, stdout, stderr });
    }, timeoutSec * 1000);

    proc.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) {
        resolve({ success: false, error: `Exit code ${code}`, stdout, stderr });
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve({ success: true, result });
      } catch (err) {
        resolve({ success: false, error: `JSON parse error: ${err.message}`, stdout, stderr });
      }
    });
  });
}

// ─── State Scraper Queries ──────────────────────────────────

async function queryAllStates(builderName) {
  console.error(`\n[Builder Report] Querying all state scrapers for "${builderName}"...\n`);

  const queries = [
    {
      state: 'Maharashtra',
      scraper: 'scripts/maharera-scraper.mjs',
      args: ['search-project', '--name', builderName]
    },
    {
      state: 'Karnataka',
      scraper: 'scripts/scrapers/krera-karnataka.mjs',
      args: ['builder', '--name', builderName]
    },
    {
      state: 'Tamil Nadu',
      scraper: 'scripts/scrapers/tnrera.mjs',
      args: ['builder', '--name', builderName]
    }
    // TG-RERA and UP-RERA commented out for automated runs:
    // TG-RERA requires CAPTCHA (human-in-the-loop)
    // UP-RERA runs but is slow
  ];

  const results = {};
  for (const q of queries) {
    console.error(`  -> Querying ${q.state} (${q.scraper})...`);
    const start = Date.now();
    const res = await runScraper(q.scraper, q.args);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (res.success) {
      const count = res.result.results_count || res.result.total_projects || (res.result.results?.length) || (res.result.projects?.length) || 0;
      console.error(`     ${count} results in ${elapsed}s`);
      results[q.state] = res.result;
    } else {
      console.error(`     FAILED (${elapsed}s): ${res.error}`);
      results[q.state] = { error: res.error };
    }
  }

  return results;
}

// ─── Promoter Resolver ─────────────────────────────────────

async function resolvePromoter(builderName) {
  console.error(`\n[Builder Report] Running promoter resolver...`);

  const res = await runScraper('scripts/promoter-resolver.mjs', ['resolve', '--name', builderName]);
  if (!res.success) {
    console.error(`  FAILED: ${res.error}`);
    return null;
  }

  console.error(`  Matches: ${res.result.matches_found}`);
  console.error(`  Unique entities: ${res.result.unique_legal_entities?.length || 0}`);
  console.error(`  Unique projects: ${res.result.unique_projects_count}`);
  return res.result;
}

// ─── eCourts Search ────────────────────────────────────────

async function searchLitigation(builderName) {
  console.error(`\n[Builder Report] Searching eCourts for litigation...`);

  const res = await runScraper('scripts/ecourts-search.mjs', ['party-name', '--name', builderName]);
  if (!res.success) {
    console.error(`  FAILED: ${res.error}`);
    return null;
  }

  console.error(`  Total cases: ${res.result.total_cases || 0}`);
  return res.result;
}

// ─── Report Generation ─────────────────────────────────────

function generateReport(builderName, stateResults, resolver, litigation) {
  const date = new Date().toISOString().split('T')[0];

  // Aggregate stats
  let totalProjects = 0;
  let statesWithPresence = 0;

  const stateRows = [];
  for (const [state, data] of Object.entries(stateResults)) {
    if (data.error) {
      stateRows.push(`| ${state} | ERROR | ${data.error} |`);
      continue;
    }

    const count = data.results_count || data.total_projects || (data.results?.length) || (data.projects?.length) || 0;
    totalProjects += count;
    if (count > 0) statesWithPresence++;

    const sampleProjects = (data.results || data.projects || []).slice(0, 3)
      .map(p => p.project_name || p.name || '').filter(Boolean);

    stateRows.push(`| ${state} | ${count} | ${sampleProjects.join(', ') || 'N/A'} |`);
  }

  // Resolver insights
  const relatedEntities = resolver?.unique_legal_entities || [];
  const resolverProjects = resolver?.unique_projects_count || 0;

  // Litigation summary
  const caseCount = litigation?.total_cases || 0;
  const pending = litigation?.pending || 0;
  const disposed = litigation?.disposed || 0;
  const summary = litigation?.summary || {};

  // Risk flags
  const redFlags = [];
  const greenFlags = [];

  if (caseCount === 0) {
    greenFlags.push('No litigation found in eCourts');
  } else if (summary.criminal > 0) {
    redFlags.push(`${summary.criminal} criminal case(s) found`);
  } else if (summary.nclt > 0) {
    redFlags.push(`${summary.nclt} NCLT/insolvency proceedings`);
  } else if (caseCount > 5) {
    redFlags.push(`High litigation volume: ${caseCount} cases`);
  } else {
    greenFlags.push(`Low litigation: ${caseCount} case(s) only`);
  }

  if (totalProjects > 50) {
    greenFlags.push(`Large portfolio: ${totalProjects}+ RERA-registered projects`);
  } else if (totalProjects < 3) {
    redFlags.push(`Small portfolio: only ${totalProjects} RERA project(s) found — limited track record`);
  }

  if (statesWithPresence >= 3) {
    greenFlags.push(`Multi-state presence: active in ${statesWithPresence} states`);
  }

  if (relatedEntities.length > 1) {
    greenFlags.push(`Promoter resolver found ${relatedEntities.length} related legal entities — comprehensive identity linkage`);
  }

  // Final verdict
  let verdict;
  if (redFlags.length === 0 && totalProjects >= 10 && caseCount <= 5) {
    verdict = 'STRONG POSITIVE — Established builder with clean record';
  } else if (redFlags.length <= 1 && totalProjects >= 5) {
    verdict = 'POSITIVE — Reasonable track record, minor concerns to verify';
  } else if (redFlags.length >= 2 || totalProjects < 3) {
    verdict = 'CAUTION — Multiple red flags or insufficient track record';
  } else {
    verdict = 'NEUTRAL — Mixed signals, requires manual verification';
  }

  // Build report
  const report = `# Builder Report: ${builderName}

**Report Date:** ${date}
**Query:** "${builderName}"
**Data Sources:** MahaRERA, K-RERA, TNRERA, eCourts (Kleopatra API), Promoter Resolver

---

## Verdict

**${verdict}**

### Red Flags
${redFlags.length > 0 ? redFlags.map(f => `- 🔴 ${f}`).join('\n') : '- None found'}

### Green Flags
${greenFlags.length > 0 ? greenFlags.map(f => `- 🟢 ${f}`).join('\n') : '- None found'}

---

## State-by-State RERA Presence

| State | Projects Found | Sample Projects |
|-------|---------------|-----------------|
${stateRows.join('\n')}

**Total projects across states:** ${totalProjects}
**States with active presence:** ${statesWithPresence}

---

## Promoter Identity Resolution

${resolver
  ? `- **Legal entities found:** ${relatedEntities.length}
  - Entities: ${relatedEntities.map(e => `\`${e}\``).join(', ')}
- **Unique projects across all entities:** ${resolverProjects}
- **Matches scanned:** ${resolver.matches_found} out of ${resolver.entities_scanned} cached entities

${resolver.notes?.join('\n\n') || ''}`
  : 'Promoter resolver not available.'}

---

## eCourts Litigation

${litigation
  ? `- **Total cases:** ${caseCount}
- **Pending:** ${pending}
- **Disposed:** ${disposed}
- **Source:** ${litigation.source}

### Breakdown by Case Type

| Type | Count |
|------|-------|
| Consumer complaints | ${summary.consumer || 0} |
| Civil suits | ${summary.civil || 0} |
| Criminal cases | ${summary.criminal || 0} |
| NCLT/Insolvency | ${summary.nclt || 0} |
| Writ petitions | ${summary.writ || 0} |
| Other | ${summary.other || 0} |

${caseCount === 0 ? '*Note: Zero results could mean clean record OR builder operates under a different legal entity name.*' : ''}`
  : 'eCourts search not available (possibly rate limited or API key missing).'}

---

## Data Source Coverage

| Source | Status | Notes |
|--------|--------|-------|
| MahaRERA (Maharashtra) | ${stateResults['Maharashtra']?.error ? 'ERROR' : 'OK'} | ${stateResults['Maharashtra']?.results_count || 0} projects |
| K-RERA (Karnataka) | ${stateResults['Karnataka']?.error ? 'ERROR' : 'OK'} | ${stateResults['Karnataka']?.total_projects || 0} projects |
| TNRERA (Tamil Nadu) | ${stateResults['Tamil Nadu']?.error ? 'ERROR' : 'OK'} | ${stateResults['Tamil Nadu']?.total_projects || 0} projects |
| TG-RERA (Telangana) | SKIPPED | Requires CAPTCHA (human-in-the-loop) |
| UP-RERA (UP/NCR) | SKIPPED | Slow, enable with --include-up |
| eCourts (National) | ${litigation?.error ? 'ERROR' : 'OK'} | Via Kleopatra API |
| Promoter Resolver | ${resolver?.error ? 'ERROR' : 'OK'} | Cross-references cached data |

---

## Important Disclaimers

1. **RERA data is a disclosure signal, not a quality guarantee.** A clean RERA record doesn't prove the builder delivers on time or at quality.
2. **Court records have lag.** A zero-result eCourts search may miss cases filed in the last 2-8 weeks.
3. **Promoter identity resolution is fuzzy.** The resolver can miss builders using completely unrelated shell entity names with no shared signals (phone, email, address, directors).
4. **Individual cases matter more than counts.** A single NCLT/insolvency proceeding is far more serious than 10 consumer complaints.
5. **This report is not legal or financial advice.** Use it as a starting point for further investigation.

---

*Generated by PropOps \`scripts/builder-report.mjs\` — https://github.com/himanshudongre/propops*
`;

  return report;
}

// ─── CLI ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  const builderName = getArg('--name');
  const outputPath = getArg('--output');

  if (!builderName) {
    console.error(`
PropOps Builder Report — End-to-End Pipeline

Runs a complete builder evaluation across all configured state RERA
scrapers, the promoter identity resolver, and eCourts litigation search.

Usage:
  node scripts/builder-report.mjs --name "Sobha Limited"
  node scripts/builder-report.mjs --name "Lodha Group" --output reports/lodha.md

Options:
  --name    Builder/promoter name (required)
  --output  Output file path (default: print to stdout)

Pipeline:
  1. Query MahaRERA, K-RERA, TNRERA in parallel
  2. Run promoter resolver across cached entities
  3. Search eCourts for litigation
  4. Aggregate into Builder Report with verdict + red/green flags

Skipped by default (manual opt-in):
  - TG-RERA (requires CAPTCHA)
  - UP-RERA (slow)
    `);
    process.exit(1);
  }

  console.error(`[Builder Report] Starting end-to-end evaluation for "${builderName}"`);

  const startTime = Date.now();

  // Run all queries (state scrapers run sequentially to avoid overloading portals)
  const stateResults = await queryAllStates(builderName);
  const resolver = await resolvePromoter(builderName);
  const litigation = await searchLitigation(builderName);

  const report = generateReport(builderName, stateResults, resolver, litigation);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`\n[Builder Report] Complete in ${elapsed}s\n`);

  if (outputPath) {
    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    const fullPath = outputPath.startsWith('/') ? outputPath : resolve(ROOT, outputPath);
    writeFileSync(fullPath, report);
    console.error(`Report saved: ${fullPath}`);
  } else {
    console.log(report);
  }
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
