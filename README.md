# PropOps

> Every property transaction in India is public record. Builders just hope you don't check.

AI-powered property transparency tool built on Claude Code. Scrapes government registries (IGRS, RERA, eCourts), scores properties, flags risks, suggests negotiation strategies, and alerts you on Telegram when matching properties appear.

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## The Problem

Indian real estate is one of the most opaque markets in the world:

- Builders quote **different prices to different buyers** based on how hard they negotiate
- **Litigation and complaints** are buried across government portals
- The **actual transaction price** (what people really paid) is public record on IGRS -- but nobody checks
- Hidden charges turn an Rs 80L flat into Rs 90L+
- Builder reputation is scattered across RERA, eCourts, and news articles

**All this data is public. It's just buried across dozens of government websites.**

PropOps makes it searchable, scored, and actionable.

## What It Does

PropOps covers the **entire property buying lifecycle** — from discovery to post-purchase enforcement of your rights.

### Discovery & Evaluation

| Feature | Description |
|---------|-------------|
| **Price Intelligence** | Pulls actual registration prices from IGRS. Shows what people REALLY paid vs what the builder quotes you. |
| **Builder Score** | Aggregates RERA compliance, delivery history, complaints, and litigation into a single score out of 10. |
| **Risk Assessment** | Red flags and green flags with data sources cited. Active litigation, delayed projects, missing RERA — all surfaced. |
| **AI Evaluation** | 7-block deep analysis: property summary, price intelligence, builder reputation, risks, location, recommendations, negotiation strategy. |
| **Price Forecasting** | AI-powered price trends and 12-month forecasts using historical registration data + infrastructure projects. |
| **Property Scanner** | 3-level scanner across property portals, RERA registrations, and web sources. Matches against your buyer brief. |

### Decision Support

| Feature | Description |
|---------|-------------|
| **Financial Analysis** | Affordability stress test, bank comparison (saves Rs 5-15L), buy vs rent, tax optimization, prepayment strategy, refinancing. |
| **Negotiation Intel** | Data-backed suggested offer price, negotiation scripts, hidden cost checklist, walk-away price. |
| **Agreement Review** | Parses builder agreements to flag one-sided clauses, missing RERA protections, vague specifications, and legal traps. Catches 80% of what a property lawyer would find. |
| **Site Visit Guide** | Generates a property-specific checklist tailored to the risks flagged in the evaluation. Questions to ask builders and residents. |
| **Due Diligence** | 7-section pre-purchase checklist: RERA, builder, litigation, price, title, physical, financial. |
| **Property Comparison** | Side-by-side comparison with weighted scoring, head-to-head metrics, and AI recommendation. |

### Builder Identity Resolution

A common critique of naive builder evaluation: the RERA "previous projects" field is often blank, so you'd evaluate Project C without knowing Project A by the same builder was a disaster. PropOps addresses this head-on with a fuzzy identity resolver.

| Feature | Description |
|---------|-------------|
| **Promoter Resolver** | Cross-references builder identity across legal entities using company name, directors, phones, email domains, and registered addresses. More robust than trusting RERA form fields. |
| **Entity Graph** | Visualizes all related legal entities and projects for a builder. Catches SPV structures most buyers never notice. |
| **Transparency** | Every report shows known limitations upfront. RERA data is a disclosure signal, not a quality guarantee — PropOps says so explicitly. |

### Post-Purchase Protection

| Feature | Description |
|---------|-------------|
| **Delay Tracking** | Calculates RERA Section 18 delay compensation (SBI MCLR + 2%) if builder misses possession date. Most buyers never claim this. |
| **OC & Society Tracking** | Monitors Occupancy Certificate status, society formation timeline (mandatory within 3 months of OC), maintenance corpus transfer. |
| **RERA Complaint Drafting** | Drafts a formal RERA complaint with proper legal references (Sections 11, 13, 14, 18, 19) when your rights are violated. |
| **Defect Liability Tracking** | Tracks the 5-year structural defect liability period. Helps you enforce rectification at builder's cost. |

### Infrastructure

| Feature | Description |
|---------|-------------|
| **Telegram Alerts** | Get notified on Telegram when matching properties hit the market. |
| **Batch Processing** | Evaluate 10+ properties in parallel with sub-agents. |
| **Pipeline Tracker** | Track every property from discovery through purchase. Status management, pipeline health checks, filtering. |
| **Dashboard TUI** | Go + Bubble Tea terminal UI with Catppuccin Mocha theme. 6 filter tabs, 4 sort modes. |

