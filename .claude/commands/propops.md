Read CLAUDE.md in the project root for full instructions. Then execute the PropOps command.

## Command Reference

| Command | Action |
|---------|--------|
| `/propops` | Show all available commands |
| `/propops {URL}` | Full auto-pipeline: evaluate + report + tracker |
| `/propops scan` | Scan portals for new listings |
| `/propops evaluate` | Deep property evaluation |
| `/propops builder {name}` | Developer reputation report |
| `/propops litigation {name}` | Legal case search |
| `/propops negotiate` | Negotiation strategy with data |
| `/propops trend {area}` | Price trends + AI forecast |
| `/propops compare` | Side-by-side property comparison |
| `/propops due-diligence` | Pre-purchase checklist |
| `/propops alert` | Configure Telegram alerts |
| `/propops tracker` | View property pipeline |
| `/propops batch` | Batch evaluate properties |
| `/propops finance` | Financial analysis (affordability, EMI, bank comparison, tax) |
| `/propops finance buy-vs-rent` | Should you buy or rent this property? |
| `/propops finance refinance` | Refinancing strategy for existing loan |
| `/propops agreement-review` | Review a builder agreement for one-sided clauses and missing RERA protections |
| `/propops site-visit` | Generate a property-specific site visit checklist |
| `/propops post-purchase` | Track delays, OC status, society formation, draft RERA complaints |

## Routing

1. If the user provides arguments that look like a URL, read `modes/auto-pipeline.md` and execute.
2. If the argument is a subcommand (scan, evaluate, builder, etc.), read the corresponding `modes/{command}.md` and execute.
3. If no argument, show the command reference table above.
4. Always read `modes/_shared.md` first, then `modes/_profile.md` for overrides.
5. Always read `buyer-brief.md` before any evaluation or scan.

$ARGUMENTS
