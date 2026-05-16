"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FORBIDDEN_RUNTIME_NOTE = "No Playwright probe was implemented for this asserted condition.";

function normalizeSlash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function resolveRepoRoot(argv = process.argv) {
  const marker = "--repo-root";
  const index = argv.indexOf(marker);
  if (index === -1) {
    return process.cwd();
  }

  const value = argv[index + 1];
  if (!value) {
    throw new Error("Missing value for --repo-root");
  }

  return path.resolve(value);
}

function readText(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Required file missing: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function readJson(repoRoot, relativePath) {
  return JSON.parse(readText(repoRoot, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const output = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          stack.push(fullPath);
        }
      } else if (entry.isFile()) {
        output.push(fullPath);
      }
    }
  }

  return output.sort();
}

function listNodeTestFiles(repoRoot) {
  const testsDir = path.join(repoRoot, "tests");
  return walkFiles(testsDir)
    .filter((filePath) => /\.(test|spec)\.js$/.test(path.basename(filePath)))
    .map((filePath) => normalizeSlash(path.relative(repoRoot, filePath)))
    .sort();
}

function validateScorecardObject(scorecard) {
  assert(scorecard && typeof scorecard === "object" && !Array.isArray(scorecard), "completion scorecard must be an object");
  assert(scorecard.completion_claim_permitted === false, "completion_claim_permitted must remain false while LIM-003/LIM-005 are open");
  assert(scorecard.node_test_status === "pass", "scorecard must record passing node_test_status");
  assert(scorecard.node_test_exit_code === 0, "scorecard must record node_test_exit_code 0");
  assert(Number(scorecard.node_test_file_count) >= 25, "scorecard must record at least 25 Node test files after LIM-004 hardening");

  const openBlockers = Array.isArray(scorecard.open_blockers) ? scorecard.open_blockers : [];
  const resolvedBlockers = Array.isArray(scorecard.resolved_blockers) ? scorecard.resolved_blockers : [];

  const openIds = new Set(openBlockers.map((item) => item && item.blocker_id).filter(Boolean));
  const resolvedIds = new Set(resolvedBlockers.map((item) => item && item.blocker_id).filter(Boolean));

  assert(openIds.has("BLOCK-LIM-003"), "BLOCK-LIM-003 must remain open until final package closure");
  assert(openIds.has("BLOCK-LIM-005"), "BLOCK-LIM-005 must remain open until CI guardrails are merged and scored");
  assert(!openIds.has("BLOCK-LIM-004"), "BLOCK-LIM-004 must not remain open after PR #51 and PR #52");
  assert(resolvedIds.has("BLOCK-LIM-004"), "BLOCK-LIM-004 must be listed as resolved");
  assert(scorecard.runtime_hardening_status === "lim_004_runtime_fail_closed_resolved", "scorecard must record LIM-004 runtime hardening as resolved");

  return true;
}

function assertNoForbiddenRuntimeFallback(repoRoot) {
  const runtimePaths = [
    "tools/run-playwright-intake.js",
    "src/intake/families/family2.probe.js"
  ];

  for (const relativePath of runtimePaths) {
    const text = readText(repoRoot, relativePath);
    assert(!text.includes(FORBIDDEN_RUNTIME_NOTE), `forbidden no-probe mechanical note remains in runtime path: ${relativePath}`);
  }

  const runnerText = readText(repoRoot, "tools/run-playwright-intake.js");
  assert(runnerText.includes("UNSUPPORTED_PROBE_FAMILY_REACHED_RUNTIME"), "runner missing UNSUPPORTED_PROBE_FAMILY_REACHED_RUNTIME guard");

  const family2Text = readText(repoRoot, "src/intake/families/family2.probe.js");
  assert(family2Text.includes("FAMILY2_PROBE_IMPLEMENTATION_MISSING"), "family2 probe missing FAMILY2_PROBE_IMPLEMENTATION_MISSING guard");

  return true;
}

