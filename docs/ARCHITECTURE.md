# PropOps Architecture

## System Overview

```
User ──→ Claude Code ──→ CLAUDE.md (routes intent to 17 modes)
                              │
                 ┌────────────┼────────────┬─────────────┐
                 ▼            ▼            ▼             ▼
            evaluate.md   scan.md    builder.md    agreement-review.md
                 │            │            │             │
                 └────────────┴────────────┴─────────────┘
                              │
                              ▼
                   State Routing Layer
                   (scripts/scrapers/state-registry.mjs)
                              │
   ┌──────────────────────────┼─────────────────────────────┐
   ▼                          ▼                             ▼

IGRS (Prices)           RERA (Builders)              eCourts
├── Maharashtra          ├── MahaRERA                 ├── Kleopatra API (national)
├── Kaveri Karnataka     ├── K-RERA (Karnataka)       └── Playwright fallback
├── Telangana            ├── TG-RERA (Telangana)
└── (more planned)       ├── TNRERA (Tamil Nadu)
                         ├── UP-RERA (UP/NCR)
                         └── MoHUA Unified (national)

   │                          │                             │
   └──────────────────────────┼─────────────────────────────┘
                              │
                              ▼
                   Promoter Resolver
                   (cross-entity identity linking)
                              │
                              ▼
                   7-Block AI Analysis
                   (A: Summary, B: Price, C: Builder,
                    D: Risk, E: Location, F: AI Rec, G: Negotiate)
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
        reports/*.md    data/properties.md   Telegram Bot
        (evaluation)    (tracker pipeline)   (alerts)
                              │
                              ▼
                        Dashboard TUI
                        (Go + Bubble Tea)

Plus lifecycle modes (run after evaluation):
  - agreement-review → parse builder contracts
  - site-visit       → property-specific inspection checklist
  - post-purchase    → delay tracking, RERA complaint drafting
  - finance          → affordability, bank comparison, buy-vs-rent, tax
```

## Data Flow

### Single Property Evaluation

```
URL or property description
        │
        ▼
[auto-pipeline.md]
  1. Extract listing details (Playwright or WebFetch)
  2. Detect property category and state
        │
        ▼
[state-registry.mjs]
  Determine which state scrapers to use based on city/address
        │
        ▼
[Parallel data fetch]
  ├── IGRS state scraper → actual registration prices
  ├── State RERA scraper → builder and project data
  ├── eCourts (Kleopatra API) → litigation
  └── WebSearch → market context, news
        │
        ▼
[promoter-resolver.mjs]
  Resolve builder identity across related legal entities
  (fixes the "previous projects field is empty" problem)
        │
        ▼
[evaluate.md — 7 Blocks]
  A. Property Summary (listing + RERA cross-reference)
  B. Price Intelligence (IGRS registrations vs quoted)
  C. Builder Reputation (RERA + eCourts + aggregated across entities)
  D. Risk Assessment (red flags / green flags)
  E. Location & Livability (connectivity, infra, safety)
  F. AI Recommendation (YES / NO / WAIT)
  G. Negotiation Intelligence (data-backed strategy)
        │
        ▼
  Calculate Global Score (1-10, weighted 10 dimensions, risk-adjusted)
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
  State tracked in batch/batch-state.tsv (resumable)
        │
  ┌─────┼─────┐
  ▼     ▼     ▼
reports/ tracker-additions/ logs/
        │
        ▼
[merge-tracker.mjs]
  Dedup + merge into data/properties.md
```

### Post-Purchase Flow

```
Booked property (in tracker)
        │
        ▼
[post-purchase.md]
  ├── Track construction milestones vs RERA schedule
  ├── Calculate delay compensation (RERA Sec 18: SBI MCLR + 2%)
  ├── Track OC application status
  ├── Monitor society formation timeline
  └── Draft RERA complaint if needed
        │
        ▼
  data/post-purchase/{property-slug}.md
```

## Mode System

