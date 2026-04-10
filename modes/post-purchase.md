# PropOps — Post-Purchase Mode

Tracks the property lifecycle after booking. Most buyers enter a 2-4 year limbo after paying the booking amount. Builders delay. Buyers don't know their rights. This mode enforces existing RERA protections that most buyers never exercise.

---

## Prerequisites

1. Read `modes/_shared.md` — load global rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. A property must exist in the tracker with status "Booked" or beyond

---

## Trigger

This mode activates when the user says:
- "Track my booked property"
- "My possession is delayed, what can I do?"
- "Calculate delay penalty for {property}"
- "Draft a RERA complaint"
- "What's the status of OC for {property}?"
- "When should I get possession of {property}?"
- "My builder is delaying, help"
- "Post-purchase tracking"

---

## Context

After you pay the booking amount for a property in India, you enter a multi-year waiting period. Here's what typically goes wrong and how to protect yourself:

**Common builder delays:**
- Missed RERA-registered completion date (very common)
- OC application delayed or stuck
- Amenities delivered months/years after possession
- Society formation indefinitely postponed
- Maintenance corpus not transferred
- Defects not rectified during liability period

**Your rights (most buyers don't know these):**

1. **RERA Section 18:** If possession is delayed, you have two options:
   - Withdraw from the project and get FULL refund + interest at SBI MCLR + 2%
   - Continue and receive interest at the same rate for every month of delay

2. **RERA Section 11(4)(a):** Builder must rectify any structural defect within 5 years of possession at NO cost to buyer.

3. **RERA Section 12:** Any promise made in the brochure/marketing material is legally enforceable.

4. **Society formation:** Within 3 months of OC, builder must facilitate society formation. If not done, you can complain to RERA or Registrar of Cooperatives.

5. **Maintenance corpus:** Builder must transfer maintenance corpus to society on formation. Non-transfer = criminal breach of trust.

---

## Step 1: Load Property Details

Read the property's record from `data/properties.md` and any associated documents:
- RERA registration date and ID
- Promised possession date (from agreement)
- RERA-stated completion date
- Stages paid for so far
- Current construction status
- Any past communications with builder

Create or update `data/post-purchase/{property-slug}.md` with tracking data.

---

## Step 2: Timeline Verification

```markdown
## Construction Timeline Status

### Original Timeline (from Agreement)

| Milestone | Promised Date | Actual Date | Status |
|-----------|--------------|-------------|--------|
| Foundation | {date} | {date or TBD} | {On time / Delayed by X months / Pending} |
| Plinth | {date} | {date or TBD} | ... |
| Superstructure | {date} | {date or TBD} | ... |
| Brickwork | {date} | {date or TBD} | ... |
| Plastering | {date} | {date or TBD} | ... |
| Flooring | {date} | {date or TBD} | ... |
| Finishing | {date} | {date or TBD} | ... |
| **Possession** | **{date}** | **{date or Pending}** | **{verdict}** |

### RERA vs Agreement

- **RERA-registered completion date:** {date from RERA portal}
- **Agreement-promised possession date:** {date from your agreement}
- **Actual status today:** {date}

If agreement date ≠ RERA date, the EARLIER date is binding (more protective of you).

### Current Delay Calculation

- **Scheduled possession:** {date}
- **Today's date:** {current date}
- **Delay duration:** {X months Y days}

If delay is less than 6 months: Usually within reasonable range, follow up
If delay is 6-12 months: Time to demand compensation under RERA Section 18
If delay is 12+ months: Serious action needed — consider RERA complaint or withdrawal
```

---

## Step 3: Delay Penalty Calculation

RERA Section 18 entitles you to interest on your paid amount for every month of delay. The rate is **SBI MCLR + 2%** (currently around 10-11%).

```markdown
## Delay Penalty Calculation

### Your Paid Amount So Far

| Payment Date | Milestone | Amount Paid |
|-------------|-----------|-------------|
| {date} | Booking | Rs {X} |
| {date} | Agreement | Rs {X} |
| {date} | Foundation | Rs {X} |
| ... | ... | ... |
| **Total** | | **Rs {X}** |

### Interest Entitlement (Per RERA Section 18)

- **Applicable rate:** SBI MCLR + 2% = {current rate}%
- **Current SBI 1-year MCLR:** {search for current rate}
- **Total paid:** Rs {X}
- **Delay duration:** {X months}

**Calculation method:**
For each payment, interest accrues from promised possession date to actual possession date (or today if still delayed).

| Payment | Amount | Days Overdue | Interest Rate | Interest Due |
|---------|--------|--------------|---------------|-------------|
| {date} | Rs {X} | {X} days | {rate}% | Rs {X} |
| ... | | | | |
| **Total Interest Due** | | | | **Rs {X}** |

**Your total entitlement if you continue:**
- Principal (refunded on final possession): Rs {X}
- Interest for delay: Rs {X}
- **Total:** Rs {X + Y}

**Your total entitlement if you withdraw:**
- Full refund: Rs {X}
- Interest on all paid amounts: Rs {X}
- **Total:** Rs {X + Y}
- Plus right to cancel without penalty (Section 19)
```

---

## Step 4: Action Decision Tree

Based on delay duration and builder responsiveness, recommend action:

### If Delay < 6 Months

**Status:** Reasonable flexibility expected

**Actions:**
1. Send a polite written follow-up asking for updated possession date
2. Request reason for delay in writing
3. Keep detailed records of all communications
4. Do NOT sign any revised timeline document without understanding implications

### If Delay 6-12 Months

**Status:** Time to assert your rights

**Actions:**
1. Send a formal notice demanding:
   - Revised possession date in writing
   - Compensation calculation per RERA Section 18
   - Proof of project status (photographs, CC status)
2. Start calculating your monthly delay penalty
3. Do NOT make further payments until builder responds
4. Consult a property lawyer
5. Begin preparing a RERA complaint (even if you don't file yet)

### If Delay 12-24 Months

**Status:** RERA complaint territory

**Actions:**
1. File a formal RERA complaint (detailed below)
2. Demand delay compensation per Section 18
3. Consider consumer court as well (parallel forum)
4. Stop all further payments until resolved
5. Engage a lawyer specializing in real estate

### If Delay 24+ Months

**Status:** Serious — withdrawal consideration

**Actions:**
1. Assess builder's financial health (are they solvent?)
2. Check if other buyers have received possession (phased delivery?)
3. Consider withdrawing and claiming full refund + interest
4. If many buyers affected, form a group — collective complaints are stronger
5. Check if builder is in NCLT/insolvency (then claim as creditor)

---

## Step 5: RERA Complaint Drafting

If the user decides to file a RERA complaint, draft it for them:

```markdown
## RERA Complaint Draft

**Before the MahaRERA Authority**

**Complainant:**
{Full name}
{Full address}
{Phone}
{Email}

**Respondent:**
{Builder's legal entity name}
{Builder's address}
{RERA registration number}

**Project:**
{Project name}
{RERA Project ID}

---

### Subject: Complaint under Section 31 of the Real Estate (Regulation and Development) Act, 2016, for violation of Sections 11, 13, 14, 18, and 19

---

### Facts of the Case

1. **Booking:** The Complainant booked Unit No. {X} in the Respondent's project "{project name}" (RERA ID: {id}) on {booking date} by paying a booking amount of Rs {X} towards the total consideration of Rs {X}.

2. **Agreement:** The Agreement for Sale was executed between the Complainant and the Respondent on {agreement date}.

3. **Promised Possession:** As per the Agreement for Sale (Clause {X}), possession was promised on or before {promised date}.

4. **RERA Commitment:** As per the RERA registration for the project (RERA ID {id}), completion was committed by {RERA date}.

5. **Total Paid:** As of date, the Complainant has paid Rs {X} towards the consideration, out of a total of Rs {X}. A tabular statement of payments is annexed as Annexure A.

6. **Delay:** The Respondent has failed to deliver possession by the promised date. As of {current date}, the delay amounts to {X} months.

7. **Communications:** The Complainant has repeatedly requested updates from the Respondent. Copies of written communications are annexed as Annexure B.

8. **Current Status:** Despite the elapsed time, the project remains incomplete. {Describe current state: construction stopped, progressing slowly, etc.}

---

### Violations Alleged

1. **Section 11(4)(a):** Failure to complete the project by the RERA-registered date.

2. **Section 13:** [If applicable] Demanded advance payment exceeding 10% before signing Agreement for Sale.

3. **Section 18:** Failure to compensate the Complainant for the delay at the prescribed rate (SBI MCLR + 2%).

4. **Section 19:** Denial of the Complainant's right to information and timely possession.

---

### Relief Sought

1. Direct the Respondent to complete the construction and hand over possession within a fixed timeframe.

2. Direct the Respondent to pay interest on the amount paid by the Complainant at the rate of SBI MCLR + 2% per annum, from the promised possession date until actual possession.

3. **ALTERNATIVELY** (if the Complainant chooses to withdraw):
   - Direct the Respondent to refund the full amount of Rs {X} paid by the Complainant.
   - Pay interest on the refund amount at SBI MCLR + 2% per annum from the date of each payment until actual refund.

4. Direct the Respondent to pay costs of this proceeding.

5. Any other relief that this Authority deems fit.

---

### Annexures

- Annexure A: Statement of payments made
- Annexure B: Copies of communications with Respondent
- Annexure C: Copy of Agreement for Sale
- Annexure D: Copy of RERA registration certificate
- Annexure E: Recent photographs of construction status

---

**Place:** {city}
**Date:** {date}

**Signature of Complainant**

{Name}
```

Save the draft to `data/post-purchase/{property-slug}-rera-complaint-draft.md` and advise the user:
- Review with a property lawyer before filing
- MahaRERA online complaint filing: https://maharera.maharashtra.gov.in/
- Filing fee: Rs 5,000 (refundable)
- Typical timeline: 60 days for disposal (in theory)

---

## Step 6: OC Status Tracking

```markdown
## Occupancy Certificate (OC) Tracking

**OC Status:** {Not applied / Applied / Received / Delayed}

### What is OC?

Occupancy Certificate is issued by the municipal corporation certifying that:
- Construction is complete as per sanctioned plan
- Building is fit for occupation
- All NOCs are in place (fire, environment, airport if applicable)

**WITHOUT OC, it is ILLEGAL to occupy the building.** Any property sold without OC (and offered for possession without it) is a serious red flag.

### Common OC Issues

- **Deviation from sanctioned plan:** Builder built beyond approved plan, OC denied
- **NOC pending:** Fire NOC or environment clearance not obtained
- **Corruption demands:** Municipal officials demanding bribes
- **Builder negligence:** Simply delayed filing application

### Your Actions

If possession offered WITHOUT OC:
1. **Refuse to take possession.** Document the refusal in writing.
2. Demand OC in writing with a deadline.
3. File complaint with RERA if OC not obtained within reasonable time.
4. Do NOT make final payment until OC is presented.

Final 10% of payment should be linked to OC presentation, not just "handover".
```

---

## Step 7: Society Formation Tracking

```markdown
## Society Formation

### Timeline (Per Law)

- **Within 3 months of OC:** Builder must facilitate society formation
- Promoter (builder) must call the first General Body meeting
- Election of managing committee from resident members

### Common Builder Tricks

- **Delays forming society indefinitely** — keeps control of maintenance money
- **Forms a "management company"** under builder's control instead of cooperative society
- **Withholds maintenance corpus** even after society formation
- **Retains common areas** (parking, terrace) in builder's name

### Your Rights

- You can approach the Registrar of Cooperative Societies
- Section 11(4)(e) of RERA mandates society formation
- Collective action works best — organize with other residents

### Maintenance Corpus

**What should be transferred:**
- All amounts collected as "maintenance deposit" or "corpus fund"
- Any unexpended common area charges
- Interest accrued on these amounts

**What to ask for:**
- Statement of account showing all corpus collected
- Proof of amount in separate bank account
- Transfer confirmation to the newly formed society

**If builder refuses:** This is breach of trust — escalate to RERA and police if necessary.
```

---

## Step 8: Defect Liability Tracking (5 Years Post-Possession)

```markdown
## Structural Defect Liability

**Per RERA Section 11(4)(a):** Builder is liable for any structural defect for **5 years from the date of possession**. At no cost to the buyer.

### What Counts as a Structural Defect?

- Wall cracks (beyond normal settlement)
- Water seepage and leakage
- Plumbing and drainage issues
- Electrical wiring problems
- Door/window frame issues
- Ceiling damage
- Flooring problems
- Sanitary fittings malfunction

### What Does NOT Count?

- Wear and tear from normal use
- Damage from buyer's modifications
- Normal maintenance (painting, etc.)

### Your Action Plan

1. **Document the defect:** Photos with date, measurements, written description.
2. **Report in writing:** Email the builder with the defect description and demand rectification.
3. **Keep records:** All correspondence, photos, and builder responses.
4. **Deadline:** Give builder 30 days to rectify.
5. **Escalate if ignored:** File RERA complaint. You can claim cost of repair + damages.

### Common Builder Tricks

- "Warranty expired" (wrong — RERA gives 5 years by law, overrides any shorter warranty)
- "This is normal settlement" (if persistent cracks, it's a defect)
- "You modified the property" (only applies if the defect is in modified area)
- "It's not covered under DLP" (if it's structural, it IS covered)
```

---

## Step 9: Tracking File Creation

Create or update `data/post-purchase/{property-slug}.md` with:

```markdown
# Post-Purchase Tracking: {Property Name}

**Property:** {Full name}
**Builder:** {Name}
**Unit:** {Number}
**Booking date:** {date}
**RERA ID:** {id}
**Promised possession:** {date}
**Current status:** {Booked / Construction / Ready / Possessed / Disputed}

---

## Timeline

{All milestones with dates}

## Payments Made

{Table of all payments with dates}

## Delay Status

- Delay: {X months}
- Entitled interest: Rs {X}
- Action taken: {None / Follow-up / Formal notice / RERA complaint}

## Communications Log

{All communications with builder with dates}

## Documents

- Agreement for Sale: {location}
- RERA certificate: {location}
- Receipts: {location}
- Correspondence: {location}

## Next Action

{What to do next with deadline}

## Notes

{Any important context}
```

---

## Rules

- **Always calculate delay penalty accurately** — this is your money, every day matters
- **Document everything** — written communications are your evidence if you escalate
- **Know your rights** — most buyers lose because they don't know RERA protects them
- **Recommend lawyer for serious issues** — RERA complaints benefit from legal advice
- **Don't encourage aggressive action when unnecessary** — sometimes patience is wise, sometimes it's surrender
- **Group action is stronger** — encourage connecting with other affected buyers
- **Update the tracker** whenever status changes
- **Be sensitive** — delayed possession is incredibly stressful for buyers, especially families
