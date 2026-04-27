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

scraperTest("MahaRERA promoter search returns Lodha results", () => {
  const result = runScraper(
    ["scripts/maharera-scraper.mjs", "search-promoter", "--name", "Lodha"],
    "maharera-lodha-smoke",
  );

  assert.ok(result.results_count >= 1, `Expected Lodha matches, got ${result.results_count}`);
});

scraperTest("MahaRERA promoter search cleanly returns zero for a non-existent builder", () => {
  const result = runScraper(
    ["scripts/maharera-scraper.mjs", "search-promoter", "--name", "ZZZ NonExistent Builder Pvt Ltd"],
    "maharera-nonexistent-smoke",
  );

  assert.equal(result.results_count, 0);
  assert.notEqual(result.error_code, "SELECTOR_DRIFT");
});
