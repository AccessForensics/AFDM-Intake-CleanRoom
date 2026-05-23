"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "tools", "create-artifact-index.js");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function makeMatterFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-artifact-index-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const matterOutDir = path.join(tempRoot, "CASE-001");
  const artifactDir = path.join(matterOutDir, "artifacts");

  fs.mkdirSync(artifactDir, { recursive: true });

  writeJson(path.join(matterOutDir, "playwright-summary.json"), {
    matter_id: "CASE-001",
    matter_scope: "dual",
    total_planned_steps: 4,
    executed_steps: 4,
    run_count: 4,
    observed_as_asserted: 0,
    not_observed_as_asserted: 0,
    constrained: 4,
    insufficient: 0,
    determination_template: "DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (BOTMITIGATION)"
  });

  writeJson(path.join(matterOutDir, "determination-record.json"), {
    matter_id: "CASE-001",
    determination_template: "DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (BOTMITIGATION)",
    matter_level_note: ""
  });

  const runs = [
    ["RUN-001", "RU-010", "desktop_baseline"],
    ["RUN-002", "RU-010", "mobile_baseline"],
    ["RUN-003", "RU-011", "desktop_baseline"],
    ["RUN-004", "RU-011", "mobile_baseline"]
  ].map(([runId, runUnitId, contextId]) => ({
    matter_id: "CASE-001",
    run_id: runId,
    complaint_group_anchor_id: "A-010",
    run_unit_id: runUnitId,
    context_id: contextId,
    outcome_label: "Constrained",
    constraint_class: "BOTMITIGATION",
    mechanical_note: "Bot-mitigation challenge prevented bounded review of the alleged site surface.",
    run_start_local: "2026-05-23T20:11:48.234Z",
    run_start_epoch_ms: 1779567108235,
    run_end_local: "2026-05-23T20:11:54.928Z",
    run_end_epoch_ms: 1779567114928
  }));

  writeJson(path.join(matterOutDir, "run-records.json"), runs);

  for (let index = 1; index <= 4; index += 1) {
    const prefix = `${String(index).padStart(3, "0")}_fixture`;

    writeText(
      path.join(artifactDir, `${prefix}.html`),
      "<html><body>Cloudflare challenge captcha verify blocked</body></html>"
    );

    writeText(path.join(artifactDir, `${prefix}.png`), "fake-png");

    writeJson(path.join(artifactDir, `${prefix}.elements.json`), {
      captured: true,
      element_count: index % 2 === 0 ? 105 : 122,
      elements: []
    });

    writeJson(path.join(artifactDir, `${prefix}.capture-v2-manifest.json`), {
      capture_version: "AFDM_CAPTURE_V2",
      artifacts_root: artifactDir,
      captured_chunks: []
    });

    writeJson(path.join(artifactDir, `${prefix}.capture-v2.json`), {
      capture_version: "AFDM_CAPTURE_V2",
      compression_format: "PNG",
      screenshot_scale: "css",
      screenshot_truncated: false,
      runtime_viewport: {
        width: index % 2 === 0 ? 393 : 1366,
        height: index % 2 === 0 ? 852 : 900,
        device_pixel_ratio: 1
      },
      terminal_artifact: {
        file_path: `${prefix}.png`,
        sha256: `sha-${index}`
      },
      element_geometry: {
        file_path: `${prefix}.elements.json`,
        captured: true,
        element_count: index % 2 === 0 ? 105 : 122,
        shadow_dom_traversal_enabled: true
      }
    });
  }

  return { matterOutDir };
}

test("artifact index generator writes JSON and text indexes for a BOTMITIGATION matter", (t) => {
  const { matterOutDir } = makeMatterFixture(t);

  execFileSync(
    process.execPath,
    [scriptPath, "--matter-output", matterOutDir],
    {
      cwd: repoRoot,
      stdio: "pipe"
    }
  );

  const jsonPath = path.join(matterOutDir, "artifact-index.json");
  const textPath = path.join(matterOutDir, "artifact-index.txt");

  assert.equal(fs.existsSync(jsonPath), true);
  assert.equal(fs.existsSync(textPath), true);

  const index = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const text = fs.readFileSync(textPath, "utf8");

  assert.equal(index.artifact_index_version, "AFDM_LOCAL_ARTIFACT_INDEX_V1");
  assert.equal(index.matter_id, "CASE-001");
  assert.equal(index.run_records.length, 4);
  assert.equal(index.artifact_counts.png_files, 4);
  assert.equal(index.artifact_counts.html_files, 4);
  assert.equal(index.artifact_counts.capture_sidecars, 4);
  assert.equal(index.artifact_counts.capture_manifests, 4);
  assert.equal(index.artifact_counts.element_snapshots, 4);
  assert.equal(index.sufficiency.structurally_sufficient_for_botmitigation_record, true);
  assert.equal(index.sufficiency.all_runs_constrained_botmitigation, true);
  assert.equal(index.sufficiency.all_html_files_have_challenge_markers, true);

  assert.match(text, /RUN-001 \| RU-010 \| desktop_baseline \| Constrained \| BOTMITIGATION/);
  assert.match(text, /RUN-004 \| RU-011 \| mobile_baseline \| Constrained \| BOTMITIGATION/);
  assert.match(text, /Markers: challenge, captcha, cloudflare, verify, blocked/);
  assert.match(text, /Shadow DOM traversal: true/);
});

test("artifact index generator rejects non-array run records", (t) => {
  const { matterOutDir } = makeMatterFixture(t);

  writeJson(path.join(matterOutDir, "run-records.json"), {
    run_id: "RUN-001",
    outcome_label: "Constrained",
    constraint_class: "BOTMITIGATION"
  });

  assert.throws(
    () => execFileSync(
      process.execPath,
      [scriptPath, "--matter-output", matterOutDir],
      {
        cwd: repoRoot,
        stdio: "pipe"
      }
    ),
    /Command failed/
  );
});