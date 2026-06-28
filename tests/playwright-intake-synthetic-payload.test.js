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

function runFixturePayload(payloadPath, outDir) {
  execFileSync(process.execPath, [runnerPath, payloadPath, outDir, "--allow-file-protocol"], {
    cwd: repoRoot,
    stdio: "pipe"
  });
}

function makePayload(matterId, assertedConditionText, siteUrl, runUnitOverrides) {
  return {
    matter_id: matterId,
    matter_scope: "dual",
    source_case: { site: siteUrl },
    run_units: [
      Object.assign({
        rununitid: "RU-001",
        complaintgroupanchorid: "CGA-001",
        assertedconditiontext: assertedConditionText,
        target_url: siteUrl,
        target_page_hint: "",
        target_element_hint: ""
      }, runUnitOverrides || {})
    ],
    sequencing_plan: [
      {
        run_unit_id: "RU-001",
        context_id: "desktop_baseline"
      }
    ]
  };
}

function runSyntheticPayload(assertedConditionText, html, runUnitOverrides) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-intake-"));
  const htmlPath = path.join(tempRoot, "site.html");
  const payloadPath = path.join(tempRoot, "payload.json");
  const outDir = path.join(tempRoot, "out");

  fs.writeFileSync(htmlPath, html, "utf8");

  const payload = makePayload(
    "AF-TEST-SYNTHETIC-0001",
    assertedConditionText,
    toFileUrl(htmlPath),
    runUnitOverrides
  );

  writeJson(payloadPath, payload);

  runFixturePayload(payloadPath, outDir);

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

test("generic runner blocks unsupported allegation at preflight before Playwright execution", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-intake-unsupported-"));
  const htmlPath = path.join(tempRoot, "site.html");
  const payloadPath = path.join(tempRoot, "payload.json");
  const outDir = path.join(tempRoot, "out");

  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  fs.writeFileSync(
    htmlPath,
    `
      <!doctype html>
      <html lang="en">
        <body>
          <main>Simple content</main>
        </body>
      </html>
    `,
    "utf8"
  );

  writeJson(
    payloadPath,
    makePayload(
      "AF-TEST-SYNTHETIC-UNSUPPORTED",
      "Color contrast ratio is below minimum on footer links",
      toFileUrl(htmlPath)
    )
  );

  assert.throws(
    () => {
      runFixturePayload(payloadPath, outDir);
    },
    (error) => {
      assert.equal(error.status, 2);
      return true;
    }
  );

  const preflightPath = path.join(outDir, "preflight-classification.json");
  assert.equal(fs.existsSync(preflightPath), true);

  const classification = JSON.parse(fs.readFileSync(preflightPath, "utf8"));
  assert.equal(classification.preflight_status, "unsupported_current_coverage");
  assert.equal(classification.production_intake_runnable, false);
  assert.equal(classification.classification_basis, "unsupported_probe_family_for_asserted_condition");
  assert.equal(classification.unsupported_probe_family_count, 1);

  assert.equal(fs.existsSync(path.join(outDir, "run-records.json")), false);
  assert.equal(fs.existsSync(path.join(outDir, "playwright-observations.json")), false);
});

test("generic runner routes supported form-label allegation through registry and records observed outcome", (t) => {
  const html = `
    <!doctype html>
    <html lang="en">
      <body>
        <main>
          <form action="/search">
            <input id="site-search" name="q" type="text" placeholder="Search products">
          </form>
        </main>
      </body>
    </html>
  `;

  const result = runSyntheticPayload(
    "Search fields lack a label.",
    html,
    {
      target_page_hint: "search page",
      target_element_hint: "search field"
    }
  );

  t.after(() => {
    fs.rmSync(result.tempRoot, { recursive: true, force: true });
  });

  assert.equal(result.summary.executed_steps, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.runRecords.length, 1);
  assert.equal(result.observations[0].operator_outcome_label, OUTCOME_LABEL.OBSERVED);
  assert.equal(typeof result.determination.determination_template, "string");
  assert.ok(result.determination.determination_template.length > 0);
});

test("generic runner routes supported form-label allegation through registry and records not observed outcome", (t) => {
  const html = `
    <!doctype html>
    <html lang="en">
      <body>
        <main>
          <form action="/search">
            <label for="site-search">Search</label>
            <input id="site-search" name="q" type="text" placeholder="Search products">
          </form>
        </main>
      </body>
    </html>
  `;

  const result = runSyntheticPayload(
    "Search fields lack a label.",
    html,
    {
      target_page_hint: "search page",
      target_element_hint: "search field"
    }
  );

  t.after(() => {
    fs.rmSync(result.tempRoot, { recursive: true, force: true });
  });

  assert.equal(result.summary.executed_steps, 1);
  assert.equal(result.observations.length, 1);
  assert.equal(result.runRecords.length, 1);
  assert.equal(result.observations[0].operator_outcome_label, OUTCOME_LABEL.NOT_OBSERVED);
  assert.equal(typeof result.determination.determination_template, "string");
  assert.ok(result.determination.determination_template.length > 0);
});

test("PR4 regression: production runner rejects file protocol payloads without explicit fixture flag", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-intake-prod-file-reject-"));
  const htmlPath = path.join(tempRoot, "site.html");
  const payloadPath = path.join(tempRoot, "payload.json");
  const outDir = path.join(tempRoot, "out");

  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  fs.writeFileSync(
    htmlPath,
    `
      <!doctype html>
      <html lang="en">
        <body>
          <h2>Hero</h2>
          <h5>Footer</h5>
        </body>
      </html>
    `,
    "utf8"
  );

  writeJson(
    payloadPath,
    makePayload(
      "AF-TEST-PRODUCTION-FILE-REJECT",
      "Heading levels were missing",
      toFileUrl(htmlPath)
    )
  );

  assert.throws(
    () => {
      execFileSync(process.execPath, [runnerPath, payloadPath, outDir], {
        cwd: repoRoot,
        stdio: "pipe"
      });
    },
    (error) => {
      const stderr = String(error.stderr || "");
      assert.match(stderr, /PAYLOAD_SOURCE_CASE_SITE_UNSUPPORTED_PROTOCOL_FOR_PRODUCTION/);
      return true;
    }
  );

  assert.equal(fs.existsSync(path.join(outDir, "run-records.json")), false);
});
