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
    /let\s+artifactPaths\s*=\s*\{\s*pngPath:\s*"",\s*htmlPath:\s*"",\s*metadataPath:\s*"",\s*manifestPath:\s*"",\s*elementGeometryPath:\s*""\s*\};/,
    "Runner must initialize empty artifact and Capture v2 paths before attempting artifact capture."
  );

  assert.match(
    runnerText,
    /try\s*\{\s*artifactPaths\s*=\s*await\s+saveArtifacts\(page,\s*prefix,\s*contextConfig\);\s*\}\s*catch\s*\(artifactError\)/,
    "Runner must wrap Capture v2 saveArtifacts in a try/catch block and pass contextConfig."
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

  assert.match(
    runnerText,
    /artifact_capture_error_record_error/,
    "Runner must preserve artifact-error-record write failures as internal evidence."
  );

  assert.match(
    runnerText,
    /evidence_screenshot_metadata_path:\s*artifactPaths\.metadataPath/,
    "Runner must preserve Capture v2 screenshot metadata path as internal evidence."
  );

  assert.match(
    runnerText,
    /evidence_screenshot_manifest_path:\s*artifactPaths\.manifestPath/,
    "Runner must preserve Capture v2 screenshot manifest path as internal evidence."
  );

  assert.match(
    runnerText,
    /evidence_element_geometry_path:\s*artifactPaths\.elementGeometryPath/,
    "Runner must preserve Capture v2 element geometry path as internal evidence."
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

test("Capture v2 regression: runner installs URL safety on the actual per-run context", () => {
  const runnerText = readRunnerSource();

  assert.match(
    runnerText,
    /await\s+installRequestSafetyRoutes\(context,\s*\{\s*allowFileProtocol\s*\}\);\s*const page = await context\.newPage\(\);/,
    "Runner must install route-level URL safety before creating the page in the per-run context."
  );

  assert.match(
    runnerText,
    /await\s+assertUrlMayBeFetched\(BASE_URL,\s*\{\s*allowFileProtocol\s*\}\);/,
    "Runner must keep early URL safety before Playwright launch."
  );

  assert.match(
    runnerText,
    /deviceScaleFactor:\s*contextConfig\.deviceScaleFactor/,
    "Runner must preserve locked context profile DPR instead of forcing a global DPR."
  );
});
