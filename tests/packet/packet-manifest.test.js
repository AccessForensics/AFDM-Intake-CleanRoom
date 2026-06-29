"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "tools", "create-packet-manifest.js");

const {
  buildPacketManifest,
  PACKET_MANIFEST_VERSION,
  ENVIRONMENT_RECORD_VERSION
} = require("../../src/packet/packet-manifest.js");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function makeMatterFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-packet-manifest-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const matterOutDir = path.join(tempRoot, "CASE-083");
  const artifactDir = path.join(matterOutDir, "artifacts");
  const prefix = "001_desktop_baseline_RU-010_search-field";
  const runStart = 1782677508234;
  const runEnd = 1782677514928;

  fs.mkdirSync(artifactDir, { recursive: true });

  writeJson(path.join(matterOutDir, "playwright-summary.json"), {
    matter_id: "CASE-083",
    matter_scope: "desktop",
    total_planned_steps: 1,
    executed_steps: 1,
    run_count: 1,
    observed_as_asserted: 1,
    not_observed_as_asserted: 0,
    constrained: 0,
    insufficient: 0,
    determination_template: "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD"
  });

  writeJson(path.join(matterOutDir, "determination-record.json"), {
    matter_id: "CASE-083",
    determination_template: "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD",
    matter_level_note: ""
  });

  writeJson(path.join(matterOutDir, "external-output-validation-record.json"), {
    matter_id: "CASE-083",
    external_output_release_allowed: true
  });

  writeText(path.join(matterOutDir, "determination-output.txt"), "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD\n");

  writeJson(path.join(matterOutDir, "run-records.json"), [
    {
      matter_id: "CASE-083",
      run_id: "RUN-001",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      context_id: "desktop_baseline",
      outcome_label: "Observed as asserted",
      constraint_class: "",
      mechanical_note: "",
      run_start_local: "2026-06-28T20:11:48.234Z",
      run_start_epoch_ms: runStart,
      run_end_local: "2026-06-28T20:11:54.928Z",
      run_end_epoch_ms: runEnd
    }
  ]);

  writeText(path.join(artifactDir, `${prefix}.html`), "<html><body>fixture</body></html>");
  writeText(path.join(artifactDir, `${prefix}.png`), "fake-png");
  writeText(path.join(artifactDir, `${prefix}_chunks`, `0001_${prefix}_y000000.png`), "fake-chunk");

  writeJson(path.join(artifactDir, `${prefix}.elements.json`), {
    captured: true,
    element_count: 42,
    shadow_dom_traversal_enabled: true,
    elements: []
  });

  writeJson(path.join(artifactDir, `${prefix}.capture-v2-manifest.json`), {
    capture_version: "AFDM_CAPTURE_V2",
    artifacts_root: artifactDir,
    captured_chunks: [
      {
        id: 1,
        file_path: `${prefix}_chunks/0001_${prefix}_y000000.png`
      }
    ]
  });

  writeJson(path.join(artifactDir, `${prefix}.capture-v2.json`), {
    capture_version: "AFDM_CAPTURE_V2",
    screenshot_scale: "css",
    runtime_viewport: {
      width: 1366,
      height: 900,
      device_pixel_ratio: 1
    },
    runtime_invariants: {
      is_mobile: false,
      has_touch: false,
      cache_state: "ephemeral_context_per_run"
    },
    terminal_artifact: {
      file_path: `${prefix}.png`
    },
    element_geometry: {
      file_path: `${prefix}.elements.json`,
      captured: true,
      element_count: 42,
      shadow_dom_traversal_enabled: true
    },
    chunks: [
      {
        id: 1,
        file_path: `${prefix}_chunks/0001_${prefix}_y000000.png`
      }
    ]
  });

  writeJson(path.join(matterOutDir, "playwright-observations.json"), [
    {
      step_index: 1,
      matter_id: "CASE-083",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      asserted_condition_text: "Search fields lack a label.",
      context_id: "desktop_baseline",
      operator_outcome_label: "Observed as asserted",
      operator_constraint_class: "",
      operator_mechanical_note: "",
      operator_notes_internal_only: "{}",
      evidence_screenshot_path: path.join(artifactDir, `${prefix}.png`),
      evidence_html_path: path.join(artifactDir, `${prefix}.html`),
      evidence_screenshot_metadata_path: path.join(artifactDir, `${prefix}.capture-v2.json`),
      evidence_screenshot_manifest_path: path.join(artifactDir, `${prefix}.capture-v2-manifest.json`),
      evidence_element_geometry_path: path.join(artifactDir, `${prefix}.elements.json`),
      run_start_local: "2026-06-28T20:11:48.234Z",
      run_start_epoch_ms: runStart,
      run_end_local: "2026-06-28T20:11:54.928Z",
      run_end_epoch_ms: runEnd
    }
  ]);

  return { matterOutDir };
}

