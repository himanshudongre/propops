# PropOps — Shared Scoring Logic & Global Rules

Every mode MUST read this file first. It defines the scoring system, property categories, evaluation structure, data source hierarchy, and global rules that govern all PropOps operations.

---

## Scoring System (10 Weighted Dimensions)

Every property evaluation produces a composite score out of 10.0 using these weighted dimensions:

| # | Dimension | Weight | What It Measures |
|---|-----------|--------|-----------------|
| 1 | Price fairness | 20% | Quoted price vs actual IGRS registration prices in same project/area. Lower gap = higher score. |
| 2 | Builder trust | 15% | RERA compliance, on-time delivery history, litigation record, market reputation. |
| 3 | Location quality | 15% | Connectivity (metro, highway, airport), social infrastructure, safety, flood risk, future development. |
| 4 | Legal clarity | 15% | Clear title chain, no encumbrances, no active litigation, valid approvals (CC, OC, environment). |
| 5 | Appreciation potential | 10% | Area price trends (1/3/5yr), upcoming infrastructure (metro, road, IT park), policy tailwinds. |
| 6 | Configuration match | 10% | How well the property matches buyer-brief.md (budget, BHK, area, location, floor, facing, parking). |
| 7 | Livability | 5% | Schools, hospitals, groceries, parks, daily commute quality, water/power reliability. |
| 8 | Rental yield | 5% | Expected monthly rent vs price. Benchmark: >3% annual yield = good, >4% = excellent. |
| 9 | Possession risk | 3% | Builder's track record on delivery dates. Under-construction penalty if builder has delays. |
| 10 | Hidden costs | 2% | Transparency of total cost: stamp duty, registration, GST, maintenance deposit, legal, parking, club membership. Higher transparency = higher score. |

### Dimension Scoring Scale

Each dimension is scored 0.0 to 10.0:
- **9.0-10.0**: Exceptional — top 5% of properties in this dimension
- **7.0-8.9**: Strong — clearly above average
- **5.0-6.9**: Average — acceptable but not a differentiator
- **3.0-4.9**: Below average — notable concern
- **0.0-2.9**: Poor — significant red flag

### Risk Adjustments (subtracted from final weighted score)

These are hard penalties applied AFTER the weighted average calculation:

| Risk Factor | Penalty | Condition |
|------------|---------|-----------|
| Not RERA registered | -2.0 | Project has no RERA registration or registration has lapsed |
| Active litigation | -1.0 per case | Major litigation (consumer court, NCLT, high court) against builder or project |
| Delayed projects | -0.5 per project | Builder has other projects delayed beyond RERA completion date |
| No OC for ready property | -1.5 | Property marketed as ready-to-move but lacks Occupation Certificate |
| Title dispute | -2.0 | Active dispute on land title or ownership chain |
| Environmental clearance missing | -1.0 | Project lacks required environmental approvals |

Minimum score after adjustments: 0.0 (never negative).

### Score Interpretation

| Score Range | Verdict | Recommended Action |
|------------|---------|-------------------|
| 8.0 - 10.0 | **Strong Buy** | Proceed with negotiation. Lock in quickly if price is fair. |
| 6.0 - 7.9 | **Consider** | Worth shortlisting. Address specific concerns before committing. |
| 4.0 - 5.9 | **Caution** | Significant issues exist. Only proceed if specific concerns can be resolved. |
| Below 4.0 | **Avoid** | Too many red flags. Move on to other options. |

### Score Display Format

Always show the score as:

```
PROPOPS SCORE: X.X / 10 — {Verdict}
```

Followed by the dimension breakdown table and any risk adjustments applied.

---

## Property Categories

Every property falls into one of these categories. The category determines which evaluation criteria are most relevant and which data sources to prioritize.

### 1. Under-Construction (New Launch)
- Builder selling directly
- RERA registration is mandatory — reject evaluation if not registered
- Key concerns: possession risk, builder reputation, payment plan terms
- Price benchmark: IGRS registrations from same project (early bookings)
- GST applicable (currently 5% without ITC for affordable, 12% for others — verify current rates)

### 2. Ready-to-Move (With OC)
- Construction complete, Occupation Certificate obtained
- No GST (only stamp duty + registration)
- Key concerns: legal clarity, actual vs quoted price, maintenance charges
- Price benchmark: IGRS registrations from same project and nearby ready projects

### 3. Resale
- Secondary market transaction between individuals
- No GST, only stamp duty + registration
- Key concerns: title chain verification, encumbrance certificate, society NOC
- Price benchmark: IGRS registrations from same society/project
- Additional checks: outstanding dues, property tax, society transfer fees

