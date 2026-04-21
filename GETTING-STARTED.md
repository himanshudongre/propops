# Getting Started with PropOps

**From zero to using PropOps in about 5 minutes.** One command does everything for you — it installs what you need, downloads PropOps, and creates a shortcut on your desktop.

No technical experience required. Works on Mac and Windows.

---

## What is PropOps?

PropOps is a free AI tool that helps you buy property in India without getting ripped off.

You can ask it things like:

- *"Is this builder overcharging me?"*
- *"Does this builder have any pending court cases?"*
- *"What did similar flats actually sell for nearby?"*
- *"Can I afford this property without ruining my finances?"*
- *"Review this builder agreement — are there any unfair clauses?"*

It pulls real answers from government databases (IGRS, MahaRERA, eCourts) that are already public but buried behind websites nobody has the patience to use. PropOps reads all of them in seconds.

**PropOps is free and open-source.** The only thing you'll pay for is a Claude subscription (~₹1,700/month) that powers the AI. One property evaluation that saves you from overpaying by even 1% pays for this many times over.

---

## What You'll Need

- **A computer** — Mac or Windows (not phone-compatible yet).
- **Internet connection** — PropOps talks to government websites.
- **A Claude Pro or Max subscription** — sign up at [https://claude.ai](https://claude.ai). Costs ~₹1,700/month, cancel anytime.
- **About 5 minutes** for this one-time setup.

---

## Install PropOps (one command)

Pick the guide for your computer. Each guide is **one command**. Copy it, paste it into the Terminal or PowerShell, press Enter. Everything else is automatic.

### Mac

1. Open the **Terminal** app.
   - Press `Cmd + Space`, type `Terminal`, press Enter.

2. Paste this command and press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/himanshudongre/propops/main/install.sh | bash
```

3. Wait 3-5 minutes. The installer will:
   - Install Node.js (if you don't have it)
   - Install Claude Code
   - Download PropOps to your Documents folder
   - Set up all the dependencies
   - Put a **PropOps.command** icon on your Desktop

4. When you see "PropOps installation complete!" — you're done.

### Windows

1. Open **PowerShell**.
   - Press the Windows key, type `PowerShell`, press Enter.

2. Paste this command and press Enter:

```powershell
iwr -useb https://raw.githubusercontent.com/himanshudongre/propops/main/install.ps1 | iex
```

3. Wait 3-5 minutes. The installer will:
   - Install Node.js (if you don't have it)
   - Install Git and Claude Code
   - Download PropOps to your Documents folder
   - Set up all the dependencies
   - Put a **PropOps.bat** icon on your Desktop

4. When you see "PropOps installation complete!" — you're done.

> **Note:** Windows needs the "App Installer" (winget) from the Microsoft Store. Most Windows 10/11 computers already have it. If the installer complains, get it free here: [apps.microsoft.com/store/detail/app-installer](https://apps.microsoft.com/store/detail/app-installer/9NBLGGH4NNS1).

---

## First Time Using PropOps

After the installer finishes, just **double-click the PropOps icon on your Desktop**:

- **Mac**: `PropOps.command`
- **Windows**: `PropOps.bat`

A Terminal window opens, followed by Claude Code. Two things will happen the first time:

### Step 1: Log into Claude Code (first time only)

Claude Code will ask you to log in. It opens your browser, you click "Allow", and you're done. This happens once — next time you open PropOps, you skip this step.

### Step 2: Type the magic word

When Claude Code is ready (you'll see a prompt waiting for input), type:

```
/propops
```

Press Enter. PropOps will greet you and ask a few questions to personalize itself — budget, target cities, family size, etc. This takes about 2 minutes. Answer honestly — the more it knows, the better it helps.

After that, you're ready.

---

## Things You Can Ask PropOps

Now that you're set up, here are a few things to try. Just type them into Claude Code.

### Check a builder's track record

```
/propops builder Lodha
```

Gets you every Lodha project, complaint, and court case across India.

### Get actual sale prices for an area

```
/propops trend Hinjewadi
```

Shows what flats actually sold for (not the inflated asking prices on 99acres).

### Evaluate a specific property

Paste any property URL from 99acres, MagicBricks, Housing.com, or similar:

```
https://www.99acres.com/some-property-here
```

You'll get a full 7-part report with a score, red flags, and a recommendation.

### Check if you can afford it

```
/propops finance
```

Runs a financial stress test — not just "can you afford the EMI" but "should you take this loan considering your income, other expenses, and risk tolerance?"

### Review a builder agreement

```
/propops agreement-review
```

Paste or upload the agreement. PropOps flags one-sided clauses, missing RERA protections, and sneaky terms to watch out for.

### See all commands

```
/propops
```

Shows every command available with a short description.

---

## Using PropOps After Setup

Every time you want to use PropOps:

1. **Double-click the PropOps icon on your Desktop.**
2. **Type a command** (like `/propops builder Godrej`).

That's it. No Terminal commands to remember, no folders to navigate.

---

## Real Tutorials: How to Actually Use PropOps

These are complete walkthroughs of real scenarios. Each one shows what to type, what you'd see, and what to do with the information.

### Tutorial 1: The 5-minute screening (before any site visit)

**Scenario:** A friend mentioned a project called *"Godrej Woods, Noida Sector 43"*. You're curious but don't want to waste a weekend driving there if it's going to be disappointing. You want a quick red-flag check.

**Step 1 — Check the builder's reputation:**

```
/propops builder Godrej
```

PropOps responds with something like:

```
Builder: Godrej Properties
Source: MahaRERA, K-RERA, UP-RERA, eCourts

Projects registered across India: 84+
States active: Maharashtra, Karnataka, Delhi NCR, Kolkata, Chennai
Delivered on time (last 5 yrs): 78%
Active RERA complaints: 14 (mostly delay-related)
Pending court cases: 3 (all consumer complaints, none criminal)
NCLT / Insolvency: None

Verdict: ESTABLISHED — Tier-1 builder, clean legal record.
Reputation is better than market average but not spotless.
```

**How to read this:**
- "No NCLT" = builder isn't bankrupt, your money is relatively safe.
- "78% on-time delivery" is decent for a large builder (anything above 70% is good for India).
- "14 RERA complaints" sounds scary but for 84 projects, that's a low complaint rate.
- "No criminal cases" is a strong green flag.

**Decision:** Worth the site visit. Continue to Step 2.

**Step 2 — Check the specific project's price:**

```
/propops trend Noida Sector 43
```

PropOps shows:

```
Noida Sector 43 — Price Trend (last 12 months)

Average registered price/sqft: Rs 12,400
Range: Rs 10,800 - Rs 14,500
Sample size: 47 registrations in this sector
Trend: Up 8% year-over-year

Typical all-inclusive price for 2BHK (800 sqft): Rs 1.05 - 1.25 Cr
```

**Now you have a baseline.** When the Godrej salesperson quotes you Rs 13,500/sqft, you'll know exactly how much they're overcharging relative to actual registrations.

Total time: ~2 minutes. You just saved a wasted weekend or got confirmation it's worth visiting.

---

### Tutorial 2: Evaluating a specific property listing

**Scenario:** You saw a property on 99acres and are seriously interested. You want a full evaluation before you inquire.

**Just paste the URL:**

```
https://www.99acres.com/3-bhk-flat-for-sale-in-hinjewadi-pune-spid-H12345
```

PropOps does a complete 7-part evaluation automatically. You'll get something like:

```
Report #001 — Property Evaluation
Project: Kolte-Patil Life Republic, Tower 3, Unit 504
Location: Hinjewadi Phase 1, Pune

BLOCK A: Property Summary
  3 BHK, 1,385 sqft carpet area, 5th floor, east-facing
  Builder: Kolte-Patil Developers Ltd
  RERA: P52100000412 (active, registered)
  Quoted: Rs 1.72 Cr (Rs 12,410/sqft)
  Possession: Ready

BLOCK B: Price Intelligence
  IGRS average (same project, last 12 mo): Rs 10,200/sqft
  Your quote is 22% above actual registrations.
  Estimated fair price: Rs 1.42 Cr
  You're being overpriced by approximately Rs 30L.

BLOCK C: Builder Reputation (Kolte-Patil)
  Builder Score: 7.8/10
  On-time delivery: 84%
  Active RERA complaints: 2 (minor)
  Court cases: None significant

BLOCK D: Risk Flags
  GREEN: RERA-registered, ready possession, OC in place
  GREEN: Clean title chain verified
  GREEN: Established builder with good track record
  YELLOW: Price significantly above market
  YELLOW: Tower 3 has higher-than-average maintenance charges

BLOCK E: Location & Livability
  Commute to Hinjewadi IT Park: 8 minutes
  Nearest metro: 1.2 km (under construction)
  Schools: 3 good options within 3 km
  Hospitals: Major hospital 2 km away
  Flood risk: Low
  Air quality: Moderate

BLOCK F: AI Recommendation
  SCORE: 7.2/10 — Strong buy at the right price.

  This is a solid property but you're being overcharged by Rs 30L.
  DO NOT accept the quoted price. Negotiate aggressively.

BLOCK G: Negotiation Intelligence
  Your opening offer: Rs 1.38 Cr (3% below IGRS average)
  Your target: Rs 1.42 Cr (at IGRS average)
  Your walk-away: Rs 1.50 Cr (max 5% above IGRS average)

  Key leverage points:
    • Recent registrations in this project: 4 units at Rs 9,800-10,500/sqft
    • Hinjewadi prices flat last 6 months (market softening)
    • Tower 3 has 11 unsold units (high inventory)

  Suggested opening line:
    "I've done thorough research. I've seen recent IGRS
     registrations in this exact project between Rs 9,800 and
     Rs 10,500/sqft. At Rs 12,410, you're asking 22% over what
     others are actually paying. I'm ready to close quickly at
     Rs 10,000/sqft — Rs 1.38 Cr total. Show me the flat."

Hidden cost checklist:
  • Maintenance deposit: verify amount, should be 2 years max
  • Parking: confirm included, not a separate charge
  • Stamp duty + registration: 7% of consideration (Rs ~10L)
  • GST: ready property, none applicable
```

**Now you know:**
1. The property is good quality (7.2/10 solid score).
2. You're being overcharged by ~Rs 30L — significant.
3. You have specific data points to negotiate with.
4. You have a prepared script to use in the first conversation.

Most buyers accept the first quote and end up paying 20-25% over market. PropOps turns the negotiation on its head because you're arguing from government data, not gut feel.

---

### Tutorial 3: Checking if you can actually afford it

**Scenario:** You love a property. You're about to pay the token amount. But should you? Your partner is nervous.

**Ask PropOps:**

```
/propops finance
```

It walks you through a financial stress test:

```
Property you're considering: Kolte-Patil Life Republic, Rs 1.42 Cr
(Based on your buyer brief and the evaluation report)

FINANCIAL STRESS TEST

Your financial profile (from your buyer brief):
  Household income: Rs 2.4L/month
  Existing EMIs: Rs 28,000/month (car loan)
  Existing savings: Rs 45L
  Down payment required (20%): Rs 28.4L
  Remaining savings after down payment: Rs 16.6L

Loan required: Rs 1.14 Cr
  EMI (20 years, 8.5% interest): Rs 98,920/month
  Total interest over 20 years: Rs 1.23 Cr

Income utilization:
  (EMI + existing EMIs) / income = 53%
  RBI guidance: Max 40% is safe. You're in the stretch zone.

STRESS SCENARIOS

What if interest rates rise 2% (happened in 2022)?
  New EMI: Rs 1.13L/month
  Income utilization: 59% — DANGEROUS

What if you lose your job for 6 months?
  Your remaining savings (Rs 16.6L) cover:
    • Existing EMIs: Rs 1.68L
    • New EMI: Rs 5.94L
    • Living expenses (est. Rs 80K/mo): Rs 4.8L
    Total burn: Rs 12.4L
  You'd have Rs 4.2L left after 6 months.

  If unemployment extends to 9 months, you'd run out.

VERDICT: BORDERLINE

The property is affordable but leaves you very little cushion.
You'd be one job loss or rate hike away from trouble.

Options to make this safer:
  1. Negotiate the price to Rs 1.32 Cr (Rs 10L cheaper).
     EMI drops to Rs 91,800. Income util drops to 50%.

  2. Extend loan to 25 years.
     EMI drops to Rs 92,600. Interest paid goes up by Rs 40L over life.

  3. Delay 6-12 months to build savings.
     Target: Rs 15L more savings (~6 months emergency buffer).

  4. Consider a cheaper property (target price: Rs 1.25 Cr max).

My recommendation: Combine option 1 and option 3.
Negotiate the price down to Rs 1.32 Cr AND wait 4-6 months to
build more savings cushion. You'll be in the green zone.
```

**What to do with this:**
- If the numbers look green: proceed with confidence.
- If they look yellow/red: you have specific advice on what would fix it.
- You can show this to your spouse/parents — the numbers are concrete, not vibes.

This one conversation can prevent years of financial stress.

---

### Tutorial 4: Comparing two properties side-by-side

**Scenario:** You've narrowed it down to two properties. You keep going back and forth. You need a tie-breaker.

First, evaluate both properties (paste both URLs, one at a time). Each becomes a report in your tracker.

Then ask:

```
/propops compare #1 and #2
```

(Where `#1` and `#2` are the report numbers, which PropOps shows you after each evaluation.)

You'll get a side-by-side table:

```
COMPARISON: Report #1 vs Report #2

                              Lodha Belmondo    Kolte-Patil
                              Ashbridge          Life Republic
─────────────────────────────────────────────────────────────
Price (quoted)                Rs 1.85 Cr         Rs 1.42 Cr
Price/sqft                    Rs 13,100          Rs 10,250
Location score                8.4/10             7.8/10
Builder score                 8.9/10             7.8/10
Legal clarity                 9.5/10             9.0/10
Price fairness                6.0/10             8.5/10
Possession                    18 months          Ready
Commute to IT park            22 min             8 min

WEIGHTED SCORE                7.4/10             8.1/10
VERDICT                       Premium but over-  Better value.
                              priced.            Ready to move.

DIFFERENCES THAT MATTER

1. Price: Kolte-Patil saves you Rs 43L upfront.
2. Time: Ready vs 18-month wait = Rs 25-30L in avoided rent
   + avoided EMI overlap.
3. Commute: 14 minutes shorter daily = 2 hours/week back.
4. Brand premium: Lodha has stronger resale halo (5-8%
   premium in secondary market).

RECOMMENDATION

Go with Kolte-Patil Life Republic unless the Lodha brand
premium is specifically important to you for resale.

Over a 10-year hold, Kolte-Patil likely nets Rs 35-50L more
even after Lodha's resale premium. Math: you save Rs 43L now
and avoid Rs 25L in wait costs (Rs 68L ahead), vs Lodha's
resale premium of ~Rs 15-25L.

If you MUST pick Lodha for lifestyle/brand reasons, negotiate
to Rs 1.65 Cr or walk. Even then, Kolte-Patil is the safer bet.
```

This is usually the moment where the decision becomes obvious.

---

### Tutorial 5: Reviewing a builder's agreement before signing

**Scenario:** The builder has sent you the Agreement for Sale. It's 40 pages of legalese. You're about to sign it and pay the booking amount.

**STOP. Do this first:**

```
/propops agreement-review
```

PropOps will ask you to paste the agreement text (or upload a PDF). Then it scans for:

```
AGREEMENT REVIEW — Kolte-Patil Life Republic Agreement for Sale

SCANNED: 42 pages, 97 clauses

RED FLAGS FOUND (3 critical)

🔴 Clause 8.3 — Possession penalty is one-sided.
    Builder's penalty for delay: 2% per annum
    Buyer's penalty for delayed payment: 18% per annum
    This violates RERA Section 18 — both parties should pay
    the same penalty rate.
    ACTION: Demand amendment before signing.

🔴 Clause 12.1 — Specifications vague.
    Says "premium imported fittings" without specifying
    brand/model. Builder can substitute any "equivalent"
    at their discretion.
    ACTION: Demand specific brand/model list attached as
    schedule.

🔴 Clause 19.4 — Possession without OC clause.
    Allows builder to offer "fit-out possession" before
    Occupation Certificate.
    Fit-out possession without OC means you can't legally
    occupy, but you're still liable for all charges.
    ACTION: Strike this clause entirely.

YELLOW FLAGS (5 items to negotiate)

🟡 Clause 6.2 — Common area calculations unclear. Super
   built-up vs carpet area distinction not spelled out.
🟡 Clause 11.3 — Maintenance deposit is Rs 75/sqft which
   is 2x market norm (Rs 35-40/sqft).
🟡 Clause 14.1 — Parking sold "subject to availability"
   rather than guaranteed with unit.
🟡 Clause 15.2 — Club membership mandatory at Rs 2L with
   annual fees Rs 18K. Consider optional.
🟡 Clause 22.1 — Arbitration clause names builder's lawyer
   as default arbitrator.

GREEN FLAGS (RERA-compliant protections present)

🟢 Section 4.1 — Clear definition of carpet area.
🟢 Section 9.2 — Refund clause matches RERA Sec 18.
🟢 Section 10.1 — Payment schedule tied to construction
   milestones.

BOTTOM LINE

This agreement has 3 critical issues and 5 items to negotiate.
Do not sign as-is.

Typical builder response: They'll call the red flags
"standard clauses" and claim they can't be changed.
They absolutely can be changed — push back.

Suggested email to builder:

"I've reviewed the agreement and require the following
 changes before signing:

 1. Clause 8.3 — Harmonize penalty rates per RERA Sec 18.
 2. Clause 12.1 — Attach detailed specifications schedule.
 3. Clause 19.4 — Remove fit-out possession clause; tie
    possession strictly to OC.

 I also want to discuss clauses 6.2, 11.3, 14.1, 15.2, 22.1.

 Happy to close quickly once these are addressed."
```

**Now you know exactly what to negotiate.** You're not signing blind.

If the builder refuses to make these changes, that tells you something too — and it's better to find out now than after you've paid Rs 10 lakhs in booking.

---

### Tutorial 6: Scanning for new properties that match what you want

**Scenario:** You're still browsing, open to options, looking for matches in your budget.

```
/propops scan
```

PropOps scans 99acres, MagicBricks, Housing.com, and MahaRERA for new listings matching your buyer brief. You'll get something like:

```
SCAN RESULTS — Based on your buyer brief (Pune, 2-3 BHK, Rs 1.2-1.8 Cr)

FOUND: 23 new listings in the last 7 days.

TOP 5 MATCHES (by quality score)

1. Kolte-Patil Life Republic 3BHK — Rs 1.42 Cr (8.1/10)
   Hinjewadi Phase 1 | Ready possession | Score match: 92%

2. Pride World City 3BHK — Rs 1.38 Cr (7.6/10)
   Bavdhan | Possession 6 months | Score match: 88%

3. Godrej Infinity 2.5BHK — Rs 1.25 Cr (7.5/10)
   Keshav Nagar | Ready | Score match: 85%

4. Nyati Estilo 3BHK — Rs 1.55 Cr (7.4/10)
   Kharadi | Possession 12 months | Score match: 83%

5. Mahindra Lifespaces Happinest 2BHK — Rs 98 Lakh (7.2/10)
   Hadapsar | Ready | Score match: 79%

WARNINGS

  ⚠ 3 listings flagged — builder has pending RERA complaints.
    See: `propops tracker` to view full list.

Would you like me to evaluate any of these? Just say "evaluate #1"
or paste the listing URL.
```

Now you have a curated, ranked shortlist without scrolling through hundreds of 99acres listings.

---

### How the tutorials connect

These aren't separate features — they're a workflow:

```
  1. /propops scan          →  Find properties matching your brief
         ↓
  2. /propops builder X     →  Screen the builders quickly (5 min)
         ↓
  3. Paste URL              →  Deep evaluate the ones worth it
         ↓
  4. /propops finance        →  Check if you can actually afford
         ↓
  5. /propops compare         →  Tie-break between top 2
         ↓
  6. /propops agreement-review →  Before you sign anything
         ↓
  7. /propops post-purchase    →  Track delays and RERA rights
```

Each step filters out bad options so by the time you're signing, you know:

- The builder is trustworthy.
- The price is fair (with data to back it up).
- You can afford it comfortably.
- The agreement doesn't trap you.
- You have a plan if things go wrong after booking.

That's the entire point of PropOps. It turns buying a flat from a gut-feel gamble into a data-driven decision.

---

## If Something Goes Wrong

### The installer says "command not found" or fails partway through

Re-run the installer. It's safe to re-run — it picks up from where it left off and fixes broken bits.

### Claude Code won't open or asks for login repeatedly

1. Close the PropOps window.
2. Open your Terminal or PowerShell.
3. Type: `claude` and press Enter.
4. Log in through your browser when prompted.
5. Close that Terminal.
6. Try opening PropOps again from your Desktop.

### PropOps asks for a CAPTCHA

Some government portals (like IGRS in Maharashtra and Telangana) show a CAPTCHA for every search. PropOps will:

1. Take a screenshot of the CAPTCHA.
2. Show it to you in the chat.
3. Ask you to type what you see.

Type the CAPTCHA text and press Enter. PropOps continues.

### Karnataka (Kaveri) asks me to log in

Kaveri requires a one-time phone + OTP login. When it asks:

1. A browser window opens.
2. You enter your phone number, receive an OTP, enter it.
3. Your session is saved for 8 hours.

After 8 hours, you'll need to log in once more. This is a Kaveri restriction, not something PropOps can avoid.

### Searches return no results for areas I know have properties

Try different spellings:

- "Hinjewadi" vs "Hinjawadi" vs "Hinjwadi"
- "Bangalore" vs "Bengaluru"
- "Pune" vs "Poona"
- Full legal builder names ("Macrotech Developers Ltd") vs common names ("Lodha")

### Something else went wrong

Re-run the installer first — it usually fixes things. If problems persist, file an issue at [https://github.com/himanshudongre/propops/issues](https://github.com/himanshudongre/propops/issues) with the exact error message you saw.

---

## Keeping PropOps Up to Date

Just run the installer command again anytime. It detects your existing installation and pulls the latest updates from GitHub.

### Mac
```bash
curl -fsSL https://raw.githubusercontent.com/himanshudongre/propops/main/install.sh | bash
```

### Windows
```powershell
iwr -useb https://raw.githubusercontent.com/himanshudongre/propops/main/install.ps1 | iex
```

Your buyer profile and saved data stay intact — only the software updates.

---

## Uninstalling (if you ever want to)

PropOps doesn't bury anything on your system. To fully remove it:

- **Mac**: Delete `~/Documents/propops` and `PropOps.command` on your Desktop.
- **Windows**: Delete `Documents\propops` and `PropOps.bat` on your Desktop.

Claude Code and Node.js can stay — they're useful for other things. Or remove them normally:

- **Mac**: `brew uninstall node` (if installed via Homebrew)
- **Windows**: Settings → Apps → Node.js → Uninstall

---

## Tips for Getting the Best Results

1. **Be specific in your buyer brief.** Tell PropOps about your family, commute, budget flexibility, deal-breakers. The more it knows, the better it helps.

2. **Use real property URLs.** When evaluating a specific flat, paste the actual listing URL. PropOps extracts all the details automatically.

3. **Check builders before site visits.** Knowing a builder has 3 pending court cases is way more useful *before* you spend a day at their showroom.

4. **Trust the data over the sales pitch.** If IGRS shows identical flats registered at ₹95L but the builder is quoting ₹1.2Cr — the data is more reliable.

5. **PropOps only works while your Claude subscription is active.** Pause Claude, PropOps pauses.

---

## How to Get Help

- **GitHub issues:** [https://github.com/himanshudongre/propops/issues](https://github.com/himanshudongre/propops/issues)
- **Documentation:** Inside your PropOps folder, the `docs/` folder has deeper guides.

---

## A Final Note

The Indian property market is opaque because that benefits builders. Different prices for different buyers, hidden litigation, agreements designed to catch you off guard — this isn't an accident. It's a feature of how the market works today.

Everything PropOps uses is already public information. You have the legal right to all of it. PropOps just makes it easy to actually get.

Good luck with your property search.
