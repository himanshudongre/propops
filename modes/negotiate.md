# PropOps -- Negotiation Strategy Mode

> Generate a data-backed negotiation strategy for a property the buyer is considering.

## Prerequisites
- A property must already be evaluated (report exists in `reports/`)
- Read the evaluation report for this property
- Read `buyer-brief.md` for budget and constraints
- Read `config/profile.yml` for loan/financial details

## Data to Gather

### 1. Registration Price Intelligence
- From the evaluation report Block B, or re-query:
  - IGRS actual registration prices for same project (last 12 months)
  - IGRS actual registration prices for same area (last 12 months)
  - Calculate: quoted price vs registration average (the gap)

### 2. Market Conditions Assessment
WebSearch for:
- Is this a buyer's or seller's market in this area?
- Current unsold inventory levels for this builder/project
- Recent discount offers or scheme announcements
- Interest rate trends (rising rates = more buyer leverage)
- Seasonal factors (quarter-end, festive season)

### 3. Builder Inventory Analysis
- How many units total in this project?
- Estimated units sold vs unsold (from RERA data or listings count)
- Higher unsold inventory = more leverage

## Strategy Generation

### Your Leverage Points
List 4-6 concrete leverage points with data citations:
1. "IGRS registrations in this project average Rs X/sqft (Y% below quoted)"
2. "Builder has Z unsold units in this tower"
3. "Market appreciation has slowed to X% (down from Y%)"
4. "Interest rates are at X%, reducing buyer demand"
5. Etc.

### Suggested Offer Price
- Calculate based on: IGRS average + small premium for preferred unit
- Show reasoning: "IGRS avg: Rs X/sqft + 5% unit premium = Rs Y/sqft = Rs Z total"
- This should be 10-15% below quoted price (the realistic starting point)

### Negotiation Script
Step-by-step dialogue:
1. Opening: Express interest but mention you're evaluating multiple options
2. Data reveal: Reference registration prices casually ("I noticed recent registrations...")
3. Offer: State your offer with rationale
4. Counter-offer handling: Prepared responses for common pushbacks:
   - "That's our best price" → "I understand, but the market data shows..."
   - "Other buyers are interested" → "I respect that. I'm ready to close today at X"
   - "We can't go below X" → "What if I pay 80% upfront?"
5. Walk-away: Know your floor and be willing to walk

### Hidden Costs Checklist
Calculate total cost of ownership:
| Component | Typical Range | Negotiable? | Tips |
|-----------|--------------|-------------|------|
| Base price | As quoted | YES | Your primary negotiation target |
| GST | 5% (under-construction) or 1% | NO | Tax, non-negotiable |
| Stamp duty | 5-7% by state | NO | Government fee |
| Registration | 1% | NO | Government fee |
| Maintenance deposit | 2-3 years | SOMETIMES | Ask to reduce to 1 year |
| Parking | Rs 2-5L | YES | Should be included in base price |
| Club membership | Rs 1-3L | YES | Ask to waive or reduce |
| Legal fees | Rs 20-50K | N/A | Your cost, shop around |
| Loan processing | 0.5-1% of loan | SOMETIMES | Negotiate with bank |
| Interior setup | Rs 5-15L | N/A | Your cost, budget separately |

### Payment Plan Analysis
If builder offers multiple plans:
- **CLP (Construction Linked Plan)**: Pay in installments as construction progresses. Lower upfront, but full GST.
- **TLP (Time Linked Plan)**: Pay bulk upfront, rest at possession. May get discount but higher financial risk.
- **Down Payment Scheme**: Pay 80-90% upfront for significant discount.

Calculate which plan saves the most money including time value of money.

### Walk-Away Price
- Your absolute ceiling (from buyer brief budget + hidden costs)
- If builder won't go below this, walk away
- State clearly: "Above Rs X total cost, this property doesn't make financial sense given alternatives."

## Output Format

Present as a clear, actionable strategy document the buyer can reference during negotiations. Include specific numbers, not ranges.

## Rules
- NEVER suggest unethical tactics (fake competing offers, threatening reviews, etc.)
- ALWAYS base suggestions on real data (IGRS, RERA, market)
- Remind the buyer: "All suggestions are based on available data. Final decisions are yours."
- If data is insufficient for a strong negotiation position, say so honestly
- Include a total cost calculator so the buyer sees the REAL price, not just base price
