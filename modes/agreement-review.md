# PropOps — Agreement Review Mode

Reviews builder agreements (Agreement for Sale, Sale Deed, Allotment Letter) for one-sided clauses, missing RERA protections, vague specifications, and legal traps. Catches 80% of the issues a property lawyer would flag at a fraction of the cost.

**CRITICAL DISCLAIMER:** This mode provides information, NOT legal advice. The output is a checklist to take to a qualified property lawyer — it does not replace one. Always have a property lawyer review the final agreement before signing.

---

## Prerequisites

1. Read `modes/_shared.md` — load global rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. The user must provide an agreement file (PDF, DOCX, or image) OR paste the text

---

## Trigger

This mode activates when the user says:
- "Review my builder agreement"
- "Check this agreement for sale"
- "Review this sale deed"
- "Is this agreement fair?"
- "What's wrong with this agreement?"
- "Parse my builder contract"
- "Check the allotment letter"

---

## Step 1: Ingest the Document

Accept the agreement in any of these formats:
- PDF file (use WebFetch or file reading)
- DOCX file (extract text)
- Image/scan (use vision capabilities)
- Pasted text directly in chat

If the document is long (50+ pages), process it in sections:
1. Cover page and parties
2. Recitals and definitions
3. Consideration and payment schedule
4. Possession and delivery
5. Specifications and amenities
6. Termination and default clauses
7. Indemnity and warranties
8. Miscellaneous (dispute resolution, force majeure, etc.)
9. Schedules and annexures

---

## Step 2: RERA Compliance Check

RERA (Real Estate Regulation Act, 2016) mandates specific clauses in every builder agreement. Missing or modified clauses are red flags.

### Mandatory RERA Clauses

Check for the presence of these mandatory provisions:

| Section | Requirement | What to Look For |
|---------|-------------|-----------------|
| **Section 4(2)(l)(D)** | Timeline for completion | Specific possession date, not vague language |
| **Section 6** | Parties can't unilaterally cancel | Check cancellation clauses aren't one-sided |
| **Section 11(4)** | Builder must rectify defects within 5 years | "Defect liability period" clause present? |
| **Section 12** | Disclosure obligations | Project details, layout, sanctioned plan |
| **Section 13** | Booking amount max 10% without agreement | Check payment schedule front-loading |
| **Section 14** | No changes to plan without 2/3 buyer consent | "Alteration of plans" clause |
| **Section 17** | Title must be clear and marketable | Warranty of title clause |
| **Section 18** | Delay penalty — interest on refund or same rate on delay | **CRITICAL** — must be present, must be same rate both ways |
| **Section 19** | Buyer rights (information, possession, clear title) | Listed explicitly? |

```markdown
## 1. RERA Compliance Check

| # | Mandatory Clause | Status | Location in Agreement | Notes |
|---|-----------------|--------|----------------------|-------|
| 1 | Specific possession date (Section 4) | PRESENT / MISSING / VAGUE | Page X, Clause Y | {specifics} |
| 2 | Delay penalty clause (Section 18) | PRESENT / MISSING / ONE-SIDED | Page X, Clause Y | {specifics} |
| 3 | Defect liability 5 years (Section 11) | PRESENT / MISSING / REDUCED | Page X, Clause Y | {specifics} |
| 4 | No plan changes without consent (Section 14) | PRESENT / MISSING / WEAKENED | Page X, Clause Y | {specifics} |
| 5 | Clear title warranty (Section 17) | PRESENT / MISSING | Page X, Clause Y | {specifics} |
| 6 | Buyer rights listed (Section 19) | PRESENT / MISSING | Page X, Clause Y | {specifics} |

**RERA Compliance Score: X/6**

Missing RERA-mandated clauses = CRITICAL red flag. Do not sign without these.
```

---

## Step 3: One-Sided Clause Detection

The most common exploitation. Builders put harsh penalties on buyers and soft penalties on themselves.

### Patterns to Flag

**1. Asymmetric Delay Penalties**

Compare:
- **Buyer's delay in payment:** What interest rate does builder charge?
- **Builder's delay in possession:** What compensation does buyer receive?

RERA mandates these should be the SAME rate. If buyer pays 18% for delay but builder pays 2% — this is illegal and a red flag.

**2. Termination Rights**

- Can builder terminate if buyer delays payment? Usually yes.
- Can buyer terminate if builder delays possession? Often NO in builder-drafted agreements.
- What happens to buyer's money on termination? Look for forfeiture clauses exceeding 10% (illegal per RERA).

**3. Specification Changes**

