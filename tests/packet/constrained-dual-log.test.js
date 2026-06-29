"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "tools", "create-constrained-dual-log.js");

const {
  buildConstrainedDualLog,
  CONSTRAINED_DUAL_LOG_VERSION
} = require("../../src/packet/constrained-dual-log.js");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function createRunArtifacts(artifactDir, prefix, viewportWidth, viewportHeight, isMobile) {
  writeText(path.join(artifactDir, `${prefix}.html`), "<html><body>fixture</body></html>");
  writeText(path.join(artifactDir, `${prefix}.png`), `fake-png-${prefix}`);
  writeText(path.join(artifactDir, `${prefix}_chunks`, `0001_${prefix}_y000000.png`), `fake-chunk-${prefix}`);

  writeJson(path.join(artifactDir, `${prefix}.elements.json`), {
    captured: true,
    element_count: 12,
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
      width: viewportWidth,
      height: viewportHeight,
      device_pixel_ratio: 1
    },
    runtime_invariants: {
      is_mobile: isMobile,
      has_touch: isMobile,
      cache_state: "ephemeral_context_per_run"
    },
    terminal_artifact: {
      file_path: `${prefix}.png`
    },
    element_geometry: {
      file_path: `${prefix}.elements.json`,
      captured: true,
      element_count: 12,
      shadow_dom_traversal_enabled: true
    },
    chunks: [
      {
        id: 1,
        file_path: `${prefix}_chunks/0001_${prefix}_y000000.png`
      }
    ]
  });
}

function makeMatterFixture(t, options) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-constrained-dual-log-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const matterOutDir = path.join(tempRoot, "CASE-084");
  const artifactDir = path.join(matterOutDir, "artifacts");
  fs.mkdirSync(artifactDir, { recursive: true });

  writeJson(path.join(matterOutDir, "playwright-summary.json"), {
    matter_id: "CASE-084",
    matter_scope: "dual",
    total_planned_steps: options.includePeer ? 2 : 1,
    executed_steps: options.includePeer ? 2 : 1,
    run_count: options.includePeer ? 2 : 1,
    observed_as_asserted: options.includePeer ? 1 : 0,
    not_observed_as_asserted: 0,
    constrained: 1,
    insufficient: 0,
    determination_template: "DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED"
  });

  writeJson(path.join(matterOutDir, "determination-record.json"), {
    matter_id: "CASE-084",
    determination_template: "DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED",
    matter_level_note: "Replicated Desktop Browser Context constraint_class is NAVIMPEDIMENT."
  });

  writeJson(path.join(matterOutDir, "external-output-validation-record.json"), {
    matter_id: "CASE-084",
    external_output_release_allowed: true
  });

  writeText(path.join(matterOutDir, "determination-output.txt"), "DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED\n");

  const runs = [
    {
      matter_id: "CASE-084",
      run_id: "RUN-001",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      context_id: "desktop_baseline",
      outcome_label: "Constrained",
      constraint_class: "NAVIMPEDIMENT",
      mechanical_note: "Navigation state prevented bounded execution.",
      run_start_local: "2026-06-28T20:11:48.234Z",
      run_start_epoch_ms: 1782677508234,
      run_end_local: "2026-06-28T20:11:54.928Z",
      run_end_epoch_ms: 1782677514928
    }
  ];

  if (options.includePeer) {
    runs.push({
      matter_id: "CASE-084",
      run_id: "RUN-002",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      context_id: "mobile_baseline",
      outcome_label: "Observed as asserted",
      constraint_class: "",
      mechanical_note: "",
      run_start_local: "2026-06-28T20:12:48.234Z",
      run_start_epoch_ms: 1782677568234,
      run_end_local: "2026-06-28T20:12:54.928Z",
      run_end_epoch_ms: 1782677574928
    });
  }

  writeJson(path.join(matterOutDir, "run-records.json"), runs);

  const observations = [];

  createRunArtifacts(artifactDir, "001_desktop_baseline_RU-010_navigation", 1366, 900, false);
  observations.push({
    step_index: 1,
    matter_id: "CASE-084",
    complaint_group_anchor_id: "A-010",
    run_unit_id: "RU-010",
    asserted_condition_text: "Navigation cannot be reached.",
    context_id: "desktop_baseline",
    operator_outcome_label: "Constrained",
    operator_constraint_class: "NAVIMPEDIMENT",
    operator_mechanical_note: "Navigation state prevented bounded execution.",
    operator_notes_internal_only: "{}",
    evidence_screenshot_path: path.join(artifactDir, "001_desktop_baseline_RU-010_navigation.png"),
    evidence_html_path: path.join(artifactDir, "001_desktop_baseline_RU-010_navigation.html"),
    evidence_screenshot_metadata_path: path.join(artifactDir, "001_desktop_baseline_RU-010_navigation.capture-v2.json"),
    evidence_screenshot_manifest_path: path.join(artifactDir, "001_desktop_baseline_RU-010_navigation.capture-v2-manifest.json"),
    evidence_element_geometry_path: path.join(artifactDir, "001_desktop_baseline_RU-010_navigation.elements.json"),
    run_start_local: runs[0].run_start_local,
    run_start_epoch_ms: runs[0].run_start_epoch_ms,
    run_end_local: runs[0].run_end_local,
    run_end_epoch_ms: runs[0].run_end_epoch_ms
  });

  if (options.includePeer) {
    createRunArtifacts(artifactDir, "002_mobile_baseline_RU-010_navigation", 393, 852, true);
    observations.push({
      step_index: 2,
      matter_id: "CASE-084",
      complaint_group_anchor_id: "A-010",
      run_unit_id: "RU-010",
      asserted_condition_text: "Navigation cannot be reached.",
      context_id: "mobile_baseline",
      operator_outcome_label: "Observed as asserted",
      operator_constraint_class: "",
      operator_mechanical_note: "",
      operator_notes_internal_only: "{}",
      evidence_screenshot_path: path.join(artifactDir, "002_mobile_baseline_RU-010_navigation.png"),
      evidence_html_path: path.join(artifactDir, "002_mobile_baseline_RU-010_navigation.html"),
      evidence_screenshot_metadata_path: path.join(artifactDir, "002_mobile_baseline_RU-010_navigation.capture-v2.json"),
      evidence_screenshot_manifest_path: path.join(artifactDir, "002_mobile_baseline_RU-010_navigation.capture-v2-manifest.json"),
      evidence_element_geometry_path: path.join(artifactDir, "002_mobile_baseline_RU-010_navigation.elements.json"),
      run_start_local: runs[1].run_start_local,
      run_start_epoch_ms: runs[1].run_start_epoch_ms,
      run_end_local: runs[1].run_end_local,
      run_end_epoch_ms: runs[1].run_end_epoch_ms
    });
  }

  writeJson(path.join(matterOutDir, "playwright-observations.json"), observations);

  return { matterOutDir };
}

