# Contributing to PropOps

## How to Contribute

### Add Support for a New State

The most impactful contribution is adding IGRS/RERA scraper support for another Indian state. PropOps currently has full support for Maharashtra, Karnataka, Telangana (IGRS + RERA) and RERA-only for Tamil Nadu and Uttar Pradesh.

Priority states (from `state-registry.mjs` build priority):

1. **Delhi NCR (DORIS/NGDRS)** — migration to NGDRS means one scraper works across 18+ states
2. **Gujarat RERA (GujRERA)** — Ahmedabad/Surat market
3. **Rajasthan RERA** — Jaipur market
4. **Haryana (HARERA)** — Gurgaon NCR market
5. **West Bengal (WB-RERA)** — Kolkata market

Steps to add a new state:

1. Research the state's IGRS portal and RERA portal. Document tech stack, CAPTCHA presence, and data fields. See existing scrapers for patterns.
2. Update `scripts/scrapers/state-registry.mjs` — add the state config with portal URLs, tech stack, difficulty rating, and scraper filename.
3. Create the scraper in `scripts/scrapers/{state}.mjs` following the pattern of existing scrapers:
   - `kaveri-karnataka.mjs` for session-based login flows
   - `igrs-telangana.mjs` for CAPTCHA-heavy portals
   - `tnrera.mjs` for simple static HTML (easiest pattern)
   - `uprera.mjs` for ASP.NET WebForms with ViewState
4. Add standard CLI commands: `list`, `search`, `builder`, optionally `project`
5. Use the shared cache pattern (`data/builder-cache/{state}-*` or `data/registration-cache/{state}-*`)
6. Update `docs/DATA-SOURCES.md` and `README.md` with the new state in the support matrix
7. Test with real data and submit a PR

All scrapers must:
- Output JSON to stdout, errors to stderr
- Cache results (30 days for RERA, 7 days for IGRS)
- Handle portal downtime gracefully (return `{ error, results: [] }` not crash)
- Normalize field names to match existing scrapers for downstream compatibility

### Improve Evaluation Logic

Mode files in `modes/` contain the AI instructions. If you have domain expertise in Indian real estate, you can improve:

- Scoring weights in `modes/_shared.md`
- Red/green flag criteria in `modes/evaluate.md`
- Negotiation tactics in `modes/negotiate.md`
- Due diligence checklist in `modes/due-diligence.md`

### Fix Scraper Issues

Government portals change. If a scraper breaks:

1. Open an issue with the error message
2. Check if the portal structure changed
3. Update the scraper selectors and submit a PR

## Development Setup

```bash
git clone https://github.com/himanshudongre/propops.git
cd propops
npm install
npx playwright install chromium
```

## Code Conventions

- Scripts: Node.js ESM (`.mjs`), no build step
- Modes: Markdown with structured sections
- Config: YAML
- Data: Markdown tables + TSV
- Dashboard: Go with Bubble Tea

## Data Contract

**CRITICAL:** Never put user-specific data in system layer files. Read `DATA_CONTRACT.md` before making changes.

## Testing

```bash
node scripts/verify-pipeline.mjs    # Health check
node scripts/merge-tracker.mjs --dry-run  # Test merge
```

## License

MIT. By contributing, you agree that your contributions will be licensed under MIT.