> **This is NOT a spam tool.** PropOps helps you make informed decisions. It never contacts builders or submits applications. You always have the final call.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/himanshudongre/propops.git
cd propops && npm install
npx playwright install chromium

# 2. Open Claude Code in this directory
claude

# 3. PropOps auto-detects it's a first run and guides you through setup:
#    - Your buyer brief (budget, locations, configuration)
#    - Your profile (name, timeline, loan status)
#    - Data sources (IGRS, RERA, eCourts config)
#    - Telegram alerts (optional)

# 4. Start using
# Paste a property listing URL, or run:
# /propops scan     - Search for properties
# /propops trend    - Price trends for an area
# /propops builder  - Check a developer's reputation
# /propops          - See all commands
```

## Usage

```
/propops                    Show all commands
/propops {paste URL}        Full evaluation (7-block report + score + negotiation tips)
/propops scan               Scan portals for new listings matching your brief
/propops evaluate           Deep property evaluation
/propops builder {name}     Developer reputation report
/propops litigation {name}  Check legal cases
/propops negotiate          Negotiation strategy with data
/propops trend {area}       Price trends + AI forecast
/propops compare            Side-by-side property comparison
/propops due-diligence      Full pre-purchase checklist
/propops alert              Configure Telegram alerts
/propops tracker            View property pipeline
/propops batch              Batch evaluate multiple properties
/propops finance            Financial analysis (affordability, EMI, bank comparison)
/propops finance buy-vs-rent  Should you buy or rent this property?
/propops finance refinance   Refinancing strategy for existing loan
/propops agreement-review   Review a builder agreement for one-sided clauses
/propops site-visit         Generate a property-specific site visit checklist
/propops post-purchase      Track delays, calculate penalties, draft RERA complaints
```

Or just paste a property URL or listing -- PropOps auto-detects it and runs the full pipeline.

## How It Works

```
  You paste a property URL, or ask about a builder/area
                        |
                        v
          +-------------------------+
          |  CLAUDE.md routes to    |
          |  the right mode (19)    |
          +------------+------------+
                       |
          +------------v------------+
          |   State Detection       |  Detects which state from
          |   (state-registry.mjs)  |  address, city, or RERA ID
          +------------+------------+
                       |
       +---------------+---------------+------------------+
       v               v               v                  v
  +----------+   +----------+   +----------+       +-----------+
  | IGRS     |   | RERA     |   | eCourts  |       | Property  |
  | (prices) |   | (builder)|   |(litigation)|     | Portals   |
  +----+-----+   +----+-----+   +----+-----+       +-----+-----+
       |              |              |                    |
  Per-state:     Per-state:    National API         WebSearch:
  - Maharashtra  - MahaRERA    - Kleopatra          - 99acres
  - Kaveri (KA)  - K-RERA      - Playwright         - MagicBricks
  - Telangana    - TG-RERA       fallback           - Housing.com
  - (more)       - TNRERA
                 - UP-RERA
                 + MoHUA unified portal
                       |
          +------------v------------+
          |  Promoter Resolver      |  Fuzzy match across legal
          |  (cross-entity linkage) |  entities (name, phones,
          +------------+------------+  directors, addresses, PIN)
                       |
          +------------v------------+
          |  7-Block AI Analysis    |  A: Summary
          |  (A-G Evaluation)       |  B: Price Intelligence
          +------------+------------+  C: Builder Score
                       |                D: Risk Flags
                       |                E: Location
                       |                F: AI Recommendation
                       |                G: Negotiation
                       |
       +---------------+----------------+---------------+
       v               v                v               v
   Reports       Tracker          Telegram        Dashboard
   (.md)         (properties.md)  Alerts          (Go TUI)

Plus lifecycle modes for post-decision actions:
   agreement-review - parse builder contracts for legal traps
   site-visit       - generate property-specific inspection checklist
   post-purchase    - track delays, draft RERA complaints, OC status
   finance          - affordability, bank comparison, buy-vs-rent, tax
