"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const toolPath = path.join(repoRoot, "tools", "create-supported-hardening-payloads.js");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("creates one hardening payload per supported run unit without bypassing production stop rules", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-supported-hardening-payloads-"));
  const payloadPath = path.join(tempDir, "payload.json");
  const preflightPath = path.join(tempDir, "preflight-classification.json");
  const outDir = path.join(tempDir, "out");

  const payload = {
    matter_id: "TEST_MATTER",
    matter_scope: "dual",
    source_case: { site: "https://example.test/" },
    run_units: [
      { rununitid: "RU-001", complaintgroupanchorid: "A-001", assertedconditiontext: "Skip to content link was not implemented.", target_url: "https://example.test/" },
      { rununitid: "RU-016", complaintgroupanchorid: "A-016", assertedconditiontext: "Unclear and ambiguous labels for form fields.", target_url: "https://example.test/" },
      { rununitid: "RU-999", complaintgroupanchorid: "A-999", assertedconditiontext: "Unsupported heading hierarchy condition.", target_url: "https://example.test/" }
    ],
    sequencing_plan: [
      { run_unit_id: "RU-001", context_id: "desktop_baseline" },
      { run_unit_id: "RU-001", context_id: "mobile_baseline" },
      { run_unit_id: "RU-016", context_id: "desktop_baseline" },
      { run_unit_id: "RU-016", context_id: "mobile_baseline" },
      { run_unit_id: "RU-999", context_id: "desktop_baseline" },
      { run_unit_id: "RU-999", context_id: "mobile_baseline" }
    ]
  };

  const preflight = {
    matter_id: "TEST_MATTER",
    preflight_status: "unsupported_current_coverage",
    run_unit_coverage: [
      { run_unit_id: "RU-001", asserted_condition_text: "Skip to content link was not implemented.", coverage_status: "supported_probe_family", supported_probe_family: "lawsuit1", classification_basis: "asserted_condition_resolves_to_supported_probe_family" },
      { run_unit_id: "RU-016", asserted_condition_text: "Unclear and ambiguous labels for form fields.", coverage_status: "supported_probe_family", supported_probe_family: "family3", classification_basis: "asserted_condition_resolves_to_supported_probe_family" },
      { run_unit_id: "RU-999", asserted_condition_text: "Unsupported heading hierarchy condition.", coverage_status: "unsupported_probe_family", supported_probe_family: "", classification_basis: "no_supported_probe_family_for_asserted_condition" }
    ]
  };

  writeJson(payloadPath, payload);
  writeJson(preflightPath, preflight);

  execFileSync(process.execPath, [toolPath, "--payload", payloadPath, "--preflight", preflightPath, "--out", outDir], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  const manifest = readJson(path.join(outDir, "_supported_hardening_manifest.json"));
  assert.equal(manifest.manifest_version, "AFDM_SUPPORTED_RUN_UNIT_HARDENING_PAYLOADS_V1");
  assert.equal(manifest.supported_count, 2);
  assert.equal(manifest.unsupported_count, 1);
  assert.equal(manifest.generated_payload_count, 2);
  assert.equal(manifest.production_stop_rules_bypassed, false);
  assert.equal(manifest.external_use_boundary, "internal_hardening_only_not_production_intake");

  const generatedFiles = fs.readdirSync(outDir).filter((name) => name.endsWith(".json") && !name.startsWith("_")).sort();
  assert.deepEqual(generatedFiles, ["TEST_MATTER_HARDENING_RU-001.json", "TEST_MATTER_HARDENING_RU-016.json"]);

  const ru001 = readJson(path.join(outDir, "TEST_MATTER_HARDENING_RU-001.json"));
  const ru016 = readJson(path.join(outDir, "TEST_MATTER_HARDENING_RU-016.json"));

  assert.equal(ru001.matter_id, "TEST_MATTER_HARDENING_RU-001");
  assert.equal(ru001.run_units.length, 1);
  assert.equal(ru001.run_units[0].rununitid, "RU-001");
  assert.deepEqual(ru001.sequencing_plan.map((step) => step.run_unit_id), ["RU-001", "RU-001"]);
  assert.equal(ru001.hardening_metadata.production_stop_rules_bypassed, false);

  assert.equal(ru016.matter_id, "TEST_MATTER_HARDENING_RU-016");
  assert.equal(ru016.run_units.length, 1);
  assert.equal(ru016.run_units[0].rununitid, "RU-016");
  assert.deepEqual(ru016.sequencing_plan.map((step) => step.run_unit_id), ["RU-016", "RU-016"]);
  assert.equal(ru016.hardening_metadata.supported_probe_family, "family3");
});
