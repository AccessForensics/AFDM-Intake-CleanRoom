"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function makeMatterFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-packet-manifest-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const matterOutDir = path.join(tempRoot, "CASE-083");
  const artifactDir = path.join(matterOutDir, "artifacts");
  fs.mkdirSync(artifactDir, { recursive: true });

  writeJson(path.join(matterOutDir, "playwright-summary.json"), {
    matter_id: "CASE-083",
    matter_scope: "dual",
    total_planned_steps: 2,
    executed_steps: 2,
    run_count: 2,
    observed_as_asserted: 1,
    not_observed_as_asserted: 1,
    constrained: 0,
    insufficient: 0,
    determination_template: "DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD"
  });

  writeJson(path.join(matterOutDir, "determination-record.json"), {
    matter_id: "CASE-083",
    determination_template: "DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD",
    matter_level_note: ""
  });

  writeJson(path.join(matterOutDir, "external-output-validation-record.json"), {
    matter_id: "CASE-083",
    external_output_validation_version: "fixture",
    external_output_release_allowed: true
  });

  writeText(
    path.join(matterOutDir, "determination-output.txt"),
    "DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD\n"
  );

  const runRecords = [
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
      run_start_epoch_ms: 1782677508234,
      run_end_local: "2026-06-28T20:11:54.928Z",
      run_end_epoch_ms: 1782677514928
    },
    {
      matter_id: "CASE-083",
      run_id: "RUN-002",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      context_id: "mobile_baseline",
      outcome_label: "Not observed as asserted",
      constraint_class: "",
      mechanical_note: "",
      run_start_local: "2026-06-28T20:12:48.234Z",
      run_start_epoch_ms: 1782677568234,
      run_end_local: "2026-06-28T20:12:54.928Z",
      run_end_epoch_ms: 1782677574928
    }
  ];

  writeJson(path.join(matterOutDir, "run-records.json"), runRecords);

  const observations = [];

  for (let index = 1; index <= 2; index += 1) {
    const contextId = index === 1 ? "desktop_baseline" : "mobile_baseline";
    const prefix = `${String(index).padStart(3, "0")}_${contextId}_RU-010_search-field`;
    const run = runRecords[index - 1];
    const pngContent = `fake-png-${index}`;

    writeText(path.join(artifactDir, `${prefix}.html`), `<html><body>run ${index}</body></html>`);
    writeText(path.join(artifactDir, `${prefix}.png`), pngContent);
    writeText(path.join(artifactDir, `${prefix}_chunks`, `0001_${prefix}_y000000.png`), `fake-chunk-${index}`);

    writeJson(path.join(artifactDir, `${prefix}.elements.json`), {
      captured: true,
      element_count: index === 1 ? 42 : 24,
      shadow_dom_traversal_enabled: true,
      elements: []
    });

    writeJson(path.join(artifactDir, `${prefix}.capture-v2-manifest.json`), {
      capture_version: "AFDM_CAPTURE_V2",
      artifacts_root: artifactDir,
      captured_chunks: [
        {
          id: 1,
          file_path: `${prefix}_chunks/0001_${prefix}_y000000.png`,
          expected_sha256: sha256Text(`fake-chunk-${index}`)
        }
      ]
    });

    writeJson(path.join(artifactDir, `${prefix}.capture-v2.json`), {
      capture_version: "AFDM_CAPTURE_V2",
      compression_format: "PNG",
      screenshot_scale: "css",
      screenshot_truncated: false,
      runtime_viewport: {
        width: index === 1 ? 1366 : 393,
        height: index === 1 ? 900 : 852,
        device_pixel_ratio: 1
      },
      runtime_invariants: {
        viewport_width: index === 1 ? 1366 : 393,
        viewport_height: index === 1 ? 900 : 852,
        device_scale_factor: 1,
        is_mobile: index === 2,
        has_touch: index === 2,
        screenshot_scale: "css",
        cache_state: "ephemeral_context_per_run"
      },
      terminal_artifact: {
        file_path: `${prefix}.png`,
        sha256: sha256Text(pngContent)
      },
      element_geometry: {
        file_path: `${prefix}.elements.json`,
        captured: true,
        element_count: index === 1 ? 42 : 24,
        shadow_dom_traversal_enabled: true
      },
      chunks: [
        {
          id: 1,
          file_path: `${prefix}_chunks/0001_${prefix}_y000000.png`,
          sha256: sha256Text(`fake-chunk-${index}`)
        }
      ]
    });

    observations.push({
      step_index: index,
      matter_id: "CASE-083",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      asserted_condition_text: "Search fields lack a label.",
      context_id: contextId,
      operator_outcome_label: run.outcome_label,
      operator_constraint_class: "",
      operator_mechanical_note: "",
      operator_notes_internal_only: "{}",
      evidence_screenshot_path: path.join(artifactDir, `${prefix}.png`),
      evidence_html_path: path.join(artifactDir, `${prefix}.html`),
      evidence_screenshot_metadata_path: path.join(artifactDir, `${prefix}.capture-v2.json`),
      evidence_screenshot_manifest_path: path.join(artifactDir, `${prefix}.capture-v2-manifest.json`),
      evidence_element_geometry_path: path.join(artifactDir, `${prefix}.elements.json`),
      run_start_local: run.run_start_local,
      run_start_epoch_ms: run.run_start_epoch_ms,
      run_end_local: run.run_end_local,
      run_end_epoch_ms: run.run_end_epoch_ms
    });
  }

  writeJson(path.join(matterOutDir, "playwright-observations.json"), observations);

  return { matterOutDir };
}

