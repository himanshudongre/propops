# PropOps — Builder Mode

Builder/developer reputation deep-dive. Comprehensive assessment of a builder's trustworthiness, track record, and risk profile.

---

## Prerequisites

1. Read `modes/_shared.md` — load scoring system and rules
2. Read `modes/_profile.md` — load user overrides (if exists)

---

## Trigger

This mode activates when the user says:
- "Tell me about {builder name}"
- "Is {builder name} reliable?"
- "Check {builder name}'s track record"
- "Builder report for {builder name}"
- "How is {builder name}?"
- "Should I trust {builder name}?"

Also triggered as a follow-up from evaluate mode or scan mode.

---

## Input

The user provides:
- Builder name (common name, e.g., "Lodha", "Godrej Properties", "Shapoorji Pallonji")
- OR the legal entity name from RERA
- OR a RERA project ID (from which we extract the promoter)

If the user provides a common name, search RERA for the exact legal entity name(s). Note: some builders operate through multiple legal entities (e.g., "Lodha" = "Macrotech Developers Ltd" + various SPVs). Identify all related entities.

---

## CRITICAL: Known Limitations (Disclose Upfront)

Before running the analysis, always show these caveats to the buyer so they calibrate expectations correctly. **Never present this mode's output as ground truth.**

```
## Limitations of This Report

1. **RERA "previous projects" field is often empty**
   RERA project forms frequently have the previous projects section left
   blank, even when the same builder has completed prior projects. This
   means naive analysis can MISS a builder's history entirely.

   How PropOps handles this: Step 0 uses the promoter-resolver to
   cross-reference projects across related legal entities. This is more
   robust than trusting the project page form field, but not perfect.
   Builders can still hide history by using unrelated SPV entities with
   different names, phone numbers, and addresses.

2. **RERA is a disclosure framework, not enforcement**
   A RERA registration proves the builder filed paperwork. It does NOT
   prove quality, timely delivery, or ethical behavior. RERA authorities
   have limited execution powers. Treat RERA data as a signal, not a
   guarantee.

3. **Linkage across legal entities is fuzzy**
   Builder groups operate through multiple SPV companies. The resolver
   matches on company name, directors, phones, emails, and addresses —
   but it can miss linkages if the builder deliberately isolates entities.

4. **Court and complaint data has lag**
   eCourts and RERA complaint data may be 2-8 weeks behind reality.
   A clean record today doesn't mean no complaints will surface tomorrow.

5. **PropOps combines signals; no single signal is sufficient**
   Use this report alongside: IGRS registration prices, eCourts
   litigation, WebSearch reputation, physical site visits, and
   conversations with existing residents of the builder's past projects.
   Never rely solely on one source.
```

---

## Step 0: Promoter Identity Resolution

Before searching RERA, resolve the builder's full identity across related legal entities. This addresses the #1 gap in naive builder evaluation — missing projects registered under different SPV names.

### Process

Run the promoter resolver on cached data first:

```bash
node scripts/promoter-resolver.mjs resolve --name "{builder name}"
```

The resolver cross-references using:
- **Company name** (with legal suffix normalization): "Macrotech Developers Ltd" matches "Macrotech Developers Private Limited"
- **Brand core extraction**: "Lodha Crown Realty LLP" extracts "lodha crown" which matches "Lodha Developers"
- **Phone numbers**: Same contact number across projects = likely same builder
- **Email domain**: Same company email domain = likely same builder
- **Registered address**: Same PIN code and address keywords = likely same builder
- **Directors/partners**: Overlapping director names across companies = linked entities

### Output

```
## 0. Promoter Identity Resolution

**Builder queried:** {name}
**Resolution confidence:** HIGH / MEDIUM / LOW

### Related Legal Entities Found

| # | Legal Entity Name | Similarity Score | Evidence |
|---|------------------|------------------|----------|
| 1 | {entity 1} | 1.0 (exact) | Direct name match |
| 2 | {entity 2} | 0.75 | Same phone, same brand core |
| 3 | {entity 3} | 0.55 | Same director, same PIN |

### Aggregated Project Count

| Entity | Projects Found |
|--------|---------------|
| {entity 1} | {X} |
| {entity 2} | {Y} |
| {entity 3} | {Z} |
| **Total unique projects** | **{X+Y+Z}** |

### IMPORTANT

This is significantly more comprehensive than the RERA "previous projects"
form field alone. However, the resolver CANNOT detect:
- Builders using completely unrelated shell entities
- Cross-family ownership without public linkage
- Name-changed entities with all new contact details

If the resolver finds only ONE entity for a large builder, be suspicious —
they likely have more projects under names we haven't linked yet.
```

