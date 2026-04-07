# PropOps Architecture

## System Overview

```
User ──→ Claude Code ──→ CLAUDE.md (routes intent to mode)
                              │
                   ┌──────────┼──────────┬──────────┐
                   ▼          ▼          ▼          ▼
              evaluate.md  scan.md  builder.md  negotiate.md  ...
                   │          │          │          │
         ┌─────────┴──────────┴──────────┴──────────┘
         ▼
    Data Sources (Playwright + API + WebSearch)
    ├── IGRS Maharashtra    → Actual registration prices
    ├── MahaRERA Portal     → Builder projects, complaints, RERA status
    ├── eCourts India       → Litigation against builders
    ├── Property Portals    → Current listings (99acres, MagicBricks)
    └── WebSearch           → Market trends, news, reviews
         │
         ▼
    Output Layer
    ├── reports/*.md        → Evaluation reports (7-block A-G)
    ├── data/properties.md  → Property tracker pipeline
    ├── Telegram Bot        → Push notifications
    └── Dashboard TUI       → Visual pipeline browser
```

## Data Flow

### Single Property Evaluation

```
URL or property description
        │
        ▼
[auto-pipeline.md]
  1. Extract listing details (Playwright or WebFetch)
  2. Detect property category
        │
        ▼
[evaluate.md — 7 Blocks]
  A. Property Summary (listing + RERA cross-reference)
  B. Price Intelligence (IGRS registration prices)
  C. Builder Reputation (MahaRERA + eCourts + WebSearch)
  D. Risk Assessment (red flags / green flags)
  E. Location & Livability (connectivity, infra, safety)
  F. AI Recommendation (YES / NO / WAIT)
  G. Negotiation Intelligence (data-backed strategy)
        │
        ▼
  Calculate Global Score (1-10, weighted 10 dimensions)
        │
  ┌─────┼─────┬─────────┐
  ▼     ▼     ▼         ▼
Report  TSV  Tracker   Telegram
 .md   file   .md      Alert
```

### Batch Processing

```
data/watchlist.md or user-provided URLs
        │
        ▼
[batch/batch-runner.sh]
  Spawns N parallel workers (claude -p)
  Each worker uses batch-prompt.md
  State tracked in batch/batch-state.tsv
        │
  ┌─────┼─────┐
  ▼     ▼     ▼
reports/ tracker-additions/ logs/
        │
        ▼
[merge-tracker.mjs]
  Dedup + merge into data/properties.md
```

## Mode System

Each mode is a complete markdown prompt file in `modes/`. CLAUDE.md routes user intent to the right mode.

| Mode | File | When |
|------|------|------|
| Auto-pipeline | `auto-pipeline.md` | User pastes a URL |
| Evaluate | `evaluate.md` | Deep property analysis |
| Scan | `scan.md` | Find new listings |
| Builder | `builder.md` | Developer reputation |
| Negotiate | `negotiate.md` | Price negotiation strategy |
| Compare | `compare.md` | Side-by-side comparison |
| Trend | `trend.md` | Price trends + forecast |
| Litigation | `litigation.md` | Legal case search |
| Due Diligence | `due-diligence.md` | Pre-purchase checklist |
| Tracker | `tracker.md` | Pipeline management |
| Finance | `finance.md` | Affordability, EMI, bank comparison, buy-vs-rent, tax, refinancing |
| Alert | `alert.md` | Telegram configuration |
| Batch | `batch.md` | Parallel evaluation |

### Mode Loading Order

1. Read `_shared.md` (system defaults — scoring, rules, tools)
2. Read `_profile.md` (user overrides — custom weights, deal-breakers)
3. Read `buyer-brief.md` (buyer requirements)
4. Execute mode-specific logic

**Rule: `_profile.md` overrides `_shared.md`.** User customizations always win.

## Scoring System

10 weighted dimensions, score 1-10:

| Dimension | Weight | Source |
|-----------|--------|--------|
| Price fairness | 20% | IGRS registrations vs quoted |
| Builder trust | 15% | MahaRERA + eCourts |
| Location quality | 15% | WebSearch + infrastructure |
| Legal clarity | 15% | eCourts + RERA status |
| Appreciation potential | 10% | IGRS trends + infra projects |
| Configuration match | 10% | vs buyer-brief.md |
| Livability | 5% | Connectivity, amenities |
| Rental yield | 5% | Market estimates |
| Possession risk | 3% | Builder delivery history |
| Hidden costs | 2% | Cost transparency |

Risk adjustments subtract from score:
- Not RERA registered: -2.0
- Active litigation: -1.0 per case
- Delayed projects: -0.5 each
- No OC for ready property: -1.5

## Data Contract

Strict separation between user data (never auto-updated) and system data (safe to update). See `DATA_CONTRACT.md` for the full specification.

## Scraper Architecture

### IGRS (Registration Prices)
```
Playwright → IGRS portal → Fill form → CAPTCHA screenshot
  → User solves CAPTCHA → Submit → Extract table → Cache 7 days
```

### MahaRERA (Builder/Project Data)
```
Portal A (Drupal, primary) → GET params → HTML table → Parse
  │ fallback
Portal B (ASP.NET) → Form POST → Anti-forgery token → Parse
  → Cache 30 days
```

### eCourts (Litigation)
```
ECIAPI/Kleopatra (primary) → REST API → JSON → Categorize
  │ fallback
Playwright → eCourts portal → Party search → Extract → Cache 30 days
```

## Cache Strategy

| Source | Cache Location | TTL | Reason |
|--------|---------------|-----|--------|
| IGRS | `data/registration-cache/` | 7 days | Prices change frequently |
| MahaRERA | `data/builder-cache/` | 30 days | Builder data changes slowly |
| eCourts | `data/builder-cache/` | 30 days | Cases don't change daily |
