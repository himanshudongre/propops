# PropOps — Evaluate Mode

Full 7-block (A-G) property evaluation. This is the core mode of PropOps.

---

## Prerequisites

Before starting any evaluation:

1. Read `modes/_shared.md` — load scoring system, rules, data hierarchy
2. Read `modes/_profile.md` — load user overrides (if file exists)
3. Read `data/buyer-brief.md` — load buyer requirements (if file exists)
4. Gather the property input: URL, project name, or RERA ID

---

## Input Handling

The user provides one of:
- A property listing URL (99acres, MagicBricks, Housing.com, NoBroker, etc.)
- A project name + location (e.g., "Lodha Palava, Dombivli")
- A RERA ID (e.g., "P52100012345")
- A builder name + project name

From any input, extract: **project name, builder name, location, configuration, quoted price**.

If the input is a URL, use WebFetch to extract listing details. If the page requires JavaScript rendering, use Playwright instead.

---

## Block A: Property Summary

**Purpose:** Establish the basic facts about the property in a clean, scannable format.

### Data Collection

1. Extract from listing URL (if provided):
   - Project name, builder name
   - Location (area, sub-area, city, pincode)
   - Configuration (BHK, carpet/built-up area in sqft)
   - Quoted price, price per sqft
   - Floor number, facing, parking
   - Amenities mentioned
   - Possession date claimed by builder/seller

2. Cross-reference with RERA portal:
   - Search MahaRERA (or relevant state RERA) for project by name or RERA ID
   - Extract: RERA registration number, registration validity, promoter name
   - Extract: RERA-stated completion date (this is the legal deadline)
   - Extract: total units, sanctioned floors, carpet area per RERA
   - Note any discrepancies between listing and RERA data

3. Determine property category:
   - Under-construction, Ready-to-move, Resale, Pre-launch, Plot, Commercial

### Output Format

```
## A. Property Summary

| Field | Value | Source |
|-------|-------|--------|
| Project | {name} | Listing |
| Builder / Promoter | {name} | RERA |
| RERA ID | {id} | RERA Portal |
| RERA Status | {Registered / Lapsed / Not Found} | RERA Portal |
| Location | {area, city, pincode} | Listing |
| Configuration | {X BHK} | Listing |
| Carpet Area | {X sqft} | RERA / Listing |
| Quoted Price | Rs {X}L / Rs {X}Cr | Listing |
| Price/sqft | Rs {X}/sqft (on carpet) | Calculated |
| Floor / Facing | {X}th floor, {direction} facing | Listing |
| Parking | {covered/open, count} | Listing |
| Possession Date | {date} (builder claim) / {date} (RERA deadline) | Listing / RERA |
| Property Category | {category} | Determined |

**Discrepancy Alert:** {Note any differences between listing claims and RERA data — area mismatch, date mismatch, builder name mismatch, etc.}
```

If RERA ID is not found, display a prominent warning:

```
WARNING: This project does not appear to be RERA registered.
Risk adjustment: -2.0 applied to final score.
Proceed with extreme caution.
```

---

## Block B: Price Intelligence

**Purpose:** Determine whether the quoted price is fair by comparing against actual government registration data. This is the highest-value block in the evaluation.

### Step 1: IGRS Registration Data (Primary Source)

Search the IGRS portal (igrmaharashtra.gov.in for Maharashtra) for actual registration prices:

1. Search by project name / society name in the relevant district and sub-registrar office
2. Look for registrations in the last 12 months (prioritize recent)
3. Extract from each registration:
   - Registration date
   - Document type (sale deed, agreement to sell)
   - Consideration amount (sale price)
   - Unit details (flat number, floor, area if available)
   - Stamp duty paid
4. Calculate price per sqft from each registration

If IGRS portal search fails or returns no results, note this clearly and proceed to Step 2.

### Step 2: Area-Level Registration Data

If same-project data is insufficient:

