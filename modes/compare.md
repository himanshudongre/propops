# PropOps — Compare Mode

Side-by-side comparison of 2-4 properties with weighted scoring matrix, category winners, and AI recommendation.

---

## Prerequisites

1. Read `modes/_shared.md` — load scoring system and rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. Read `data/buyer-brief.md` — load buyer requirements (if exists)

---

## Trigger

This mode activates when the user says:
- "Compare {property A} and {property B}"
- "Compare my top 3 properties"
- "Which property should I pick?"
- "Side by side comparison"
- "Compare #1, #3, and #5" (tracker IDs)
- "Help me choose between {property A} and {property B}"

---

## Input

The user provides 2-4 properties to compare. Properties can be identified by:
- Report number (e.g., "#3" or "report 003")
- Project name (e.g., "Lodha Palava")
- Tracker ID
- "my shortlisted properties" (compare all shortlisted)
- "my top 3" (compare top 3 by score)

### Resolve Properties

For each property:
1. Find the evaluation report in `reports/`
2. If report exists: extract all scores, data, and findings
3. If report does not exist: ask if user wants to run a quick evaluation first
4. Minimum data needed: project name, location, config, price, score dimensions

If comparing more than 4 properties, warn: "Comparing more than 4 gets hard to read. Want me to narrow it to the top 4 by score?"

---

## Step 1: Property Cards

Show a quick reference card for each property:

```
## Properties Being Compared

### Property A: {Project Name}
- Builder: {name} | Location: {area}
- Config: {BHK}, {sqft} carpet | Floor: {X}, {facing}
- Price: Rs {X}L (Rs {X}/sqft)
- RERA: {ID} | Category: {type}
- Score: {X.X}/10 — {Verdict}
- Report: {filename}

### Property B: {Project Name}
- Builder: {name} | Location: {area}
- Config: {BHK}, {sqft} carpet | Floor: {X}, {facing}
- Price: Rs {X}L (Rs {X}/sqft)
- RERA: {ID} | Category: {type}
- Score: {X.X}/10 — {Verdict}
- Report: {filename}

### Property C: {Project Name} (if applicable)
...
```

---

## Step 2: Comparison Matrix (Weighted Scoring)

The core comparison. Each dimension shows the raw score and the winner is highlighted.

```
## Comparison Matrix

| Dimension | Weight | {Property A} | {Property B} | {Property C} | Winner |
|-----------|--------|-------------|-------------|-------------|--------|
| Price fairness | 20% | {X.X} | {X.X} | {X.X} | **{name}** |
| Builder trust | 15% | {X.X} | {X.X} | {X.X} | **{name}** |
| Location quality | 15% | {X.X} | {X.X} | {X.X} | **{name}** |
| Legal clarity | 15% | {X.X} | {X.X} | {X.X} | **{name}** |
| Appreciation potential | 10% | {X.X} | {X.X} | {X.X} | **{name}** |
| Configuration match | 10% | {X.X} | {X.X} | {X.X} | **{name}** |
| Livability | 5% | {X.X} | {X.X} | {X.X} | **{name}** |
| Rental yield | 5% | {X.X} | {X.X} | {X.X} | **{name}** |
| Possession risk | 3% | {X.X} | {X.X} | {X.X} | **{name}** |
| Hidden costs | 2% | {X.X} | {X.X} | {X.X} | **{name}** |
| **Weighted Score** | **100%** | **{X.X}** | **{X.X}** | **{X.X}** | **{name}** |
| Risk adjustments | — | {-X.X} | {-X.X} | {-X.X} | — |
| **FINAL SCORE** | — | **{X.X}** | **{X.X}** | **{X.X}** | **{name}** |

Dimensions won: {Property A}: {X} | {Property B}: {X} | {Property C}: {X}
```

---

## Step 3: Key Metrics Comparison

Head-to-head on the numbers that matter most:

