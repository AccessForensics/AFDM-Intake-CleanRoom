"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const runnerPath = path.join(repoRoot, "tools", "run-playwright-intake.js");

test("runner stops at intake edge for known unsupported current coverage matter", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-runner-preflight-"));
  try {
    const payloadPath = path.join(tempDir, "payload.json");
    const outDir = path.join(tempDir, "out");

    const payload = {
      matter_id: "AF-HARDEN-001-MANE-SKIP",
      matter_scope: "dual",
      source_case: {
        site: "https://heymane.com"
      },
      run_units: [],
      sequencing_plan: []
    };

    fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2), "utf8");

    const result = spawnSync(process.execPath, [runnerPath, payloadPath, outDir], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30000
    });

    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stdout, /Preflight classification: unsupported_current_coverage/);

    const classificationPath = path.join(outDir, "preflight-classification.json");
    assert.equal(fs.existsSync(classificationPath), true);

    const classification = JSON.parse(fs.readFileSync(classificationPath, "utf8"));
    assert.equal(classification.matter_id, "AF-HARDEN-001-MANE-SKIP");
    assert.equal(classification.preflight_status, "unsupported_current_coverage");

    assert.equal(fs.existsSync(path.join(outDir, "run-records.json")), false);
    assert.equal(fs.existsSync(path.join(outDir, "determination-record.json")), false);
    assert.equal(fs.existsSync(path.join(outDir, "determination-output.txt")), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