1. Search IGRS for registrations in the same sub-registrar jurisdiction
2. Look for comparable projects (similar builder tier, similar configuration, similar age)
3. Use ready reckoner rates as a floor reference
4. WebSearch for "registration prices {project name}" or "{area} registration prices 2025-2026"

### Step 3: Price Analysis

Calculate and present:

```
## B. Price Intelligence

### Registration Price Data

| # | Date | Project/Society | Unit | Registered Price | Area (sqft) | Price/sqft | Source |
|---|------|----------------|------|-----------------|-------------|------------|--------|
| 1 | {date} | {name} | {unit} | Rs {X}L | {X} | Rs {X}/sqft | IGRS |
| 2 | {date} | {name} | {unit} | Rs {X}L | {X} | Rs {X}/sqft | IGRS |
| ... | | | | | | | |

### Price Comparison

| Metric | Value |
|--------|-------|
| Quoted price/sqft | Rs {X}/sqft |
| Average registration price/sqft (same project) | Rs {X}/sqft |
| Average registration price/sqft (same area) | Rs {X}/sqft |
| Ready reckoner rate | Rs {X}/sqft |
| **Overpayment indicator** | **{+X% / -X% / At market}** |

### Price Trend

| Period | Avg Price/sqft | Change |
|--------|---------------|--------|
| Current (last 6 months) | Rs {X}/sqft | — |
| 1 year ago | Rs {X}/sqft | {+/-X%} |
| 3 years ago | Rs {X}/sqft | {+/-X%} |
| 5 years ago | Rs {X}/sqft | {+/-X%} |
```

### Overpayment Indicator Interpretation

- **-5% or lower**: Below market — potential bargain or red flag (investigate why)
- **-5% to +5%**: At market — fair price
- **+5% to +15%**: Slightly above market — room to negotiate
- **+15% to +25%**: Significantly above market — strong negotiation needed
- **+25% or higher**: Overpriced — likely inflated asking price

### Scoring: Price Fairness Dimension

| Overpayment % | Score |
|--------------|-------|
| Below market (negative) | 9.0-10.0 (investigate if too low) |
| 0-5% above | 8.0-9.0 |
| 5-10% above | 6.5-7.9 |
| 10-15% above | 5.0-6.4 |
| 15-25% above | 3.0-4.9 |
| 25%+ above | 0.0-2.9 |
| IGRS data unavailable | Cap at 6.0 (uncertainty penalty) |

---

## Block C: Builder Reputation Score

**Purpose:** Assess the trustworthiness and track record of the builder/developer.

### Step 1: RERA Portal Research

Search MahaRERA (or relevant state RERA) for the builder/promoter:

1. List all registered projects by this promoter
2. For each project, note: status (ongoing/completed), registration date, completion date, any extensions
3. Count: total projects, completed on time, completed late, ongoing, delayed beyond RERA date
4. Check RERA complaint section for complaints against this promoter
5. Categorize complaints: delay, quality, refund, non-compliance, other

### Step 2: eCourts Litigation Check

Search ecourts.gov.in for cases involving the builder:

1. Search by builder/promoter company name
2. Search by key directors/partners if known
3. Note: case type (civil, criminal, consumer, NCLT), status (pending/disposed), nature of dispute
4. Prioritize: consumer complaints, NCLT proceedings, criminal cases

### Step 3: WebSearch Reputation

Search the web for:
- "{builder name} reviews"
- "{builder name} complaints"
- "{builder name} news"
- "{builder name} RERA"
- "{builder name} delayed projects"

Extract: customer reviews, news coverage (positive and negative), industry reputation.

### Step 4: Calculate Builder Score