function assertAppendixF(repoRoot) {
  const appendix = readText(repoRoot, "delivery_artifacts/intake/limitations_appendix_f.md");

  assert(appendix.includes("### LIM-004"), "Appendix F missing LIM-004 section");
  assert(
    appendix.includes("current_state: resolved for runtime fail-closed enforcement in the implemented intake slice"),
    "Appendix F does not mark LIM-004 runtime fail-closed enforcement resolved"
  );
  assert(appendix.includes("### LIM-005"), "Appendix F missing LIM-005 section");
  assert(appendix.includes("blocks_completion: true"), "Appendix F must still show an open completion blocker");
  assert(!appendix.includes("why_not_enforced: current implementation includes boundedness and outcome handling, but the general unsupported-probe-family preflight hardening package has not yet been completed"), "Appendix F still contains stale LIM-004 why_not_enforced text");

  return true;
}

function assertTraceabilityResolution(repoRoot) {
  readText(repoRoot, "delivery_artifacts/intake/traceability_matrix.csv");
  const addendum = readText(repoRoot, "delivery_artifacts/intake/traceability_lim004_resolution_addendum.md");

  const normalizedAddendum = addendum
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  assert(
    /`?LIM-004`?\s+no longer blocks completion for runtime fail-closed unsupported probe coverage/i.test(normalizedAddendum),
    "LIM-004 traceability addendum missing resolution rule"
  );
  assert(normalizedAddendum.includes("UNSUPPORTED_PROBE_FAMILY_REACHED_RUNTIME"), "LIM-004 addendum missing runner guard evidence");
  assert(normalizedAddendum.includes("FAMILY2_PROBE_IMPLEMENTATION_MISSING"), "LIM-004 addendum missing Family 2 guard evidence");

  return true;
}

function assertTemplateSpec(repoRoot) {
  const templateValidator = require(path.join(repoRoot, "src", "intake", "template-validator.js"));
  const spec = templateValidator.loadTemplateSpec(repoRoot);
  templateValidator.validateTemplateSpec(spec);
  return true;
}

function assertContextProfiles(repoRoot) {
  const { CONTEXT_PROFILES, CONTEXT_ID, SPEC_VERSION } = require(path.join(repoRoot, "src", "intake", "context-profiles.js"));

  assert(SPEC_VERSION === "L3-v8", "context profile spec version drifted");

  const desktop = CONTEXT_PROFILES[CONTEXT_ID.DESKTOP_BASELINE];
  const mobile = CONTEXT_PROFILES[CONTEXT_ID.MOBILE_BASELINE];

  assert(desktop.viewport_width === 1366, "desktop viewport width drifted");
  assert(desktop.viewport_height === 900, "desktop viewport height drifted");
  assert(desktop.zoom === 100, "desktop zoom drifted");
  assert(desktop.device_scale_factor === 1, "desktop DPR drifted");
  assert(desktop.orientation === "landscape", "desktop orientation drifted");
  assert(desktop.is_mobile === false, "desktop mobile flag drifted");
  assert(desktop.has_touch === false, "desktop touch flag drifted");

  assert(mobile.viewport_width === 393, "mobile viewport width drifted");
  assert(mobile.viewport_height === 852, "mobile viewport height drifted");
  assert(mobile.zoom === 100, "mobile zoom drifted");
  assert(mobile.device_scale_factor === 1, "mobile DPR drifted");
  assert(mobile.orientation === "portrait", "mobile orientation drifted");
  assert(mobile.is_mobile === true, "mobile mobile flag drifted");
  assert(mobile.has_touch === true, "mobile touch flag drifted");

  return true;
}