test("packet manifest CLI writes manifest, text, and environment records", (t) => {
  const { matterOutDir } = makeMatterFixture(t);

  execFileSync(
    process.execPath,
    [scriptPath, "--matter-output", matterOutDir],
    {
      cwd: repoRoot,
      stdio: "pipe"
    }
  );

  const manifestPath = path.join(matterOutDir, "packet_manifest.json");
  const textPath = path.join(matterOutDir, "packet_manifest.txt");
  const envPath = path.join(matterOutDir, "environment_records.json");

  assert.equal(fs.existsSync(manifestPath), true);
  assert.equal(fs.existsSync(textPath), true);
  assert.equal(fs.existsSync(envPath), true);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const envRecords = JSON.parse(fs.readFileSync(envPath, "utf8"));
  const text = fs.readFileSync(textPath, "utf8");

  assert.equal(manifest.packet_manifest_version, PACKET_MANIFEST_VERSION);
  assert.equal(manifest.matter_id, "CASE-083");
  assert.equal(manifest.validation.validation_error_count, 0);
  assert.equal(manifest.environment_records.length, 2);
  assert.equal(envRecords.length, 2);
  assert.equal(envRecords[0].environment_record_version, ENVIRONMENT_RECORD_VERSION);
  assert.equal(envRecords[0].browser_engine, "chromium");
  assert.equal(envRecords[0].viewport_width, 1366);
  assert.equal(envRecords[1].mobile_emulation_enabled, true);
  assert.equal(envRecords[1].touch_enabled, true);

  const desktopPng = manifest.entries.find((entry) => {
    return entry.file_path.endsWith("desktop_baseline_RU-010_search-field.png");
  });

  assert.ok(desktopPng);
  assert.equal(desktopPng.included_in_packet, true);
  assert.equal(desktopPng.file_type, "screenshot_png");
  assert.equal(desktopPng.generation_step, "artifact-capture-v2");
  assert.equal(desktopPng.run_id, "RUN-001");
  assert.equal(desktopPng.run_unit_id, "RU-010");
  assert.equal(desktopPng.context_id, "desktop_baseline");
  assert.match(desktopPng.sha256, /^[a-f0-9]{64}$/);
  assert.equal(desktopPng.file_size_bytes > 0, true);
  assert.equal(Number.isNaN(Date.parse(desktopPng.created_timestamp)), false);

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
    /PACKET_MANIFEST_VALIDATION_FAILED/[Symbol.match].bind(/PACKET_MANIFEST_VALIDATION_FAILED/)
  );
});
