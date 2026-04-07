# PropOps — Negotiate Mode

Data-backed negotiation strategy generator. Arms the buyer with registration price data, market intelligence, and scripted responses to maximize their position.

---

## Prerequisites

1. Read `modes/_shared.md` — load scoring system and rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. Read `data/buyer-brief.md` — load buyer requirements (if exists)

---

## Trigger

This mode activates when the user says:
- "Help me negotiate for {property}"
- "What should I offer for {property}?"
- "Negotiation strategy for {property}"
- "How much should I pay for {property}?"
- "Generate a negotiation plan"

Also triggered as a follow-up from evaluate mode (Block G deep-dive).

---

## Input

The user provides:
- A property they are interested in (by name, report number, or URL)
- Optionally: their budget ceiling, financing status, timeline

If an evaluation report exists for this property, read it first. If not, gather minimum required data: project name, builder, location, configuration, quoted price.

---

## Step 1: Registration Price Research

This is the foundation of any negotiation. Actual registration prices are your strongest leverage.

### Primary: IGRS Data

Search IGRS portal for registrations in:

1. **Same project** — most relevant, highest leverage
2. **Same society/building** (for resale) — direct comparison
3. **Same area, similar configuration** — comparable data
4. **Same sub-registrar office jurisdiction** — area-level benchmarks

For each registration found, extract:
- Registration date
- Consideration amount (sale price)
- Area (if mentioned in document)
- Calculated price per sqft
- Document type (sale deed, agreement for sale)

### Secondary: WebSearch Estimates

If IGRS data is insufficient:
- Search for "{project name} registration price"
- Search for "{area} property registration prices {year}"
- Check property portals for "price trends" sections
- Look for forum posts discussing actual transaction prices

**Always label the data source clearly.** IGRS data is a hard fact. WebSearch estimates are soft intelligence.

### Output

```
## 1. Registration Price Intelligence

### Same Project Registrations

| # | Date | Unit | Registered Price | Area (sqft) | Price/sqft | Source |
|---|------|------|-----------------|-------------|------------|--------|
| 1 | {date} | {unit} | Rs {X}L | {X} | Rs {X}/sqft | IGRS |
| 2 | {date} | {unit} | Rs {X}L | {X} | Rs {X}/sqft | IGRS |

Average registration price/sqft (same project): Rs {X}/sqft
Data points: {X} registrations over {X} months

### Area Comparable Registrations

| # | Date | Project | Registered Price | Area (sqft) | Price/sqft | Source |
|---|------|---------|-----------------|-------------|------------|--------|
| 1 | {date} | {name} | Rs {X}L | {X} | Rs {X}/sqft | IGRS |
| 2 | {date} | {name} | Rs {X}L | {X} | Rs {X}/sqft | IGRS |

Average registration price/sqft (area): Rs {X}/sqft

### Ready Reckoner Rate

Ready reckoner rate for this zone: Rs {X}/sqft
(This is the minimum stamp duty valuation — actual market is typically {X-Y}x this rate)

### Price Gap Analysis

| Metric | Value |
|--------|-------|
| Builder's quoted price/sqft | Rs {X}/sqft |
| Average registration price/sqft | Rs {X}/sqft |
| **Price gap** | **{+X%} above registrations** |
| Ready reckoner rate | Rs {X}/sqft |
| Quoted vs RR multiple | {X.Xx} |
```

---

## Step 2: Market Gap Analysis

Calculate the difference between what the builder is asking and what the market is actually paying.

```
## 2. Market Gap Analysis

| Component | Amount | Per sqft | Source |
|-----------|--------|----------|--------|
| Builder quoted price | Rs {X}L | Rs {X}/sqft | Listing |
| Average same-project registration | Rs {X}L | Rs {X}/sqft | IGRS |
| Average area registration | Rs {X}L | Rs {X}/sqft | IGRS |
| **Gap (same project)** | **Rs {X}L** | **Rs {X}/sqft ({+X%})** | Calculated |
| **Gap (area average)** | **Rs {X}L** | **Rs {X}/sqft ({+X%})** | Calculated |

### Gap Interpretation

- **0-5% gap**: Price is close to market. Builder may hold firm. Focus on hidden costs and payment terms.
- **5-15% gap**: Room to negotiate. Target closing at 5-8% above registrations. Use data aggressively.
- **15-25% gap**: Significant overpricing. Strong negotiation possible. Consider walking away if builder won't move.
- **25%+ gap**: Extremely overpriced. Builder is testing the market. Either negotiate hard or walk away.

**This property's gap: {X%} — {interpretation}**
```

