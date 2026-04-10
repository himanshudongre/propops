# PropOps — Scan Mode

Property discovery scanner. Finds properties matching the buyer's brief across portals, RERA registrations, and web sources. Three discovery levels from targeted to broad.

---

## Prerequisites

1. Read `modes/_shared.md` — load scoring system and rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. Read `data/buyer-brief.md` — **required** for scan mode. If not found, ask the user to provide: budget range, target locations, configuration (BHK), and property category preference before proceeding.
4. Read `data/sources.yml` — load search queries and portal URLs (if exists)
5. Read `data/scan-history.tsv` — load previous scan results for deduplication

---

## Trigger

This mode activates when the user says:
- "Find properties in {area}"
- "Scan for properties matching my brief"
- "What's available in {area} under Rs {X}Cr?"
- "Search for {X} BHK in {area}"
- "Run a scan"
- "Find new launches in {area}"

---

## Scan Configuration

Before scanning, confirm the search parameters with the user:

```
SCAN PARAMETERS

Budget: Rs {min}L - Rs {max}L
Location(s): {area1, area2, ...}
Configuration: {X BHK}
Carpet area: {min sqft}+
Category: {Under-construction / Ready / Resale / Any}
Purpose: {Self-use / Investment / Both}

Discovery levels to run:
  [x] Level 1 — Property Portals
  [x] Level 2 — RERA Portal
  [x] Level 3 — Web Discovery

Proceed with scan? (or adjust parameters)
```

If the user has a buyer brief, auto-fill from that. If not, ask for minimum: budget, location, BHK.

---

## Level 1 — Property Portal Scan

**Source:** 99acres, MagicBricks, Housing.com, NoBroker
**Trust level:** Medium (listing/asking prices)
**Purpose:** Find actively listed properties matching criteria

### Search Strategy

For each target location and portal, construct search queries:

**WebSearch queries:**
```
site:99acres.com {X} BHK {area} {city} Rs {budget-range}
site:magicbricks.com {X} BHK {area} {city} under {max-budget}
site:housing.com {X} BHK in {area} {city} {budget-range}
```

If `data/sources.yml` contains custom queries, use those instead.

**Alternative: Direct portal search via Playwright**

If WebSearch results are insufficient, use Playwright to:
1. Navigate to portal search page
2. Set filters: location, BHK, budget, property type
3. Extract results from first 2-3 pages

### Data to Extract Per Listing

| Field | Required | Notes |
|-------|----------|-------|
| Project name | Yes | |
| Builder / seller | Yes | |
| Location (area) | Yes | |
| Configuration (BHK) | Yes | |
| Carpet area (sqft) | Yes | Estimate from built-up if only that's available |
| Listed price | Yes | This is ASKING price, label accordingly |
| Price per sqft | Yes | Calculate from price / carpet area |
| Listing URL | Yes | For follow-up evaluation |
| Possession status | If available | Ready / under-construction / date |
| RERA ID | If shown | |
| Listing source | Yes | Which portal |

### Output: Level 1 Results

```
LEVEL 1 RESULTS — Property Portals

Found: {X} listings across {Y} portals

| # | Project | Builder | Area | Config | Carpet | Listed Price | Rs/sqft | Status | Portal | URL |
|---|---------|---------|------|--------|--------|-------------|---------|--------|--------|-----|
| 1 | {name} | {builder} | {area} | {BHK} | {sqft} | Rs {X}L | {X} | {status} | 99acres | {url} |
| 2 | ... | | | | | | | | | |

Note: All prices are LISTING prices (asking), not verified registration prices.
```

---

## Level 2 — RERA Portal Scan (state-specific routing)

**Source:** State-specific RERA scraper (determined by State Routing Protocol in `_shared.md`)
**Trust level:** High
**Purpose:** Find RERA-registered projects, including new registrations not yet on property portals

### Search Strategy

**First, determine the state** from the buyer brief (target locations) or user input. Then run the appropriate RERA scraper:

**Maharashtra:**
```bash
node scripts/maharera-scraper.mjs search-project --district "{district}" --name "{query}"
```

**Karnataka:**
```bash
node scripts/scrapers/krera-karnataka.mjs list --district "{district}"
```

**Telangana:**
```bash
node scripts/scrapers/tsrera.mjs list --district "{district}"
```

**Tamil Nadu:**
```bash
node scripts/scrapers/tnrera.mjs list --year {year}
```

**Uttar Pradesh (Noida/Ghaziabad):**
```bash
node scripts/scrapers/uprera.mjs list --district "Gautam Budh Nagar"
```

**For national-level discovery across multiple states:**
```bash
node scripts/scrapers/rera-national.mjs tracker
```

Search each RERA portal for:

1. **New project registrations** in target areas (registered in last 6 months)
2. **Ongoing projects** in target areas matching configuration
3. **Projects by specific builders** if user has preferences

### Data to Extract Per Project

| Field | Required | Notes |
|-------|----------|-------|
| RERA ID | Yes | Registration number |
| Project name | Yes | |
| Promoter name | Yes | |
| Location | Yes | District, taluka, village/area |
| Registration date | Yes | |
| Proposed completion | Yes | |
| Total units | If available | |
| Project status | Yes | Ongoing / Completed |

### Cross-Reference with Level 1

For each RERA project found:
1. Check if it appeared in Level 1 results (match by project name + builder)
2. If yes: add RERA ID to the Level 1 entry
3. If no: this is a new discovery — add to results with note "Found on RERA, not listed on portals"

### Output: Level 2 Results

```
LEVEL 2 RESULTS — RERA Portal

Found: {X} registered projects in target areas

| # | RERA ID | Project | Promoter | Area | Registered | Completion | Units | On Portals? |
|---|---------|---------|----------|------|-----------|------------|-------|-------------|
| 1 | {id} | {name} | {builder} | {area} | {date} | {date} | {X} | Yes/No |
| 2 | ... | | | | | | | |

New discoveries (not on portals): {X}
```

