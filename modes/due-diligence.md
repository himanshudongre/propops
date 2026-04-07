# PropOps -- Due Diligence Mode

Comprehensive pre-purchase checklist that walks the buyer through every verification step before committing to a property. Combines automated checks with manual verification guidance.

---

## Prerequisites

1. Read `modes/_shared.md` -- load rules
2. Read `modes/_profile.md` -- load user overrides (if exists)
3. Read `buyer-brief.md` -- load buyer requirements
4. A property must be identified (by name, report number, or URL)

## Trigger

This mode activates when the user says:
- "Run due diligence on {property}"
- "Full checklist for {property}"
- "Is {property} safe to buy?"
- "Pre-purchase check for {property}"

## The Checklist

### Section 1: RERA Verification (Automated)

Run MahaRERA scraper and verify:

- [ ] **RERA registered**: Certificate number exists and is valid
- [ ] **RERA not expired**: Registration date and expiry date check
- [ ] **No extensions**: Check if completion date has been extended (red flag if >2 times)
- [ ] **Promoter matches**: Builder name on listing matches RERA promoter
- [ ] **Project type matches**: Configuration matches RERA registration

### Section 2: Builder Reputation (Automated)

Run builder mode or reference existing builder report:

- [ ] **Builder Score >= 6/10**: Minimum threshold for safe purchase
- [ ] **On-time delivery >= 70%**: Acceptable track record
- [ ] **Complaints < industry average**: Per-project complaint rate
- [ ] **No NCLT proceedings**: Critical check
- [ ] **No criminal cases**: Against builder or key promoters

### Section 3: Litigation Check (Automated)

Run litigation mode or reference existing report:

- [ ] **No pending criminal cases**: Against builder
- [ ] **No NCLT/insolvency**: Against builder or parent company
- [ ] **Consumer cases reviewed**: Understand nature and volume
- [ ] **Property-specific litigation**: Check if this specific property/land has cases

### Section 4: Price Verification (Automated + Manual)

- [ ] **IGRS registration check**: Compare quoted price vs actual registrations (if available)
- [ ] **Area comparable check**: Price/sqft vs area average
- [ ] **Ready reckoner rate**: Price vs government circle rate
- [ ] **Hidden costs calculated**: Total cost including stamp duty, GST, registration, maintenance

### Section 5: Title & Legal (Manual -- Guide the Buyer)

These require a lawyer. PropOps guides the buyer on what to check:

- [ ] **Title search (30 years)**: Verify unbroken chain of ownership for 30 years
  - Ask lawyer to check: sale deeds, gift deeds, partition deeds, wills
  - Verify: no disputed inheritance, no pending partition suits
- [ ] **Encumbrance Certificate (EC)**: Obtain from Sub-Registrar's office
  - Should show no mortgages, liens, or charges on the property
  - Get EC for at least 13-30 years
- [ ] **Mutation records**: Property should be mutated in seller's/builder's name in municipal records
- [ ] **Land use certificate**: Verify land is zoned for residential use
  - Check: conversion order from NA to residential (if applicable)
- [ ] **Approved building plan**: Sanctioned plan from municipal corporation
  - Verify: actual construction matches approved plan
  - Check for any unauthorized floor/structure additions
- [ ] **Commencement Certificate (CC)**: Builder has CC to start construction
- [ ] **Occupancy Certificate (OC)**: For ready-to-move properties, OC is mandatory
  - No OC = illegal to occupy (even if builder says "applied for OC")
- [ ] **No Objection Certificates (NOCs)**:
  - Fire NOC
  - Airport authority NOC (if near airport)
  - Environmental clearance
  - Water/sewage connection approval
- [ ] **Society formation**: For existing buildings, check if cooperative society is formed

### Section 6: Physical Verification (Manual -- Guide the Buyer)

- [ ] **Site visit**: Visit the property at different times (morning, evening, weekend)
- [ ] **Construction quality**: Check walls, flooring, plumbing, electrical
- [ ] **Water supply**: Ask existing residents about water pressure and hours
- [ ] **Power backup**: Verify generator/inverter capacity
- [ ] **Parking**: Verify allotted parking spot exists and is adequate
- [ ] **Common areas**: Check lifts, staircase, lobby, garden maintenance
- [ ] **Neighbors**: Talk to existing residents about their experience
- [ ] **Surroundings**: Check for noise (highway, railway), smells (industrial), flooding history

### Section 7: Financial Verification (Guided)

- [ ] **Loan eligibility**: Verify property is approved by your bank
- [ ] **Agreement review**: Have lawyer review the Agreement for Sale
  - Key clauses: possession date penalty, specification list, payment schedule
  - Red flags: one-sided penalty clauses, vague specifications, no penalty for builder delay
- [ ] **Payment plan**: Understand CLP vs TLP implications
- [ ] **Stamp duty calculation**: Verify correct rate for your district
- [ ] **GST applicability**: 5% with ITC or 1% without ITC for under-construction

## Output Format

```markdown
# Due Diligence Report: {Property Name}

**Date:** {date}
**Property:** {name} by {builder} in {location}
**Report Reference:** {report number if exists}

## Automated Checks

| # | Check | Status | Details | Source |
|---|-------|--------|---------|--------|
| 1 | RERA registered | PASS/FAIL/PENDING | {details} | MahaRERA |
| 2 | RERA not expired | PASS/FAIL | {details} | MahaRERA |
| 3 | Builder Score >= 6 | PASS/FAIL | Score: X/10 | PropOps |
| 4 | No NCLT proceedings | PASS/FAIL | {details} | eCourts |
| 5 | No criminal cases | PASS/FAIL | {details} | eCourts |
| 6 | Price vs registrations | PASS/WARN/N-A | {gap %} | IGRS |
...

Automated checks passed: X/Y
Automated checks failed: Z
Requires manual verification: W

## Manual Checklist

### Title & Legal (take to your lawyer)
- [ ] Title search (30 years)
- [ ] Encumbrance Certificate
- [ ] Mutation records
...

### Physical Verification (do yourself)
- [ ] Site visit (different times)
- [ ] Talk to existing residents
...

### Financial (verify with bank)
- [ ] Loan approval for this property
- [ ] Agreement review by lawyer
...

## Overall Assessment

**Automated checks:** X/Y passed
**Critical failures:** {list any}
**Recommendation:** {Proceed to manual checks / Do NOT proceed / Needs more investigation}

## Next Steps
1. {First thing to do}
2. {Second thing to do}
3. {Third thing to do}
```

## Rules
- NEVER say a property is "safe to buy" based only on automated checks. Always recommend lawyer verification for title and legal matters.
- Mark checks as PASS, FAIL, WARN (warning but not blocking), PENDING (needs manual verification), or N/A (not applicable).
- If automated checks reveal any CRITICAL failure (no RERA, NCLT, criminal cases), recommend stopping before manual checks: "Critical issues found. Resolve these before spending money on lawyer/site visit."
- This checklist is a guide, not legal advice. Always state this.
