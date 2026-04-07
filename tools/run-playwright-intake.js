"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");

const {
  CONTEXT_ID,
  OUTCOME_LABEL,
  CONSTRAINT_CLASS,
  createRunRecord
} = require("../src/intake/run-record.js");

const {
  evaluateMatterProgress,
  appendRunIfPermitted
} = require("../src/intake/sufficiency-stop.js");

const {
  routeDetermination
} = require("../src/intake/determination-router.js");

const {
  resolveProbe
} = require("../src/intake/probes/index.js");

const {
  assertAllowedUrl,
  buildProbeInputFromPayload,
  validateProbeResult
} = require("../src/intake/probes/probe-contract.js");

const {
  renderExternalOutputText,
  createExternalOutputValidationRecord,
  assertExternalOutputMayBeReleased
} = require("../src/intake/external-output-validator.js");

function usage() {
  console.error("Usage: node tools/run-playwright-intake.js <payload-json-path> <output-dir>");
  process.exit(1);
}

if (process.argv.length < 4) {
  usage();
}

const payloadPath = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);

if (!fs.existsSync(payloadPath)) {
  throw new Error(`PAYLOAD_NOT_FOUND: ${payloadPath}`);
}

fs.mkdirSync(outDir, { recursive: true });
const artifactsDir = path.join(outDir, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const BASE_URL = assertAllowedUrl(
  payload && payload.source_case && payload.source_case.site,
  "PAYLOAD_SOURCE_CASE_SITE"
);

if (!BASE_URL) {
  throw new Error("PAYLOAD_SOURCE_CASE_SITE_REQUIRED");
}

const CONTEXT_CONFIG = {
  [CONTEXT_ID.DESKTOP_BASELINE]: {
    viewport: { width: 1366, height: 900 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1
  },
  [CONTEXT_ID.MOBILE_BASELINE]: {
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1
  }
};

function nowLocal() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "step";
}

function sanitizeFilePart(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveArtifacts(page, prefix) {
  const pngPath = path.join(artifactsDir, prefix + ".png");
  const htmlPath = path.join(artifactsDir, prefix + ".html");
  await page.screenshot({ path: pngPath, fullPage: true });
  fs.writeFileSync(htmlPath, await page.content(), "utf8");
  return { pngPath, htmlPath };
}

// BEGIN INTERNAL PREFLIGHT COVERAGE GATE
function runUnsupportedCoveragePreflight(payloadPath, outDir) {
  const scriptPath = path.resolve(__dirname, "..", "scripts", "hardening", "preflight-coverage-check.js");

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`PREFLIGHT_DEPENDENCY_MISSING: ${scriptPath}`);
  }

  const result = spawnSync(process.execPath, [scriptPath, "--matter-file", payloadPath], {
    encoding: "utf8",
    timeout: 30000
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status !== "number") {
    throw new Error("PREFLIGHT_EXECUTION_FAILED: missing exit status");
  }

  if (result.status === 0) {
    return {
      blocked: false,
      exitCode: 0,
      classification: null,
      artifactPath: null
    };
  }

  if (result.status === 2) {
    const stdoutText = String(result.stdout || "").trim();
    if (!stdoutText) {
      throw new Error("PREFLIGHT_OUTPUT_PARSE_FAILED: empty stdout for blocked matter");
    }

    let classification;
    try {
      classification = JSON.parse(stdoutText);
    } catch (error) {
      throw new Error(`PREFLIGHT_OUTPUT_PARSE_FAILED: ${error.message}`);
    }

    if (!classification || classification.preflight_status !== "unsupported_current_coverage") {
      throw new Error("PREFLIGHT_OUTPUT_INVALID: blocked result did not return unsupported_current_coverage");
    }

    const artifactPath = path.join(outDir, "preflight-classification.json");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(classification, null, 2), "utf8");

    return {
      blocked: true,
      exitCode: 2,
      classification,
      artifactPath
    };
  }

  const stderrText = String(result.stderr || "").trim();
  const stdoutText = String(result.stdout || "").trim();
  throw new Error(
    `PREFLIGHT_EXECUTION_FAILED: exit=${result.status}; stderr=${stderrText}; stdout=${stdoutText}`
  );
}
// END INTERNAL PREFLIGHT COVERAGE GATE

