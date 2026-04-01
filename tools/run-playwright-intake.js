"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
  devices
} = require("playwright");
const {
  parseComplaintText
} = require("../src/intake/parse-complaint-text.js");
const {
  detectEnvironmentChallenge
} = require("../src/intake/browser-challenge.js");
const {
  OUTCOME_LABEL
} = require("../src/intake/run-record.js");
const {
  runFamily1Probe,
  runFamily2Probe,
  runFamily3Probe
} = require("../src/intake/probes/index.js");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT_DIR = path.join(ROOT, "tmp", "playwright-intake");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function writeJson(jsonPath, data) {
  ensureDir(path.dirname(jsonPath));
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

function safeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "run-unit";
}

function pickFamilyRunner(familyId) {
  if (familyId === "family_1_structural_integrity") {
    return runFamily1Probe;
  }

  if (familyId === "family_2_form_input_assistance") {
    return runFamily2Probe;
  }

  if (familyId === "family_3_form_label_semantics") {
    return runFamily3Probe;
  }

  return null;
}

function buildProbeInput(payload, runUnit) {
  return Object.freeze({
    matter_id: payload.matter_id || "",
    matter_scope: payload.matter_scope || "",
    run_unit_id: runUnit.run_unit_id || runUnit.rununitid || "",
    complaint_group_anchor_id:
      runUnit.complaint_group_anchor_id || runUnit.complaintgroupanchorid || "",
    family_id: runUnit.family_id || "",
    asserted_condition_text:
      runUnit.asserted_condition_text || runUnit.assertedconditiontext || "",
    target_url: runUnit.target_url || payload.base_url || "",
    target_page_hint: runUnit.target_page_hint || "",
    target_element_hint: runUnit.target_element_hint || "",
    baseline_scope: runUnit.baseline_scope || payload.matter_scope || ""
  });
}

async function createContext(browser, baseline) {
  if (baseline === "mobile") {
    return browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
  }

  return browser.newContext({
    viewport: { width: 1366, height: 900 }
  });
}

async function runSingleProbe(browser, payload, runUnit, baseline) {
  const runner = pickFamilyRunner(runUnit.family_id);
  if (!runner) {
    return Object.freeze({
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "No family probe is registered for the supplied family id.",
      evidence: Object.freeze({
        family_id: runUnit.family_id || "",
        asserted_condition_text:
          runUnit.asserted_condition_text || runUnit.assertedconditiontext || ""
      })
    });
  }

  const context = await createContext(browser, baseline);
  const page = await context.newPage();

  try {
    const probeInput = buildProbeInput(payload, runUnit);
    return await runner(page, probeInput, {
      base_url: payload.base_url || "",
      detectEnvironmentChallenge
    });
  } finally {
    await context.close();
  }
}

function buildResultRecord(runUnit, baseline, result) {
  return Object.freeze({
    run_unit_id: runUnit.run_unit_id || runUnit.rununitid || "",
    family_id: runUnit.family_id || "",
    baseline,
    asserted_condition_text:
      runUnit.asserted_condition_text || runUnit.assertedconditiontext || "",
    outcome_label: result.outcome_label || "",
    constraint_class: result.constraint_class || "",
    mechanical_note: result.mechanical_note || "",
    evidence: result.evidence || {}
  });
}

async function main() {
  const jsonPath = process.argv[2];
  const outputDir = process.argv[3] || DEFAULT_OUTPUT_DIR;

  if (!jsonPath) {
    throw new Error("USAGE: node tools/run-playwright-intake.js <matter.json> [outputDir]");
  }

  const payload = readJson(path.resolve(jsonPath));
  const parsed = parseComplaintText(payload.complaint_text || "");
  const runUnits = Array.isArray(parsed.run_units) ? parsed.run_units : [];

  ensureDir(outputDir);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const runUnit of runUnits) {
      const baselines = Array.isArray(runUnit.baselines) && runUnit.baselines.length > 0
        ? runUnit.baselines
        : ["desktop"];

      for (const baseline of baselines) {
        const result = await runSingleProbe(browser, payload, runUnit, baseline);
        results.push(buildResultRecord(runUnit, baseline, result));
      }
    }
  } finally {
    await browser.close();
  }

  writeJson(path.join(outputDir, "playwright-results.json"), {
    matter_id: payload.matter_id || "",
    run_units: runUnits.length,
    results
  });

  const summary = results.reduce(
    (acc, item) => {
      const key = item.outcome_label || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  writeJson(path.join(outputDir, "playwright-summary.json"), summary);

  process.stdout.write(
    JSON.stringify(
      {
        output_dir: outputDir,
        result_count: results.length,
        summary
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});