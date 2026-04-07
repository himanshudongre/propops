# Contributing to PropOps

## How to Contribute

### Add Support for a New State

The most impactful contribution is adding IGRS/RERA scraper support for another Indian state.

1. Research the state's IGRS portal (registration data) and RERA portal
2. Create a new scraper in `scripts/` following the `maharera-scraper.mjs` pattern
3. Add state config to `templates/sources.example.yml`
4. Update `docs/DATA-SOURCES.md` with the new state
5. Test with real data and submit a PR

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
