# PropOps — Tracker Mode

View and manage the property pipeline. Central dashboard for all evaluated, shortlisted, and in-progress properties.

---

## Prerequisites

1. Read `modes/_shared.md` — load scoring system and rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. Read `data/properties.md` — **required**. This is the master tracker file.

---

## Trigger

This mode activates when the user says:
- "Show my tracker"
- "Where am I with my properties?"
- "Pipeline status"
- "Show my shortlist"
- "What properties have I evaluated?"
- "Update {property} status"
- "Mark {property} as shortlisted"

---

## Data Format

The master tracker (`data/properties.md`) uses TSV format with these columns:

```
ID | Date | Project | Builder | Location | Config | Carpet(sqft) | Price | Rs/sqft | Score | Verdict | Status | Report
```

### Status Values

| Status | Meaning | Next Action |
|--------|---------|-------------|
| **Evaluated** | Full evaluation complete, no further action yet | Review and decide: shortlist or pass |
| **Shortlisted** | Buyer is interested, wants to explore further | Site visit, negotiation, comparison |
| **Negotiating** | Active negotiation with builder/seller | Track offers, counter-offers, deadlines |
| **Site Visit Scheduled** | Physical visit planned | Visit, take notes, reassess |
| **Site Visit Done** | Physical visit completed | Update assessment, decide next step |
| **Offer Made** | Formal offer submitted | Wait for response, prepare counter |
| **Agreement Draft** | Agreement for sale being reviewed | Legal review, negotiate terms |
| **Booked** | Token/booking amount paid | Track milestones, payments |
| **Passed** | Decided not to pursue | No action (archived) |
| **Watching** | On watchlist, monitoring price/progress | Periodic check |

---

## Step 1: Load and Parse Tracker

Read `data/properties.md` and parse the TSV data. Handle:
- Empty file (no properties yet)
- Malformed rows (skip with warning)
- Missing columns (fill with "—")

---

## Step 2: Dashboard Summary

Present the pipeline overview:

```
PROPOPS PIPELINE DASHBOARD

Last updated: {date of most recent entry}
Total properties tracked: {X}

### Status Breakdown

| Status | Count | Avg Score | Top Property |
|--------|-------|-----------|-------------|
| Evaluated | {X} | {X.X} | {name} ({score}) |
| Shortlisted | {X} | {X.X} | {name} ({score}) |
| Negotiating | {X} | {X.X} | {name} ({score}) |
| Site Visit Scheduled | {X} | — | {name} |
| Site Visit Done | {X} | — | {name} |
| Offer Made | {X} | — | {name} |
| Booked | {X} | — | {name} |
| Passed | {X} | {X.X} | — |
| Watching | {X} | — | {name} |

### Quick Stats

- Highest score: {name} ({score}/10) — {status}
- Most recent evaluation: {name} ({date})
- Active negotiations: {count}
- Average score (all evaluated): {X.X}/10
```

---

## Step 3: Top Properties by Score

Show the best-scoring properties that are still active (not Passed):

```
### Top Properties (Active)

| Rank | Property | Location | Config | Price | Score | Verdict | Status |
|------|----------|----------|--------|-------|-------|---------|--------|
| 1 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {verdict} | {status} |
| 2 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {verdict} | {status} |
| 3 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {verdict} | {status} |
| 4 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {verdict} | {status} |
| 5 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {verdict} | {status} |
```

---

## Step 4: Status Update

When the user requests a status change:

### Input Parsing

Accept commands like:
- "Mark #3 as Shortlisted"
- "Update Lodha Palava to Negotiating"
- "Pass on property #7"
- "Move {project name} to Site Visit Done"
- "I visited {project name}" (infer: Site Visit Done)
- "Made an offer on {project name}" (infer: Offer Made)
- "Booked {project name}" (infer: Booked)
- "Not interested in {project name}" (infer: Passed)

### Update Process

1. Identify the property (by ID, name, or rank number)
2. Confirm the change: "Updating {property name}: {old status} -> {new status}. Confirm?"
3. On confirmation, update `data/properties.md`
4. Show the updated row

### Status Transition Rules

Some transitions should prompt additional actions:

