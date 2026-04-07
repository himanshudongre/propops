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

| Feature | Description |
|---------|-------------|
| **Price Intelligence** | Pulls actual registration prices from IGRS. Shows what people REALLY paid vs what the builder quotes you. |
| **Builder Score** | Aggregates RERA compliance, delivery history, complaints, and litigation into a single score out of 10. |
| **Risk Assessment** | Red flags and green flags with data sources cited. Active litigation, delayed projects, missing RERA -- all surfaced. |
| **AI Evaluation** | 7-block deep analysis: property summary, price intelligence, builder reputation, risks, location, recommendations, negotiation strategy. |
| **Negotiation Intel** | Data-backed suggested offer price, negotiation scripts, hidden cost checklist, walk-away price. |
| **Price Forecasting** | AI-powered price trends and 12-month forecasts using historical registration data + infrastructure projects. |
| **Telegram Alerts** | Get notified on Telegram when matching properties hit the market. |
| **Batch Processing** | Evaluate 10+ properties in parallel with sub-agents. |
| **Financial Analysis** | Affordability stress test, bank comparison (saves Rs 5-15L), buy vs rent, tax optimization, prepayment strategy, refinancing. |
| **Pipeline Tracker** | Track every property from discovery through purchase. |

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
+-- modes/                    # 16 skill modes
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

- **Maharashtra** -- IGRS, MahaRERA, Pune & Mumbai districts
- More states coming (UP, Karnataka, Telangana planned)

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
