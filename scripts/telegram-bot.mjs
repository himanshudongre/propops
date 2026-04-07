#!/usr/bin/env node

/**
 * PropOps Telegram Bot
 *
 * Sends property alerts to the buyer via Telegram when matching
 * properties are found during scans.
 *
 * Setup:
 *   1. Message @BotFather on Telegram → /newbot → get token
 *   2. Message @userinfobot on Telegram → get your chat ID
 *   3. Copy templates/telegram-config.example.yml → telegram-config.yml
 *   4. Fill in bot_token and chat_ids
 *
 * Usage:
 *   node scripts/telegram-bot.mjs send --message "Test alert"
 *   node scripts/telegram-bot.mjs alert --property '{"project":"Godrej Infinity","builder":"Godrej","config":"2 BHK","price":"78L","score":"7.8"}'
 *   node scripts/telegram-bot.mjs digest               # Send daily digest of new matches
 *   node scripts/telegram-bot.mjs test                  # Send test message to verify setup
 *
 * Output: JSON with delivery status
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONFIG_PATH = resolve(ROOT, 'telegram-config.yml');

const TELEGRAM_API = 'https://api.telegram.org/bot';

// ─── Config Loader ──────────────────────────────────────────

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error('ERROR: telegram-config.yml not found.');
    console.error('Copy templates/telegram-config.example.yml → telegram-config.yml');
    console.error('Then fill in your bot_token and chat_ids.');
    process.exit(1);
  }

  const content = readFileSync(CONFIG_PATH, 'utf-8');

  // Simple YAML parser for our flat structure
  const config = {
    bot_token: '',
    chat_ids: [],
    alerts: {
      enabled: true,
      min_score: 6.0,
      max_price_lakhs: 100,
      locations: [],
      configs: [],
      priority_builders: [],
      digest_mode: false,
      quiet_hours: { start: '22:00', end: '08:00' }
    }
  };

  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;

    // Bot token
    const tokenMatch = trimmed.match(/bot_token:\s*"?([^"]+)"?/);
    if (tokenMatch) config.bot_token = tokenMatch[1].trim();

    // Chat IDs (array items)
    if (trimmed.startsWith('- "') && currentSection === 'chat_ids') {
      config.chat_ids.push(trimmed.replace(/^-\s*"?|"?\s*$/g, ''));
    }

    // Track sections
    if (trimmed === 'chat_ids:') currentSection = 'chat_ids';
    else if (trimmed === 'locations:') currentSection = 'locations';
    else if (trimmed === 'configs:') currentSection = 'configs';
    else if (trimmed === 'priority_builders:') currentSection = 'priority_builders';
    else if (!trimmed.startsWith('-')) currentSection = '';

    // Alert settings
    if (trimmed.startsWith('- "') || trimmed.startsWith("- '")) {
      const val = trimmed.replace(/^-\s*["']?|["']?\s*$/g, '');
      if (currentSection === 'locations') config.alerts.locations.push(val);
      if (currentSection === 'configs') config.alerts.configs.push(val);
      if (currentSection === 'priority_builders') config.alerts.priority_builders.push(val);
    }

    const enabledMatch = trimmed.match(/^\s*enabled:\s*(true|false)/);
    if (enabledMatch) config.alerts.enabled = enabledMatch[1] === 'true';

    const minScoreMatch = trimmed.match(/^\s*min_score:\s*([\d.]+)/);
    if (minScoreMatch) config.alerts.min_score = parseFloat(minScoreMatch[1]);

    const maxPriceMatch = trimmed.match(/^\s*max_price_lakhs:\s*(\d+)/);
    if (maxPriceMatch) config.alerts.max_price_lakhs = parseInt(maxPriceMatch[1]);

    const digestMatch = trimmed.match(/^\s*digest_mode:\s*(true|false)/);
    if (digestMatch) config.alerts.digest_mode = digestMatch[1] === 'true';
  }

  if (!config.bot_token || config.bot_token === 'YOUR_BOT_TOKEN_HERE') {
    console.error('ERROR: bot_token not configured in telegram-config.yml');
    process.exit(1);
  }

  if (config.chat_ids.length === 0 || config.chat_ids[0] === 'YOUR_CHAT_ID_HERE') {
    console.error('ERROR: chat_ids not configured in telegram-config.yml');
    process.exit(1);
  }

  return config;
}

// ─── Telegram API Helpers ───────────────────────────────────

async function sendMessage(botToken, chatId, text, parseMode = 'Markdown') {
  const url = `${TELEGRAM_API}${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false
      })
    });

    const result = await response.json();

    if (!result.ok) {
      console.error(`Telegram API error: ${result.description}`);
      return { success: false, error: result.description, chat_id: chatId };
    }

    return { success: true, message_id: result.result.message_id, chat_id: chatId };
  } catch (error) {
    console.error(`Network error: ${error.message}`);
    return { success: false, error: error.message, chat_id: chatId };
  }
}

async function broadcastMessage(config, text) {
  const results = [];
  for (const chatId of config.chat_ids) {
    const result = await sendMessage(config.bot_token, chatId, text);
    results.push(result);
  }
  return results;
}

// ─── Quiet Hours Check ──────────────────────────────────────

function isQuietHours(config) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const [startH, startM] = (config.alerts.quiet_hours?.start || '22:00').split(':').map(Number);
  const [endH, endM] = (config.alerts.quiet_hours?.end || '08:00').split(':').map(Number);
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  if (startTime > endTime) {
    // Quiet hours cross midnight (e.g., 22:00 - 08:00)
    return currentTime >= startTime || currentTime < endTime;
  }
  return currentTime >= startTime && currentTime < endTime;
}

// ─── Property Alert Formatter ───────────────────────────────

function formatPropertyAlert(property) {
  const p = typeof property === 'string' ? JSON.parse(property) : property;

  const score = parseFloat(p.score) || 0;
  const scoreEmoji = score >= 8 ? '🟢' : score >= 6 ? '🟡' : '🔴';

  let flags = '';
  if (p.red_flags) flags += `\n⚠️ Flags: ${p.red_flags}`;
  if (p.green_flags) flags += `\n✅ Positives: ${p.green_flags}`;

  const reraStatus = p.rera_registered === false ? '❌ Not registered' :
    p.rera_id ? `✅ ${p.rera_id}` : '❓ Unknown';

  return `🏠 *New Property Match!*

📍 *${p.project || 'Unknown Project'}*
${p.location ? `📌 ${p.location}` : ''}
🏗️ Builder: ${p.builder || 'Unknown'} ${p.builder_score ? `(Score: ${p.builder_score}/10)` : ''}
📐 Config: ${p.config || 'N/A'} ${p.carpet_area ? `| ${p.carpet_area} sqft` : ''}
💰 Price: Rs ${p.price || 'N/A'} ${p.price_per_sqft ? `(Rs ${p.price_per_sqft}/sqft)` : ''}
${p.area_avg_sqft ? `📊 Area avg: Rs ${p.area_avg_sqft}/sqft` : ''}
⚖️ RERA: ${reraStatus}
${scoreEmoji} Score: ${p.score || 'N/A'}/10${flags}

${p.listing_url ? `🔗 [View Listing](${p.listing_url})` : ''}
📋 Run \`/propops evaluate\` for full report`;
}

// ─── Digest Formatter ───────────────────────────────────────

function formatDigest(properties) {
  if (properties.length === 0) return '📭 No new matching properties found today.';

  let msg = `📊 *PropOps Daily Digest*\n`;
  msg += `Found *${properties.length}* new matching properties:\n\n`;

  properties.slice(0, 10).forEach((p, i) => {
    const score = parseFloat(p.score) || 0;
    const emoji = score >= 8 ? '🟢' : score >= 6 ? '🟡' : '🔴';
    msg += `${i + 1}. ${emoji} *${p.project}* — ${p.config || ''} Rs ${p.price || 'N/A'}`;
    msg += ` (${p.score || '?'}/10)\n`;
    msg += `   📍 ${p.location || ''} | 🏗️ ${p.builder || ''}\n\n`;
  });

  if (properties.length > 10) {
    msg += `\n_...and ${properties.length - 10} more. Run /propops tracker to see all._`;
  }

  return msg;
}

// ─── Alert Filter ───────────────────────────────────────────

function shouldAlert(property, config) {
  const p = typeof property === 'string' ? JSON.parse(property) : property;

  // Check if alerts are enabled
  if (!config.alerts.enabled) return false;

  // Check quiet hours
  if (isQuietHours(config)) return false;

  // Priority builders always alert
  const isPriority = config.alerts.priority_builders.some(b =>
    (p.builder || '').toLowerCase().includes(b.toLowerCase())
  );
  if (isPriority) return true;

  // Check min score
  const score = parseFloat(p.score) || 0;
  if (score < config.alerts.min_score) return false;

  // Check max price
  const price = parseFloat((p.price || '0').replace(/[^0-9.]/g, ''));
  if (price > config.alerts.max_price_lakhs && config.alerts.max_price_lakhs > 0) return false;

  // Check location filter (empty = all locations)
  if (config.alerts.locations.length > 0) {
    const matchesLocation = config.alerts.locations.some(loc =>
      (p.location || '').toLowerCase().includes(loc.toLowerCase())
    );
    if (!matchesLocation) return false;
  }

  // Check config filter (empty = all configs)
  if (config.alerts.configs.length > 0) {
    const matchesConfig = config.alerts.configs.some(cfg =>
      (p.config || '').toLowerCase().includes(cfg.toLowerCase())
    );
    if (!matchesConfig) return false;
  }

  return true;
}

// ─── Main CLI ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps Telegram Bot

Setup:
  1. Message @BotFather on Telegram → /newbot → copy token
  2. Message @userinfobot → copy your chat ID
  3. cp templates/telegram-config.example.yml telegram-config.yml
  4. Edit telegram-config.yml with your token and chat ID

Usage:
  node scripts/telegram-bot.mjs test                     # Verify connection
  node scripts/telegram-bot.mjs send --message "Hello"   # Send text message
  node scripts/telegram-bot.mjs alert --property '{...}' # Send property alert
  node scripts/telegram-bot.mjs digest --file props.json # Send daily digest
  node scripts/telegram-bot.mjs check --property '{...}' # Check if property passes filters
    `);
    process.exit(0);
  }

  const config = loadConfig();
  let result;

  switch (command) {
    case 'test':
      result = await broadcastMessage(config, '✅ *PropOps Telegram Bot Connected!*\n\nYou will receive property alerts here when matching properties are found.\n\nRun `/propops scan` to start searching.');
      break;

    case 'send':
      result = await broadcastMessage(config, getArg('--message') || 'Test message from PropOps');
      break;

    case 'alert': {
      const propertyJson = getArg('--property');
      if (!propertyJson) { console.error('--property JSON required'); process.exit(1); }

      const property = JSON.parse(propertyJson);

      if (shouldAlert(property, config)) {
        const msg = formatPropertyAlert(property);
        result = await broadcastMessage(config, msg);
      } else {
        result = { filtered: true, reason: 'Property does not match alert criteria' };
      }
      break;
    }

    case 'digest': {
      const filePath = getArg('--file');
      let properties = [];

      if (filePath && existsSync(filePath)) {
        properties = JSON.parse(readFileSync(filePath, 'utf-8'));
      } else if (getArg('--properties')) {
        properties = JSON.parse(getArg('--properties'));
      }

      const matching = properties.filter(p => shouldAlert(p, config));
      const msg = formatDigest(matching);
      result = await broadcastMessage(config, msg);
      result = { ...result, total: properties.length, matching: matching.length };
      break;
    }

    case 'check': {
      const property = JSON.parse(getArg('--property') || '{}');
      const passes = shouldAlert(property, config);
      result = {
        property: property.project || 'Unknown',
        passes_filter: passes,
        criteria: {
          min_score: config.alerts.min_score,
          max_price: config.alerts.max_price_lakhs,
          locations: config.alerts.locations,
          configs: config.alerts.configs,
          priority_builders: config.alerts.priority_builders
        }
      };
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