---

## Step 3: Builder Inventory Assessment

Unsold inventory is the buyer's greatest leverage. A builder sitting on unsold units is more willing to negotiate.

### Data Collection

1. Check RERA portal for total units vs booked units
2. WebSearch for "{project name} availability" or "{project name} unsold units"
3. Check property portals for number of units listed in the same project
4. Look for builder's quarterly reports (if listed company) for unsold inventory data

```
## 3. Builder Inventory Assessment

| Metric | Value | Source |
|--------|-------|--------|
| Total units in project | {X} | RERA |
| Units booked/sold | {X} | RERA / estimated |
| Estimated unsold | {X} ({Y%}) | Calculated |
| Units listed on portals | {X} | Portal scan |
| Project launch date | {date} | RERA |
| Months since launch | {X} | Calculated |
| Sales velocity | {X units/month} | Estimated |

### Inventory Leverage

- **<20% unsold**: Low leverage — builder has sold well, less pressure to discount
- **20-40% unsold**: Moderate leverage — builder will negotiate for serious buyers
- **40-60% unsold**: Strong leverage — builder needs sales, significant negotiation room
- **>60% unsold**: Maximum leverage — builder may be desperate, could also signal problems with the project

**This project: {X%} unsold — {leverage assessment}**
```

---

## Step 4: Market Conditions Assessment

Is it a buyer's market or seller's market in this area?

```
## 4. Market Conditions

| Factor | Assessment | Implication |
|--------|-----------|-------------|
| Price trend (12 months) | Rising / Flat / Declining | {impact on negotiation} |
| New supply in area | High / Medium / Low | High supply = more buyer leverage |
| Demand level | Hot / Warm / Cool | Cool = more buyer leverage |
| Interest rates trend | Rising / Stable / Falling | Rising = buyer caution, more leverage |
| Policy environment | Favorable / Neutral / Restrictive | {impact} |
| Festive/seasonal factor | {if applicable} | Builders offer more during festivals |
| Quarter-end pressure | {if applicable} | Builders may push for sales at quarter-end |

**Overall market assessment: {Buyer's market / Balanced / Seller's market}**
**Negotiation leverage level: {Strong / Moderate / Limited}**
```

---

## Step 5: Negotiation Strategy

The core output. A complete negotiation playbook.

### 5A: Your Leverage Points

```
## 5. Negotiation Strategy

### Your Leverage Points

1. **Registration data**: "Units in your project registered at Rs {X}/sqft in {month}. Your asking price of Rs {X}/sqft is {X%} above actual transaction prices."

2. **Inventory pressure**: "I understand there are approximately {X} unsold units in this project. I'm a serious buyer with {financing status}."

3. **Competing options**: "I'm also considering {competitor project 1} at Rs {X}/sqft and {competitor project 2} at Rs {X}/sqft. Both are in similar locations."

4. **Payment readiness**: "I have a pre-approved home loan for Rs {X}L and can close within {X} weeks if we agree on fair terms."

5. **Market conditions**: "{Specific market condition that favors buyer — e.g., rising inventory, declining demand, interest rate hikes, festival season discounts}"

6. **Hidden costs knowledge**: "When I calculate all-in costs including {list extras}, the effective price goes up to Rs {X}/sqft. I need the base price to account for this."
```

### 5B: Suggested Offer Price