- Does the agreement allow builder to "substitute materials of equivalent quality at builder's sole discretion"?
- This is how premium specifications become cheap substitutes.
- Flag any "subject to change" or "at builder's discretion" language on specs.

**4. Amenity Delivery**

- Are amenities (pool, gym, clubhouse) guaranteed with possession?
- Or "may be delivered in subsequent phases"?
- Common trick: possession without amenities, then amenities delayed indefinitely.

**5. Super Built-Up vs Carpet Area**

- Per RERA, sale must be on CARPET area basis.
- Flag any agreement still using "super built-up area" as the basis of price.
- Check if the carpet area matches what was marketed.

**6. Parking**

- Is parking "allotted" or "sold"?
- RERA says parking can't be sold separately in multi-storey buildings (it's common area).
- Flag any separate "parking consideration" or "parking sale."

**7. Club Membership**

- Mandatory? How much?
- Refundable deposit or one-time fee?
- Annual fees locked in or "subject to revision by builder"?

**8. Maintenance Corpus**

- How much is being collected?
- Is it held in trust or becomes builder's property?
- Will it be transferred to the society on formation?

**9. Common Area Ownership**

- Who owns common areas until society is formed?
- Does the agreement specify transfer of common areas to society?

**10. Force Majeure**

- Reasonable events (earthquake, flood, pandemic): OK
- Unreasonable: "any cause beyond builder's reasonable control including labor shortage, material price increase, regulatory changes"
- COVID became the excuse for everything. Flag overly broad force majeure.

```markdown
## 2. One-Sided Clause Detection

### 🔴 Critical Red Flags Found

| # | Issue | Location | Severity | Impact | Recommended Fix |
|---|-------|----------|----------|--------|----------------|
| 1 | Buyer pays 18% interest on delay, builder pays only 2% | Clause X.Y | CRITICAL | Violates RERA Section 18 | Negotiate: same rate both ways |
| 2 | "Specifications subject to change at builder's discretion" | Clause X.Y | HIGH | Enables downgrade | Demand: changes only with buyer consent |
| 3 | 25% forfeiture on buyer termination | Clause X.Y | CRITICAL | Violates RERA 10% cap | Negotiate: max 10% forfeiture |

### 🟡 Concerning Clauses

| # | Issue | Location | Notes |
|---|-------|----------|-------|
| 1 | Parking sold separately for Rs X | Clause X.Y | Parking can't be sold separately per RERA |
| 2 | Club membership mandatory Rs X with annual revision | Clause X.Y | Negotiate cap on annual revision |
| 3 | Amenities "may be delivered in subsequent phases" | Clause X.Y | Demand specific amenity delivery date |

### 🟢 Clauses Properly Drafted

| # | Clause | Location | Notes |
|---|--------|----------|-------|
| 1 | Defect liability 5 years | Clause X.Y | Properly per RERA Section 11 |
| 2 | Carpet area basis of sale | Clause X.Y | Compliant with RERA |
```

---

## Step 4: Specification Verification

Check if the agreement's specifications match what was marketed.

### Fields to Verify

| Item | Marketed As | In Agreement | Match? |
|------|-------------|--------------|--------|
| Flooring (living room) | Italian marble | Vitrified tiles | ❌ DOWNGRADE |
| Kitchen countertop | Granite | Quartz | Different — verify value |
| Bathroom fittings | Jaquar | Cera / equivalent | ❌ VAGUE |
| Doors | Teak | Engineered wood | ❌ DOWNGRADE |
| AC provision | Yes, all rooms | Only provision, no ACs | Clarify |
| Modular kitchen | Included | Optional extra | ❌ HIDDEN COST |

Cross-reference with:
- Brochure provided to buyer
- Marketing material (website, ads, emails)
- Sample flat (if shown)

**Builder's common trick:** Marketing shows premium specs, agreement has vague language like "or equivalent quality at builder's discretion" — enabling downgrades.

---

## Step 5: Payment Schedule Analysis

Check the payment schedule for fairness and RERA compliance.

### RERA Rules

- Booking amount: Max 10% before signing agreement (Section 13)
- Construction-linked payments should match actual construction stages
- No front-loading beyond actual work completed

### Red Flags

| # | Pattern | Problem |
|---|---------|---------|
| 1 | 20-30% demanded before foundation | Front-loaded, risky for buyer |
| 2 | Payment linked to time, not construction | CLP should be construction-linked |
| 3 | "On signing agreement" stage demanding >10% | Violates RERA Section 13 |
| 4 | Penalty interest on buyer delays >2% above SBI MCLR | Unreasonable |
| 5 | No penalty on builder for delayed milestones | Should be symmetric |

### Output

