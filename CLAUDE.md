# PropOps -- AI Property Transparency Tool

## Origin

PropOps brings transparency to Indian real estate by aggregating publicly available government data. Every property transaction is public record on IGRS portals. RERA tracks builder complaints. eCourts tracks litigation. This data exists -- it's just buried across dozens of government websites. PropOps makes it searchable, scored, and actionable.

**It works out of the box for Maharashtra, but it's designed to be made yours.** If the scoring doesn't fit your priorities, the locations don't match your search, or the deal-breakers are wrong -- just ask. You (Claude) can edit the user's files. The user says "change the budget to 1.5Cr" and you do it. That's the whole point.

## Data Contract (CRITICAL)

There are two layers. Read `DATA_CONTRACT.md` for the full list.

**User Layer (NEVER auto-updated, personalization goes HERE):**
- `buyer-brief.md`, `config/profile.yml`, `modes/_profile.md`
- `sources.yml`, `telegram-config.yml`
- `data/*`, `reports/*`

**System Layer (auto-updatable, DON'T put user data here):**
- `modes/_shared.md`, `modes/evaluate.md`, all other modes
- `CLAUDE.md`, `scripts/*.mjs`, `dashboard/*`, `templates/*`, `batch/*`

**THE RULE: When the user asks to customize anything (budget, locations, deal-breakers, scoring weights, builder blacklist), ALWAYS write to `modes/_profile.md` or `config/profile.yml`. NEVER edit `modes/_shared.md` for user-specific content.** This ensures system updates don't overwrite their customizations.

## What is PropOps

AI-powered property intelligence pipeline built on Claude Code: property evaluation, price transparency, builder reputation, litigation checks, negotiation strategy, and Telegram alerts.

### Main Files

| File | Function |
|------|----------|
| `data/properties.md` | Property tracker (main pipeline) |
| `data/watchlist.md` | Areas/projects being monitored |
| `data/scan-history.tsv` | Scanner dedup history |
| `sources.yml` | Data source & portal config |
| `buyer-brief.md` | Buyer requirements document |
| `reports/` | Evaluation reports (format: `{###}-{project-slug}-{YYYY-MM-DD}.md`) |

### First Run -- Onboarding (IMPORTANT)

**Before doing ANYTHING else, check if the system is set up.** Run these checks silently every time a session starts:

1. Does `buyer-brief.md` exist?
2. Does `config/profile.yml` exist (not just profile.example.yml)?
3. Does `modes/_profile.md` exist (not just _profile.template.md)?
4. Does `sources.yml` exist (not just templates/sources.example.yml)?

If `modes/_profile.md` is missing, copy from `modes/_profile.template.md` silently.

**If ANY of these is missing, enter onboarding mode.** Do NOT proceed with evaluations, scans, or any other mode until the basics are in place. Guide the user step by step:

#### Step 1: Buyer Brief (required)
If `buyer-brief.md` is missing, ask:
> "I need to understand what you're looking for. Tell me:
> 1. Are you buying for self-use or investment?
> 2. Your budget range (e.g., 60L-90L)
> 3. Preferred city and areas (e.g., Pune -- Hinjewadi, Baner, Keshav Nagar)
> 4. Configuration (1/2/3 BHK, villa, plot)
> 5. Minimum carpet area (sqft)
> 6. Any deal-breakers? (e.g., no under-construction, no builder <5 years old)
>
> I'll create your buyer brief and personalize the system."

Create `buyer-brief.md` from whatever they provide. Clean markdown with sections: Purpose, Budget, Locations, Configuration, Must-haves, Deal-breakers.

#### Step 2: Profile (required)
If `config/profile.yml` is missing, copy from `config/profile.example.yml` and ask:
> "A few more details to personalize:
> - Your name (for reports)
> - Your timeline (when do you want to buy?)
> - Loan pre-approval status and budget
> - Family size (affects configuration recommendations)
>
> I'll set everything up."

Fill in `config/profile.yml` with their answers.

#### Step 3: Sources (recommended)
If `sources.yml` is missing:
> "I'll set up the property scanner for Maharashtra with pre-configured portals (IGRS, MahaRERA, eCourts, 99acres). Want me to customize the search areas for your target locations?"

Copy `templates/sources.example.yml` to `sources.yml`. Update locations to match buyer brief.

#### Step 4: Tracker
If `data/properties.md` doesn't exist, create it:
```markdown
# Property Tracker

| # | Date | Project | Builder | Location | Config | Area | Price(L) | Rs/sqft | Score | Status | Report | Notes |
|---|------|---------|---------|----------|--------|------|----------|---------|-------|--------|--------|-------|
```

#### Step 5: Get to know the buyer (important for quality)

After basics are set up, proactively ask:

> "The system works much better when it knows your priorities well. Can you tell me:
> - What matters most? (price, location, builder reputation, appreciation potential?)
> - Any builders you trust or distrust?
> - Are you flexible on location if the right deal comes up?
> - First-time buyer or have you purchased before?
> - Any specific concerns? (construction quality, legal clarity, resale value?)
>
> The more context you give me, the better I filter and negotiate for you."

Store insights in `config/profile.yml` or `modes/_profile.md`.

#### Step 6: Telegram Alerts (optional)
> "Want property alerts on Telegram? I can notify you when matching properties hit the market. You'll need to create a bot via @BotFather on Telegram (takes 2 minutes). Want me to walk you through it?"

If yes, guide through BotFather setup, create `telegram-config.yml`.

#### Step 7: Ready
> "You're all set! You can now:
> - Paste a property listing URL to evaluate it
> - Run `/propops scan` to search for properties
> - Run `/propops trend {area}` for price analysis
> - Run `/propops builder {name}` to check a developer
> - Run `/propops` to see all commands
>
> Everything is customizable -- just ask me to change anything."

### Skill Modes

| If the user... | Mode |
|----------------|------|
| Pastes property URL or listing | auto-pipeline (evaluate + report + tracker) |
| Asks to evaluate a property | `evaluate` |
| Wants to scan for listings | `scan` |
| Asks about a builder/developer | `builder` |
| Wants litigation/legal check | `litigation` |
| Asks for negotiation help | `negotiate` |
| Wants price trends or forecast | `trend` |
| Wants to compare properties | `compare` |
| Asks for due diligence checklist | `due-diligence` |
| Wants to set up alerts | `alert` |
| Asks about pipeline status | `tracker` |
| Wants to batch evaluate | `batch` |
| Asks about affordability, EMI, home loan | `finance` |
| Wants to compare banks or loan rates | `finance` |
| Asks "should I buy or rent?" | `finance` |
| Asks about tax benefits of property | `finance` |
| Wants prepayment or refinancing strategy | `finance` |

### Buyer Brief Source of Truth

- `buyer-brief.md` in project root is the canonical requirements document
- **NEVER hardcode buyer preferences** -- read them from this file at evaluation time
- `config/profile.yml` has buyer identity and logistics
- `modes/_profile.md` has custom scoring overrides

---

## Ethical Use -- CRITICAL

**This tool is designed for informed buying, not speculation or harassment.**

- **NEVER contact builders/agents automatically.** Provide information, let the buyer decide.
- **NEVER fabricate data.** If IGRS/RERA data isn't available, say so. Don't invent registration prices.
- **Clearly label data sources.** Always state whether price data comes from IGRS registrations (verified), listing portals (asking price), or WebSearch estimates.
- **Disclaim forecasts.** AI price forecasts are estimates, not guarantees. Always include confidence level and caveats.
- **Respect privacy.** Registration data may contain buyer/seller names. Don't expose personal details unnecessarily.
- **Discourage speculation.** If a buyer is clearly over-leveraged or chasing unrealistic appreciation, flag the risk.

---

## Data Source Verification

**Hierarchy of trust:**
1. **IGRS Registration Data** -- Highest trust. Actual recorded transaction prices. Government source.
2. **RERA Portal Data** -- High trust. Official builder/project registrations, complaints.
3. **eCourts Data** -- High trust. Official court records.
4. **Property Portal Listings** (99acres, MagicBricks) -- Medium trust. Asking prices, not actual prices. May be inflated.
5. **WebSearch Results** -- Low trust. News articles, reviews, forum posts. Use for context, not as primary data.

**ALWAYS label the source when presenting data.** Example: "Registration price (IGRS, Jan 2026): Rs 8,500/sqft" vs "Listed price (99acres): Rs 11,000/sqft"

---

## Stack and Conventions

- Node.js (mjs modules), Playwright (scraping + PDF), YAML (config), Markdown (data)
- Scripts in `scripts/*.mjs`, configuration in YAML
- Reports in `reports/` (gitignored), Data in `data/` (gitignored)
- Report numbering: sequential 3-digit zero-padded, max existing + 1
- Report format: `{###}-{project-slug}-{YYYY-MM-DD}.md`
- **RULE: After each batch of evaluations, run `node scripts/merge-tracker.mjs`**
- **RULE: NEVER create new entries in properties.md if project+builder already exists.** Update the existing entry.

### TSV Format for Tracker Additions

Write one TSV file per evaluation to `batch/tracker-additions/{num}-{project-slug}.tsv`. Single line, 13 tab-separated columns:

```
{num}\t{date}\t{project}\t{builder}\t{location}\t{config}\t{area}\t{price_lakhs}\t{rs_sqft}\t{score}/10\t{status}\t[{num}](reports/{num}-{slug}-{date}.md)\t{notes}
```

### Pipeline Integrity

1. **NEVER edit properties.md to ADD new entries** -- Write TSV, use merge-tracker.
2. **YES you can edit properties.md to UPDATE status/notes of existing entries.**
3. All reports MUST include `**URL:**` and `**Source:**` in the header.
4. All statuses MUST be canonical (see `templates/states.yml`).
5. Health check: `node scripts/verify-pipeline.mjs`

### Canonical States (properties.md)

**Source of truth:** `templates/states.yml`

| State | When to use |
|-------|-------------|
| `Evaluated` | Report completed, pending decision |
| `Shortlisted` | Buyer interested, investigating further |
| `Site Visit` | Visit scheduled or completed |
| `Negotiating` | In price negotiation |
| `Offer Made` | Formal offer submitted |
| `Booked` | Token/booking amount paid |
| `Registered` | Sale deed registered |
| `Rejected` | Buyer rejected (too expensive, red flags) |
| `SKIP` | Doesn't match brief |
| `Watching` | On watchlist, monitoring price |

**RULES:**
- No markdown bold (`**`) in status field
- No dates in status field (use the date column)
- No extra text (use the notes column)