```
### Price Strategy

| Stage | Price | Per sqft | Rationale |
|-------|-------|----------|-----------|
| **Your opening offer** | Rs {X}L | Rs {X}/sqft | At average registration price — starting position |
| **Expected counter** | Rs {X}L | Rs {X}/sqft | Builder will likely counter here |
| **Your target** | Rs {X}L | Rs {X}/sqft | 5-8% above registrations — fair for both sides |
| **Your ceiling** | Rs {X}L | Rs {X}/sqft | Maximum you should pay — includes brief-matching and opportunity cost |
| **Walk-away price** | Rs {X}L | Rs {X}/sqft | Above this, better options exist elsewhere |

**Opening offer rationale:** Based on average registration price of Rs {X}/sqft from {X} data points spanning {X} months. This is the price the market is actually paying. Any premium above this must be justified by specific value (floor, facing, amenities, timing).

**Target price rationale:** Rs {X}/sqft represents a {X%} premium above average registrations, which accounts for {specific factors — new inventory vs resale, specific floor/facing premium, current market momentum}. This is a fair deal for both sides.

**Walk-away rationale:** At Rs {X}/sqft or above, you can get {comparable property} which scores {X}/10 on PropOps evaluation, making this property the less attractive option.
```

### 5C: Negotiation Script

```
### Negotiation Script

**Phase 1: Opening (show you've done homework)**

> "I'm interested in {project name} and I've been researching the area carefully. I've looked at actual registration data for this project and comparable properties. Based on recent registrations averaging Rs {X}/sqft, I'd like to discuss pricing around Rs {X}/sqft for {specific unit or configuration}."

**Phase 2: If builder quotes list price or says "price is fixed"**

> "I understand you have a list price, but I want to share some data. In the last {X} months, {X} units in your project registered at an average of Rs {X}/sqft. The area average for comparable projects is Rs {X}/sqft. I'd like a price that's closer to what the market is actually paying."

**Phase 3: If builder cites amenities, brand premium, or future appreciation**

> "I appreciate the quality and amenities. However, my offer is based on what buyers in this project and area are actually paying. Premium claims need to be backed by registration data, not brochure promises. What's the best price you can offer for a confirmed booking today?"

**Phase 4: If builder offers schemes instead of price reduction**

> "Thank you for the offer, but I prefer a clean, transparent price reduction rather than schemes that add conditions. A lower base price benefits both of us — it reduces my stamp duty as well. What's the best all-inclusive price per sqft?"

**Phase 5: Closing**

> "I have financing arranged and can complete the booking within {X} days at Rs {X}/sqft. This is a fair price based on market data. If this works, I'd like to proceed with the booking form today."

**Phase 6: If builder won't budge**

> "I appreciate your time. Let me evaluate my other options — I'm looking at {competitor 1} and {competitor 2} which are both priced closer to area registrations. I'll circle back if your pricing becomes more competitive. Please feel free to reach out if your situation changes."
```

### 5D: Hidden Costs Checklist

```
### Hidden Costs Checklist

Use this checklist to ensure you account for ALL costs beyond the base price. Ask the builder about each item BEFORE signing anything.

| # | Cost Item | Typical Range | Ask Builder | Included? | Amount |
|---|-----------|--------------|-------------|-----------|--------|
| 1 | Stamp duty | 5-7% of agreement value | State-mandated, non-negotiable | No | Rs {X} |
| 2 | Registration fee | 1% (capped at Rs 30,000 in MH) | State-mandated | No | Rs {X} |
| 3 | GST | 5% (affordable) / 12% (others) for under-construction | Check if included in quoted price | {?} | Rs {X} |
| 4 | Legal/documentation | Rs 10K-50K | What do you charge? | {?} | Rs {X} |
| 5 | Covered parking | Rs 3-10L per slot | Is parking included or extra? | {?} | Rs {X} |
| 6 | Open parking | Rs 1-5L per slot | Same as above | {?} | Rs {X} |
| 7 | Floor rise charges | Rs 50-200/sqft per floor | Is this already in the quoted price? | {?} | Rs {X} |
| 8 | Preferred location charge (PLC) | Rs 50-300/sqft | For corner, garden, road facing | {?} | Rs {X} |
| 9 | Club house membership | Rs 1-5L one-time | Is this mandatory? | {?} | Rs {X} |
| 10 | Maintenance deposit | Rs 50-100/sqft for 2-3 years | How many years upfront? | {?} | Rs {X} |
| 11 | Sinking fund | Rs 10-30/sqft | How many years? | {?} | Rs {X} |
| 12 | Infrastructure charges | Rs 50-200/sqft | External/internal development | {?} | Rs {X} |
| 13 | MSEDCL electricity deposit | Rs 10-20K | Standard | No | Rs {X} |
| 14 | Water connection deposit | Rs 5-15K | Municipal | No | Rs {X} |
| 15 | Gas pipeline deposit | Rs 5-10K | If applicable | {?} | Rs {X} |
| 16 | Advance maintenance | Rs 3-5/sqft/month for 6-12 months | Often charged pre-OC | {?} | Rs {X} |
| | **TOTAL HIDDEN COSTS** | | | | **Rs {X}** |
| | **ALL-IN PRICE** | | Base + all extras | | **Rs {X}** |
| | **EFFECTIVE PRICE/SQFT** | | All-in / carpet area | | **Rs {X}/sqft** |

**Key question to ask:** "What is the all-inclusive price per sqft on carpet area, including ALL charges except government duties?"
```