If the resolver returns multiple entities, run Steps 1-4 on EACH of them and aggregate the results into a single combined portfolio. Label each project with which legal entity registered it so the user can verify.

---

## Step 1: MahaRERA Project Portfolio

Search the RERA portal (MahaRERA for Maharashtra, or relevant state portal) for all projects registered under this builder/promoter.

### Search Method

1. Search by promoter name on the RERA portal
2. If multiple entities found, search each one
3. For each project found, extract:

| Field | Description |
|-------|-------------|
| RERA ID | Registration number |
| Project name | |
| Location | District, taluka, area |
| Registration date | When RERA registration was obtained |
| Proposed completion | RERA-stated completion date |
| Actual status | Ongoing / Completed / Lapsed |
| Extension history | Any extensions granted, number of times |
| Total units | Number of units in project |
| Units booked | If available |

### Project Status Classification

Categorize each project:

- **Completed on time**: Delivered on or before RERA completion date
- **Completed late**: Delivered after RERA completion date
- **Ongoing (on track)**: Under construction, RERA deadline not yet passed
- **Ongoing (delayed)**: Under construction, RERA deadline has passed
- **Lapsed registration**: RERA registration expired without completion or renewal

### Portfolio Summary

```
## 1. RERA Project Portfolio

### Summary

| Metric | Count | Percentage |
|--------|-------|-----------|
| Total RERA projects | {X} | 100% |
| Completed on time | {X} | {Y%} |
| Completed late | {X} | {Y%} |
| Ongoing (on track) | {X} | {Y%} |
| Ongoing (delayed) | {X} | {Y%} |
| Lapsed / Revoked | {X} | {Y%} |
| **On-time delivery rate** | | **{Y%}** |

### All Projects

| # | RERA ID | Project | Location | Registered | RERA Deadline | Status | Extensions | Notes |
|---|---------|---------|----------|-----------|---------------|--------|------------|-------|
| 1 | {id} | {name} | {area} | {date} | {date} | {status} | {count} | {notes} |
| 2 | ... | | | | | | | |
```

---

## Step 2: RERA Complaints Analysis

Search the RERA portal's complaint section for complaints filed against this builder/promoter.

### Data to Extract

For each complaint (or aggregate if individual details are not accessible):

| Field | Description |
|-------|-------------|
| Complaint ID | If available |
| Project | Which project the complaint is about |
| Category | Delay / Quality / Refund / Non-compliance / Other |
| Date filed | |
| Status | Pending / Disposed / Withdrawn |
| Outcome | If disposed — in favor of buyer or builder |

### Complaint Summary

```
## 2. RERA Complaints

### Complaint Summary

| Category | Count | % of Total | Trend |
|----------|-------|-----------|-------|
| Delay in possession | {X} | {Y%} | Increasing / Stable / Decreasing |
| Construction quality | {X} | {Y%} | |
| Refund requests | {X} | {Y%} | |
| Agreement violations | {X} | {Y%} | |
| Non-compliance | {X} | {Y%} | |
| Other | {X} | {Y%} | |
| **Total** | **{X}** | **100%** | |

### Complaint Rate

Complaints per 100 units: {X}
(Total complaints / Total units across all projects * 100)

Industry benchmark: {X} complaints per 100 units is {low/average/high}
```

---

## Step 3: eCourts Litigation Check

Search ecourts.gov.in for cases involving the builder.

### Search Strategy

1. Search by company name (exact legal entity)
2. Search by common name variants
3. Search by key directors/partners (if known)
4. Filter for: district courts, high courts, consumer courts, NCLT

### Data to Extract

| Field | Description |
|-------|-------------|
| Case type | Civil / Criminal / Consumer / NCLT / Writ |
| Court | Which court |
| Case number | |
| Filing year | |
| Status | Pending / Disposed |
| Nature of dispute | Brief description |
| Opposing party | Buyer / Government / Contractor / Other |

### Litigation Summary

