# PropOps -- Finance Mode

Complete financial analysis for a property purchase. Not a basic EMI calculator — a financial crash test that answers "should I take this loan?" rather than "can I get this loan?"

---

## Prerequisites

1. Read `modes/_shared.md` -- load rules
2. Read `modes/_profile.md` -- load overrides
3. Read `buyer-brief.md` -- budget, timeline
4. Read `config/profile.yml` -- loan status, income

## Trigger

This mode activates when the user says:
- "Can I afford {property}?"
- "What's the EMI for {property}?"
- "Compare home loan banks"
- "Should I buy or rent?"
- "Tax benefits of buying {property}?"
- "Help me plan the finances for {property}"
- "Refinance my home loan"
- "Is this property worth it financially?"
- "Financial analysis for {property}"

---

## Buyer Financial Profile

Before analysis, gather (or read from profile.yml):

```
## Buyer Financial Profile

| Field | Value | Notes |
|-------|-------|-------|
| Gross monthly income | Rs {X} | Individual or household |
| Net monthly income | Rs {X} | After tax and deductions |
| Spouse/co-borrower income | Rs {X} | If joint loan |
| Combined household income | Rs {X} | Total |
| Existing EMIs | Rs {X}/month | Car, personal, credit card |
| Monthly expenses (non-EMI) | Rs {X} | Rent, utilities, food, etc. |
| Monthly savings capacity | Rs {X} | Income - expenses - existing EMIs |
| Liquid savings available | Rs {X} | For down payment + emergency |
| Employment type | Salaried / Self-employed | Affects rate and risk profile |
| CIBIL score range | Excellent (750+) / Good (700-749) / Fair (650-699) | Affects rate |
| Tax bracket | 30% / 20% / 10% / 0% | For tax benefit calculation |
| Age | {X} | Max loan tenure = 60 - age (typically) |
| Existing home loans | Yes/No | Affects 24(b) limits and 80EEA eligibility |
```

If the user hasn't provided all of this, ask for the essentials:
- Monthly household income (net)
- Existing EMIs
- Liquid savings
- Employment type
- Approximate CIBIL score range

---

## Section 1: Affordability Stress Test

This is the core value. Not "can you get the loan?" but "should you take it?"

### Base EMI Calculation

```
## 1. Affordability Stress Test

### Base Numbers

| Metric | Value |
|--------|-------|
| Property price | Rs {X}L |
| Down payment (20%) | Rs {X}L |
| Loan amount | Rs {X}L |
| Estimated interest rate | {X}% (current best salaried rate) |
| Loan tenure | {X} years |
| **Monthly EMI** | **Rs {X}** |
```

### Income Ratios (The Real Test)

```
### Income Ratio Analysis

| Ratio | Value | Benchmark | Status |
|-------|-------|-----------|--------|
| EMI / Net income | {X}% | < 35% safe, 35-40% stretch, > 40% danger | {GREEN/YELLOW/RED} |
| EMI / Household income | {X}% | < 30% comfortable, 30-40% manageable | {GREEN/YELLOW/RED} |
| All EMIs / Income | {X}% | < 50% (includes car, personal loans) | {GREEN/YELLOW/RED} |
| Post-EMI savings rate | {X}% | > 20% of income recommended | {GREEN/YELLOW/RED} |

**RBI guideline:** Total debt servicing should not exceed 50% of net income.
**PropOps recommendation:** Keep housing EMI below 35% for financial safety.
```

### Stress Scenarios

```
### Stress Test: What If...

| Scenario | Impact | New EMI | EMI/Income | Verdict |
|----------|--------|---------|-----------|---------|
| **Base case** | Current rates | Rs {X} | {X}% | {OK/STRETCH/DANGER} |
| **Rate +1%** | Rates rise 1% (likely in 2-3 years) | Rs {X} | {X}% | {verdict} |
| **Rate +2%** | Rates rise 2% (happened 2022-23) | Rs {X} | {X}% | {verdict} |
| **Income -20%** | Salary cut or bonus loss | Rs {X} | {X}% | {verdict} |
| **Income loss (6 months)** | Job loss / gap | Need Rs {X}L buffer | {months covered by savings} | {verdict} |
| **Rate +2% AND income -20%** | Worst case | Rs {X} | {X}% | {verdict} |

### Emergency Buffer Check

| Metric | Value | Minimum Required |
|--------|-------|-----------------|
| Liquid savings after down payment | Rs {X}L | |
| Monthly EMI | Rs {X} | |
| **Months of EMI covered** | **{X} months** | **6 months minimum** |
| Additional monthly expenses | Rs {X} | |
| **Months of total expenses covered** | **{X} months** | **6 months minimum** |

{If buffer < 6 months: "WARNING: Your emergency fund after down payment covers only {X} months. Financial advisors recommend 6+ months of expenses as buffer. Consider a smaller down payment to preserve cash, or wait until you've saved more."}
```