```
## C. Builder Reputation

### Builder Profile

| Field | Value | Source |
|-------|-------|--------|
| Promoter Name | {legal entity name} | RERA |
| Key Person(s) | {name(s)} | RERA / WebSearch |
| RERA Projects (Total) | {X} | RERA Portal |
| Completed On Time | {X} ({Y%}) | RERA Portal |
| Completed Late | {X} | RERA Portal |
| Ongoing | {X} | RERA Portal |
| Delayed (past RERA deadline) | {X} | RERA Portal |
| RERA Complaints | {X} total ({breakdown by type}) | RERA Portal |
| Court Cases (Active) | {X} | eCourts |
| Court Cases (Disposed) | {X} | eCourts |

### Builder Score Breakdown

| Dimension | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| RERA compliance | 20% | {X}/10 | {X} |
| On-time delivery | 25% | {X}/10 | {X} |
| Complaint volume | 20% | {X}/10 | {X} |
| Litigation record | 15% | {X}/10 | {X} |
| Market reputation | 10% | {X}/10 | {X} |
| Project portfolio quality | 10% | {X}/10 | {X} |
| **Builder Score** | **100%** | | **{X}/10** |

### Key Findings
- {Green flag or red flag with source}
- {Green flag or red flag with source}
- ...
```

### Builder Score Thresholds

- **8.0+**: Highly reputable — established track record
- **6.0-7.9**: Decent — some concerns but generally reliable
- **4.0-5.9**: Risky — multiple issues, proceed with caution
- **Below 4.0**: Avoid — serious trust issues

---

## Block D: Risk Assessment

**Purpose:** Consolidate all identified risks and positive indicators into a clear, actionable list.

### Red Flags (risks that reduce score)

Search for and assess each of these risk categories:

**Legal Risks:**
- Title not clear or disputed
- Missing encumbrance certificate
- Active litigation on property or land
- Missing government approvals (CC, OC, environment, fire NOC)
- Land use discrepancy (agricultural land sold as residential)

**Builder Risks:**
- Not RERA registered or RERA lapsed
- History of project delays
- High complaint volume
- Active NCLT / insolvency proceedings
- Frequent RERA extensions

**Financial Risks:**
- Price significantly above registrations
- Hidden costs not disclosed upfront
- Unfavorable payment plan terms (high upfront, no bank tie-up)
- Unusually low price (could indicate distress or defect)

**Location Risks:**
- Flood-prone area
- Near industrial zone, airport flight path, high-tension lines
- Poor water/power infrastructure
- No clear road access
- Upcoming negative development (highway widening affecting property, etc.)

### Green Flags (positives that support the score)

- RERA registered and compliant
- Builder has strong delivery track record
- Price at or below registration average
- Clear title with no encumbrances
- Good location with upcoming infrastructure
- Strong rental demand in area
- Bank-approved project (multiple bank tie-ups)

### Output Format

```
## D. Risk Assessment

### Red Flags

| # | Flag | Severity | Score Impact | Source |
|---|------|----------|-------------|--------|
| 1 | {description} | HIGH/MEDIUM/LOW | {-X.X} | {source} |
| 2 | {description} | HIGH/MEDIUM/LOW | {-X.X} | {source} |

### Green Flags

| # | Flag | Confidence | Source |
|---|------|-----------|--------|
| 1 | {description} | HIGH/MEDIUM/LOW | {source} |
| 2 | {description} | HIGH/MEDIUM/LOW | {source} |

### Net Risk Adjustment: {-X.X}
```

---

## Block E: Location & Livability

**Purpose:** Evaluate the location for both daily living quality and investment potential.

### Data Collection

Use WebSearch and available map/location data to assess:

**Connectivity:**
- Distance and travel time to nearest metro station
- Distance to nearest railway station
- Distance to major highway / expressway
- Distance to airport
- Public transport availability (bus routes, frequency)
- Commute time to major employment hubs (mention specific hubs)

**Social Infrastructure:**
- Schools (within 2km, 5km — mention notable ones)
- Hospitals (within 5km — mention notable ones)
- Shopping (malls, markets, daily needs)
- Parks and recreation

**Utilities:**
- Water supply reliability (municipal / borewell / tanker dependency)
- Power supply reliability (load shedding frequency)
- Internet connectivity (fiber availability)
- Sewage and waste management

**Safety & Environment:**
- Flood history / flood zone status
- Crime rate (if data available)
- Air quality (if data available)
- Noise levels (proximity to highway, railway, airport, industrial area)