---

## Level 3 — Web Discovery (Broad Search)

**Source:** WebSearch
**Trust level:** Low (needs verification)
**Purpose:** Find projects not yet on major portals — pre-launches, smaller builders, upcoming areas

### Search Queries

Run these WebSearch queries for each target location:

```
"new projects in {area} {city} 2026"
"new residential projects {area} {year}"
"{area} upcoming housing projects"
"new launch {area} {city} {BHK} BHK"
"{builder-name} new project {city}" (for preferred builders)
"affordable housing {area} {city}" (if budget is in affordable range)
```

### Data to Extract

From search results, extract any property project mentions that:
- Are in target locations
- Appear to match configuration and budget
- Are not already found in Level 1 or Level 2

For each new find, note:
- Project name (or working name)
- Builder (if mentioned)
- Location
- Approximate price range (if mentioned)
- Stage (pre-launch, launched, under construction)
- Source URL
- Confidence level (Low — needs verification)

### Output: Level 3 Results

```
LEVEL 3 RESULTS — Web Discovery

Found: {X} additional mentions

| # | Project | Builder | Area | Est. Price Range | Stage | Source | Confidence |
|---|---------|---------|------|-----------------|-------|--------|------------|
| 1 | {name} | {builder} | {area} | Rs {X-Y}L | {stage} | {source} | Low |
| 2 | ... | | | | | | |

Note: Level 3 results are from web searches and require verification.
```

---

## Post-Scan Processing

### Deduplication

After all three levels complete:

1. **Merge results** across levels, matching by project name + builder + area
2. **Check against scan history** — read `data/scan-history.tsv` and mark any previously seen entries
3. **Check against tracker** — read `data/properties.md` and mark any already-evaluated properties

For each property, assign a status:
- **NEW** — not seen before in any scan or evaluation
- **SEEN** — appeared in a previous scan but not evaluated
- **EVALUATED** — already has a report in the system
- **REJECTED** — previously evaluated and scored below threshold

### Brief Matching

For each NEW property, calculate a rough brief-match score:

| Criterion | Match? | Notes |
|-----------|--------|-------|
| Budget | Yes/No/Partial | Within range / above / below |
| Location | Yes/No | In target area list |
| Configuration | Yes/No | Right BHK |
| Area (sqft) | Yes/No/Unknown | Meets minimum carpet area |
| Category | Yes/No | Matches preferred category |
| Purpose fit | Yes/No | Suitable for self-use / investment as needed |

Properties matching 4+ criteria are flagged as **Strong Match**.
Properties matching 2-3 criteria are flagged as **Partial Match**.
Properties matching 0-1 criteria are **Weak Match** and deprioritized.

### Update Scan History

Write all discovered properties to `data/scan-history.tsv`:

```
{scan-date}\t{project-name}\t{builder}\t{area}\t{config}\t{listed-price}\t{source-portal}\t{rera-id}\t{match-level}\t{status}
```

### Update Watchlist

For Strong Match and notable Partial Match properties, add to `data/watchlist.md`:

```
## {Project Name} — {Area}
- Builder: {name}
- Config: {BHK}, {carpet sqft if known}
- Listed price: Rs {X}L
- RERA: {id or "Not found"}
- Found: {date}, Level {1/2/3}
- Match: {Strong/Partial}
- Action: Evaluate / Watch / Skip
```

---

## Scan Summary

Present the final summary to the user:

```
PROPOPS SCAN COMPLETE

Scan date: {date}
Parameters: {BHK} in {areas}, Rs {min}-{max}L

Discovery Summary:
  Level 1 (Portals):     {X} listings found
  Level 2 (RERA):        {X} projects found ({Y} not on portals)
  Level 3 (Web):         {X} additional mentions
  Total unique:          {X}
  Already known:         {X}
  NEW discoveries:       {X}

Brief Match:
  Strong match:  {X} properties
  Partial match: {X} properties
  Weak match:    {X} properties

TOP MATCHES (Strong Match, sorted by brief fit):

| # | Project | Builder | Area | Config | Price | Match | Action |
|---|---------|---------|------|--------|-------|-------|--------|
| 1 | {name} | {builder} | {area} | {BHK} | Rs {X}L | Strong | Evaluate? |
| 2 | {name} | {builder} | {area} | {BHK} | Rs {X}L | Strong | Evaluate? |
| ... | | | | | | | |
```

---

## Follow-Up Options

After presenting the scan summary:

> "What would you like to do next?
>
> 1. **Evaluate** — Run a full evaluation on any of the top matches (give me the number)
> 2. **Batch evaluate** — Evaluate the top {X} matches one by one
> 3. **Refine scan** — Adjust parameters and scan again
> 4. **Builder check** — Deep-dive on any of the builders found
> 5. **Save and exit** — Results are saved to scan history and watchlist"

---

## Telegram Alerts (if configured)

If Telegram integration is configured in `_profile.md` and the scan found Strong Match properties:

Send alert:
```
PropOps Scan Alert
Found {X} new strong matches for your brief

Top matches:
1. {name} - {area} - Rs {X}L
2. {name} - {area} - Rs {X}L
3. {name} - {area} - Rs {X}L

Run /evaluate to assess these properties.
```

---

## Scheduled Scan

If the user wants periodic scanning:

1. Note the scan parameters
2. Suggest: "I can run this scan periodically. When would you like the next scan?"
3. Options: daily, weekly, or on-demand
4. For scheduled scans, only report NEW discoveries (not previously seen properties)
5. Send Telegram alert for new Strong Match discoveries
