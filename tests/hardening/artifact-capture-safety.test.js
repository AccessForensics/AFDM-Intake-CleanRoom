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

test("PR6 regression: runner guards artifact capture so screenshot or HTML failures do not escape the run loop", () => {
  const runnerText = readRunnerSource();

  assert.match(
    runnerText,
    /let\s+artifactPaths\s*=\s*\{\s*pngPath:\s*"",\s*htmlPath:\s*""\s*\};/,
    "Runner must initialize empty artifact paths before attempting artifact capture."
  );

  assert.match(
    runnerText,
    /try\s*\{\s*artifactPaths\s*=\s*await\s+saveArtifacts\(page,\s*prefix\);\s*\}\s*catch\s*\(artifactError\)/,
    "Runner must wrap saveArtifacts in a try/catch block."
  );

  assert.match(
    runnerText,
    /constraint_class:\s*CONSTRAINT_CLASS\.HARDCRASH/,
    "Runner must classify artifact capture failures as HARDCRASH."
  );

  assert.match(
    runnerText,
    /mechanical_note:\s*"Playwright execution failed during artifact capture\."/,
    "Runner must use the locked artifact capture mechanical note."
  );

  assert.match(
    runnerText,
    /artifact_capture_error/,
    "Runner must preserve artifact capture failure details as internal evidence."
  );

  assert.doesNotMatch(
    runnerText,
    /const\s+artifactPaths\s*=\s*await\s+saveArtifacts\(page,\s*prefix\);/,
    "Runner must not leave artifact capture as an unguarded const await call."
  );
});

test("PR6 regression: runner keeps PR5 per-run context cleanup while adding artifact capture safety", () => {
  const runnerText = readRunnerSource();

  assert.match(
    runnerText,
    /let\s+context\s*=\s*null;/,
    "Runner must retain PR5 nullable context declaration."
  );

  assert.match(
    runnerText,
    /finally\s*\{\s*if\s*\(context\)\s*\{\s*await\s+context\.close\(\);/,
    "Runner must retain PR5 per-run context finally cleanup."
  );
});