```
## 3. Litigation Record

### Case Summary

| Case Type | Pending | Disposed | Total |
|-----------|---------|----------|-------|
| Consumer complaints | {X} | {X} | {X} |
| Civil suits | {X} | {X} | {X} |
| Criminal cases | {X} | {X} | {X} |
| NCLT / Insolvency | {X} | {X} | {X} |
| High Court / Writ | {X} | {X} | {X} |
| **Total** | **{X}** | **{X}** | **{X}** |

### Critical Cases (if any)

| # | Case | Court | Year | Status | Nature | Severity |
|---|------|-------|------|--------|--------|----------|
| 1 | {number} | {court} | {year} | {status} | {description} | HIGH/MEDIUM |
| 2 | ... | | | | | |

### Risk Assessment

- NCLT/Insolvency proceedings: {Yes/No — if Yes, this is a CRITICAL red flag}
- Criminal cases: {count and nature}
- Consumer case volume: {normal/elevated/high for builder of this size}
```

---

## Step 4: WebSearch Reputation

Search the web for builder's market reputation.

### Search Queries

```
"{builder name} reviews"
"{builder name} customer complaints"
"{builder name} news {current year}"
"{builder name} controversy"
"{builder name} financial health"
"{builder name} quality issues"
"{builder name} delivery record"
"{builder name} awards" (for balance)
```

### Data to Extract

**Negative signals:**
- Customer complaints on forums (CommonFloor, MouthShut, etc.)
- News articles about delays, quality issues, financial trouble
- Social media complaints
- Blacklisting by any authority

**Positive signals:**
- Industry awards and recognition
- Positive customer testimonials
- Strong financial performance (if listed company — check BSE/NSE)
- CSR activities (weak signal but shows long-term orientation)
- International partnerships or certifications

**Neutral context:**
- Company size and age
- Geographic spread
- Market positioning (luxury / mid-segment / affordable)
- Key leadership

### Reputation Summary

```
## 4. Market Reputation

### Company Profile

| Field | Value | Source |
|-------|-------|--------|
| Legal entity | {name} | RERA |
| Common name | {name} | Market |
| Founded | {year} | WebSearch |
| Headquarters | {city} | WebSearch |
| Listed on exchange | {BSE/NSE or Private} | WebSearch |
| Market cap (if listed) | Rs {X}Cr | WebSearch |
| Key promoter(s) | {names} | RERA / WebSearch |
| Segment | Luxury / Mid / Affordable | Market |
| Geographic presence | {cities} | RERA / WebSearch |

### Sentiment Analysis

| Source | Positive | Negative | Neutral | Overall |
|--------|----------|----------|---------|---------|
| News articles | {count} | {count} | {count} | {sentiment} |
| Customer reviews | {count} | {count} | {count} | {sentiment} |
| Forum discussions | {count} | {count} | {count} | {sentiment} |

### Key Findings

**Positive:**
- {finding with source}
- {finding with source}

**Negative:**
- {finding with source}
- {finding with source}

**Notable:**
- {finding with source}
```

---

## Step 5: Calculate Builder Score

Compute the Builder Score out of 10 using these weighted dimensions:

### Builder Score Dimensions

| # | Dimension | Weight | What It Measures | Scoring Guide |
|---|-----------|--------|-----------------|---------------|
| 1 | RERA compliance | 20% | All projects registered, no lapsed registrations, timely filings | 10: All compliant. 7: Minor lapses. 4: Significant non-compliance. 0: Major violations. |
| 2 | Delivery track record | 25% | On-time delivery percentage across all projects | 10: >90% on time. 7: 70-90%. 4: 50-70%. 0: <50%. |
| 3 | Complaint volume | 20% | Complaints per 100 units relative to industry average | 10: <2 per 100 units. 7: 2-5. 4: 5-10. 0: >10. |
| 4 | Litigation record | 15% | Volume and severity of court cases | 10: No cases. 7: Few minor cases. 4: Multiple cases. 0: NCLT/criminal cases. |
| 5 | Market reputation | 10% | Web sentiment, news, customer reviews | 10: Overwhelmingly positive. 7: Mostly positive. 4: Mixed. 0: Mostly negative. |
| 6 | Project portfolio | 10% | Scale, diversity, quality of projects | 10: Large, diverse, quality portfolio. 7: Solid portfolio. 4: Small or uneven. 0: Tiny or problematic. |