### Financial Health Score

```
### Financial Health Score for This Purchase

| Dimension | Score | Weight | Details |
|-----------|-------|--------|---------|
| EMI/Income ratio | {X}/10 | 30% | {ratio}% — {interpretation} |
| Emergency buffer | {X}/10 | 25% | {months} months — {interpretation} |
| Debt-to-income (total) | {X}/10 | 20% | {ratio}% — {interpretation} |
| Income stability | {X}/10 | 15% | {Salaried=8, Self-employed=5, Freelance=3} |
| Rate sensitivity | {X}/10 | 10% | +2% changes EMI by {X}% — {interpretation} |

**Financial Health Score: {X.X}/10**

Score interpretation:
- 8.0+: Comfortable purchase. Low financial risk.
- 6.0-7.9: Manageable but tight. Build a buffer before proceeding.
- 4.0-5.9: Stretching. Consider a cheaper property or larger down payment.
- <4.0: Overextended. High risk of financial stress. Strongly reconsider.
```

---

## Section 2: Bank Comparison

WebSearch for current home loan rates from major banks. Rates change monthly — always search for latest.

### Search Queries
```
"home loan interest rate {current month} {current year} India"
"SBI home loan rate today"
"HDFC home loan rate {current month}"
"best home loan rates comparison India {current year}"
```

### Comparison Table

```
## 2. Bank Comparison

### Current Rates (as of {month} {year})

| Bank | Rate (Salaried) | Rate (Self-emp) | Processing Fee | Prepayment Penalty | Max Tenure |
|------|-----------------|-----------------|---------------|-------------------|-----------|
| SBI | {X}% | {X}% | 0.35% (min Rs 2K) | Nil (floating) | 30 yrs |
| HDFC | {X}% | {X}% | 0.50% (max Rs 3K) | Nil (floating) | 30 yrs |
| ICICI | {X}% | {X}% | 0.50% | Nil (floating) | 30 yrs |
| Kotak | {X}% | {X}% | 0.50% | Nil (floating) | 20 yrs |
| Axis | {X}% | {X}% | Rs 10K flat | Nil (floating) | 30 yrs |
| Bank of Baroda | {X}% | {X}% | 0.25% | Nil (floating) | 30 yrs |
| PNB | {X}% | {X}% | 0.35% | Nil (floating) | 30 yrs |
| LIC Housing | {X}% | {X}% | Rs 10K-15K | 2% on fixed | 30 yrs |

*Rates depend on loan amount, CIBIL score, and property type. Above are indicative for Rs {X}L loan with CIBIL 750+.*
*Source: WebSearch, {date}. Verify directly with banks before applying.*

### Total Cost Comparison (for your loan)

| Bank | Rate | EMI | Total Interest (20yr) | Processing Fee | Total Cost | Savings vs Worst |
|------|------|-----|----------------------|---------------|-----------|-----------------|
| {Cheapest} | {X}% | Rs {X} | Rs {X}L | Rs {X} | Rs {X}L | — |
| {Next} | {X}% | Rs {X} | Rs {X}L | Rs {X} | Rs {X}L | Rs {X}L more |
| {Next} | {X}% | Rs {X} | Rs {X}L | Rs {X} | Rs {X}L | Rs {X}L more |
| {Costliest} | {X}% | Rs {X} | Rs {X}L | Rs {X} | Rs {X}L | Rs {X}L more |

**Choosing {cheapest} over {costliest} saves you Rs {X}L over the loan tenure.**
That's real money — not a rounding error.

### Recommendation

**Best option: {Bank}** at {X}%
- Lowest total cost: Rs {X}L
- Processing fee: Rs {X}
- Prepayment: {terms}
- {Any other advantage}

{If self-employed: "Self-employed borrowers often get 0.1-0.25% higher rates. Consider {bank} which has the smallest salaried/self-employed gap."}

{If CIBIL < 750: "Your CIBIL range ({range}) may add 0.1-0.5% to these rates. Improving CIBIL to 750+ before applying could save Rs {X}L."}
```

---

## Section 3: Buy vs Rent Analysis

The hardest question nobody answers honestly. Use PropOps data (IGRS appreciation, rental yields) to make it specific to THIS property.