test("constrained dual-log CLI writes constraint and peer context logs", (t) => {
  const { matterOutDir } = makeMatterFixture(t, { includePeer: true });

  execFileSync(process.execPath, [scriptPath, "--matter-output", matterOutDir], {
    cwd: repoRoot,
    stdio: "pipe"
  });

  const dualLog = JSON.parse(fs.readFileSync(path.join(matterOutDir, "constrained_dual_log.json"), "utf8"));
  const text = fs.readFileSync(path.join(matterOutDir, "constrained_dual_log.txt"), "utf8");

  assert.equal(dualLog.constrained_dual_log_version, CONSTRAINED_DUAL_LOG_VERSION);
  assert.equal(dualLog.constrained_run_count, 1);
  assert.equal(dualLog.peer_context_available_count, 1);
  assert.equal(dualLog.peer_context_not_available_count, 0);
  assert.equal(dualLog.entries.length, 1);
  assert.equal(dualLog.entries[0].comparison_status, "peer_context_available");
  assert.equal(dualLog.entries[0].constraint_log.run_id, "RUN-001");
  assert.equal(dualLog.entries[0].constraint_log.constraint_class, "NAVIMPEDIMENT");
  assert.equal(dualLog.entries[0].constraint_log.environment_record.viewport_width, 1366);
  assert.equal(dualLog.entries[0].constraint_log.artifact_references.length > 0, true);
  assert.equal(dualLog.entries[0].peer_context_log.run_id, "RUN-002");
  assert.equal(dualLog.entries[0].peer_context_log.context_id, "mobile_baseline");
  assert.equal(dualLog.entries[0].peer_context_log.environment_record.mobile_emulation_enabled, true);

  assert.match(text, /AFDM Constrained Dual Log/);
  assert.match(text, /Constraint Log/);
  assert.match(text, /Peer Context Log/);
});

test("constrained dual-log records when peer context is unavailable", (t) => {
  const { matterOutDir } = makeMatterFixture(t, { includePeer: false });
  const dualLog = buildConstrainedDualLog(matterOutDir);

  assert.equal(dualLog.constrained_run_count, 1);
  assert.equal(dualLog.peer_context_available_count, 0);
  assert.equal(dualLog.peer_context_not_available_count, 1);
  assert.equal(dualLog.entries[0].comparison_status, "peer_context_not_available");
  assert.equal(dualLog.entries[0].peer_context_log, null);
});

test("constrained dual-log rejects missing constrained artifact references", (t) => {
  const { matterOutDir } = makeMatterFixture(t, { includePeer: true });
  fs.rmSync(path.join(matterOutDir, "artifacts", "001_desktop_baseline_RU-010_navigation.html"), { force: true });

  assert.throws(
    () => buildConstrainedDualLog(matterOutDir),
    /PACKET_MANIFEST_OBSERVATION_ARTIFACT_MISSING/
  );
});