```markdown
## 3. Payment Schedule Analysis

### Scheduled Payments

| Stage | % of Price | Amount (Rs) | Expected Date | Trigger |
|-------|-----------|-------------|---------------|---------|
| Booking | 10% | Rs X | Signed | RERA-compliant |
| Agreement signing | 15% | Rs X | Within 30 days | CHECK: max 10% per RERA 13 |
| Foundation | 10% | Rs X | Month 6 | OK |
| Plinth | 10% | Rs X | Month 9 | OK |
| 5th floor slab | 10% | Rs X | Month 12 | OK |
| ... | | | | |

### Issues Found

- Agreement signing demands 15% — RERA max is 10% before agreement
- No construction-linked triggers for payments 4-6 (time-based only)
- Late payment penalty: 18% p.a. (reasonable max is SBI MCLR + 2%)

### Recommended Modifications

1. Reduce "on agreement signing" to 10% max
2. Link all milestone payments to actual RERA-registered construction stages
3. Cap late payment penalty at SBI MCLR + 2% (~10-11% currently)
```

---

## Step 6: Missing Clauses Buyer Should Demand

Clauses that benefit the buyer that builders usually omit.

### Essential Buyer Protections

1. **Right to inspect construction** before each payment
2. **Specific possession date** with day/month/year (not "approximately")
3. **Right to receive RERA registration certificate copy**
4. **Right to receive sanctioned plans copy**
5. **Right to receive title documents copy**
6. **OC-linked final payment** (10% only on OC, not before)
7. **Refund with interest** if possession delayed beyond X months
8. **Right to audit maintenance corpus**
9. **Specific amenity delivery timeline** (separate from possession)
10. **First right of refusal on adjacent parking**
11. **Transparent common area calculation**
12. **Right to form society post-OC**
13. **Builder liability for structural defects** (beyond RERA's 5 years — ideally 10)
14. **Escrow account for payments** until project completion
15. **No-lien certificate** before possession

---

## Step 7: Final Report

```markdown
# Agreement Review Report

**Property:** {Project name, unit number}
**Builder:** {Name}
**Agreement type:** Agreement for Sale / Allotment Letter / Sale Deed
**Date reviewed:** {date}
**Total pages:** {X}

---

## Overall Verdict

**{SAFE TO SIGN / NEEDS MAJOR NEGOTIATION / DO NOT SIGN WITHOUT LAWYER REVIEW}**

{2-3 sentence summary of findings}

---

## Severity Summary

| Severity | Count | Action Needed |
|----------|-------|---------------|
| CRITICAL (violates RERA) | X | Must be fixed before signing |
| HIGH (significantly one-sided) | X | Strongly negotiate |
| MEDIUM (unfair but survivable) | X | Push back if possible |
| LOW (minor wording issues) | X | Note but not dealbreakers |

---

## Top 10 Issues to Fix Before Signing

1. **{Issue}** — Clause X.Y — {Why this matters} — {What to demand}
2. ...

---

## RERA Compliance: {X/6}

{Details from Step 2}

---

## Critical Red Flags

{Details from Step 3}

---

## Specification Verification

{Details from Step 4}

---

## Payment Schedule Issues

{Details from Step 5}

---

## Missing Buyer Protections to Demand

{List from Step 6 with which are most important for this specific agreement}

---

## Negotiation Strategy

Before signing, request the following changes in writing:

1. {Specific demand with clause reference}
2. {Specific demand with clause reference}
3. ...

Send this as a formal "pre-signing review comments" letter to the builder.

---

## Lawyer Review Recommendation

**Even after addressing these issues, ALWAYS have a qualified property lawyer in {city} review the final agreement.**

Things a lawyer will check that this mode cannot:
- Title chain verification (30 years)
- Encumbrance certificate check
- Mutation records
- Building plan sanction verification
- Local area specific issues
- Current legal precedents affecting similar cases

Typical lawyer fee for agreement review: Rs 15,000-50,000
Worth every rupee for a property purchase.
```

---

## Rules

- **ALWAYS include the lawyer disclaimer.** This mode is not legal advice.
- **Be specific.** "Clause X.Y on page Z" not "there's an issue somewhere."
- **Cite RERA sections.** "Violates RERA Section 18" is more actionable than "this is unfair."
- **Provide specific language** the buyer can request in modifications.
- **Rank by severity.** CRITICAL issues must be highlighted separately.
- **Never flag too many false positives.** A 50-issue report is useless — focus on the 10-15 that actually matter.
- **Acknowledge context.** Some "unfair" clauses are market-standard and not worth fighting.
- **Watch for scanned/handwritten sections.** These might be negotiated additions — read them carefully.
