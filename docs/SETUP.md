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
2. **Profile** -- your name, timeline, loan status
3. **Sources** -- data source configuration (IGRS, MahaRERA, eCourts)
4. **Telegram Alerts** -- optional push notifications

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
The IGRS portal can be slow. Try:
- Running during off-peak hours (early morning IST)
- Using `--interactive` mode to see the browser

### MahaRERA returns empty results
Try searching with different name variations:
- Full legal entity name vs brand name
- With/without "Ltd", "LLP", "Pvt"

### Telegram bot not sending
1. Verify token: `node scripts/telegram-bot.mjs test`
2. Check chat ID is correct (number, not username)
3. Ensure you've started a conversation with your bot first
