"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MARKERS = Object.freeze([
  "challenge",
  "captcha",
  "cloudflare",
  "datadome",
  "turnstile",
  "verify",
  "checking your browser",
  "access denied",
  "blocked",
  "please enable",
  "security check",
  "human"
]);

function printHelp() {
  console.log(`Usage:
  node tools/create-artifact-index.js --matter-output <matter-output-dir> [--out-json <path>] [--out-text <path>]

Purpose:
  Creates a local artifact-index.json and artifact-index.txt for an intake matter output folder.

Required matter output files:
  playwright-summary.json
  determination-record.json
  run-records.json
  artifacts/

Notes:
  This tool does not modify source code, intake results, screenshots, HTML, capture sidecars, or run records.
  It only writes index files for easier review.
`);
}

function parseArgs(argv) {
  const args = {
    matterOutputDir: "",
    outJson: "",
    outText: "",
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--matter-output") {
      args.matterOutputDir = String(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg === "--out-json") {
      args.outJson = String(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg === "--out-text") {
      args.outText = String(argv[index + 1] || "");
      index += 1;
      continue;
    }

    throw new Error(`UNKNOWN_ARGUMENT: ${arg}`);
  }

  return args;
}

function assertExistingPath(filePath, label) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`MISSING_REQUIRED_${label}: ${filePath}`);
  }
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`INVALID_JSON_${label}: ${filePath}: ${error.message}`);
  }
}

