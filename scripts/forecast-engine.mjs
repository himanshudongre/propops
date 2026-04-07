#!/usr/bin/env node

/**
 * PropOps Price Forecast Engine
 *
 * Analyzes historical registration prices from IGRS cache and generates
 * price trend reports with AI-assisted forecasting context.
 *
 * This script does NOT generate AI forecasts itself — it prepares the
 * structured data that Claude uses to make informed predictions.
 *
 * Usage:
 *   node scripts/forecast-engine.mjs analyze --district "Pune" --village "Hinjewadi"
 *   node scripts/forecast-engine.mjs compare --villages "Hinjewadi,Baner,Wakad" --district "Pune"
 *
 * Output: JSON with historical trends, growth rates, and data for AI analysis
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/registration-cache');

// ─── Load Cached IGRS Data ─────────────────────────────────

function loadCachedData(district, village) {
  if (!existsSync(CACHE_DIR)) return {};

  const prefix = `igrs-${district}-${village}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const files = readdirSync(CACHE_DIR).filter(f => f.startsWith(prefix) && f.endsWith('.json'));

  const yearlyData = {};

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(resolve(CACHE_DIR, file), 'utf-8'));
      if (data.status === 'success' && data.year) {
        yearlyData[data.year] = {
          registrations_count: data.registrations_count,
          avg_amount_raw: data.summary?.avg_amount_raw || 0,
          min_amount_raw: data.summary?.min_amount_raw || 0,
          max_amount_raw: data.summary?.max_amount_raw || 0,
          registrations: data.registrations || []
        };
      }
    } catch { /* skip malformed cache files */ }
  }

  return yearlyData;
}

// ─── Trend Analysis ─────────────────────────────────────────

function analyzeTrend(yearlyData) {
  const years = Object.keys(yearlyData).map(Number).sort();
  if (years.length < 2) return { status: 'insufficient_data', years_available: years.length };

  const trend = [];
  let prevAvg = null;

  for (const year of years) {
    const data = yearlyData[year];
    const avg = data.avg_amount_raw;
    const growth = prevAvg && prevAvg > 0 ? ((avg - prevAvg) / prevAvg * 100) : null;

    trend.push({
      year,
      avg_amount: avg > 0 ? `Rs ${(avg / 100000).toFixed(2)}L` : 'N/A',
      avg_amount_raw: avg,
      min_amount: data.min_amount_raw > 0 ? `Rs ${(data.min_amount_raw / 100000).toFixed(2)}L` : 'N/A',
      max_amount: data.max_amount_raw > 0 ? `Rs ${(data.max_amount_raw / 100000).toFixed(2)}L` : 'N/A',
      registrations: data.registrations_count,
      yoy_growth: growth !== null ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : 'N/A',
      yoy_growth_raw: growth
    });

    prevAvg = avg > 0 ? avg : prevAvg;
  }

  // Calculate CAGR (Compound Annual Growth Rate)
  const firstYear = trend.find(t => t.avg_amount_raw > 0);
  const lastYear = [...trend].reverse().find(t => t.avg_amount_raw > 0);
  let cagr = null;

  if (firstYear && lastYear && firstYear !== lastYear) {
    const numYears = lastYear.year - firstYear.year;
    if (numYears > 0 && firstYear.avg_amount_raw > 0) {
      cagr = (Math.pow(lastYear.avg_amount_raw / firstYear.avg_amount_raw, 1 / numYears) - 1) * 100;
    }
  }

  // Detect acceleration/deceleration
  const growthRates = trend.filter(t => t.yoy_growth_raw !== null).map(t => t.yoy_growth_raw);
  let momentum = 'stable';
  if (growthRates.length >= 3) {
    const recent = growthRates.slice(-2);
    const earlier = growthRates.slice(0, -2);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    if (recentAvg > earlierAvg + 3) momentum = 'accelerating';
    else if (recentAvg < earlierAvg - 3) momentum = 'decelerating';
  }

  // Volume trend (are registrations increasing or decreasing?)
  const volumes = trend.map(t => t.registrations).filter(v => v > 0);
  let volumeTrend = 'stable';
  if (volumes.length >= 3) {
    const recentVol = volumes.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const earlierVol = volumes.slice(0, -2).reduce((a, b) => a + b, 0) / (volumes.length - 2);
    if (recentVol > earlierVol * 1.2) volumeTrend = 'increasing';
    else if (recentVol < earlierVol * 0.8) volumeTrend = 'decreasing';
  }

  return {
    status: 'success',
    years_analyzed: years.length,
    period: `${years[0]}-${years[years.length - 1]}`,
    trend,
    cagr: cagr !== null ? `${cagr.toFixed(1)}%` : 'N/A',
    cagr_raw: cagr,
    momentum,
    volume_trend: volumeTrend,
    latest_avg: lastYear ? lastYear.avg_amount : 'N/A',
    latest_avg_raw: lastYear ? lastYear.avg_amount_raw : 0
  };
}

// ─── Compare Villages ───────────────────────────────────────

function compareVillages(district, villages) {
  const comparisons = {};

  for (const village of villages) {
    const data = loadCachedData(district, village);
    const analysis = analyzeTrend(data);
    comparisons[village] = {
      ...analysis,
      village,
      district
    };
  }

  // Rank by latest average price
  const ranked = Object.entries(comparisons)
    .filter(([, v]) => v.latest_avg_raw > 0)
    .sort((a, b) => a[1].latest_avg_raw - b[1].latest_avg_raw);

  return {
    district,
    villages_compared: villages.length,
    comparison: comparisons,
    ranking_by_price: ranked.map(([name, data], i) => ({
      rank: i + 1,
      village: name,
      latest_avg: data.latest_avg,
      cagr: data.cagr,
      momentum: data.momentum
    })),
    cheapest: ranked[0]?.[0] || 'N/A',
    most_expensive: ranked[ranked.length - 1]?.[0] || 'N/A',
    fastest_growing: Object.entries(comparisons)
      .filter(([, v]) => v.cagr_raw !== null)
      .sort((a, b) => (b[1].cagr_raw || 0) - (a[1].cagr_raw || 0))[0]?.[0] || 'N/A'
  };
}

// ─── Main CLI ───────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps Price Forecast Engine

Analyzes cached IGRS registration data to generate price trends.
Run the IGRS scraper first to populate the cache.

Usage:
  node scripts/forecast-engine.mjs analyze --district "Pune" --village "Hinjewadi"
  node scripts/forecast-engine.mjs compare --district "Pune" --villages "Hinjewadi,Baner,Wakad"

Requires: cached IGRS data in data/registration-cache/
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'analyze': {
      const district = getArg('--district') || 'Pune';
      const village = getArg('--village') || '';
      const data = loadCachedData(district, village);
      result = {
        district,
        village,
        source: 'IGRS Maharashtra (cached)',
        ...analyzeTrend(data),
        ai_context: {
          note: 'This data is for Claude to analyze. The AI should combine these trends with infrastructure projects, macro indicators, and market conditions to generate a forecast.',
          data_points: Object.keys(data).length,
          latest_year: Math.max(...Object.keys(data).map(Number)) || 'N/A'
        }
      };
      break;
    }

    case 'compare': {
      const district = getArg('--district') || 'Pune';
      const villages = (getArg('--villages') || '').split(',').map(v => v.trim()).filter(Boolean);
      if (villages.length < 2) {
        console.error('Need at least 2 villages to compare. Use --villages "Hinjewadi,Baner,Wakad"');
        process.exit(1);
      }
      result = compareVillages(district, villages);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
