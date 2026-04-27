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

scraperTest("TG-RERA builder search surfaces CAPTCHA instead of silently returning zero", () => {
  const result = runScraper(
    ["scripts/scrapers/tsrera.mjs", "builder", "--name", "Aparna"],
    "tsrera-aparna-smoke",
  );

  assert.equal(result.status, "captcha_required");
  assert.ok(result.captcha_image);
});