**Future Development:**
- Upcoming metro lines or stations
- Upcoming roads, flyovers, expressways
- Upcoming IT parks, commercial zones, SEZs
- Government housing projects (may affect prices)
- Smart city or AMRUT inclusion

**Rental Market:**
- Current rental rates for similar configuration
- Rental yield calculation (annual rent / property price * 100)
- Tenant demand level (low / medium / high)

### Output Format

```
## E. Location & Livability

### Connectivity

| Destination | Distance | Travel Time | Mode |
|------------|----------|-------------|------|
| {Nearest metro} | {X km} | {X min} | {mode} |
| {Nearest railway} | {X km} | {X min} | {mode} |
| {Major highway} | {X km} | {X min} | {mode} |
| {Airport} | {X km} | {X min} | {mode} |
| {Key employment hub} | {X km} | {X min} | {mode} |

### Social Infrastructure (within 5km radius)

| Category | Notable Options | Rating |
|----------|----------------|--------|
| Schools | {names} | Good/Average/Poor |
| Hospitals | {names} | Good/Average/Poor |
| Shopping | {names} | Good/Average/Poor |
| Parks/Recreation | {names} | Good/Average/Poor |

### Upcoming Infrastructure

| Project | Status | Expected Completion | Impact on Property |
|---------|--------|--------------------|--------------------|
| {project} | {status} | {date} | Positive/Neutral/Negative |

### Rental Market

| Metric | Value | Source |
|--------|-------|--------|
| Comparable rent (monthly) | Rs {X} | {source} |
| Annual rental yield | {X%} | Calculated |
| Tenant demand | High/Medium/Low | {source} |

### Location Score: {X}/10
### Livability Score: {X}/10
### Appreciation Potential Score: {X}/10
```

---

## Block F: AI-Powered Suggestions

**Purpose:** Synthesize all data into a clear, actionable recommendation.

### Recommendation Logic

Based on the evaluation so far, generate one of three verdicts:

**YES (Recommended):**
- Score 7.0+ after risk adjustments
- No HIGH severity red flags
- Price is at or within 10% of market
- Builder score 6.0+
- Matches buyer brief on key criteria

**NO (Not Recommended):**
- Score below 5.0
- Any critical red flag (active litigation, no RERA, title dispute)
- Price 25%+ above market with no justification
- Builder score below 4.0
- Fundamental mismatch with buyer brief

**WAIT (Hold):**
- Score 5.0-6.9 with addressable concerns
- Pre-launch project (wait for RERA)
- Price negotiable to acceptable range
- Under-construction with uncertain possession timeline
- Market conditions suggest prices may correct

### Output Format

```
## F. AI-Powered Suggestions

### Verdict: {YES / NO / WAIT}

**Reasoning:** {2-3 sentences explaining the verdict, referencing specific data from Blocks A-E}

### If YES:

**Timing:** {Buy now / Wait for X / Negotiate first}
**Suggested offer price:** Rs {X}L — based on {rationale from Block B data}
**Best configuration:** {if multiple options, which one and why}

### If NO:

**Primary concerns:**
1. {concern with data reference}
2. {concern with data reference}

**Alternatives to consider:**
- {alternative project 1 — brief reason}
- {alternative project 2 — brief reason}

### If WAIT:

**What to wait for:** {specific trigger — RERA registration, price correction, possession progress}
**Revisit timeline:** {when to re-evaluate}
**Action meanwhile:** {add to watchlist, monitor builder, etc.}

### Investment vs Self-Use Assessment

| Aspect | Self-Use | Investment |
|--------|----------|------------|
| Suitability | {rating} | {rating} |
| Key advantage | {what} | {what} |
| Key concern | {what} | {what} |
| Recommended hold period | — | {X years} |

### Financial Estimate

| Component | Amount | Notes |
|-----------|--------|-------|
| Base price | Rs {X} | Quoted / Suggested |
| Stamp duty ({X%}) | Rs {X} | Current rate for {state} |
| Registration fee | Rs {X} | Current rate |
| GST (if applicable) | Rs {X} | {rate and applicability} |
| Legal charges (est.) | Rs {X} | Typical range |
| **Total acquisition cost** | **Rs {X}** | |
| Loan eligibility (est.) | Rs {X} | At {X%} for {X} years |
| EMI (est.) | Rs {X}/month | |

### Tax Implications

- Stamp duty: {rate and calculation}
- Registration: {fee structure}
- GST: {applicable or not, rate, ITC status}
- Income tax: {Section 24, Section 80C benefits if applicable}
- Capital gains: {if investment, holding period considerations}
```

