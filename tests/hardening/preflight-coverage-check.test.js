"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "hardening", "preflight-coverage-check.js");

function runNode(args) {
  return childProcess.spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

test("known unsupported hardening matter is classified and stopped", () => {
  const result = runNode(["--matter", "AF-HARDEN-001-MANE-SKIP"]);

  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.matter_id, "AF-HARDEN-001-MANE-SKIP");
  assert.equal(payload.preflight_status, "unsupported_current_coverage");
  assert.equal(payload.production_intake_runnable, false);
  assert.equal(payload.classification_basis, "observed_runtime_no_implemented_probe");
  assert.equal(payload.action, "classify_and_stop");
  assert.equal(payload.negative_hardening_fixture, true);
  assert.match(payload.observed_runtime_mechanical_note, /No Playwright probe was implemented/i);
});

test("unknown matter does not get stamped supported and does not block by registry", () => {
  const result = runNode(["--matter", "AF-HARDEN-999-UNKNOWN"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.matter_id, "AF-HARDEN-999-UNKNOWN");
  assert.equal(payload.preflight_status, "no_registry_block");
  assert.equal(payload.production_intake_runnable, null);
  assert.equal(payload.classification_basis, "no_observed_runtime_registry_block");
  assert.equal(payload.action, "allow_existing_process_to_decide");
});

test("text matter-file input resolves and blocks known unsupported matter", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-preflight-text-"));
  try {
    const matterFilePath = path.join(tempDir, "matter-id.txt");
    fs.writeFileSync(matterFilePath, "AF-HARDEN-004-PRECIOUS-FORMS\n", "utf8");

    const result = runNode(["--matter-file", matterFilePath]);

    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.matter_id, "AF-HARDEN-004-PRECIOUS-FORMS");
    assert.equal(payload.preflight_status, "unsupported_current_coverage");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("json matter-file input resolves and blocks known unsupported matter", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-preflight-json-"));
  try {
    const matterFilePath = path.join(tempDir, "matter.json");
    fs.writeFileSync(
      matterFilePath,
      JSON.stringify({ matter_id: "AF-HARDEN-002-MANE-IMGLINKS" }, null, 2),
      "utf8"
    );

    const result = runNode(["--matter-file", matterFilePath]);

    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.matter_id, "AF-HARDEN-002-MANE-IMGLINKS");
    assert.equal(payload.preflight_status, "unsupported_current_coverage");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("all known unsupported red fixtures are returned as blocked negative hardening proofs", () => {
  const result = runNode(["--all"]);

  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.blocked_count, 4);
  assert.equal(Array.isArray(payload.classifications), true);
  assert.equal(payload.classifications.length, 4);

  for (const item of payload.classifications) {
    assert.equal(item.preflight_status, "unsupported_current_coverage");
    assert.equal(item.production_intake_runnable, false);
    assert.equal(item.negative_hardening_fixture, true);
    assert.equal(item.action, "classify_and_stop");
  }
});