```
## Key Metrics Head-to-Head

| Metric | {Property A} | {Property B} | {Property C} | Better |
|--------|-------------|-------------|-------------|--------|
| **Quoted Price** | Rs {X}L | Rs {X}L | Rs {X}L | Lower |
| **Price/sqft** | Rs {X} | Rs {X} | Rs {X} | **{name}** |
| **Registration avg/sqft** | Rs {X} | Rs {X} | Rs {X} | **{name}** |
| **Overpayment %** | {X%} | {X%} | {X%} | **{name}** |
| **Carpet area (sqft)** | {X} | {X} | {X} | Larger |
| **Builder Score** | {X}/10 | {X}/10 | {X}/10 | **{name}** |
| **RERA Status** | {status} | {status} | {status} | — |
| **Possession** | {date/status} | {date/status} | {date/status} | Earlier |
| **Rental yield** | {X%} | {X%} | {X%} | **{name}** |
| **Hidden costs (est.)** | Rs {X}L | Rs {X}L | Rs {X}L | **{name}** |
| **All-in cost** | Rs {X}L | Rs {X}L | Rs {X}L | **{name}** |
| **All-in cost/sqft** | Rs {X} | Rs {X} | Rs {X} | **{name}** |
| **Red flags** | {count} | {count} | {count} | Fewer |
| **Green flags** | {count} | {count} | {count} | More |
```

---

## Step 4: Red Flags Cross-Reference

Surface any red flags that should override numerical scores. A property with a high score but a critical red flag needs special attention.

```
## Red Flags — Cross Reference

### {Property A}: {Project Name}
| Flag | Severity | Impact | Should it override score? |
|------|----------|--------|--------------------------|
| {description} | {severity} | {-X.X} | {Yes/No — and why} |

### {Property B}: {Project Name}
| Flag | Severity | Impact | Should it override score? |
|------|----------|--------|--------------------------|
| {description} | {severity} | {-X.X} | {Yes/No — and why} |

### Critical Flag Warnings

{If any property has a red flag that should make you think twice regardless of score, call it out here explicitly.}

Example warnings:
- "{Property A} scores highest but has active litigation — this could become a 2-year delay."
- "{Property B} has no RERA registration — no legal protection regardless of price."
- "{Property C}'s builder has NCLT proceedings — financial health is questionable."
```

---

## Step 5: Purpose-Based Assessment

Different properties may suit different purposes:

```
## Purpose Assessment

### For Self-Use (Primary Residence)

| Factor | {Property A} | {Property B} | {Property C} | Best |
|--------|-------------|-------------|-------------|------|
| Livability score | {X}/10 | {X}/10 | {X}/10 | **{name}** |
| Commute to {hub} | {X min} | {X min} | {X min} | **{name}** |
| Schools nearby | {quality} | {quality} | {quality} | **{name}** |
| Hospitals nearby | {quality} | {quality} | {quality} | **{name}** |
| Possession timeline | {when} | {when} | {when} | **{name}** |
| Daily convenience | {rating} | {rating} | {rating} | **{name}** |
| **Self-use pick** | | | | **{name}** |

### For Investment

| Factor | {Property A} | {Property B} | {Property C} | Best |
|--------|-------------|-------------|-------------|------|
| Price/sqft vs market | {gap%} | {gap%} | {gap%} | **{name}** |
| Rental yield | {X%} | {X%} | {X%} | **{name}** |
| Appreciation potential | {X}/10 | {X}/10 | {X}/10 | **{name}** |
| Liquidity (resale ease) | {rating} | {rating} | {rating} | **{name}** |
| Builder brand (resale value) | {rating} | {rating} | {rating} | **{name}** |
| Upcoming infra impact | {impact} | {impact} | {impact} | **{name}** |
| **Investment pick** | | | | **{name}** |
```

---

## Step 6: Financial Comparison

Side-by-side financial picture:

