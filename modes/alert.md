# PropOps -- Alert Mode

Configure and manage Telegram notifications for property matches.

---

## Prerequisites

1. Read `modes/_shared.md`
2. Read `modes/_profile.md` (if exists)
3. Check if `telegram-config.yml` exists

## Trigger

This mode activates when the user says:
- "Set up alerts"
- "Notify me when matching properties appear"
- "Configure Telegram"
- "I want notifications"
- "Alert me for properties in {area}"
- "Change alert settings"

---

## Step 1: Check Telegram Setup

If `telegram-config.yml` does NOT exist, guide the user:

> "To get Telegram alerts, I need to set up a bot. It takes 2 minutes:
>
> 1. Open Telegram and message **@BotFather**
> 2. Send `/newbot` and follow the prompts to create a bot
> 3. Copy the **bot token** it gives you (looks like `123456:ABC-DEF...`)
> 4. Now message **@userinfobot** to get your **chat ID** (a number)
> 5. Tell me both and I'll configure everything."

Once the user provides the token and chat ID:
1. Copy `templates/telegram-config.example.yml` → `telegram-config.yml`
2. Fill in `bot_token` and `chat_ids`
3. Set alert preferences based on `buyer-brief.md` (locations, configs, budget)
4. Test the connection:

```bash
node scripts/telegram-bot.mjs test
```

If test succeeds: "Telegram alerts are live! You'll get notified when matching properties appear."

---

## Step 2: Configure Alert Filters

Read `buyer-brief.md` and suggest alert settings:

> "Based on your buyer brief, I'll alert you for:
> - Properties scoring **6.0+** (adjustable)
> - Budget up to **Rs {max_budget}L**
> - In: {locations from brief}
> - Config: {configs from brief}
>
> Want to adjust any of these?"

Update `telegram-config.yml` with the user's preferences.

---

## Step 3: Alert Types

### Instant Alerts (default)
Sent immediately when a matching property is found during `/propops scan`.

### Daily Digest
If user prefers fewer notifications:
- Set `digest_mode: true` in `telegram-config.yml`
- Batches all matches found during the day
- Sends a summary at end of day

### Priority Builder Alerts
Properties from specific trusted builders alert regardless of score:
- Set `priority_builders` in `telegram-config.yml`
- Example: `["Godrej Properties", "Lodha"]`

---

## Step 4: Scheduling Scans

Suggest setting up recurring scans:

> "Want me to scan for new properties automatically? I can run a scan every few days so you don't miss anything."

If the user accepts, suggest using Claude's scheduling capabilities:
- `/loop 3d /propops scan` — scan every 3 days
- Or set up a cron job: `0 9 */3 * * cd /path/to/propops && claude -p "run /propops scan"`

---

## Step 5: Managing Alerts

### Pause alerts
User says: "Pause notifications" → Set `enabled: false` in `telegram-config.yml`

### Resume alerts
User says: "Resume notifications" → Set `enabled: true`

### Change criteria
User says: "Only alert above 7.0" → Update `min_score` in config

### Test
User says: "Send me a test alert" → Run `node scripts/telegram-bot.mjs test`

---

## Rules
- NEVER send alerts without user consent and configuration
- ALWAYS test the connection before considering setup complete
- Respect quiet hours (default 10pm-8am)
- If digest mode is on, don't send instant alerts
- Max 10 alerts per scan (bundle the rest in a summary)
