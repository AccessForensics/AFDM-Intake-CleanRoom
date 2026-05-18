"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readRunnerSource() {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "tools", "run-playwright-intake.js"),
    "utf8"
  );
}

test("PR5 regression: runner closes each Playwright context in a per-run finally block", () => {
  const runnerText = readRunnerSource();

  assert.match(
    runnerText,
    /let\s+context\s*=\s*null;/,
    "Runner must declare per-run context before the protected execution block."
  );

  assert.match(
    runnerText,
    /context\s*=\s*await\s+browser\.newContext\(/,
    "Runner must assign the Playwright context so finally can close it."
  );

  assert.match(
    runnerText,
    /finally\s*\{\s*if\s*\(context\)\s*\{\s*await\s+context\.close\(\);/,
    "Runner must close the Playwright context in a finally block."
  );

  assert.doesNotMatch(
    runnerText,
    /\n\s*await\s+context\.close\(\);\s*\n\s*console\.log\(/,
    "Runner must not close context only on the success path immediately before logging."
  );
});