```

## Data Sources

All data comes from **publicly available government portals**:

### Registration Prices (What People Actually Paid)

| Source | State/Coverage | Trust Level |
|--------|---------------|-------------|
| **IGRS Maharashtra** (`freesearchigrservice.maharashtra.gov.in`) | Mumbai from 1985, rest of MH from 2002 | Highest |
| **Kaveri Karnataka** (`kaveri.karnataka.gov.in`) | Bangalore and all Karnataka, OTP login required | Highest |
| **IGRS Telangana** (`registration.telangana.gov.in`) | Hyderabad and all 33 districts from 1983 | Highest |

### Builder & Project Registrations (RERA)

| Source | State/Coverage | Trust Level |
|--------|---------------|-------------|
| **MahaRERA** (`maharera.maharashtra.gov.in`) | All Maharashtra RERA-registered projects | High |
| **K-RERA** (`rera.karnataka.gov.in`) | All Karnataka RERA projects | High |
| **TG-RERA** (`rera.telangana.gov.in`) | Hyderabad metro + all Telangana | High |
| **TNRERA** (`rera.tn.gov.in`) | Chennai + Tamil Nadu + Andaman & Nicobar | High |
| **UP-RERA** (`www.up-rera.in`) | Noida, Greater Noida, Ghaziabad + all UP | High |
| **Unified RERA (MoHUA)** (`rera.mohua.gov.in`) | National aggregator, 35 states, 151K+ projects | High |

### Litigation

| Source | Coverage | Trust Level |
|--------|----------|-------------|
| **eCourts (Kleopatra API)** | 700+ district courts, High Courts, NCLT, Consumer Forum — all India | High |
| **eCourts Playwright fallback** | Same, when API is unavailable | High |

### Market Data (for Context)

| Source | What It Provides | Trust Level |
|--------|-----------------|-------------|
| **99acres / MagicBricks / Housing.com** | Current listings and asking prices | Medium |
| **WebSearch / WebFetch** | Market trends, bank rates, builder news, area reviews | Context only |

## Scoring System

Properties are scored across **10 weighted dimensions** on a scale of 1-10:

| Dimension | Weight |
|-----------|--------|
| Price fairness (quoted vs actual registrations) | 20% |
| Builder trust (RERA, delivery, litigation) | 15% |
| Location quality (connectivity, infrastructure) | 15% |
| Legal clarity (title, encumbrance, litigation) | 15% |
| Appreciation potential (trends, infrastructure) | 10% |
| Configuration match (vs your buyer brief) | 10% |
| Livability (schools, hospitals, daily needs) | 5% |
| Rental yield (investment potential) | 5% |
| Possession risk (builder delivery history) | 3% |
| Hidden costs (transparency of total cost) | 2% |

**Interpretation:** 8.0+ = Strong buy | 6.0-7.9 = Consider | 4.0-5.9 = Caution | <4.0 = Avoid

## Project Structure

```
propops/
+-- CLAUDE.md                 # Agent instructions
+-- buyer-brief.md            # Your requirements (created during onboarding)
+-- config/
|   +-- profile.yml           # Your identity & preferences
+-- modes/                    # 19 skill modes
|   +-- _shared.md            # Scoring system & global rules
|   +-- evaluate.md           # 7-block A-G evaluation
|   +-- auto-pipeline.md      # Paste URL -> full report
|   +-- scan.md               # Property scanner (3-level)
|   +-- builder.md            # Builder reputation deep-dive
|   +-- negotiate.md          # Data-backed negotiation strategy
|   +-- finance.md            # Affordability, bank comparison, buy-vs-rent, tax
|   +-- trend.md              # Price trends + AI forecasting
|   +-- compare.md            # Side-by-side property comparison
|   +-- litigation.md         # Legal case search
|   +-- due-diligence.md      # Pre-purchase checklist
|   +-- agreement-review.md   # Builder agreement legal review
|   +-- site-visit.md         # Property-specific site visit guide
|   +-- post-purchase.md      # Delay tracking, OC, RERA complaints
|   +-- alert.md              # Telegram alert configuration
|   +-- tracker.md            # Pipeline management
|   +-- batch.md              # Parallel evaluation
+-- scripts/                        # Utility scripts + scrapers
|   +-- igrs-scraper.mjs            # IGRS Maharashtra (CAPTCHA-aware)
|   +-- maharera-scraper.mjs        # MahaRERA builder/project data
|   +-- ecourts-search.mjs          # Litigation search (API + Playwright)
|   +-- telegram-bot.mjs            # Telegram notifications
|   +-- forecast-engine.mjs         # Price trend analysis
|   +-- merge-tracker.mjs           # Tracker merge + dedup
|   +-- verify-pipeline.mjs         # Data health check
|   +-- promoter-resolver.mjs       # Fuzzy builder identity resolution
|   +-- scrapers/
|       +-- state-registry.mjs      # Central config for all Indian state portals
|       +-- rera-national.mjs       # MoHUA unified RERA portal (35 states)
|       +-- kaveri-karnataka.mjs    # Karnataka IGRS (OTP login)
|       +-- krera-karnataka.mjs     # Karnataka RERA
|       +-- igrs-telangana.mjs      # Telangana IGRS (CAPTCHA-aware)
|       +-- tsrera.mjs              # Telangana RERA
|       +-- tnrera.mjs              # Tamil Nadu RERA (easiest, static PHP)
|       +-- uprera.mjs              # UP-RERA (Noida/Greater Noida/Ghaziabad)
+-- data/                     # Tracker, cache, history (gitignored)
+-- reports/                  # Generated evaluation reports (gitignored)
+-- templates/                # Config templates
+-- dashboard/                # Go TUI (Bubble Tea, Catppuccin Mocha theme)
+-- batch/                    # Parallel processing (shell orchestrator)
+-- docs/                     # Setup, architecture, data sources
```

## Telegram Alerts

Get notified when matching properties appear:

```
New Property Match!

