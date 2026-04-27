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

scraperTest("UP-RERA builder search returns Supertech promoter registry matches", () => {
  const result = runScraper(
    ["scripts/scrapers/uprera.mjs", "builder", "--name", "Supertech"],
    "uprera-supertech-smoke",
  );

  assert.ok(result.total_projects >= 1, `Expected Supertech matches, got ${result.total_projects}`);
});

scraperTest("UP-RERA builder search cleanly returns zero for a non-existent builder", () => {
  const result = runScraper(
    ["scripts/scrapers/uprera.mjs", "builder", "--name", "ZZZ NonExistent Builder Pvt Ltd"],
    "uprera-nonexistent-smoke",
  );

  assert.equal(result.total_projects, 0);
});