| Transition | Prompt |
|-----------|--------|
| Any -> Shortlisted | "Want me to generate a negotiation strategy?" |
| Any -> Negotiating | "Want me to pull the latest registration prices for your negotiation?" |
| Any -> Site Visit Scheduled | "I'll check back after your visit. Any specific things to look for?" |
| Any -> Site Visit Done | "How was the visit? Any new information to update the evaluation?" |
| Any -> Offer Made | "What price did you offer? I'll track it." |
| Any -> Booked | "Congratulations! What was the final price? I'll update the record." |
| Any -> Passed | "Got it. Want me to note the reason?" |

---

## Step 5: Pipeline Health Check

Identify issues in the pipeline:

```
### Pipeline Health

**Stale Entries** (evaluated >30 days ago, still at "Evaluated"):
| Property | Evaluated On | Days Ago | Action Needed |
|----------|-------------|----------|---------------|
| {name} | {date} | {X} | Shortlist or Pass? |
| {name} | {date} | {X} | Shortlist or Pass? |

**Long Negotiations** (negotiating >14 days):
| Property | Started Negotiating | Days | Suggest |
|----------|-------------------|------|---------|
| {name} | {date} | {X} | Follow up or reassess? |

**Score Drift Risk** (evaluated >60 days ago, scores may be stale):
| Property | Evaluated On | Days Ago | Suggest |
|----------|-------------|----------|---------|
| {name} | {date} | {X} | Re-evaluate with fresh data? |

**Watchlist Check** (watching for >30 days):
| Property | Watching Since | Days | Suggest |
|----------|--------------|------|---------|
| {name} | {date} | {X} | Any changes to review? |
```

---

## Step 6: Filtering and Views

Support different views of the tracker:

### By Status

User says: "Show me my shortlisted properties"

```
### Shortlisted Properties

| # | Property | Location | Config | Price | Score | Notes |
|---|----------|----------|--------|-------|-------|-------|
| 1 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {any notes} |
```

### By Score Range

User says: "Show properties scoring above 7"

```
### Properties Scoring 7.0+

| # | Property | Score | Verdict | Status | Price |
|---|----------|-------|---------|--------|-------|
| 1 | {name} | {X.X} | {verdict} | {status} | Rs {X}L |
```

### By Location

User says: "Show me properties in Thane"

```
### Properties in Thane

| # | Property | Builder | Config | Price | Score | Status |
|---|----------|---------|--------|-------|-------|--------|
| 1 | {name} | {builder} | {BHK} | Rs {X}L | {X.X} | {status} |
```

### By Builder

User says: "Show me all Lodha properties"

```
### Lodha Properties

| # | Property | Location | Config | Price | Score | Status |
|---|----------|----------|--------|-------|-------|--------|
| 1 | {name} | {area} | {BHK} | Rs {X}L | {X.X} | {status} |
```

### By Price Range

User says: "Properties under Rs 1Cr"

Filter and display accordingly.

---

## Step 7: Bulk Actions

Support batch operations:

- "Pass on all properties scoring below 5"
- "Shortlist all Strong Buy properties"
- "Re-evaluate all properties older than 60 days"

For each bulk action:
1. Show the affected properties
2. Confirm: "This will update {X} properties. Proceed?"
3. On confirmation, update all entries
4. Show summary of changes

---

## Tracker Maintenance

### Auto-Cleanup

When the tracker gets large, offer to archive:

- Properties with status "Passed" older than 90 days -> suggest archiving
- Properties with status "Booked" -> suggest moving to a "completed" section

### Export

If user asks to export:
- "Export my shortlist" -> generate a clean markdown or CSV
- "Email me my tracker" -> format for email-friendly output

---

## Post-Actions

After showing the tracker:

> "What would you like to do?
>
> 1. **Update status** — Change status for any property (e.g., 'mark #3 as shortlisted')
> 2. **Compare** — Side-by-side comparison of your top properties
> 3. **Re-evaluate** — Refresh evaluation for any property with new data
> 4. **Scan** — Find new properties matching your brief
> 5. **Negotiate** — Generate negotiation strategy for a shortlisted property"