Project: Godrej Infinity, Keshav Nagar, Pune
Builder: Godrej Properties (Score: 8.2/10)
Config: 2 BHK | 650 sqft carpet
Price: Rs 78L (Rs 12,000/sqft)
Area avg: Rs 11,200/sqft (+7% above avg)
RERA: Registered
Flags: 1 delayed project in area

Run /propops evaluate for full report
```

## Currently Supported

### State-by-State Support

| State | IGRS (Actual Prices) | RERA | eCourts | Status |
|-------|---------------------|------|---------|--------|
| **Maharashtra** (Mumbai, Pune, Thane) | ✅ Full | ✅ Full | ✅ Full | ✅ Production |
| **Karnataka** (Bangalore) | ✅ Full (Kaveri) | ✅ Full | ✅ Via API | ✅ Production |
| **Telangana** (Hyderabad) | ✅ **Full** | ✅ **Full** | ✅ Via API | ✅ **Production** |
| **Uttar Pradesh** (Noida, Greater Noida, Ghaziabad) | Planned | ✅ **Full** | ✅ Via API | 🚧 **RERA live** |
| **Tamil Nadu** (Chennai) | Planned | ✅ Full | ✅ Via API | 🚧 RERA live |
| **Delhi NCR** (Delhi, Gurgaon) | Planned | Planned | ✅ Via API | 📋 Roadmap |

**Plus: Unified National RERA Portal** (`rera.mohua.gov.in`) — launched September 2025 by MoHUA. Aggregates 35 states/UTs with 151,113+ projects, 106,545+ agents, 147,383+ disposed complaints. PropOps has a scraper for this (`rera-national.mjs`).

**eCourts litigation search works nationally** via the Kleopatra API wrapper (with Playwright fallback) — all states covered for legal case lookups. IGRS portals are state-specific.

Karnataka Kaveri and IGRS Telangana use human-in-the-loop authentication — you solve the CAPTCHA (or log in manually once for Kaveri), and the agent handles the rest. Aggressive caching minimizes friction.

The state registry (`scripts/scrapers/state-registry.mjs`) defines all configurations. Adding a new state is as simple as writing one scraper file matching the base interface.

### Contributing a New State

The highest-impact contribution to PropOps is adding IGRS/RERA scraper support for another Indian state. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent | Claude Code with 19 custom modes |
| Scraping | Playwright (IGRS, RERA portals across 5 states, property portals) |
| State Routing | `state-registry.mjs` — central config mapping cities/states to scrapers |
| Builder Linkage | `promoter-resolver.mjs` — fuzzy identity resolution across legal entities |
| Litigation | eCourts API (Kleopatra, free tier) + Playwright fallback |
| Market Data | WebSearch + WebFetch for trends, rates, news |
| Alerts | Telegram Bot API |
| Data | Markdown tables + YAML config + TSV batch |
| Dashboard | Go + Bubble Tea (Catppuccin Mocha theme) |
| Batch | Bash orchestrator + `claude -p` workers |

## Why Open Source

Real estate transparency shouldn't be a premium feature. Every piece of data PropOps uses is already public -- it's just scattered across government portals that most buyers don't know about or don't have the patience to navigate.

If PropOps saves you even 1% on your property purchase, that's lakhs of rupees. It should be free.

## License

MIT

## Documentation

- [SETUP.md](docs/SETUP.md) -- Installation and configuration guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) -- System design and data flow
- [DATA-SOURCES.md](docs/DATA-SOURCES.md) -- Government portals and trust hierarchy

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. The most impactful contribution is adding scraper support for a new Indian state.