---

## Block G: Negotiation Intelligence

**Purpose:** Arm the buyer with data-backed negotiation strategy.

### Output Format

```
## G. Negotiation Intelligence

### Your Leverage Points

1. **Registration data gap:** Actual registrations in this project average Rs {X}/sqft vs quoted Rs {X}/sqft — a {X%} premium. Reference: "Similar units in your project registered at Rs {X} in {month/year}."

2. **Builder inventory:** {Assessment of unsold inventory — high inventory = more leverage}

3. **Market conditions:** {Buyer's or seller's market in this area. Reference specific data.}

4. **Competing options:** {Other projects at better price points that you can reference}

5. **Payment readiness:** {If paying upfront or have pre-approved loan, use as leverage}

### Suggested Offer Price

**Your opening offer:** Rs {X}L (Rs {X}/sqft)
**Rationale:** {Based on average registration price + reasonable premium for {factors}}
**Expected counter:** Rs {X}L
**Your target:** Rs {X}L (Rs {X}/sqft)
**Walk-away price:** Rs {X}L — below this, the deal is acceptable; above this, walk away.

### Negotiation Script

**Opening:**
> "I've been researching properties in {area} and I'm interested in {project}. I've seen that recent registrations in similar projects are around Rs {X}/sqft. Your quoted rate of Rs {X}/sqft is {X%} above market. I'm looking at a fair price closer to Rs {X}/sqft."

**If builder cites amenities/quality:**
> "I appreciate the amenities, but my comparison is based on registered transactions — actual prices buyers paid. Can we discuss a price closer to market?"

**If builder offers discounts/schemes:**
> "I'd prefer a straightforward price reduction over schemes. What's the best all-inclusive price per sqft you can offer?"

**If builder says price is non-negotiable:**
> "I have pre-approved financing and I'm ready to close quickly. For a confirmed booking at Rs {X}/sqft, I can proceed this week."

### Hidden Costs Checklist

| Cost Item | Estimated Amount | Included in Quoted Price? | Notes |
|-----------|-----------------|--------------------------|-------|
| Stamp duty | Rs {X} | No | State-mandated |
| Registration | Rs {X} | No | State-mandated |
| GST | Rs {X} | {Yes/No/NA} | Check agreement |
| Legal fees | Rs {X} | No | For agreement review |
| Parking (covered) | Rs {X} | {Yes/No} | Verify if included |
| Parking (open) | Rs {X} | {Yes/No} | Often extra |
| Floor rise | Rs {X} | {Yes/No} | Per floor premium |
| Preferred location charge | Rs {X} | {Yes/No} | Corner/garden facing |
| Club membership | Rs {X} | {Yes/No} | One-time + monthly |
| Maintenance deposit | Rs {X} | {Yes/No} | Usually 2-3 years upfront |
| Infrastructure charges | Rs {X} | {Yes/No} | Road, water, sewage |
| Development charges | Rs {X} | {Yes/No} | Municipal charges |
| Electricity deposit | Rs {X} | No | MSEDCL deposit |
| Water deposit | Rs {X} | No | Municipal deposit |
| **Total hidden costs** | **Rs {X}** | | |
| **True all-in price** | **Rs {X}** | | Base + all hidden costs |
| **True price/sqft** | **Rs {X}/sqft** | | All-in / carpet area |

### Payment Plan Analysis

| Plan Type | Structure | Total Cost | Pros | Cons |
|-----------|-----------|-----------|------|------|
| CLP (Construction-Linked) | {breakdown} | Rs {X} | Lower risk, pay as built | Longer timeline |
| TLP (Time-Linked) | {breakdown} | Rs {X} | Often discounted | Higher risk if delayed |
| Down Payment | {breakdown} | Rs {X} | Maximum discount | Highest risk |

**Recommendation:** {Which plan and why, based on builder trust score and project stage}

### Counter-Offer Responses

| Builder Says | Your Response |
|-------------|---------------|
| "Price will increase next month" | "Prices have been stable per registration data. I'm offering based on current market." |
| "Other buyers are interested" | "I'm ready to close at a fair price. Let me know if my offer works." |
| "We don't negotiate" | "Every builder negotiates. I'm offering Rs {X} which is at market rate." |
| "This is the best location" | "Location is good, but price must reflect registrations in this area." |
```

