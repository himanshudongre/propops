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
You paste a property listing URL
        |
        v
+----------------------+
|  Multi-Source Lookup  |  IGRS (prices), MahaRERA (builder), eCourts (litigation)
|  (Playwright + API)  |
+----------+-----------+
           |
+----------v-----------+
|  7-Block AI Analysis |  Price intel, builder score, risks, location,
|  (A-G Evaluation)    |  AI suggestions, negotiation strategy
+----------+-----------+
           |
    +------+------+----------+
    v      v      v          v
 Report   Score  Tracker   Telegram
  .md     /10    .md       Alert
```

## Data Sources

All data comes from **publicly available government portals**:

| Source | What It Provides | Trust Level |
|--------|-----------------|-------------|
| **IGRS Maharashtra** | Actual registration prices (what people really paid) | Highest |
| **MahaRERA** | Builder projects, complaints, compliance, delivery status | High |
| **eCourts India** | Litigation against builders/properties | High |
| **99acres / MagicBricks** | Current listings and asking prices | Medium |
| **WebSearch** | Market trends, builder news, area reviews | Context |

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
+-- scripts/                  # Scraping & utility scripts
|   +-- igrs-scraper.mjs      # IGRS registration prices (CAPTCHA-aware)
|   +-- maharera-scraper.mjs  # MahaRERA builder/project data
|   +-- ecourts-search.mjs    # Litigation search (API + Playwright)
|   +-- telegram-bot.mjs      # Telegram notifications
|   +-- forecast-engine.mjs   # Price trend analysis
|   +-- merge-tracker.mjs     # Tracker merge + dedup
|   +-- verify-pipeline.mjs   # Data health check
|   +-- scrapers/
|       +-- state-registry.mjs # Central config for all Indian state portals
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
| **Karnataka** (Bangalore) | ✅ Full (Kaveri) | ✅ Full | ✅ Via API | ✅ **Production** |
| **Tamil Nadu** (Chennai) | Planned | ✅ Full | ✅ Via API | 🚧 RERA live |
| **Telangana** (Hyderabad) | Planned | Planned | ✅ Via API | 📋 Roadmap |
| **Delhi NCR** (Delhi, Gurgaon, Noida) | Planned | Planned | ✅ Via API | 📋 Roadmap |
| **Uttar Pradesh** (Noida/Greater Noida) | Planned | Planned | ✅ Via API | 📋 Roadmap |

Karnataka Kaveri uses human-in-the-loop session handoff — you log in manually once (phone + OTP + CAPTCHA), and the session is reused for 8 hours. Aggressive caching minimizes re-login friction.

**Plus: Unified National RERA Portal** (`rera.mohua.gov.in`) — launched Sept 2025 by MoHUA, covers 35 states/UTs with 151,113+ projects. PropOps has a scraper for this as well (`rera-national.mjs`).

**eCourts litigation search works nationally** via the Kleopatra API wrapper — all states covered for legal case lookups. IGRS portals are state-specific.

The state registry (`scripts/scrapers/state-registry.mjs`) defines all configurations. Adding a new state is as simple as writing one scraper file matching the base interface.

### Contributing a New State

The highest-impact contribution to PropOps is adding IGRS/RERA scraper support for another Indian state. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent | Claude Code with 16 custom modes |
| Scraping | Playwright (IGRS, MahaRERA, property portals) |
| Litigation | eCourts API (Kleopatra) + Playwright fallback |
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
