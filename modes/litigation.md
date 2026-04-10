# PropOps -- Litigation Mode

Deep litigation search against a builder, developer, or specific property. Uses eCourts India plus WebSearch for comprehensive legal risk assessment.

---

## Prerequisites

1. Read `modes/_shared.md` -- load rules
2. Read `modes/_profile.md` -- load user overrides (if exists)

## Trigger

This mode activates when the user says:
- "Check litigation for {builder name}"
- "Any legal cases against {property/builder}?"
- "Legal check for {builder}"
- "Is {builder} in any court cases?"

## Step 0: Promoter Identity Resolution (Recommended)

Before searching eCourts, resolve the builder's full identity across related legal entities so you search ALL of them, not just the one the user provided:

```bash
node scripts/promoter-resolver.mjs resolve --name "{builder name}"
```

This catches SPVs, parent companies, and related entities that may have litigation under different names.

## Step 1: eCourts Search (national, state-agnostic)

eCourts via the Kleopatra API works for ALL Indian states. Set the state code for filtering, but the scraper itself is not state-specific:

```bash
node scripts/ecourts-search.mjs party-name --name "{builder name}" --state "MH"
```

State codes: `MH` (Maharashtra), `KA` (Karnataka), `TG` (Telangana), `TN` (Tamil Nadu), `UP` (Uttar Pradesh), `DL` (Delhi), `GJ` (Gujarat), etc. If unsure, omit the `--state` flag for a nationwide search.

If the builder operates through multiple legal entities (common for large groups), search each entity name returned by the promoter resolver:
- Company name (e.g., "Godrej Properties Limited")
- Brand name (e.g., "Godrej Properties")
- SPV names if known (e.g., "Godrej Keshav Nagar LLP")

## Step 2: RERA Complaint Cross-Reference (state-specific)

Check the RERA portal for formal complaints. Use the state-specific scraper based on where the builder operates:

**Maharashtra:**
```bash
node scripts/maharera-scraper.mjs search-promoter --name "{builder name}"
```

**Karnataka:**
```bash
node scripts/scrapers/krera-karnataka.mjs builder --name "{builder name}"
```

**Telangana:**
```bash
node scripts/scrapers/tsrera.mjs builder --name "{builder name}"
```

**Tamil Nadu:**
```bash
node scripts/scrapers/tnrera.mjs builder --name "{builder name}"
```

**Uttar Pradesh (Noida/Ghaziabad):**
```bash
node scripts/scrapers/uprera.mjs builder --name "{builder name}"
```

Extract complaint count and categories from RERA project pages.

## Step 3: WebSearch Legal News

Search for recent legal news:
- `"{builder name}" court case 2025 2026`
- `"{builder name}" NCLT insolvency`
- `"{builder name}" consumer forum order`
- `"{builder name}" RERA order penalty`

## Step 4: Assessment

### Case Summary Table

| Case Type | Pending | Disposed | Total | Severity |
|-----------|---------|----------|-------|----------|
| Consumer complaints | X | X | X | MEDIUM |
| Civil suits | X | X | X | LOW |
| Criminal cases | X | X | X | HIGH |
| NCLT / Insolvency | X | X | X | CRITICAL |
| Writ petitions | X | X | X | MEDIUM |

### Risk Classification

- **CRITICAL**: NCLT/insolvency proceedings = builder may be financially distressed. Do NOT proceed.
- **HIGH**: Criminal cases = serious allegations. Strongly reconsider.
- **MEDIUM**: Consumer complaints > industry average = pattern of buyer dissatisfaction.
- **LOW**: Few civil cases = normal business disputes.
- **CLEAN**: No cases found = positive signal (but verify thoroughness of search).

### Impact on Property Score

| Finding | Score Adjustment |
|---------|-----------------|
| NCLT proceedings | -3.0 (near-disqualifying) |
| Criminal cases | -2.0 per case |
| 10+ consumer complaints | -1.5 |
| 5-10 consumer complaints | -1.0 |
| 1-4 consumer complaints | -0.5 |
| No litigation found | +0.0 (no bonus, just baseline) |

## Output Format

```markdown
# Litigation Report: {Builder Name}

**Source:** eCourts India + MahaRERA + WebSearch
**Date:** {date}
**Risk Level:** {CRITICAL / HIGH / MEDIUM / LOW / CLEAN}

## Summary
- Total cases found: X
- Pending: X | Disposed: X
- Consumer: X | Civil: X | Criminal: X | NCLT: X

## Case Details
[Table with individual cases]

## RERA Complaints
[Summary from MahaRERA]

## Recent Legal News
[Key findings from WebSearch]

## Risk Assessment
[Clear verdict with score impact]

## Recommendation
[Buy / Proceed with caution / Avoid]
```

## Rules
- Always clearly state when search returns zero results: "No cases found. This could mean clean record OR that the builder operates under different legal entity names."
- NEVER provide legal advice. State: "This is informational. Consult a property lawyer for legal opinions."
- Cache results for 30 days (litigation doesn't change daily)
- If eCourts is down or returns errors, fall back to WebSearch and clearly label as "partial search"
