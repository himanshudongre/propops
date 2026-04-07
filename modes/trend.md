# PropOps -- Trend Mode

Price trends and AI-powered forecasting using historical IGRS registration data, infrastructure developments, and market analysis.

---

## Prerequisites

1. Read `modes/_shared.md` -- load scoring system and rules
2. Read `modes/_profile.md` -- load user overrides (if exists)
3. Read `buyer-brief.md` -- load target areas and budget

## Trigger

This mode activates when the user says:
- "What are the price trends in {area}?"
- "Is {area} a good time to buy?"
- "Price forecast for {area}"
- "How have prices moved in {area}?"
- "Compare prices between {area1} and {area2}"
- "Show me trends for {area}"

---

## Step 1: Gather Historical Registration Data

### Primary: IGRS Registration Prices (Highest Trust)

Run the IGRS scraper for a 5-year range:

```bash
node scripts/igrs-scraper.mjs trend --district "{district}" --village "{village}" --from {current_year - 4} --to {current_year}
```

This will require solving CAPTCHAs for each uncached year. The scraper handles this:
1. If cached data exists (within 7 days), it uses the cache
2. If not, it captures the CAPTCHA image to `data/igrs-captcha.png`
3. Show the CAPTCHA image to the user and ask them to solve it
4. Re-run with the `--captcha` flag

**IMPORTANT:** Each year requires a separate CAPTCHA solve. Guide the user through this:
> "I need to pull registration data for {village} from {year_start} to {year_end}. This requires solving a CAPTCHA for each year. I'll show you each one — just type the text you see."

### If IGRS Data Unavailable

Fall back to WebSearch estimates:
- Search for "{area} property price trend {year range}"
- Search for "{area} registration price per sqft"
- Search property portal price trend sections (99acres, Housing.com)
- **CLEARLY LABEL** as "estimated" not "registration data"

### Analyze Cached Data

Once registration data is available, run the forecast engine:

```bash
node scripts/forecast-engine.mjs analyze --district "{district}" --village "{village}"
```

---

## Step 2: Infrastructure & Development Context

WebSearch for upcoming projects that affect prices:

- Metro lines under construction or planned
- Highway/expressway projects
- New IT parks or commercial zones
- Airport proximity changes
- Government development plans (Smart City, PMAY, etc.)

For each project found, assess:
- **Timeline:** When will it be completed?
- **Impact radius:** How far does price impact extend?
- **Historical precedent:** How much did similar infra boost prices in other areas?

---

## Step 3: Market Conditions

WebSearch for current market signals:

- Interest rate trends (RBI repo rate direction)
- Housing demand index for the city
- New supply pipeline (how many new projects launching?)
- Unsold inventory levels in the area
- Stamp duty/registration fee changes
- PMAY or government subsidy changes
- NRI investment trends

---

## Step 4: AI Price Forecast

Combine all data sources to generate a forecast. Structure as:

```
## Price Trend: {Village}, {District} ({start_year}-{current_year})

### Historical Registration Prices (IGRS Data)

| Year | Avg Registration Price | Avg Rs/sqft* | YoY Growth | Volume |
|------|----------------------|-------------|-----------|--------|
| {year} | Rs {X}L | Rs {X}/sqft | {+X%} | {N} registrations |
| ... | | | | |

*Rs/sqft estimated from average registration amount and typical unit sizes in this area.

### CAGR (Compound Annual Growth Rate): {X%} over {N} years

### Growth Momentum: {Accelerating / Stable / Decelerating}
{Explanation based on comparing recent growth to historical average}

### Volume Trend: {Increasing / Stable / Decreasing}
{What this means — increasing volume = more demand or more supply?}

### Infrastructure Impact

| Project | Status | Expected Completion | Price Impact |
|---------|--------|-------------------|-------------|
| {Metro Line X} | Under construction | {date} | +15-20% within 2km |
| {Highway project} | Planned | {date} | +5-10% in catchment |

### Market Conditions

| Factor | Current State | Impact on Prices |
|--------|--------------|-----------------|
| Interest rates | {Rising/Stable/Falling} | {impact} |
| Demand level | {Hot/Warm/Cool} | {impact} |
| New supply | {High/Medium/Low} | {impact} |
| Unsold inventory | {X% estimated} | {impact} |

### AI Forecast (12-Month)

**Predicted range:** Rs {X}-{Y}/sqft ({+Z% to +W%} from current)
**Confidence:** {HIGH / MEDIUM / LOW}

**Key drivers:**
1. {Driver 1 with specific data}
2. {Driver 2 with specific data}
3. {Driver 3 with specific data}

**Key risks:**
1. {Risk 1}
2. {Risk 2}

### Buying Recommendation

**{GOOD TIME TO BUY / WAIT / NEUTRAL}**

{2-3 sentence reasoning with specific data points}

{If WAIT: "Watch for: {specific trigger events}"}
{If BUY: "Target price: Rs {X}/sqft based on registration data + growth trajectory"}
```

---

## Step 5: Area Comparison (if requested)

If user asks to compare multiple areas:

```bash
node scripts/forecast-engine.mjs compare --district "{district}" --villages "{area1},{area2},{area3}"
```

Present as:

```
### Area Comparison: {district}

| Metric | {Area 1} | {Area 2} | {Area 3} |
|--------|---------|---------|---------|
| Latest avg price | Rs {X}L | Rs {X}L | Rs {X}L |
| Rs/sqft (est.) | Rs {X} | Rs {X} | Rs {X} |
| 5yr CAGR | {X%} | {X%} | {X%} |
| Momentum | {state} | {state} | {state} |
| Infra catalyst | {project} | {project} | {project} |
| Best for | {self-use/invest} | {self-use/invest} | {self-use/invest} |
```

---

## Rules

- **ALWAYS label data sources.** "IGRS registration data" vs "WebSearch estimate" vs "portal listing price"
- **NEVER present forecasts as guarantees.** Always include confidence level and caveats.
- **Forecasts are Claude's analysis**, not a financial model. State: "This forecast is based on available data and AI analysis. It is not financial advice."
- **If IGRS data is thin** (<5 registrations per year), lower confidence level and say so.
- **Registration prices may not reflect market prices perfectly** — they can be understated (to save stamp duty) or include properties of different sizes. Note this limitation.
- **Always suggest the user verify** with a local property consultant for ground-truth validation.