```
## 3. Buy vs Rent Analysis

### Assumptions

| Factor | Buy | Rent |
|--------|-----|------|
| Property price | Rs {X}L | — |
| Down payment | Rs {X}L | Rs 0 (invested instead) |
| Loan amount | Rs {X}L | — |
| Interest rate | {X}% | — |
| Monthly EMI | Rs {X} | — |
| Monthly rent (equivalent) | — | Rs {X} (from rental yield data) |
| Annual rent increase | — | {5-7}% |
| Annual maintenance + tax | Rs {X}/yr | Rs 0 |
| Property appreciation (IGRS) | {X}% CAGR | — |
| Investment return (alternative) | — | {10-12}% (equity) or {7}% (FD) |

### 10-Year Comparison

| Year | Buying: Cumulative Cost | Renting: Cumulative Cost | Difference |
|------|------------------------|-------------------------|-----------|
| 1 | Rs {X}L (EMI + maint + tax) | Rs {X}L (rent + invest returns) | Buying costs Rs {X}L more |
| 3 | Rs {X}L | Rs {X}L | {which is cheaper} |
| 5 | Rs {X}L | Rs {X}L | {which is cheaper} |
| 7 | Rs {X}L | Rs {X}L | {which is cheaper} |
| 10 | Rs {X}L | Rs {X}L | {which is cheaper} |

### Break-Even Year

**Buying becomes cheaper than renting in year {X}.**

{If break-even > 7 years: "Financially, renting is better for the next {X} years. Buying makes sense only if you plan to stay 7+ years or value the non-financial benefits of ownership (stability, customization, pride)."}

{If break-even < 5 years: "Buying is a strong financial decision for this property. The combination of {X}% appreciation and rent savings makes ownership clearly better within {X} years."}

### The Full Picture

| Factor | Buying | Renting |
|--------|--------|---------|
| Total paid over 10 years | Rs {X}L (EMI + costs) | Rs {X}L (rent, escalating) |
| Asset value at year 10 | Rs {X}L (purchase + appreciation) | Rs {X}L (down payment invested) |
| Net position at year 10 | Rs {X}L (asset - remaining loan) | Rs {X}L (investments) |
| **Net advantage** | | **{Buying/Renting} wins by Rs {X}L** |

### Verdict

**{BUY / RENT / MARGINAL}**

{If BUY: "For this property at this price, buying is financially superior to renting. You build Rs {X}L more wealth over 10 years, and the break-even is {X} years."}

{If RENT: "At the current price, this property is overvalued relative to rental yields. Renting and investing your down payment generates Rs {X}L more wealth over 10 years. Wait for a 10-15% correction or negotiate harder."}

{If MARGINAL: "It's a close call. The financial difference is Rs {X}L over 10 years — not decisive. Decision should be based on non-financial factors: stability, lifestyle, family needs."}
```

---

## Section 4: Tax Optimization

```
## 4. Tax Benefits

### Your Eligible Deductions

| Section | Deduction | Limit | Your Benefit | Annual Savings |
|---------|-----------|-------|-------------|---------------|
| **24(b)** | Interest on home loan | Rs 2L/yr (self-occupied) | Rs {min(interest, 2L)} | Rs {X} |
| **80C** | Principal repayment | Rs 1.5L/yr (shared with other 80C) | Rs {X} | Rs {X} |
| **80EEA** | Additional interest (first-time buyer) | Rs 1.5L/yr | Rs {X} or N/A | Rs {X} |
| **Stamp duty + reg** | One-time deduction under 80C | Within 1.5L limit | Rs {X} | Rs {X} (year 1 only) |

{If joint loan:}
| **Joint loan** | Both co-borrowers claim | Double the above | Rs {X} | Rs {X} |

### Effective Cost After Tax

| Metric | Without Tax Benefit | With Tax Benefit |
|--------|-------------------|-----------------|
| Annual EMI payment | Rs {X}L | Rs {X}L |
| Annual tax savings | — | Rs {X} |
| **Effective annual cost** | Rs {X}L | **Rs {X}L** |
| **Effective monthly cost** | Rs {X} | **Rs {X}** |

**Tax benefits reduce your effective EMI from Rs {X} to Rs {X} — a {X}% reduction.**

### Year-by-Year Tax Benefit

| Year | Interest Paid | Principal Paid | 24(b) Benefit | 80C Benefit | Total Tax Saved |
|------|--------------|---------------|--------------|-------------|----------------|
| 1 | Rs {X}L | Rs {X}L | Rs {X} | Rs {X} | Rs {X} |
| 5 | Rs {X}L | Rs {X}L | Rs {X} | Rs {X} | Rs {X} |
| 10 | Rs {X}L | Rs {X}L | Rs {X} | Rs {X} | Rs {X} |
| 20 | Rs {X}L | Rs {X}L | Rs {X} | Rs {X} | Rs {X} |

**Total tax savings over loan tenure: Rs {X}L**

### Optimization Tips

{Based on the buyer's profile, suggest specific optimizations:}
- {If not joint loan but spouse earns: "A joint loan doubles your tax deductions. Consider adding your spouse as co-borrower to save Rs {X}L more over the tenure."}
- {If 80C already used by PF/insurance: "Your 80C is likely already used by PF and insurance. The principal deduction may not add incremental benefit. Focus on maximizing 24(b)."}
- {If first-time buyer: "You qualify for Section 80EEA — additional Rs 1.5L interest deduction. This saves Rs {X}/year extra."}
- {If self-occupied: "Consider claiming the property as let-out (even if notional). The 24(b) limit increases from Rs 2L to unlimited. Consult your CA."}
```