(async () => {
  // BEGIN INTERNAL PREFLIGHT COVERAGE GATE INVOCATION
  const preflight = runUnsupportedCoveragePreflight(payloadPath, outDir);
  if (preflight.blocked) {
    console.log("Preflight classification: unsupported_current_coverage");
    console.log(`Matter: ${preflight.classification.matter_id}`);
    console.log(`Artifact: ${preflight.artifactPath}`);
    process.exitCode = preflight.exitCode;
    return;
  }
  // END INTERNAL PREFLIGHT COVERAGE GATE INVOCATION
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  let runRecords = [];

  try {
    for (let i = 0; i < payload.sequencing_plan.length; i += 1) {
      const progressBefore = evaluateMatterProgress(runRecords);
      if (progressBefore.intake_closed) {
        console.log(`Stop reached before step ${i + 1}: ${progressBefore.stop_basis}`);
        break;
      }

      const step = payload.sequencing_plan[i];
      const runUnit = payload.run_units.find((ru) => ru.rununitid === step.run_unit_id);
      if (!runUnit) {
        throw new Error(`RUN_UNIT_NOT_FOUND: ${step.run_unit_id}`);
      }

      const contextConfig = CONTEXT_CONFIG[step.context_id];
      if (!contextConfig) {
        throw new Error(`UNKNOWN_CONTEXT_ID: ${step.context_id}`);
      }

      const prefix = [
        String(i + 1).padStart(3, "0"),
        sanitizeFilePart(step.context_id),
        sanitizeFilePart(runUnit.rununitid),
        sanitizeFilePart(slug(runUnit.assertedconditiontext))
      ].join("_");

      const runStartLocal = nowLocal();
      const runStartEpoch = nowMs();

      const context = await browser.newContext({
        viewport: contextConfig.viewport,
        isMobile: contextConfig.isMobile,
        hasTouch: contextConfig.hasTouch,
        deviceScaleFactor: contextConfig.deviceScaleFactor
      });

      const page = await context.newPage();

      let probeResult;
      try {
        const resolved = resolveProbe(runUnit.assertedconditiontext);

        if (!resolved) {
          probeResult = validateProbeResult({
            outcome_label: OUTCOME_LABEL.INSUFFICIENT,
            constraint_class: "",
            mechanical_note: "No Playwright probe was implemented for this asserted condition.",
            evidence: {}
          });
        } else {
          const probeRequest = buildProbeInputFromPayload(payload, runUnit, BASE_URL);
          probeResult = validateProbeResult(
            await resolved.run(page, probeRequest, {
              base_url: BASE_URL,
              context_id: step.context_id
            })
          );
        }
      } catch (error) {
        probeResult = validateProbeResult({
          outcome_label: OUTCOME_LABEL.CONSTRAINED,
          constraint_class: CONSTRAINT_CLASS.HARDCRASH,
          mechanical_note: "Playwright execution failed during bounded step execution.",
          evidence: { error: String((error && error.stack) || error) }
        });
      }

      const artifactPaths = await saveArtifacts(page, prefix);

      const runEndLocal = nowLocal();
      const runEndEpoch = nowMs();

      const nextRunRecord = createRunRecord({
        runIndex: runRecords.length + 1,
        matter_id: payload.matter_id,
        complaint_group_anchor_id: runUnit.complaintgroupanchorid,
        run_unit_id: runUnit.rununitid,
        context_id: step.context_id,
        outcome_label: probeResult.outcome_label,
        constraint_class: probeResult.constraint_class || "",
        mechanical_note: probeResult.mechanical_note || "",
        run_start_local: runStartLocal,
        run_start_epoch_ms: runStartEpoch,
        run_end_local: runEndLocal,
        run_end_epoch_ms: runEndEpoch
      });

      const appendResult = appendRunIfPermitted(runRecords, nextRunRecord);
      runRecords = appendResult.run_records;

      observations.push({
        step_index: i + 1,
        matter_id: payload.matter_id,
        complaint_group_anchor_id: runUnit.complaintgroupanchorid,
        run_unit_id: runUnit.rununitid,
        asserted_condition_text: runUnit.assertedconditiontext,
        context_id: step.context_id,
        operator_outcome_label: probeResult.outcome_label,
        operator_constraint_class: probeResult.constraint_class || "",
        operator_mechanical_note: probeResult.mechanical_note || "",
        operator_notes_internal_only: JSON.stringify(probeResult.evidence || {}, null, 2),
        evidence_screenshot_path: artifactPaths.pngPath,
        evidence_html_path: artifactPaths.htmlPath,
        run_start_local: runStartLocal,
        run_start_epoch_ms: runStartEpoch,
        run_end_local: runEndLocal,
        run_end_epoch_ms: runEndEpoch
      });

      await context.close();

      console.log(
        `[${runRecords.length}] ${step.context_id} ${runUnit.rununitid} -> ${probeResult.outcome_label} ${probeResult.constraint_class || ""} | stop_basis=${appendResult.progress.stop_basis || "not_stopped"}`
      );
    }
  } finally {
    await browser.close();
  }

  const now = new Date();
  const determination = routeDetermination({
    matter_id: payload.matter_id,
    matter_scope: payload.matter_scope,
    run_records: runRecords,
    generated_at_local: now.toISOString(),
    generated_at_epoch_ms: now.getTime()
  });

  const renderedExternalOutputText = renderExternalOutputText(determination);
  const externalOutputValidationRecord = createExternalOutputValidationRecord({
    matter_id: payload.matter_id,
    determination_record: determination,
    output_text: renderedExternalOutputText
  });

  assertExternalOutputMayBeReleased(externalOutputValidationRecord);

  const summary = {
    matter_id: payload.matter_id,
    matter_scope: payload.matter_scope,
    total_planned_steps: payload.sequencing_plan.length,
    executed_steps: observations.length,
    run_count: runRecords.length,
    progress: evaluateMatterProgress(runRecords),
    observed_as_asserted: observations.filter((r) => r.operator_outcome_label === OUTCOME_LABEL.OBSERVED).length,
    not_observed_as_asserted: observations.filter((r) => r.operator_outcome_label === OUTCOME_LABEL.NOT_OBSERVED).length,
    constrained: observations.filter((r) => r.operator_outcome_label === OUTCOME_LABEL.CONSTRAINED).length,
    insufficient: observations.filter((r) => r.operator_outcome_label === OUTCOME_LABEL.INSUFFICIENT).length,
    determination_template: determination.determination_template
  };

  fs.writeFileSync(path.join(outDir, "playwright-observations.json"), JSON.stringify(observations, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "run-records.json"), JSON.stringify(runRecords, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "determination-record.json"), JSON.stringify(determination, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "determination-output.txt"), renderedExternalOutputText, "utf8");
  fs.writeFileSync(path.join(outDir, "external-output-validation-record.json"), JSON.stringify(externalOutputValidationRecord, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "playwright-summary.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log("");
  console.log("Determination template:", determination.determination_template);
  console.log("Executed steps:", observations.length);
  console.log("Run count:", runRecords.length);
  console.log("Stop basis:", summary.progress.stop_basis || "(not stopped)");
})();