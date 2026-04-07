---
name: propops
description: AI-powered property transparency tool. Evaluate properties, scan portals, check builders, negotiate prices, get Telegram alerts.
command: propops
---

# PropOps Skill

When this skill is triggered, read `CLAUDE.md` in the project root for full instructions.

## Quick Command Reference

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

## Routing

1. If the user pastes a URL (99acres, MagicBricks, Housing.com, or any property listing), read `modes/auto-pipeline.md` and execute.
2. If the user specifies a subcommand, read the corresponding `modes/{command}.md` and execute.
3. If no subcommand, show the command reference table above.
4. Always read `modes/_shared.md` first, then `modes/_profile.md` for overrides.
5. Always read `buyer-brief.md` before any evaluation or scan.
