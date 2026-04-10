# PropOps Setup Guide

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) (Claude Max subscription)
- [Node.js](https://nodejs.org/) v18+
- Git

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/himanshudongre/propops.git
cd propops
npm install
npx playwright install chromium
```

### 2. Open Claude Code

```bash
claude
```

PropOps auto-detects it's a first run and walks you through setup:

1. **Buyer Brief** -- your budget, target areas, configuration, deal-breakers
2. **Profile** -- your name, timeline, loan status, financial details (for finance mode)
3. **Sources** -- data source configuration (state-specific IGRS + RERA + eCourts)
4. **Telegram Alerts** -- optional push notifications

PropOps auto-detects your target state from your buyer brief and routes to the appropriate scrapers. Currently supported states with FULL IGRS + RERA support: Maharashtra, Karnataka, Telangana. RERA-only: Tamil Nadu, Uttar Pradesh.

### 3. Start Using

```bash
# Paste a property listing URL for instant evaluation
# Or use any command:

/propops                    # See all commands
/propops scan               # Search for properties
/propops builder Godrej     # Check a builder's reputation
/propops trend Hinjewadi    # Price trends for an area
/propops finance            # Can I afford this property?
/propops litigation Lodha   # Check legal cases against builder
/propops compare            # Compare shortlisted properties
/propops tracker            # View your property pipeline
/propops agreement-review   # Review a builder agreement for traps
/propops site-visit         # Generate property-specific site visit checklist
/propops post-purchase      # Track delays, draft RERA complaints
```

## Detailed Setup

### eCourts API Key (Recommended)

The eCourts litigation search works best with a free API key:

1. Visit [court-api.kleopatra.io](https://court-api.kleopatra.io/)
2. Sign up (free for personal/research use)
3. Copy your API key
4. Set the environment variable:

```bash
export ECOURTS_API_KEY="your-api-key-here"
```

Without the API key, PropOps falls back to Playwright browser scraping (slower).

### Telegram Alerts (Optional)

1. Open Telegram and message **@BotFather**
2. Send `/newbot`, follow prompts, copy the **bot token**
3. Message **@userinfobot** to get your **chat ID**
4. Run in Claude:

```
/propops alert
```

Claude will guide you through creating `telegram-config.yml`.

Test it:
```bash
node scripts/telegram-bot.mjs test
```

### State-Specific Setup

**Maharashtra (IGRS):** No setup needed. When the scraper hits a CAPTCHA, it screenshots the image and shows it to you in chat. Type the CAPTCHA text, and the agent continues.

**Karnataka (Kaveri):** Requires a one-time manual login. Kaveri uses phone + OTP authentication, so PropOps opens a browser window for you to log in manually:

```bash
node scripts/scrapers/kaveri-karnataka.mjs login
```

This opens a headful browser. Enter your phone number, solve the CAPTCHA, receive the OTP on your phone, and complete the login. The script detects successful login and saves the session. After that, you can run queries freely for ~8 hours without re-logging in.

```bash
# Check session status
node scripts/scrapers/kaveri-karnataka.mjs session-status

# Clear session (forces re-login next time)
node scripts/scrapers/kaveri-karnataka.mjs logout
```

**Telangana (IGRS):** Same CAPTCHA-in-chat pattern as Maharashtra. No upfront setup.

**Tamil Nadu (TNRERA), Karnataka (K-RERA), Telangana (TG-RERA), UP-RERA:** No setup. Public HTML tables, no CAPTCHA, no auth.

### Dashboard TUI (Optional)

Requires [Go](https://go.dev/dl/) 1.21+:

```bash
cd dashboard
go build -o propops-dashboard .
./propops-dashboard
```

Features: 6 filter tabs, 4 sort modes, score-colored display, keyboard navigation.

## File Structure After Setup

```
propops/
├── buyer-brief.md          # YOUR requirements (created during onboarding)
├── config/profile.yml      # YOUR identity (created during onboarding)
├── modes/_profile.md       # YOUR custom scoring (auto-created)
├── sources.yml             # YOUR data sources (auto-created)
├── telegram-config.yml     # YOUR Telegram config (optional)
├── data/
│   ├── properties.md       # YOUR property tracker
│   ├── watchlist.md        # YOUR monitored properties
│   └── registration-cache/ # Cached IGRS data (auto)
├── reports/                # YOUR evaluation reports (auto)
└── [system files]          # Never modified by updates
```

## Customization

Everything is customizable -- just ask Claude:

- "Change my budget to 1.2 Cr"
- "Add Thane to my target areas"
- "Blacklist XYZ Developers"
- "Only alert me for properties scoring above 7.5"
- "Change the scoring to weight location more"

Claude reads the same files it uses, so it knows exactly what to edit.

## Updating

```bash
# Check for updates
node scripts/update-system.mjs check

# Apply update (your data is NEVER touched)
node scripts/update-system.mjs apply

# Rollback if needed
node scripts/update-system.mjs rollback
```

## Troubleshooting

### "Playwright not found"
```bash
npx playwright install chromium
```

### IGRS CAPTCHA won't load
Maharashtra and Telangana IGRS portals can be slow. Try:
- Running during off-peak hours (early morning IST)
- Using `--interactive` mode to see the browser

### Kaveri session expired
Kaveri sessions last ~8 hours. If you get `session_expired`:

```bash
node scripts/scrapers/kaveri-karnataka.mjs login
```

Re-run the manual login flow.

### MahaRERA returns empty results
Try searching with different name variations:
- Full legal entity name vs brand name
- With/without "Ltd", "LLP", "Pvt"

### Builder has history I should see but PropOps doesn't find it
This is the "previous projects field is empty" problem. Run the promoter resolver to cross-reference identity:

```bash
node scripts/promoter-resolver.mjs resolve --name "Builder Name"
```

It will find related legal entities (SPVs, parent company, etc.) and aggregate projects across all of them — catching history that the RERA project page form field misses.

### Telegram bot not sending
1. Verify token: `node scripts/telegram-bot.mjs test`
2. Check chat ID is correct (number, not username)
3. Ensure you've started a conversation with your bot first
