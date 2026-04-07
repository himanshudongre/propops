# PropOps — Auto-Pipeline Mode

Paste a property listing URL and get a complete evaluation automatically. Zero friction — URL in, report out.

---

## Trigger

This mode activates when the user pastes a URL from any property portal:
- 99acres.com
- magicbricks.com
- housing.com
- nobroker.in
- commonfloor.com
- makaan.com
- squareyards.com
- proptiger.com
- Any URL that appears to be a property listing

Also activates when user says something like:
- "Check this property: {URL}"
- "Evaluate this: {URL}"
- "What do you think of this? {URL}"

---

## Prerequisites

1. Read `modes/_shared.md` — load scoring system and rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. Read `data/buyer-brief.md` — load buyer requirements (if exists)

---

## Pipeline Steps

### Step 1: Extract Property Details from URL

**Try WebFetch first.** If the page content is sufficient (property name, price, location, configuration are extractable), proceed with extracted data.

**If WebFetch returns insufficient data** (JavaScript-rendered content, anti-scraping blocks, or missing key fields), fall back to Playwright:

1. Navigate to the URL
2. Wait for page to fully load (property portals are often slow — wait for price elements)
3. Extract all visible property details

**Required fields to extract:**
- Project name
- Builder / developer name
- Location (area, city)
- Configuration (BHK, carpet/built-up area)
- Quoted price
- Possession date / status
- Any RERA ID shown on listing

**Nice-to-have fields:**
- Floor number, facing
- Parking details
- Amenities list
- Agent/seller contact info (do NOT auto-contact — just note for user)
- Listing description text (may contain useful details)
- Photos count (presence of actual photos vs stock images is a trust signal)

### Step 2: Detect Property Category

Based on extracted details, classify the property:

| Signal | Category |
|--------|----------|
| "Under construction", "New Launch", future possession date | Under-Construction |
| "Ready to move", "OC Received", immediate possession | Ready-to-Move |
| "Resale", listed by owner/agent (not builder), older project | Resale |
| "Pre-launch", "Upcoming", no RERA ID | Pre-Launch |
| Plot, land, NA plot | Plot / Land |
| Office, shop, commercial | Commercial |

If category is **Pre-Launch**, display an immediate warning before proceeding:

```
CAUTION: This appears to be a pre-launch property without RERA registration.
Pre-launch purchases have NO legal protection under RERA.
Evaluation will proceed, but the score will include a -2.0 penalty.
Recommendation: WAIT until RERA registration is obtained.
```

### Step 3: Execute Full Evaluation (Blocks A-G)

Execute the complete `evaluate.md` flow:

1. **Block A: Property Summary** — Use extracted data + RERA portal verification
2. **Block B: Price Intelligence** — IGRS registration search + area comparables
3. **Block C: Builder Reputation** — RERA + eCourts + WebSearch
4. **Block D: Risk Assessment** — Compile all red/green flags
5. **Block E: Location & Livability** — Connectivity, infrastructure, rental yield
6. **Block F: AI Suggestions** — YES/NO/WAIT verdict
7. **Block G: Negotiation Intelligence** — Leverage points, offer price, script

Follow all instructions in `evaluate.md` for each block. Do not skip any block.

### Step 4: Save Report

Write the complete evaluation report to:

```
reports/{###}-{project-slug}-{YYYY-MM-DD}.md
```

Determine the next sequential number by checking existing files in the `reports/` directory.

### Step 5: Register in Tracker

Write tracker entry to `batch/tracker-additions/` and run `node scripts/merge-tracker.mjs`.

TSV format:
```
{date}\t{project-name}\t{builder}\t{location}\t{config}\t{carpet-sqft}\t{quoted-price}\t{price-per-sqft}\t{score}\t{verdict}\t{status}\t{report-file}
```

### Step 6: Show Summary

After the full evaluation, present a compact summary card:

```
PROPOPS AUTO-EVALUATION COMPLETE

Property: {Project Name}, {Location}
Builder: {Builder Name}
Config: {X BHK, Y sqft carpet}
Quoted: Rs {X}L (Rs {X}/sqft)

SCORE: {X.X}/10 — {Verdict}

Key Green Flags:
  + {flag 1}
  + {flag 2}

Key Red Flags:
  - {flag 1}
  - {flag 2}

Price Intelligence:
  Registrations avg: Rs {X}/sqft
  Overpayment: {+X%}

Builder Score: {X}/10
Recommendation: {YES/NO/WAIT — one sentence}

Report saved: reports/{filename}
```

### Step 7: Follow-Up Options

After the summary, present actionable next steps:

> "What would you like to do next?
>
> 1. **Builder deep-dive** — Check this builder's other projects and full track record
> 2. **Compare** — Find similar properties in this area for side-by-side comparison
> 3. **Negotiate** — Generate a detailed negotiation strategy with offer price
> 4. **Shortlist** — Add this to your shortlist for further consideration
> 5. **Scan area** — Find other properties in {area} matching your brief
> 6. **Next property** — Paste another URL to evaluate"

---

## Error Handling

### URL Extraction Fails

If WebFetch and Playwright both fail to extract sufficient property details:

1. Tell the user: "I couldn't extract complete details from this URL. The page may require login or have anti-bot protection."
2. Ask: "Can you provide the following details manually?"
   - Project name and builder
   - Location (area, city)
   - Configuration (BHK, carpet area)
   - Quoted price
   - RERA ID (if known)
3. Once user provides details, proceed with evaluation using manual input.

### Portal-Specific Handling

**99acres.com:**
- Listings are usually well-structured. WebFetch often works.
- Price may be shown as "on request" — note this and use IGRS data for pricing.
- Look for "RERA ID" field in listing details.

**MagicBricks.com:**
- Often requires JavaScript rendering. May need Playwright.
- Has builder profile pages — useful for Block C data.
- Shows "Price Trends" — useful but treat as listing-based (not registration-based).

**Housing.com:**
- Good structured data. WebFetch usually works.
- Has "Price Insights" section — useful for area-level trends.
- Shows nearby projects — useful for comparison context.

**NoBroker.in:**
- Primarily resale and rental listings.
- Owner-listed — no agent commission (note this as a cost advantage).
- May lack RERA details for resale properties.

### Duplicate Detection

Before starting the evaluation, check if this property has already been evaluated:

1. Read `data/properties.md`
2. Search for the project name + configuration
3. If found:
   - Show previous evaluation date and score
   - Ask: "This property was evaluated on {date} (score: {X.X}). Want me to re-evaluate with fresh data, or would you like to see the existing report?"
4. If re-evaluating, note changes from previous evaluation in the report.

---

## Batch Mode

If the user pastes multiple URLs (separated by newlines or commas):

1. Acknowledge all URLs: "I see {X} properties to evaluate."
2. Evaluate each one sequentially using the full pipeline
3. After all evaluations, show a comparison summary:

```
BATCH EVALUATION SUMMARY

| # | Property | Location | Price | Score | Verdict |
|---|----------|----------|-------|-------|---------|
| 1 | {name} | {area} | Rs {X}L | {X.X} | {verdict} |
| 2 | {name} | {area} | Rs {X}L | {X.X} | {verdict} |
| ... | | | | | |

Top pick: {name} — {one-line reason}
```

4. Ask: "Want me to do a detailed comparison of the top {2-3} properties?"
