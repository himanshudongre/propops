import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const scraperTest = process.env.RUN_SCRAPER_TESTS === "1" ? test : test.skip;

function runScraper(args, label) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 120_000,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  mkdirSync(resolve("data/debug"), { recursive: true });
  writeFileSync(resolve("data/debug", `${label}.json`), result.stdout);
  return JSON.parse(result.stdout);
}

scraperTest("TNRERA builder search returns Casagrand results", () => {
  const result = runScraper(
    ["scripts/scrapers/tnrera.mjs", "builder", "--name", "Casagrand"],
    "tnrera-casagrand-smoke",
  );

  assert.ok(result.total_projects >= 1, `Expected Casagrand matches, got ${result.total_projects}`);
});

scraperTest("TNRERA builder search cleanly returns zero for a non-existent builder", () => {
  const result = runScraper(
    ["scripts/scrapers/tnrera.mjs", "builder", "--name", "ZZZ NonExistent Builder Pvt Ltd"],
    "tnrera-nonexistent-smoke",
  );

  assert.equal(result.total_projects, 0);
});