### Output Format

```
## 5. Builder Score

### Score Breakdown

| # | Dimension | Weight | Score | Weighted | Rationale |
|---|-----------|--------|-------|----------|-----------|
| 1 | RERA compliance | 20% | {X}/10 | {X.XX} | {one-line reason} |
| 2 | Delivery track record | 25% | {X}/10 | {X.XX} | {one-line reason} |
| 3 | Complaint volume | 20% | {X}/10 | {X.XX} | {one-line reason} |
| 4 | Litigation record | 15% | {X}/10 | {X.XX} | {one-line reason} |
| 5 | Market reputation | 10% | {X}/10 | {X.XX} | {one-line reason} |
| 6 | Project portfolio | 10% | {X}/10 | {X.XX} | {one-line reason} |
| | **BUILDER SCORE** | **100%** | | **{X.X}/10** | |

### Score Interpretation

{X.X}/10 — {Highly Reliable / Decent / Risky / Avoid}

{2-3 sentence summary: what makes this builder good or bad, and what a buyer should watch out for.}
```

### Builder Score Thresholds

| Score | Interpretation | Recommendation |
|-------|---------------|----------------|
| 8.0+ | **Highly Reliable** | Established track record. Proceed with confidence (still verify project-specific details). |
| 6.0-7.9 | **Decent** | Generally reliable with some concerns. Proceed but monitor specific risk areas. |
| 4.0-5.9 | **Risky** | Multiple issues. Only proceed if specific project has strong independent merits and you can mitigate risks. |
| Below 4.0 | **Avoid** | Serious trust issues. Recommend looking at other builders. |

---

## Step 6: Green Flags & Red Flags

Consolidate all findings into clear flags.

```
## 6. Flags

### Green Flags
| # | Flag | Source | Confidence |
|---|------|--------|-----------|
| 1 | {description} | {source} | High/Medium |
| 2 | {description} | {source} | High/Medium |

### Red Flags
| # | Flag | Severity | Source | Confidence |
|---|------|----------|--------|-----------|
| 1 | {description} | HIGH/MEDIUM/LOW | {source} | High/Medium |
| 2 | {description} | HIGH/MEDIUM/LOW | {source} | High/Medium |

### Recommendation

**For buyers considering this builder:**
{Clear, actionable recommendation. E.g., "This builder is reliable for mid-segment projects. Their track record on delivery is strong, but watch for quality complaints post-possession. Ensure your agreement has penalty clauses for delay."}

**Projects to consider:**
- {project name} — {why it's their strongest current offering}

**Projects to avoid:**
- {project name} — {why it's risky even by this builder's standards}
```

---

## Step 7: Full Project List

Present the complete project portfolio for reference.

```
## 7. Complete Project Portfolio

| # | Project | RERA ID | Location | Type | Units | Status | Completion | Rating |
|---|---------|---------|----------|------|-------|--------|-----------|--------|
| 1 | {name} | {id} | {area} | Resi/Comm | {X} | {status} | {date} | {brief note} |
| 2 | ... | | | | | | | |
```

---

## Post-Report Actions

After presenting the builder report:

> "What would you like to do next?
>
> 1. **Evaluate a project** — Run a full evaluation on any of this builder's projects
> 2. **Compare builders** — Compare this builder with another one
> 3. **Check a specific project** — Deep-dive into one of their projects
> 4. **Save report** — Save this builder report for reference"

### Save Report

If the user wants to save, write to:
```
reports/builder-{builder-slug}-{YYYY-MM-DD}.md
```

---

## Cross-Builder Comparison

If the user asks to compare two builders, create a comparison table:

```
BUILDER COMPARISON

| Dimension | {Builder A} | {Builder B} | Winner |
|-----------|------------|------------|--------|
| Builder Score | {X}/10 | {X}/10 | {name} |
| RERA Projects | {X} | {X} | — |
| On-time delivery | {X%} | {X%} | {name} |
| Complaints/100 units | {X} | {X} | {name} |
| Active litigation | {X} | {X} | {name} |
| Market reputation | {sentiment} | {sentiment} | {name} |
| Years in business | {X} | {X} | — |

**Recommendation:** {Which builder and why, or "both are acceptable with caveats"}
```