### 4. Pre-Launch / Upcoming
- Builder marketing before RERA registration
- HIGH RISK — no RERA means no legal protection
- Must warn user explicitly about pre-launch risks
- Price benchmark: comparable RERA-registered projects in same area
- Recommendation: WAIT until RERA registration

### 5. Plot / Land
- NA (Non-Agricultural) order verification is critical
- Title chain goes back further (30+ years ideally)
- Key concerns: clear title, NA order, road access, setback rules, FSI
- Price benchmark: IGRS registrations for plots in same survey number / area
- Additional: check if land is in reservation, flood zone, or green belt

### 6. Commercial / Office
- Different valuation metrics: price/sqft, rental yield, lock-in periods
- Key concerns: RERA (if applicable), fire NOC, parking ratio, CAM charges
- Price benchmark: commercial IGRS registrations in same area
- Additional: tenant profile, vacancy rates, escalation clauses

---

## 7-Block Evaluation Structure (A through G)

Every full property evaluation follows this structure. Modes may execute all blocks or a subset, but the structure is always A-G.

### Block A: Property Summary
Core facts about the property in a structured table. Source: listing + RERA portal.
- Project name, builder name, RERA ID
- Location (area, city, pincode)
- Configuration (BHK, carpet area in sqft)
- Quoted price, price per sqft
- Floor, facing, parking
- Possession date (RERA vs builder claim)
- Property category
- Current status (booking open, under construction, ready, etc.)

### Block B: Price Intelligence
The most valuable block. Establishes whether the quoted price is fair.
- Actual registration prices from IGRS (same project, same area)
- Price per sqft comparison: quoted vs registered
- Overpayment indicator (percentage above market)
- Price trend: 1-year, 3-year, 5-year movement
- Comparable properties and their registration prices
- Source labeling on every data point (IGRS / WebSearch estimate / listing price)

### Block C: Builder Reputation Score
Trust assessment of the developer.
- RERA project count (total, completed, ongoing, delayed)
- Complaint history from RERA portal
- Litigation from eCourts
- News and reviews from WebSearch
- Builder Score X/10 with breakdown table

### Block D: Risk Assessment
All red flags and green flags, each with source citation.
- Legal risks (title, encumbrance, litigation)
- Builder risks (delays, complaints, financial health)
- Location risks (flood zone, airport noise, industrial proximity)
- Financial risks (hidden costs, payment plan traps)
- Risk-adjusted score impact

### Block E: Location & Livability
Quality of life and investment potential of the location.
- Connectivity (metro, bus, highway, airport, railway)
- Social infrastructure (schools, hospitals, markets)
- Upcoming infrastructure projects
- Water and power reliability
- Safety and flood risk
- Rental market and yield
- Appreciation potential with supporting data

### Block F: AI-Powered Suggestions
Clear, actionable recommendation.
- YES / NO / WAIT verdict with reasoning
- If YES: timing advice, suggested offer price
- If NO: specific reasons + alternative suggestions
- Investment vs self-use assessment
- Loan eligibility estimate (based on price and typical bank criteria)
- Tax implications (stamp duty, registration, GST breakdown)

### Block G: Negotiation Intelligence
Data-backed negotiation strategy.
- Leverage points derived from Blocks B and C
- Suggested offer price with rationale
- Negotiation script
- Hidden costs checklist
- Payment plan analysis (CLP vs TLP)
- Walk-away price (floor below which deal makes no sense)

---

## Data Source Hierarchy

Every data point must be labeled with its source. Sources are ranked by trust level:

### Tier 1 — Highest Trust (Government Records)
1. **IGRS Registration Data** — Actual transaction prices from Index-II / registered documents. This is ground truth for pricing. Access via igrmaharashtra.gov.in or equivalent state portal.
2. **RERA Portal Data** — Project registration, builder details, complaints, compliance status. Access via maharera.mahaonline.gov.in (Maharashtra) or equivalent state RERA portal.
3. **eCourts Data** — Litigation records against builder, project, or land. Access via ecourts.gov.in.

### Tier 2 — High Trust (Institutional)
4. **Municipal Corporation Records** — Property tax, building permissions, OC status.
5. **Revenue Department Records** — 7/12 extract, mutation entries, land use.

### Tier 3 — Medium Trust (Market Data)
6. **Property Portal Listings** — 99acres, MagicBricks, Housing.com, NoBroker. These show ASKING prices, not transaction prices. Always label as "listed at" never "valued at."
7. **Bank Valuations** — If available, bank-assessed property values for loan purposes.

### Tier 4 — Low Trust (Supplementary)
8. **WebSearch Results** — News articles, forum discussions, blog posts. Useful for context, reputation, and trend data. Never use as sole source for pricing.
9. **Builder Marketing Material** — Brochures, websites, sales pitches. Treat as biased. Cross-verify every claim.

