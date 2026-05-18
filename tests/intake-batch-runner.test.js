"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const batchScript = path.join(repoRoot, "tools", "run-intake-batch.js");

test("batch runner dry-run writes manifest without executing Playwright runner", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-batch-runner-"));
  const payloadsDir = path.join(tempRoot, "payloads");
  const outDir = path.join(tempRoot, "out");

  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  fs.mkdirSync(payloadsDir, { recursive: true });

  fs.writeFileSync(
    path.join(payloadsDir, "CASE-DRY.json"),
    JSON.stringify(
      {
        matter_id: "CASE-DRY",
        matter_scope: "dual",
        source_case: {
          site: "https://example.com/"
        },
        run_units: [
          {
            rununitid: "RU-001",
            complaintgroupanchorid: "A-001",
            assertedconditiontext: "Images lack meaningful alternative text.",
            target_url: "https://example.com/",
            target_page_hint: "",
            target_element_hint: "",
            desktopinscope: true,
            mobileinscope: true
          }
        ],
        sequencing_plan: [
          {
            run_unit_id: "RU-001",
            context_id: "desktop_baseline"
          },
          {
            run_unit_id: "RU-001",
            context_id: "mobile_baseline"
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
      batchScript,
      "--payloads",
      payloadsDir,
      "--out",
      outDir,
      "--dry-run",
      "--skip-guardrails"
    ],
    {
      cwd: repoRoot,
      stdio: "pipe"
    }
  );

  const batchDirs = fs.readdirSync(outDir).filter((name) => name.startsWith("batch_"));
  assert.equal(batchDirs.length, 1);

  const manifestPath = path.join(outDir, batchDirs[0], "batch_manifest.json");
  const csvPath = path.join(outDir, batchDirs[0], "batch_summary.csv");

  assert.equal(fs.existsSync(manifestPath), true);
  assert.equal(fs.existsSync(csvPath), true);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.total_payloads, 1);
  assert.equal(manifest.dry_run_count, 1);
  assert.equal(manifest.failure_count, 0);
  assert.equal(manifest.rows[0].status, "DRY_RUN_READY");
  assert.equal(manifest.rows[0].matter_id, "CASE-DRY");
});