test("packet manifest CLI writes manifest, text, and environment records", (t) => {
  const { matterOutDir } = makeMatterFixture(t);

  execFileSync(process.execPath, [scriptPath, "--matter-output", matterOutDir], {
    cwd: repoRoot,
    stdio: "pipe"
  });

  const manifest = JSON.parse(fs.readFileSync(path.join(matterOutDir, "packet_manifest.json"), "utf8"));
  const envRecords = JSON.parse(fs.readFileSync(path.join(matterOutDir, "environment_records.json"), "utf8"));
  const text = fs.readFileSync(path.join(matterOutDir, "packet_manifest.txt"), "utf8");

  assert.equal(manifest.packet_manifest_version, PACKET_MANIFEST_VERSION);
  assert.equal(manifest.matter_id, "CASE-083");
  assert.equal(manifest.validation.validation_error_count, 0);
  assert.equal(envRecords.length, 1);
  assert.equal(envRecords[0].environment_record_version, ENVIRONMENT_RECORD_VERSION);
  assert.equal(envRecords[0].browser_engine, "chromium");
  assert.equal(envRecords[0].viewport_width, 1366);
  assert.equal(envRecords[0].mobile_emulation_enabled, false);

  const png = manifest.entries.find((entry) => entry.file_path.endsWith("search-field.png"));
  assert.ok(png);
  assert.equal(png.included_in_packet, true);
  assert.equal(png.file_type, "screenshot_png");
  assert.equal(png.generation_step, "artifact-capture-v2");
  assert.equal(png.run_id, "RUN-001");
  assert.equal(png.run_unit_id, "RU-010");
  assert.equal(png.context_id, "desktop_baseline");
  assert.match(png.sha256, /^[a-f0-9]{64}$/);
  assert.equal(png.file_size_bytes > 0, true);

  assert.match(text, /AFDM Packet Manifest/);
  assert.match(text, /RUN-001 \| RU-010 \| desktop_baseline/);
  assert.match(text, /INCLUDED \| artifacts\//);
});

test("packet manifest rejects observation artifact paths that do not exist", (t) => {
  const { matterOutDir } = makeMatterFixture(t);
  const observationsPath = path.join(matterOutDir, "playwright-observations.json");
  const observations = JSON.parse(fs.readFileSync(observationsPath, "utf8"));
  observations[0].evidence_html_path = path.join(matterOutDir, "artifacts", "missing.html");
  writeJson(observationsPath, observations);

  assert.throws(
    () => buildPacketManifest(matterOutDir),
    /PACKET_MANIFEST_OBSERVATION_ARTIFACT_MISSING/
  );
});

test("packet manifest rejects unknown included artifacts", (t) => {
  const { matterOutDir } = makeMatterFixture(t);
  writeText(path.join(matterOutDir, "artifacts", "orphan.bin"), "unknown");

  assert.throws(
    () => buildPacketManifest(matterOutDir),
    /PACKET_MANIFEST_VALIDATION_FAILED/
  );
});