Each mode is a complete markdown prompt file in `modes/`. CLAUDE.md routes user intent to the right mode.

### Discovery & Evaluation

| Mode | File | When |
|------|------|------|
| Auto-pipeline | `auto-pipeline.md` | User pastes a URL |
| Evaluate | `evaluate.md` | Deep property analysis (7 blocks A-G) |
| Scan | `scan.md` | Find new listings (3-level discovery) |
| Builder | `builder.md` | Developer reputation (uses promoter resolver) |
| Negotiate | `negotiate.md` | Data-backed negotiation strategy |
| Trend | `trend.md` | Price trends + AI forecast |
| Compare | `compare.md` | Side-by-side comparison (2-4 properties) |
| Litigation | `litigation.md` | Legal case search via eCourts |

### Decision Support

| Mode | File | When |
|------|------|------|
| Finance | `finance.md` | Affordability, EMI, bank comparison, buy-vs-rent, tax, refinancing |
| Agreement Review | `agreement-review.md` | Parse builder contracts for one-sided clauses |
| Site Visit | `site-visit.md` | Property-specific inspection checklist |
| Due Diligence | `due-diligence.md` | 7-section pre-purchase checklist |

### Post-Purchase & Tracking

| Mode | File | When |
|------|------|------|
| Post-Purchase | `post-purchase.md` | Delay tracking, RERA complaints, OC status |
| Tracker | `tracker.md` | Pipeline management |
| Alert | `alert.md` | Telegram alert configuration |
| Batch | `batch.md` | Parallel evaluation |

### System Files

| File | Purpose |
|------|---------|
| `_shared.md` | Scoring system + global rules (auto-updatable) |
| `_profile.template.md` | Template for user's `_profile.md` (user copies on first run) |

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
| Builder trust | 15% | RERA (state-specific) + eCourts |
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

### State Registry (Central Config)

`scripts/scrapers/state-registry.mjs` maps every Indian state/UT to:
- IGRS portal URL, tech stack, difficulty
- RERA portal URL, scraper file, difficulty
- Which scraper to load based on the user's city

This is the entry point — modes don't hardcode state assumptions, they consult the registry.

### IGRS Scrapers (Registration Prices)

**Maharashtra** (`scripts/igrs-scraper.mjs`)
```
Playwright → freesearchigrservice.maharashtra.gov.in → Fill form
  → CAPTCHA screenshot → User solves in chat → Submit
  → Extract table → Cache 7 days
```

**Karnataka Kaveri** (`scripts/scrapers/kaveri-karnataka.mjs`)
```
First run: Playwright (headful) → User logs in (phone + OTP + CAPTCHA)
  → Session saved to data/kaveri-session.json (8-hour validity)
Subsequent runs: Playwright (headless) → Load session cookies
  → Query EC/market value/deed → Extract → Cache 7 days
```

**Telangana** (`scripts/scrapers/igrs-telangana.mjs`)
```
Playwright → registration.telangana.gov.in → Fill form
  → CAPTCHA screenshot → User solves → Submit
  → Extract results → Cache 7 days
```

### RERA Scrapers (Builder/Project Data)

**MahaRERA** (`scripts/maharera-scraper.mjs`)
```
Portal A (Drupal, primary) → GET params → HTML table → Parse
  │ fallback
Portal B (ASP.NET) → Form POST → Anti-forgery token → Parse
  → Cache 30 days
```

**K-RERA Karnataka** (`scripts/scrapers/krera-karnataka.mjs`)
```
Playwright → rera.karnataka.gov.in → Public HTML tables
  → Paginated extraction → Cache 30 days
```

**TG-RERA Telangana** (`scripts/scrapers/tsrera.mjs`)
```
Playwright → rerait.telangana.gov.in (ASP.NET MVC)
  → Public search, no CAPTCHA → Paginated → Cache 30 days
```