---

## Global Score Calculation

After all blocks are complete, calculate the final weighted score.

```
## PropOps Score Card

### Dimension Scores

| # | Dimension | Weight | Raw Score | Weighted Score | Key Factor |
|---|-----------|--------|-----------|---------------|------------|
| 1 | Price fairness | 20% | {X}/10 | {X} | {one-line reason} |
| 2 | Builder trust | 15% | {X}/10 | {X} | {one-line reason} |
| 3 | Location quality | 15% | {X}/10 | {X} | {one-line reason} |
| 4 | Legal clarity | 15% | {X}/10 | {X} | {one-line reason} |
| 5 | Appreciation potential | 10% | {X}/10 | {X} | {one-line reason} |
| 6 | Configuration match | 10% | {X}/10 | {X} | {one-line reason} |
| 7 | Livability | 5% | {X}/10 | {X} | {one-line reason} |
| 8 | Rental yield | 5% | {X}/10 | {X} | {one-line reason} |
| 9 | Possession risk | 3% | {X}/10 | {X} | {one-line reason} |
| 10 | Hidden costs | 2% | {X}/10 | {X} | {one-line reason} |
| | **Weighted Average** | **100%** | | **{X.X}** | |

### Risk Adjustments

| Adjustment | Impact | Reason |
|-----------|--------|--------|
| {adjustment} | {-X.X} | {reason with source} |
| **Total adjustment** | **{-X.X}** | |

### FINAL SCORE: {X.X} / 10 — {Verdict}

{2-3 sentence summary of the property — what makes it good or bad, and what the buyer should do next.}
```

---

## Post-Evaluation Actions

After completing the evaluation:

### 1. Save Report

Write the full evaluation to a report file:

```
reports/{###}-{project-slug}-{YYYY-MM-DD}.md
```

Where:
- `{###}` is a zero-padded sequential number (read existing reports to determine next number)
- `{project-slug}` is the project name in lowercase kebab-case
- `{YYYY-MM-DD}` is today's date

The report file should contain all 7 blocks (A-G) and the score card.

### 2. Write Tracker Entry

Write a TSV line to `batch/tracker-additions/`:

```
{date}\t{project-name}\t{builder}\t{location}\t{config}\t{carpet-sqft}\t{quoted-price}\t{price-per-sqft}\t{score}\t{verdict}\t{status}\t{report-file}
```

Status for new evaluations: "Evaluated"

### 3. Merge Tracker

Run:
```
node scripts/merge-tracker.mjs
```

This merges the batch addition into `data/properties.md`.

### 4. Telegram Alert (if configured)

If Telegram integration is configured in `_profile.md`, send a summary:

```
PropOps Evaluation: {Project Name}
Score: {X.X}/10 — {Verdict}
Price: Rs {X}L (Rs {X}/sqft)
Builder: {name} ({builder-score}/10)
Key: {top red flag or green flag}
Report: {filename}
```

### 5. Follow-Up Prompt

After presenting the evaluation, ask:

> "Would you like me to:
> 1. Deep-dive into this builder's other projects?
> 2. Compare this with similar properties in the area?
> 3. Generate a detailed negotiation strategy?
> 4. Add this to your shortlist?"