### 5E: Payment Plan Analysis

```
### Payment Plan Analysis

#### Option 1: Construction-Linked Plan (CLP)
- Payment tied to construction milestones
- Typically: 10% booking + 80% linked to construction + 10% on possession

| Milestone | % Payment | Amount | When |
|-----------|----------|--------|------|
| Booking | 10% | Rs {X}L | Now |
| Agreement | 10% | Rs {X}L | Within 30 days |
| Plinth | 10% | Rs {X}L | ~6 months |
| 1st slab | 10% | Rs {X}L | ~9 months |
| ... | ... | ... | ... |
| Possession | 10% | Rs {X}L | On OC |

**Pros:** Lower risk — pay as construction progresses. If builder defaults, exposure is limited. Bank disburses in stages.
**Cons:** No discount typically offered on CLP. Pre-EMI interest on disbursed amount during construction.

**Estimated pre-EMI interest cost:** Rs {X}L over {X} months

#### Option 2: Time-Linked Plan (TLP)
- Fixed payment schedule regardless of construction progress

| Milestone | % Payment | Amount | When |
|-----------|----------|--------|------|
| Booking | 10% | Rs {X}L | Now |
| 30 days | 15% | Rs {X}L | +30 days |
| 90 days | 15% | Rs {X}L | +90 days |
| 180 days | 15% | Rs {X}L | +180 days |
| 365 days | 15% | Rs {X}L | +365 days |
| Possession | 30% | Rs {X}L | On OC |

**Pros:** Often comes with 3-5% discount on base price. Predictable payment schedule.
**Cons:** Higher risk — paying ahead of construction. If builder delays, you've paid more than construction value.

**Discount value:** Rs {X}L (if TLP discount is {X%})
**Risk premium:** {Assessment based on builder score — if builder is reliable, TLP discount is genuine savings}

#### Option 3: Down Payment Plan
- Large upfront payment (60-90% within 90 days)

**Pros:** Maximum discount (typically 5-10%).
**Cons:** Maximum risk. Only consider if builder score is 8.0+ and project is near completion.

#### Recommendation

**For this property:**
{Specific recommendation based on builder score, project stage, and buyer's risk tolerance}

- If builder score >= 7.0 and project >70% complete: TLP may be worth the discount
- If builder score < 7.0 or project <50% complete: CLP strongly recommended
- Down payment: Only if builder is 8.0+ AND possession within 6 months
```

### 5F: Counter-Offer Response Guide