**TNRERA Tamil Nadu** (`scripts/scrapers/tnrera.mjs`)
```
Fetch static PHP pages by year:
  /cms/reg_projects_tamilnadu/Building/{year}.php
  → Parse HTML table → Cache 30 days
(Easiest RERA portal in India)
```

**UP-RERA** (`scripts/scrapers/uprera.mjs`)
```
Playwright → www.up-rera.in (ASP.NET WebForms on Azure)
  → ViewState handling → District filter (Gautam Budh Nagar = Noida)
  → Paginated extraction → Cache 30 days
```

**MoHUA Unified (National)** (`scripts/scrapers/rera-national.mjs`)
```
Playwright → rera.mohua.gov.in → Static HTML pages
  → Extract tracker stats, state portal links, dataset info
  → Cache 30 days
NOTE: Portal aggregates stats but deep-links to state portals
for full project details. Use as discovery layer, not primary.
```

### eCourts (Litigation)

```
Primary: Kleopatra REST API (court-api.kleopatra.io)
  → JSON response → Categorize (consumer/civil/criminal/NCLT)
  → Cache 30 days
Fallback: Playwright → services.ecourts.gov.in → Party search
  → Extract results
```

### Promoter Resolver

`scripts/promoter-resolver.mjs` reads all cached RERA data from `data/builder-cache/` and fuzzy-matches builder identity across legal entities:

```
Load cached entities from all RERA scrapers
         │
         ▼
For each entity, calculate similarity with seed builder:
  - Company name (normalized, 35% weight)
  - Phone numbers (20%)
  - Email domain (15%)
  - Address + PIN (15%)
  - Directors (15%)
         │
         ▼
Group by verdict:
  - very_likely_same (>= 0.7)
  - likely_same (0.5-0.7)
  - possibly_related (0.3-0.5)
         │
         ▼
Aggregate projects across all matched entities
```

This addresses the Reddit critique that "RERA previous projects field is often empty" by NOT relying on that form field and instead resolving identity across multiple signals.

## Cache Strategy

| Source | Cache Location | TTL | Reason |
|--------|---------------|-----|--------|
| IGRS Maharashtra | `data/registration-cache/igrs-*` | 7 days | Prices change, CAPTCHA costs |
| IGRS Telangana | `data/registration-cache/igrs-tg-*` | 7 days | Same |
| Kaveri Karnataka | `data/registration-cache/kaveri-*` | 7 days | Same + session limit |
| Kaveri session | `data/kaveri-session.json` | 8 hours | Portal session validity |
| MahaRERA | `data/builder-cache/maharera-*` | 30 days | Builder data slow-changing |
| K-RERA | `data/builder-cache/krera-*` | 30 days | Same |
| TG-RERA | `data/builder-cache/tsrera-*` | 30 days | Same |
| TNRERA | `data/builder-cache/tnrera-*` | 30 days | Same |
| UP-RERA | `data/builder-cache/uprera-*` | 30 days | Same |
| MoHUA | `data/builder-cache/rera-national-*` | 30 days | Weekly tracker |
| eCourts | `data/builder-cache/ecourts-*` | 30 days | Cases don't change daily |

## State Support Matrix

| State | IGRS | RERA | eCourts | Difficulty |
|-------|------|------|---------|-----------|
| Maharashtra | Full | Full | Full | Medium (IGRS CAPTCHA) |
| Karnataka | Full (Kaveri) | Full | Via API | HIGH (OTP login) |
| Telangana | Full | Full | Via API | Medium-High (IGRS CAPTCHA) |
| Tamil Nadu | Planned | Full | Via API | LOW (easiest) |
| Uttar Pradesh | Planned | Full (NCR) | Via API | Low-Medium |
| Delhi NCR | Planned | Planned | Via API | Medium (NGDRS migration) |
| + National aggregate | — | MoHUA unified | — | Low |

See `scripts/scrapers/state-registry.mjs` for full configuration of each state including portal URLs, tech stacks, difficulty ratings, and build priority.
