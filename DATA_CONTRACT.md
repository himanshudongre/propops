# PropOps Data Contract

## Principle

PropOps separates files into two layers. The system layer can be updated automatically (e.g., via `scripts/update-system.mjs`). The user layer is NEVER touched by updates -- it contains personal data, preferences, and generated work product.

**THE RULE: If it's about the USER (their budget, location, preferences, evaluations), it goes in the user layer. If it's about the SYSTEM (scoring logic, mode instructions, scripts), it goes in the system layer.**

---

## User Layer (NEVER auto-updated)

These files belong to the user. Updates will NEVER modify, replace, or delete them.

| File | Purpose |
|------|---------|
| `buyer-brief.md` | Buyer requirements: budget, locations, config, deal-breakers |
| `config/profile.yml` | Buyer identity: name, timeline, loan status, family size |
| `modes/_profile.md` | Custom scoring weights, builder blacklist, personal overrides |
| `sources.yml` | Configured data sources with user's target areas |
| `telegram-config.yml` | Telegram bot token, chat IDs, alert preferences |
| `data/properties.md` | Property tracker (main pipeline) |
| `data/watchlist.md` | Monitored areas and projects |
| `data/scan-history.tsv` | Scanner dedup history |
| `data/registration-cache/*` | Cached IGRS results |
| `data/builder-cache/*` | Cached builder/RERA data |
| `data/price-history/*` | Historical price trend data |
| `reports/*` | Generated evaluation reports |

## System Layer (auto-updatable)

These files define system behavior. They can be replaced by updates without losing user data.

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Master agent orchestration |
| `DATA_CONTRACT.md` | This file |
| `modes/_shared.md` | Scoring system, evaluation logic, global rules |
| `modes/evaluate.md` | 7-block A-G evaluation instructions |
| `modes/auto-pipeline.md` | Paste-URL-to-report pipeline |
| `modes/scan.md` | Property scanner instructions |
| `modes/builder.md` | Builder reputation mode |
| `modes/litigation.md` | Litigation search mode |
| `modes/negotiate.md` | Negotiation strategy mode |
| `modes/trend.md` | Price trend & forecast mode |
| `modes/compare.md` | Property comparison mode |
| `modes/due-diligence.md` | Pre-purchase checklist mode |
| `modes/alert.md` | Telegram alert configuration mode |
| `modes/tracker.md` | Pipeline viewer mode |
| `modes/batch.md` | Batch evaluation mode |
| `modes/_profile.template.md` | Template for user's _profile.md |
| `scripts/*.mjs` | All utility scripts |
| `batch/batch-prompt.md` | Batch worker prompt |
| `batch/batch-runner.sh` | Batch orchestrator |
| `templates/*` | Configuration templates |
| `dashboard/*` | Go TUI source code |
| `fonts/*` | PDF report fonts |
| `docs/*` | Documentation |
| `examples/*` | Sample files |
| `package.json` | Dependencies |
| `VERSION` | Current version |

## Override Rule

When both `_shared.md` and `_profile.md` define the same setting (e.g., scoring weights, deal-breakers), **`_profile.md` always wins.** Read `_shared.md` first for defaults, then `_profile.md` for overrides.