function assertExternalOutputLeakageTests(repoRoot) {
  const validatorText = readText(repoRoot, "src/intake/external-output-validator.js");
  const testText = readText(repoRoot, "tests/external-output-validator.test.js");

  const requiredValidatorMarkers = [
    "FORBIDDEN_LANGUAGE_TERMS",
    "hasForbiddenDisclosure",
    "hasForbiddenLanguage",
    "hasIndirectSignalingExactPhrase",
    "requiresFunctionalEquivalentReview",
    "requiresAntiHedgingReview",
    "assertExternalOutputMayBeReleased",
    "EXTERNAL_OUTPUT_VALIDATION_FAILED"
  ];

  for (const marker of requiredValidatorMarkers) {
    assert(validatorText.includes(marker), `external output validator missing marker: ${marker}`);
  }

  const requiredForbiddenTerms = [
    "compliant",
    "non-compliant",
    "violation",
    "audit",
    "remediation",
    "certification",
    "guarantee"
  ];

  for (const term of requiredForbiddenTerms) {
    assert(validatorText.toLowerCase().includes(term), `external output validator missing forbidden term: ${term}`);
  }

  const requiredTestMarkers = [
    "forbidden language in matter_level_note fails validation",
    "indirect signaling phrase in matter_level_note fails validation",
    "functional-equivalent signaling in matter_level_note requires reviewer clearance",
    "anti-hedging language in matter_level_note requires reviewer clearance",
    "EXTERNAL_OUTPUT_VALIDATION_FAILED",
    "FUNCTIONAL_EQUIVALENT_REVIEW_CLEARANCE_REQUIRED",
    "ANTI_HEDGING_REVIEW_CLEARANCE_REQUIRED"
  ];

  for (const marker of requiredTestMarkers) {
    assert(testText.includes(marker), `external output tests missing marker: ${marker}`);
  }

  return true;
}

function assertWorkflow(repoRoot) {
  const workflow = readText(repoRoot, ".github/workflows/ci.yml");

  assert(workflow.includes("node tools/ci/guardrails_check.js"), "CI workflow must run guardrails_check.js");
  assert(workflow.includes("node --test"), "CI workflow must run Node test suite");
  assert(workflow.includes("pull_request:"), "CI workflow must run on pull_request");
  assert(workflow.includes("push:"), "CI workflow must run on push");

  return true;
}

function assertTestInventory(repoRoot) {
  const testFiles = listNodeTestFiles(repoRoot);

  assert(testFiles.length >= 25, `expected at least 25 Node test files, found ${testFiles.length}`);

  const requiredTests = [
    "tests/hardening/preflight-coverage-check.test.js",
    "tests/playwright-intake-fail-closed-routing.test.js",
    "tests/playwright-intake-synthetic-payload.test.js",
    "tests/external-output-validator.test.js",
    "tests/context-profiles-manifest.test.js",
    "tests/intake-template-validator.test.js"
  ];

  for (const relativePath of requiredTests) {
    assert(testFiles.includes(relativePath), `required test file missing from inventory: ${relativePath}`);
  }

  return true;
}

function runAll(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const write = options.write || ((line) => process.stdout.write(`${line}\n`));

  const checks = [
    ["required Node test inventory", () => assertTestInventory(repoRoot)],
    ["template spec validation", () => assertTemplateSpec(repoRoot)],
    ["context profile drift", () => assertContextProfiles(repoRoot)],
    ["external output leakage coverage", () => assertExternalOutputLeakageTests(repoRoot)],
    ["runtime unsupported coverage fail-closed markers", () => assertNoForbiddenRuntimeFallback(repoRoot)],
    ["Appendix F blocker state", () => assertAppendixF(repoRoot)],
    ["completion scorecard blocker state", () => validateScorecardObject(readJson(repoRoot, "delivery_artifacts/intake/audit/completion_scorecard.json"))],
    ["LIM-004 traceability addendum", () => assertTraceabilityResolution(repoRoot)],
    ["GitHub Actions workflow", () => assertWorkflow(repoRoot)]
  ];

  const passed = [];

  for (const [name, fn] of checks) {
    fn();
    passed.push(name);
    write(`ok - ${name}`);
  }

  return {
    ok: true,
    passed
  };
}

function main() {
  try {
    const repoRoot = resolveRepoRoot(process.argv);
    runAll({ repoRoot });
    process.stdout.write("Guardrails passed.\n");
  } catch (error) {
    process.stderr.write(`Guardrails failed: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = Object.freeze({
  FORBIDDEN_RUNTIME_NOTE,
  listNodeTestFiles,
  validateScorecardObject,
  assertNoForbiddenRuntimeFallback,
  assertAppendixF,
  assertTraceabilityResolution,
  assertTemplateSpec,
  assertContextProfiles,
  assertExternalOutputLeakageTests,
  assertWorkflow,
  assertTestInventory,
  runAll
});