```
### Counter-Offer Response Guide

Prepared responses to common builder/agent tactics:

| # | They Say | Your Response | Why It Works |
|---|---------|---------------|-------------|
| 1 | "Price will increase next month / next quarter" | "Registration data shows prices have been {stable/growing at X%}. I'll take my chances." | Shows you're not pressured by artificial urgency |
| 2 | "Other buyers are interested / we have multiple offers" | "Great, that means the project is doing well. I'm offering a fair price based on registrations. Let me know within {X} days." | Calls the bluff without confrontation |
| 3 | "This is the lowest price we've ever offered" | "I appreciate that. But my benchmark is registration data, not your internal pricing. Rs {X}/sqft is what the market pays." | Redirects to objective data |
| 4 | "We can't go below this — our costs are fixed" | "I understand your constraints. My budget constraint is Rs {X}L based on market data. Can we meet somewhere in between?" | Frames it as a mutual problem |
| 5 | "You'll never get this quality elsewhere" | "Quality is important to me, which is why I'm here. But quality should be priced at market rates, not above them." | Acknowledges their point while holding your position |
| 6 | "We're offering a free modular kitchen / AC / gold coin" | "I'd prefer a straight price reduction of equivalent value. Freebies don't reduce my stamp duty." | Exposes the economics |
| 7 | "This price is only valid today" | "If the price changes tomorrow, I'll reevaluate with the market data at that time. No rush." | Removes time pressure |
| 8 | "Talk to my manager — maybe they can do something" | "Sure, let's have that conversation. My position is Rs {X}/sqft based on {X} data points." | Stay consistent regardless of who you're talking to |
| 9 | "We don't negotiate" | "Every transaction is a negotiation. I'm offering Rs {X}L which is at market rate. Let me know." | Polite but firm |
| 10 | "This area is going to appreciate 30% in 2 years" | "Possible, but I need to buy at today's market rate, not tomorrow's speculation. Registrations show Rs {X}/sqft today." | Ground the conversation in facts |
```

---

## Step 6: Total Cost of Ownership

Calculate the full financial picture over 5, 10, and 20 years.

```
## 6. Total Cost of Ownership

### Acquisition Cost

| Item | Amount |
|------|--------|
| Base property price | Rs {X}L |
| All hidden costs (from checklist) | Rs {X}L |
| Stamp duty + registration | Rs {X}L |
| GST (if applicable) | Rs {X}L |
| **Total acquisition cost** | **Rs {X}L** |

### Ongoing Costs (Monthly)

| Item | Monthly | Annual |
|------|---------|--------|
| Home loan EMI | Rs {X} | Rs {X}L |
| Maintenance charges | Rs {X} | Rs {X} |
| Property tax | Rs {X} | Rs {X} |
| Insurance (est.) | Rs {X} | Rs {X} |
| **Total monthly outgo** | **Rs {X}** | **Rs {X}L** |

### 10-Year Total Cost

| Item | Amount |
|------|--------|
| Total acquisition cost | Rs {X}L |
| Total loan interest (10yr) | Rs {X}L |
| Total maintenance (10yr) | Rs {X}L |
| Total property tax (10yr) | Rs {X}L |
| **10-year total cost** | **Rs {X}Cr** |
| Less: Tax benefits (Sec 24 + 80C, 10yr) | Rs {X}L |
| Less: Estimated rental income (if investment, 10yr) | Rs {X}L |
| **Net 10-year cost** | **Rs {X}Cr** |

### Break-Even Analysis (for investment)

At current rental yield of {X%} and estimated appreciation of {X%}/year:
- **Break-even period**: {X} years
- **10-year IRR**: {X%}
- **Comparable with**: {FD at X% / mutual fund at X%}
```

---

## Final Output

After all steps, present a summary:

```
PROPOPS NEGOTIATION STRATEGY

Property: {Project Name}, {Unit/Config}
Quoted: Rs {X}L (Rs {X}/sqft)

Price Intelligence:
  Registration avg: Rs {X}/sqft ({X} data points)
  Gap: {+X%} above market
  Inventory: {X%} unsold
  Market: {Buyer's/Seller's}

Your Numbers:
  Opening offer: Rs {X}L (Rs {X}/sqft)
  Target: Rs {X}L (Rs {X}/sqft)
  Walk-away: Rs {X}L (Rs {X}/sqft)

Total cost (all-in): Rs {X}L (Rs {X}/sqft effective)
Monthly outgo (with loan): Rs {X}

Strategy: {2-3 sentence summary of recommended approach}
```

---

## Post-Strategy Actions

> "Would you like me to:
> 1. **Refine the strategy** — Adjust based on new information or changed priorities
> 2. **Compare alternatives** — See if better-priced options exist in the area
> 3. **Check builder** — Deep-dive into this builder's track record
> 4. **Update tracker** — Mark this property as 'Negotiating' in your pipeline"
