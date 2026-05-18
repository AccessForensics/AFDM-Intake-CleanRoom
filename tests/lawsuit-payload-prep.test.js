"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const prepScript = path.join(repoRoot, "tools", "prepare-intake-payloads.js");

test("lawsuit payload prep converts reviewed facts into engine-ready payload", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-payload-prep-"));
  const factsDir = path.join(tempRoot, "facts");
  const payloadsDir = path.join(tempRoot, "payloads");

  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  fs.mkdirSync(factsDir, { recursive: true });

  fs.writeFileSync(
    path.join(factsDir, "case-one.json"),
    JSON.stringify(
      {
        matter_id: "CASE-ONE",
        matter_scope: "dual",
        source_case: {
          site: "www.example.com"
        },
        anchors: [
          {
            complaintgroupanchorid: "A-001",
            anchortext: "Images lack meaningful alternative text.\nForm fields lack programmatically associated labels.",
            target_page_hint: "homepage",
            target_element_hint: "images and form fields"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  execFileSync(
    process.execPath,
    [
      prepScript,
      "--facts",
      factsDir,
      "--payloads",
      payloadsDir,
      "--overwrite"
    ],
    {
      cwd: repoRoot,
      stdio: "pipe"
    }
  );

  const payloadPath = path.join(payloadsDir, "CASE-ONE.json");
  assert.equal(fs.existsSync(payloadPath), true);

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

  assert.equal(payload.matter_id, "CASE-ONE");
  assert.equal(payload.matter_scope, "dual");
  assert.equal(payload.source_case.site, "https://www.example.com/");
  assert.equal(payload.run_units.length, 2);
  assert.equal(payload.sequencing_plan.length, 4);
  assert.equal(payload.run_units[0].desktopinscope, true);
  assert.equal(payload.run_units[0].mobileinscope, true);
  assert.equal(payload.run_units[0].target_url, "https://www.example.com/");
  assert.equal(payload.run_units[0].createdcontextbasis, "reviewed_lawsuit_fact_extraction");
});