---

## Section 5: Prepayment Strategy

```
## 5. Prepayment Strategy

### Scenario: Extra Rs {X}/year toward principal

| Metric | Without Prepayment | With Rs {X}/yr Prepay | Difference |
|--------|-------------------|----------------------|-----------|
| Total tenure | {X} years | {X} years | **{X} years less** |
| Total interest paid | Rs {X}L | Rs {X}L | **Rs {X}L saved** |
| Total amount paid | Rs {X}L | Rs {X}L | **Rs {X}L saved** |

### Prepay vs Invest

"Should I prepay the loan or invest the surplus?"

| Option | Return/Savings | Post-Tax Return | Verdict |
|--------|---------------|----------------|---------|
| Prepay loan at {X}% | {X}% guaranteed | {X}% (after losing 24(b) benefit) | |
| Equity mutual fund | ~12% expected | ~10% post-LTCG | |
| Fixed deposit | ~7% | ~5% post-tax (30% bracket) | |
| PPF | 7.1% | 7.1% (tax-free) | |

**Rule of thumb:** If loan rate > post-tax investment return → prepay. Otherwise → invest.

**For your situation:**
{If loan rate > 9%: "At {X}% interest, prepayment gives better risk-adjusted returns than most investments. Prepay aggressively."}
{If loan rate 8-9%: "It's close. Consider a 50-50 split: prepay Rs {X}/yr and invest Rs {X}/yr for diversification."}
{If loan rate < 8%: "Your loan rate is below typical equity returns. Invest the surplus and let the loan run. But only if you're comfortable with market volatility."}

### Optimal Prepayment Schedule

| Year | Extra Payment | Interest Saved | Cumulative Savings |
|------|--------------|---------------|-------------------|
| 1 | Rs {X} | Rs {X} | Rs {X} |
| 2 | Rs {X} | Rs {X} | Rs {X} |
| 3 | Rs {X} | Rs {X} | Rs {X} |
| ... | | | |
| Total | Rs {X}L | **Rs {X}L saved** | |

**Best time to prepay:** Early years (when interest component is highest). Each Rs 1L prepaid in year 1 saves ~Rs {X}L in interest over the remaining tenure.
```

---

## Section 6: Refinancing Strategy