```
## Financial Comparison

### Acquisition Cost

| Component | {Property A} | {Property B} | {Property C} |
|-----------|-------------|-------------|-------------|
| Base price | Rs {X}L | Rs {X}L | Rs {X}L |
| Hidden costs (est.) | Rs {X}L | Rs {X}L | Rs {X}L |
| Stamp duty + reg | Rs {X}L | Rs {X}L | Rs {X}L |
| GST (if applicable) | Rs {X}L | Rs {X}L | Rs {X}L |
| **Total acquisition** | **Rs {X}L** | **Rs {X}L** | **Rs {X}L** |

### Monthly Outgo (with loan)

| Component | {Property A} | {Property B} | {Property C} |
|-----------|-------------|-------------|-------------|
| EMI (est.) | Rs {X} | Rs {X} | Rs {X} |
| Maintenance | Rs {X} | Rs {X} | Rs {X} |
| Property tax | Rs {X} | Rs {X} | Rs {X} |
| **Total monthly** | **Rs {X}** | **Rs {X}** | **Rs {X}** |

### Value per Rupee Spent

| Metric | {Property A} | {Property B} | {Property C} |
|--------|-------------|-------------|-------------|
| Carpet area per Rs 1L | {X} sqft | {X} sqft | {X} sqft |
| All-in Rs/sqft | Rs {X} | Rs {X} | Rs {X} |
| Score per Rs 10L spent | {X} | {X} | {X} |
```

---

## Step 7: AI Recommendation

The final verdict:

```
## AI Recommendation

### Overall Winner: {Property Name}

**Score: {X.X}/10 — {Verdict}**

**Why this property wins:**
{2-3 sentences explaining why this property is the best choice overall, referencing specific data from the comparison. Be specific — cite price/sqft differences, builder scores, location advantages.}

**What you're trading off:**
{1-2 sentences on what you give up by choosing this property over the others. E.g., "You're paying Rs {X}/sqft more than {Property B}, but you get a significantly more reliable builder and better location."}

### Runner-Up: {Property Name}

**Score: {X.X}/10**

**Why it's a strong alternative:**
{1-2 sentences on why this is worth keeping as a backup.}

### Eliminated: {Property Name} (if applicable)

**Score: {X.X}/10**

**Why it falls short:**
{1-2 sentences on what disqualifies it.}

### Conditional Recommendations

- **If budget is the primary constraint:** Pick {name} — lowest all-in cost at Rs {X}L
- **If location matters most:** Pick {name} — best connectivity and livability
- **If builder trust is paramount:** Pick {name} — highest builder score at {X}/10
- **If investment return is the goal:** Pick {name} — best appreciation potential and rental yield
- **If possession urgency:** Pick {name} — earliest possession at {date/status}

### Score Override Warnings

{If any red flag should override the numerical comparison, state it clearly here.}

Example:
"Although {Property A} scores highest numerically, {Property B} may be the safer choice due to {Property A}'s active litigation. A lawsuit could delay possession by years and erode the score advantage."
```

---

## Step 8: Action Plan

```
## Recommended Next Steps

Based on this comparison:

1. **{Property Name} (Winner):**
   - {Specific next action — e.g., "Schedule a site visit this weekend"}
   - {Follow-up — e.g., "Then run /negotiate to prepare your offer"}

2. **{Property Name} (Runner-up):**
   - {Action — e.g., "Keep as backup. Re-evaluate in 2 weeks for price movement."}

3. **{Property Name} (Eliminated):**
   - {Action — e.g., "Mark as Passed in tracker. Better options exist."}
```

---

## Post-Comparison Actions

After presenting the comparison:

> "What would you like to do?
>
> 1. **Pick a winner** — I'll update your tracker and generate a negotiation strategy
> 2. **Evaluate more** — Add another property to the comparison
> 3. **Deep-dive** — Look closer at a specific dimension (price, builder, location)
> 4. **Negotiate** — Generate negotiation strategy for your top pick
> 5. **Re-evaluate** — Refresh data for any property that seems stale"

---

## Comparison Report

If the user wants to save the comparison:

Write to: `reports/compare-{slug-a}-vs-{slug-b}-{YYYY-MM-DD}.md`

Include the full comparison matrix, key metrics, red flags, recommendation, and action plan.
