"use strict";

const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = { payloadPath: "", preflightPath: "", outDir: "", help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--payload") {
      index += 1;
      args.payloadPath = argv[index] ? path.resolve(argv[index]) : "";
    } else if (value === "--preflight") {
      index += 1;
      args.preflightPath = argv[index] ? path.resolve(argv[index]) : "";
    } else if (value === "--out") {
      index += 1;
      args.outDir = argv[index] ? path.resolve(argv[index]) : "";
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else {
      fail("UNKNOWN_ARGUMENT: " + value);
    }
  }

  return args;
}

function usage() {
  console.log("");
  console.log("Usage:");
  console.log("  node tools/create-supported-hardening-payloads.js --payload <payload.json> --preflight <preflight-classification.json> --out <dir>");
  console.log("");
  console.log("Creates one hardening payload per supported run unit.");
  console.log("This does not bypass production sufficiency stop rules.");
  console.log("");
}

function readJson(filePath, label) {
  if (!filePath) fail(label + "_PATH_REQUIRED");
  if (!fs.existsSync(filePath)) fail(label + "_NOT_FOUND: " + filePath);

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(label + "_JSON_PARSE_FAILED: " + error.message);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(label + "_ARRAY_REQUIRED");
  return value;
}

function safeFilePart(value) {
  const safe = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  return safe || "item";
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("PAYLOAD_OBJECT_REQUIRED");
  if (!payload.matter_id) fail("PAYLOAD_MATTER_ID_REQUIRED");
  if (!payload.source_case || !payload.source_case.site) fail("PAYLOAD_SOURCE_CASE_SITE_REQUIRED");

  assertArray(payload.run_units, "PAYLOAD_RUN_UNITS");
  assertArray(payload.sequencing_plan, "PAYLOAD_SEQUENCING_PLAN");
}

function validatePreflight(preflight, payload) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) fail("PREFLIGHT_OBJECT_REQUIRED");

  if (String(preflight.preflight_status || "") !== "unsupported_current_coverage") {
    fail("PREFLIGHT_STATUS_UNEXPECTED: " + String(preflight.preflight_status || ""));
  }

  if (String(preflight.matter_id || "") !== String(payload.matter_id || "")) {
    fail("PREFLIGHT_MATTER_ID_MISMATCH: " + String(preflight.matter_id || "") + " !== " + String(payload.matter_id || ""));
  }

  assertArray(preflight.run_unit_coverage, "PREFLIGHT_RUN_UNIT_COVERAGE");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  const payload = readJson(args.payloadPath, "PAYLOAD");
  const preflight = readJson(args.preflightPath, "PREFLIGHT");

  if (!args.outDir) fail("OUT_DIR_REQUIRED");

  validatePayload(payload);
  validatePreflight(preflight, payload);

  const coverage = preflight.run_unit_coverage;
  const supportedRows = coverage.filter((row) => String(row.coverage_status || "") === "supported_probe_family");
  const unsupportedRows = coverage.filter((row) => String(row.coverage_status || "") === "unsupported_probe_family");

  if (supportedRows.length === 0) fail("NO_SUPPORTED_RUN_UNITS_FOUND");

  const runUnitsById = new Map(payload.run_units.map((runUnit) => [String(runUnit.rununitid || ""), runUnit]));

  fs.mkdirSync(args.outDir, { recursive: true });

  const generatedPayloads = [];

  for (const row of supportedRows) {
    const runUnitId = String(row.run_unit_id || "").trim();
    if (!runUnitId) fail("SUPPORTED_ROW_RUN_UNIT_ID_REQUIRED");

    const runUnit = runUnitsById.get(runUnitId);
    if (!runUnit) fail("SUPPORTED_RUN_UNIT_NOT_FOUND_IN_PAYLOAD: " + runUnitId);

    const sequencingPlan = payload.sequencing_plan.filter((step) => String(step.run_unit_id || "") === runUnitId);
    if (sequencingPlan.length === 0) fail("SUPPORTED_RUN_UNIT_HAS_NO_SEQUENCING_STEPS: " + runUnitId);

    const hardeningMatterId = String(payload.matter_id) + "_HARDENING_" + safeFilePart(runUnitId).toUpperCase();

    const hardeningPayload = {
      matter_id: hardeningMatterId,
      matter_scope: payload.matter_scope,
      source_case: cloneJson(payload.source_case),
      run_units: [cloneJson(runUnit)],
      sequencing_plan: cloneJson(sequencingPlan),
      hardening_metadata: {
        hardening_payload_version: "AFDM_SUPPORTED_RUN_UNIT_HARDENING_PAYLOAD_V1",
        source_matter_id: payload.matter_id,
        source_run_unit_id: runUnitId,
        supported_probe_family: String(row.supported_probe_family || ""),
        source_coverage_status: String(row.coverage_status || ""),
        generation_basis: "preflight_supported_probe_family_only",
        production_stop_rules_bypassed: false,
        execution_model: "one_supported_run_unit_per_payload_using_normal_batch_intake",
        external_use_boundary: "internal_hardening_only_not_production_intake"
      }
    };

    const fileName = safeFilePart(hardeningMatterId) + ".json";
    const outPath = path.join(args.outDir, fileName);
    fs.writeFileSync(outPath, JSON.stringify(hardeningPayload, null, 2) + "\n", "utf8");

    generatedPayloads.push({
      run_unit_id: runUnitId,
      supported_probe_family: String(row.supported_probe_family || ""),
      matter_id: hardeningMatterId,
      payload_file: outPath,
      sequencing_step_count: sequencingPlan.length
    });
  }

  const manifest = {
    manifest_version: "AFDM_SUPPORTED_RUN_UNIT_HARDENING_PAYLOADS_V1",
    generated_at_utc: new Date().toISOString(),
    source_payload: args.payloadPath,
    source_preflight: args.preflightPath,
    output_dir: args.outDir,
    source_matter_id: payload.matter_id,
    supported_count: supportedRows.length,
    unsupported_count: unsupportedRows.length,
    generated_payload_count: generatedPayloads.length,
    execution_model: "one_supported_run_unit_per_payload_using_normal_batch_intake",
    production_stop_rules_bypassed: false,
    external_use_boundary: "internal_hardening_only_not_production_intake",
    generated_payloads: generatedPayloads,
    unsupported_run_units: unsupportedRows.map((row) => ({
      run_unit_id: row.run_unit_id,
      asserted_condition_text: row.asserted_condition_text,
      coverage_status: row.coverage_status,
      classification_basis: row.classification_basis
    }))
  };

  const manifestPath = path.join(args.outDir, "_supported_hardening_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log("");
  console.log("Supported hardening payload generation complete.");
  console.log("Source matter: " + payload.matter_id);
  console.log("Supported run units: " + supportedRows.length);
  console.log("Unsupported run units: " + unsupportedRows.length);
  console.log("Generated payloads: " + generatedPayloads.length);
  console.log("Output: " + args.outDir);
  console.log("Manifest: " + manifestPath);
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Supported hardening payload generation failed.");
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
}