```
## 6. Refinancing Analysis

### When to Refinance

Refinancing makes sense when:
1. Market rates have dropped significantly since you took the loan
2. Your CIBIL score has improved (lower risk = lower rate)
3. You've been paying EMI consistently for 1+ years (bargaining power)
4. The interest savings exceed refinancing costs

### Current Loan vs Market

| Metric | Your Current Loan | Best Available Rate |
|--------|-------------------|-------------------|
| Lender | {current bank} | {best bank} |
| Interest rate | {current rate}% | {best rate}% |
| Outstanding principal | Rs {X}L | Rs {X}L |
| Remaining tenure | {X} years | {X} years |
| Current EMI | Rs {X} | Rs {X} (new) |
| Rate difference | — | **{X}% lower** |

### Refinancing Cost-Benefit

| Cost of Refinancing | Amount |
|---------------------|--------|
| Processing fee (new bank) | Rs {X} |
| Legal/valuation charges | Rs {X} |
| Prepayment penalty (old bank) | Rs {X} (nil for floating) |
| Documentation/stamp charges | Rs {X} |
| **Total refinancing cost** | **Rs {X}** |

| Benefit of Refinancing | Amount |
|------------------------|--------|
| Monthly EMI reduction | Rs {X} |
| Annual savings | Rs {X} |
| Total interest savings (remaining tenure) | Rs {X}L |
| **Net savings (after costs)** | **Rs {X}L** |

### Break-Even

**Refinancing cost recovered in {X} months.**

{If break-even < 12 months: "Strong case to refinance. You recover the switching cost within a year and save Rs {X}L over the remaining tenure."}

{If break-even 12-24 months: "Worthwhile if you plan to hold the loan for 3+ more years. Net savings: Rs {X}L."}

{If break-even > 24 months: "Marginal benefit. Consider negotiating with your current bank first — they may match the rate to retain you. This costs nothing."}

### Refinancing Strategy

**Step 1: Negotiate with current bank first (free)**
> "I've received a pre-approved offer from {best bank} at {X}%. Can you match this rate on my existing loan?"

Banks have a retention desk. They'd rather reduce your rate than lose the loan. This works ~40% of the time.

**Step 2: If negotiation fails, switch**
> Apply to {best bank}. Required documents:
> - Last 6 months salary slips
> - Last 2 years ITR
> - Current loan sanction letter
> - Last 12 months loan statement
> - Property documents

**Step 3: Balance transfer process**
1. New bank sanctions loan and issues cheque to old bank
2. Old bank provides NOC and property documents
3. New bank registers mortgage
4. New EMI starts from next month

### When NOT to Refinance

- Remaining tenure < 5 years (most interest already paid, savings minimal)
- Rate difference < 0.3% (savings don't justify hassle)
- You're planning to sell the property soon
- Your CIBIL has dropped (you may get a worse rate)
- You have a fixed-rate loan with heavy prepayment penalty
```

---

## Section 7: Complete Financial Summary

```
## 7. Complete Financial Picture

### One-Page Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Property price** | Rs {X}L | |
| **Down payment** | Rs {X}L ({X}%) | |
| **Loan amount** | Rs {X}L | |
| **Best bank** | {Bank} at {X}% | |
| **Monthly EMI** | Rs {X} | |
| **Effective EMI (after tax)** | Rs {X} | |
| **EMI/Income ratio** | {X}% | {GREEN/YELLOW/RED} |
| **Financial Health Score** | {X}/10 | {interpretation} |
| **Total cost (20yr)** | Rs {X}L (price + interest + costs) | |
| **Tax savings (total)** | Rs {X}L | |
| **Net cost of ownership** | Rs {X}L | |
| **Buy vs Rent verdict** | {BUY/RENT/MARGINAL} | Break-even: year {X} |
| **Prepayment advice** | {Prepay/Invest/Split} | Saves Rs {X}L |
| **Refinancing opportunity** | {Yes/No/Check in {X} months} | |

### Final Recommendation

**{FINANCIALLY SOUND / PROCEED WITH CAUTION / RECONSIDER}**

{2-3 sentences summarizing the financial verdict. Be direct.}

{If FINANCIALLY SOUND: "This property is within your comfortable range. EMI is {X}% of income (safe zone), you have {X} months emergency buffer, and buying beats renting by year {X}. Go ahead with {Bank} at {X}%."}

{If PROCEED WITH CAUTION: "You can afford this, but it's tight. Your EMI/income ratio ({X}%) is in the stretch zone, and a rate increase would push you to {X}%. Build Rs {X}L more in savings before committing, or negotiate the price down by {X}%."}

{If RECONSIDER: "This property stretches your finances dangerously. EMI would be {X}% of income, leaving only {X} months buffer. A {scenario} would put you in serious trouble. Either negotiate the price below Rs {X}L, increase your down payment to Rs {X}L, or look at properties under Rs {X}L."}
```

---

## Rules

- **NEVER provide specific financial advice.** State: "This is informational analysis, not financial advice. Consult a certified financial planner for personalized advice."
- **NEVER guarantee bank rates.** Always label as "indicative" and "based on WebSearch as of {date}."
- **Always show the math.** Don't just show the answer — show the formula and inputs so the user can verify.
- **Be brutally honest about affordability.** Banks want to maximize loans. Builders want sales. PropOps is the ONLY voice looking out for the buyer's financial health.
- **Include both financial AND non-financial factors** in the final recommendation. Home ownership has emotional value that doesn't show up in spreadsheets.
- **Refresh bank rates via WebSearch** every time this mode runs. Rates change monthly.
- **If the user's financial data is incomplete,** ask for the essentials before running analysis. Garbage in = garbage out.
