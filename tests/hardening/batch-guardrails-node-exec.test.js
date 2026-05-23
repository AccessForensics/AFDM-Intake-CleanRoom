"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("batch runner invokes guardrails through the current Node executable, not npm.cmd", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "tools", "run-intake-batch.js"),
    "utf8"
  );

  const runGuardrailsStart = source.indexOf("function runGuardrails(repoRoot)");
  assert.notEqual(runGuardrailsStart, -1, "runGuardrails function must exist");

  const mainStart = source.indexOf("function main()", runGuardrailsStart);
  assert.notEqual(mainStart, -1, "main function must exist after runGuardrails");

  const runGuardrailsSource = source.slice(runGuardrailsStart, mainStart);

  assert.match(
    runGuardrailsSource,
    /spawnSync\(\s*process\.execPath\s*,/,
    "runGuardrails must spawn the current Node executable directly"
  );

  assert.match(
    runGuardrailsSource,
    /guardrails_check\.js/,
    "runGuardrails must target tools/ci/guardrails_check.js"
  );

  assert.doesNotMatch(
    runGuardrailsSource,
    /npm\.cmd|npm["']?\s*,\s*\[\s*["']run["']\s*,\s*["']guardrails["']\s*\]/,
    "runGuardrails must not shell out through npm or npm.cmd"
  );
});