### Source Labeling Format

Every data point in a report must include its source:

```
Price: Rs 85L (IGRS registration, Dec 2025, Unit 504)
Price: Rs 92L (99acres listing — asking price, not verified)
Builder score: 7.2/10 (calculated from MahaRERA + eCourts data)
Appreciation: 12% over 3 years (WebSearch estimate — verify with IGRS)
```

---

## Global Rules

### NEVER
- Invent registration prices, builder data, or legal records. If data is unavailable, say so explicitly.
- Skip source labeling on any data point. Every number must have a source.
- Present listing prices (99acres, MagicBricks) as actual transaction prices. Listing price != registration price.
- Recommend properties with active litigation without a clear, prominent warning.
- Auto-contact builders, agents, or any third party on behalf of the user.
- Use old registration data (>2 years) as current price benchmark without noting the date.
- Round scores to make them look better. Show exact calculated values.
- Skip Block D (Risk Assessment) even if the property looks great.
- Generate reports without reading buyer-brief.md first (if it exists).

### ALWAYS
- Read `buyer-brief.md` before evaluating any property. Match against user's criteria.
- Read `_profile.md` after `_shared.md`. User overrides in profile take precedence over system defaults.
- Label every data point with its source (IGRS, RERA, eCourts, portal listing, WebSearch, estimated).
- Calculate and show price per sqft for every property. This is the universal comparison metric.
- Include both red flags and green flags in every evaluation. No property is perfect; no property is all bad.
- Register every evaluation in the tracker (`data/properties.md`).
- Use INR formatting consistently:
  - Below Rs 1 Crore: "Rs 85L" or "Rs 85,00,000"
  - Rs 1 Crore and above: "Rs 1.2Cr" or "Rs 1,20,00,000"
  - Price per sqft: "Rs 8,500/sqft"
- Show carpet area (not super built-up) as the primary area metric. If only built-up is available, note it and estimate carpet at 70-75% of built-up.
- Date-stamp every report with evaluation date.
- When IGRS data is unavailable, clearly state "IGRS data not found — using WebSearch estimates" and reduce Price Fairness score accordingly.
- Show the score calculation: dimension scores, weights, weighted average, risk adjustments, final score.

---

## Tools Available

PropOps operates using these tools:

### WebSearch
- Market data, builder news, price trends, area information
- Use for: background research, comparable prices when IGRS unavailable, builder reputation
- Trust level: Low — always cross-reference

### Playwright / Browser
- IGRS portal (igrmaharashtra.gov.in) for registration data
- MahaRERA portal for project registration, builder details, complaints
- eCourts (ecourts.gov.in) for litigation records
- Property portals (99acres, MagicBricks, Housing.com) for listings
- Trust level: Varies by source (see Data Source Hierarchy)

### File System
- Read: buyer-brief.md, _profile.md, data/properties.md, reports/, data/sources.yml
- Write: reports/{###}-{slug}-{date}.md, data/properties.md, batch/tracker-additions/
- Execute: node scripts/merge-tracker.mjs

### WebFetch
- Extract content from property listing URLs
- Parse listing details from portals

---

## File Structure Reference

```
propops/
  modes/
    _shared.md          ← this file (scoring + rules)
    _profile.md         ← user overrides and preferences
    evaluate.md         ← full 7-block evaluation
    auto-pipeline.md    ← paste URL, get everything
    scan.md             ← property discovery scanner
    builder.md          ← builder reputation deep-dive
    negotiate.md        ← negotiation strategy
    tracker.md          ← pipeline management
    compare.md          ← side-by-side comparison
  data/
    buyer-brief.md      ← user's requirements (budget, location, config)
    properties.md       ← master tracker (TSV format)
    sources.yml         ← search queries and portal URLs
    watchlist.md        ← properties to monitor
    scan-history.tsv    ← dedup log for scanner
    cache/              ← cached portal data
  reports/
    001-project-slug-2026-01-15.md
    002-project-slug-2026-01-20.md
  batch/
    tracker-additions/  ← staging area for tracker updates
  scripts/
    merge-tracker.mjs   ← merges batch additions into properties.md
```

---

## Buyer Brief Reference

The `buyer-brief.md` file contains the user's requirements. Every evaluation checks the property against this brief for the Configuration Match dimension. Expected fields:

- Budget range (min-max)
- Location preferences (areas, cities)
- Configuration (BHK, min carpet area)
- Property category preference
- Purpose (self-use / investment / both)
- Possession timeline preference
- Must-haves (parking, floor preference, facing, amenities)
- Deal-breakers (no litigation, RERA mandatory, etc.)
- Loan requirement (yes/no, estimated eligibility)
