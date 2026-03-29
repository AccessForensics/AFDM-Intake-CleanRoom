"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { OUTCOME_LABEL } = require("../src/intake/run-record.js");

const repoRoot = path.resolve(__dirname, "..");
const runnerPath = path.join(repoRoot, "tools", "run-playwright-intake.js");

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function toFileUrl(filePath) {
  return "file:///" + filePath.replace(/\\/g, "/");
}

function makePayload(matterId, assertedConditionText, siteUrl) {
  return {
    matter_id: matterId,
    matter_scope: "dual",
    source_case: { site: siteUrl },
    run_units: [
      {
        rununitid: "RU-001",
        complaintgroupanchorid: "CGA-001",
        assertedconditiontext: assertedConditionText
      }
    ],
    sequencing_plan: [
      {
        run_unit_id: "RU-001",
        context_id: "desktop_baseline"
      }
    ]
  };
}

function runSyntheticPayload(assertedConditionText, html) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-intake-"));
  const htmlPath = path.join(tempRoot, "site.html");
  const payloadPath = path.join(tempRoot, "payload.json");
  const outDir = path.join(tempRoot, "out");

  fs.writeFileSync(htmlPath, html, "utf8");

  const payload = makePayload(
    "AF-TEST-SYNTHETIC-0001",
    assertedConditionText,
    toFileUrl(htmlPath)
  );

  writeJson(payloadPath, payload);

  execFileSync(process.execPath, [runnerPath, payloadPath, outDir], {
    cwd: repoRoot,
    stdio: "pipe"
  });

  const summary = JSON.parse(fs.readFileSync(path.join(outDir, "playwright-summary.json"), "utf8"));
  const observations = JSON.parse(fs.readFileSync(path.join(outDir, "playwright-observations.json"), "utf8"));
  const determination = JSON.parse(fs.readFileSync(path.join(outDir, "determination-record.json"), "utf8"));
  const runRecords = JSON.parse(fs.readFileSync(path.join(outDir, "run-records.json"), "utf8"));

  return {
    tempRoot,
    outDir,
    summary,
    observations,
    determination,
    runRecords
  };
}

test("generic runner routes supported heading allegation through registry and records observed outcome", (t) => {
  const html = `
    <!doctype html>
    <html lang="en">
      <body>
        <h2>Hero</h2>
        <h5>Footer</h5>
      </body>
    </html>
  `;

  const result = runSyntheticPayload("Heading levels were missing", html);

  t.after(() => {
    fs.rmSync(result.tempRoot, { recursive: true, force: true });
  });

  assert.equal(result.summary.executed_steps, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.runRecords.length, 1);

  assert.equal(result.observations[0].operator_outcome_label, OUTCOME_LABEL.OBSERVED);
  assert.equal(result.observations[0].run_unit_id, "RU-001");
  assert.ok(result.runRecords[0].run_start_local);
  assert.ok(result.runRecords[0].run_end_local);

  assert.equal(typeof result.determination.determination_template, "string");
  assert.ok(result.determination.determination_template.length > 0);

  assert.equal(Object.prototype.hasOwnProperty.call(result.determination, "run_start_local"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.determination, "run_end_local"), false);
});

test("generic runner routes unsupported allegation to fail-closed insufficient outcome", (t) => {
  const html = `
    <!doctype html>
    <html lang="en">
      <body>
        <main>Simple content</main>
      </body>
    </html>
  `;

  const result = runSyntheticPayload("Color contrast ratio is below minimum on footer links", html);

  t.after(() => {
    fs.rmSync(result.tempRoot, { recursive: true, force: true });
  });

  assert.equal(result.summary.executed_steps, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.runRecords.length, 1);

  assert.equal(
    result.observations[0].operator_outcome_label,
    OUTCOME_LABEL.INSUFFICIENT
  );
  assert.equal(
    result.observations[0].operator_mechanical_note,
    "No Playwright probe was implemented for this asserted condition."
  );

  assert.equal(typeof result.determination.determination_template, "string");
  assert.ok(result.determination.determination_template.length > 0);
});