function writeUtf8(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function listFilesRecursive(rootDir) {
  const files = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function markerSearch(htmlText) {
  const lower = String(htmlText || "").toLowerCase();
  return DEFAULT_MARKERS.filter((marker) => lower.includes(marker.toLowerCase()));
}

function toRelativeOrAbsolute(baseDir, filePath) {
  const relative = path.relative(baseDir, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return filePath;
  }
  return relative;
}

function buildCaptureRows(captureJsonFiles, artifactDir) {
  return captureJsonFiles.map((file) => {
    const json = readJson(file, "CAPTURE_SIDECAR");

    return {
      file: toRelativeOrAbsolute(artifactDir, file),
      screenshot_truncated: Boolean(json.screenshot_truncated),
      viewport_width: Number(json.runtime_viewport && json.runtime_viewport.width),
      viewport_height: Number(json.runtime_viewport && json.runtime_viewport.height),
      device_pixel_ratio: Number(json.runtime_viewport && json.runtime_viewport.device_pixel_ratio),
      screenshot_scale: String(json.screenshot_scale || ""),
      terminal_png: String((json.terminal_artifact && json.terminal_artifact.file_path) || ""),
      terminal_sha256: String((json.terminal_artifact && json.terminal_artifact.sha256) || ""),
      element_count: Number(json.element_geometry && json.element_geometry.element_count),
      shadow_dom_traversal_enabled: Boolean(json.element_geometry && json.element_geometry.shadow_dom_traversal_enabled)
    };
  });
}

function buildElementRows(elementsFiles, artifactDir) {
  return elementsFiles.map((file) => {
    const json = readJson(file, "ELEMENT_SNAPSHOT");

    return {
      file: toRelativeOrAbsolute(artifactDir, file),
      captured: Boolean(json.captured),
      element_count: Number(json.element_count),
      error: typeof json.error === "string" ? json.error : ""
    };
  });
}

function buildHtmlMarkerRows(htmlFiles, artifactDir) {
  return htmlFiles.map((file) => {
    const text = fs.readFileSync(file, "utf8");

    return {
      file: toRelativeOrAbsolute(artifactDir, file),
      markers: markerSearch(text)
    };
  });
}

function buildIndex(matterOutputDir) {
  const resolvedMatterOutputDir = path.resolve(matterOutputDir);
  const artifactDir = path.join(resolvedMatterOutputDir, "artifacts");
  const summaryPath = path.join(resolvedMatterOutputDir, "playwright-summary.json");
  const determinationPath = path.join(resolvedMatterOutputDir, "determination-record.json");
  const runRecordsPath = path.join(resolvedMatterOutputDir, "run-records.json");

  assertExistingPath(resolvedMatterOutputDir, "MATTER_OUTPUT_DIR");
  assertExistingPath(artifactDir, "ARTIFACT_DIR");
  assertExistingPath(summaryPath, "PLAYWRIGHT_SUMMARY");
  assertExistingPath(determinationPath, "DETERMINATION_RECORD");
  assertExistingPath(runRecordsPath, "RUN_RECORDS");

  const summary = readJson(summaryPath, "PLAYWRIGHT_SUMMARY");
  const determination = readJson(determinationPath, "DETERMINATION_RECORD");
  const runRecords = readJson(runRecordsPath, "RUN_RECORDS");

  if (!Array.isArray(runRecords)) {
    throw new Error("RUN_RECORDS_NOT_ARRAY");
  }

  const allFiles = listFilesRecursive(artifactDir);
  const pngFiles = allFiles.filter((file) => path.extname(file).toLowerCase() === ".png");
  const htmlFiles = allFiles.filter((file) => path.extname(file).toLowerCase() === ".html");
  const captureJsonFiles = allFiles.filter((file) => path.basename(file).endsWith(".capture-v2.json"));
  const manifestFiles = allFiles.filter((file) => path.basename(file).endsWith(".capture-v2-manifest.json"));
  const elementsFiles = allFiles.filter((file) => path.basename(file).endsWith(".elements.json"));

  const botMitigationRuns = runRecords.filter((run) => {
    return run.outcome_label === "Constrained" && run.constraint_class === "BOTMITIGATION";
  });

  const htmlMarkerRows = buildHtmlMarkerRows(htmlFiles, artifactDir);
  const captureRows = buildCaptureRows(captureJsonFiles, artifactDir);
  const elementRows = buildElementRows(elementsFiles, artifactDir);

  return {
    artifact_index_version: "AFDM_LOCAL_ARTIFACT_INDEX_V1",
    generated_at_utc: new Date().toISOString(),
    matter_output_dir: resolvedMatterOutputDir,
    artifact_dir: artifactDir,
    matter_id: String(summary.matter_id || ""),
    determination_template: String(determination.determination_template || ""),
    executed_steps: Number(summary.executed_steps),
    run_count: Number(summary.run_count),
    observed_as_asserted: Number(summary.observed_as_asserted),
    not_observed_as_asserted: Number(summary.not_observed_as_asserted),
    constrained: Number(summary.constrained),
    insufficient: Number(summary.insufficient),
    run_records: runRecords,
    artifact_counts: {
      total_files: allFiles.length,
      png_files: pngFiles.length,
      html_files: htmlFiles.length,
      capture_sidecars: captureJsonFiles.length,
      capture_manifests: manifestFiles.length,
      element_snapshots: elementsFiles.length
    },
    capture_sidecars: captureRows,
    element_snapshots: elementRows,
    html_marker_search: htmlMarkerRows,
    sufficiency: {
      structurally_sufficient_for_botmitigation_record:
        captureJsonFiles.length === runRecords.length &&
        manifestFiles.length === runRecords.length &&
        elementsFiles.length === runRecords.length &&
        htmlFiles.length === runRecords.length &&
        pngFiles.length >= runRecords.length,
      all_runs_constrained_botmitigation:
        runRecords.length > 0 && botMitigationRuns.length === runRecords.length,
      all_html_files_have_challenge_markers:
        htmlMarkerRows.length === runRecords.length &&
        htmlMarkerRows.every((row) => Array.isArray(row.markers) && row.markers.length > 0)
    }
  };
}

function renderTextIndex(index) {
  const lines = [];

  lines.push("AFDM Local Artifact Index");
  lines.push("");
  lines.push(`Matter: ${index.matter_id}`);
  lines.push(`Determination: ${index.determination_template}`);
  lines.push(`Generated UTC: ${index.generated_at_utc}`);
  lines.push("");
  lines.push("Run Summary");
  lines.push(`Executed steps: ${index.executed_steps}`);
  lines.push(`Run count: ${index.run_count}`);
  lines.push(`Observed as asserted: ${index.observed_as_asserted}`);
  lines.push(`Not observed as asserted: ${index.not_observed_as_asserted}`);
  lines.push(`Constrained: ${index.constrained}`);
  lines.push(`Insufficient: ${index.insufficient}`);
  lines.push("");
  lines.push("Artifact Counts");
  lines.push(`Total files: ${index.artifact_counts.total_files}`);
  lines.push(`PNG files: ${index.artifact_counts.png_files}`);
  lines.push(`HTML files: ${index.artifact_counts.html_files}`);
  lines.push(`Capture sidecars: ${index.artifact_counts.capture_sidecars}`);
  lines.push(`Capture manifests: ${index.artifact_counts.capture_manifests}`);
  lines.push(`Element snapshots: ${index.artifact_counts.element_snapshots}`);
  lines.push("");
  lines.push("Sufficiency");
  lines.push(`Structurally sufficient for BOTMITIGATION record: ${index.sufficiency.structurally_sufficient_for_botmitigation_record}`);
  lines.push(`All runs constrained BOTMITIGATION: ${index.sufficiency.all_runs_constrained_botmitigation}`);
  lines.push(`All HTML files have challenge markers: ${index.sufficiency.all_html_files_have_challenge_markers}`);
  lines.push("");
  lines.push("Run Records");

  for (const run of index.run_records) {
    lines.push(`${run.run_id} | ${run.run_unit_id} | ${run.context_id} | ${run.outcome_label} | ${run.constraint_class || ""} | ${run.mechanical_note || ""}`);
  }

  lines.push("");
  lines.push("HTML Challenge Markers");

  for (const row of index.html_marker_search) {
    lines.push(row.file);
    lines.push(`Markers: ${row.markers.join(", ")}`);
    lines.push("");
  }

  lines.push("Capture Sidecars");

  for (const row of index.capture_sidecars) {
    lines.push(row.file);
    lines.push(`Terminal PNG: ${row.terminal_png}`);
    lines.push(`SHA-256: ${row.terminal_sha256}`);
    lines.push(`Viewport: ${row.viewport_width}x${row.viewport_height}, DPR ${row.device_pixel_ratio}`);
    lines.push(`Screenshot scale: ${row.screenshot_scale}`);
    lines.push(`Truncated: ${row.screenshot_truncated}`);
    lines.push(`Element count: ${row.element_count}`);
    lines.push(`Shadow DOM traversal: ${row.shadow_dom_traversal_enabled}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.matterOutputDir) {
    throw new Error("MISSING_REQUIRED_ARGUMENT: --matter-output");
  }

  const matterOutputDir = path.resolve(args.matterOutputDir);
  const index = buildIndex(matterOutputDir);

  const outJson = path.resolve(args.outJson || path.join(matterOutputDir, "artifact-index.json"));
  const outText = path.resolve(args.outText || path.join(matterOutputDir, "artifact-index.txt"));

  writeUtf8(outJson, `${JSON.stringify(index, null, 2)}\n`);
  writeUtf8(outText, renderTextIndex(index));

  console.log("Artifact index created.");
  console.log(`JSON: ${outJson}`);
  console.log(`Text: ${outText}`);
  console.log("Sufficiency:");
  console.log(JSON.stringify(index.sufficiency, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  buildIndex,
  markerSearch,
  parseArgs,
  renderTextIndex
});