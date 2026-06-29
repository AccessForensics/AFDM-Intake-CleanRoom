"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PACKET_MANIFEST_VERSION = "AFDM_PACKET_MANIFEST_V1";
const ENVIRONMENT_RECORD_VERSION = "AFDM_ENVIRONMENT_RECORD_V1";

const DEFAULT_GENERATED_OUTPUT_NAMES = Object.freeze(new Set([
  "packet_manifest.json",
  "packet_manifest.txt",
  "environment_records.json"
]));

const DEFAULT_LOCAL_REVIEW_OUTPUT_NAMES = Object.freeze(new Set([
  "artifact-index.json",
  "artifact-index.txt"
]));

const REQUIRED_MATTER_FILES = Object.freeze([
  "playwright-summary.json",
  "determination-record.json",
  "run-records.json",
  "playwright-observations.json",
  "external-output-validation-record.json",
  "determination-output.txt"
]);

const OBSERVATION_ARTIFACT_FIELDS = Object.freeze([
  "evidence_screenshot_path",
  "evidence_html_path",
  "evidence_screenshot_metadata_path",
  "evidence_screenshot_manifest_path",
  "evidence_element_geometry_path"
]);

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`PACKET_MANIFEST_INVALID_JSON_${label}: ${filePath}: ${error.message}`);
  }
}

function writeUtf8File(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function normalizeForMap(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function assertExistingPath(filePath, label) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`PACKET_MANIFEST_MISSING_REQUIRED_${label}: ${filePath}`);
  }
}

function assertSafeChildPath(rootDir, candidatePath, label) {
  const root = normalizeForMap(rootDir);
  const candidate = normalizeForMap(candidatePath);

  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error(`PACKET_MANIFEST_PATH_ESCAPE_BLOCKED_${label}: ${candidatePath}`);
  }

  return path.resolve(candidatePath);
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

  return files.sort((a, b) => a.localeCompare(b));
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function toIsoTimestamp(stat) {
  const birth = stat.birthtime instanceof Date && Number.isFinite(stat.birthtime.getTime())
    ? stat.birthtime
    : null;
  const modified = stat.mtime instanceof Date && Number.isFinite(stat.mtime.getTime())
    ? stat.mtime
    : null;

  return (birth || modified || new Date(0)).toISOString();
}

function toRelativePath(baseDir, filePath) {
  return path.relative(baseDir, filePath).split(path.sep).join("/");
}

function pathFromObservationValue(matterOutputDir, value) {
  if (!value) {
    return "";
  }

  const raw = String(value);
  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(matterOutputDir, raw);
  return assertSafeChildPath(matterOutputDir, resolved, "OBSERVATION_ARTIFACT");
}

function matchRunRecord(runRecords, observation) {
  const exact = runRecords.find((run) => {
    return run.run_unit_id === observation.run_unit_id &&
      run.context_id === observation.context_id &&
      run.run_start_epoch_ms === observation.run_start_epoch_ms;
  });

  if (exact) {
    return exact;
  }

  return runRecords.find((run) => {
    return run.run_unit_id === observation.run_unit_id && run.context_id === observation.context_id;
  }) || null;
}

function addArtifactPathMapping(map, filePath, runRecord, observation, sourceField) {
  if (!filePath) {
    return;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`PACKET_MANIFEST_OBSERVATION_ARTIFACT_MISSING: ${sourceField}: ${filePath}`);
  }

  map.set(normalizeForMap(filePath), {
    run_id: runRecord ? String(runRecord.run_id || "") : "",
    run_unit_id: String(observation.run_unit_id || ""),
    context_id: String(observation.context_id || ""),
    matter_id: String(observation.matter_id || ""),
    source_field: sourceField
  });
}

function addCaptureChildMappings(map, matterOutputDir, sidecarPath, runMapping) {
  if (!sidecarPath || !fs.existsSync(sidecarPath)) {
    return;
  }

  const sidecar = readJson(sidecarPath, "CAPTURE_SIDECAR");
  const artifactsDir = path.join(matterOutputDir, "artifacts");
  const baseDir = path.dirname(sidecarPath);

  const relativeCandidates = [];

  if (sidecar.terminal_artifact && sidecar.terminal_artifact.file_path) {
    relativeCandidates.push(sidecar.terminal_artifact.file_path);
  }

  if (sidecar.element_geometry && sidecar.element_geometry.file_path) {
    relativeCandidates.push(sidecar.element_geometry.file_path);
  }

  if (Array.isArray(sidecar.chunks)) {
    for (const chunk of sidecar.chunks) {
      if (chunk && chunk.file_path) {
        relativeCandidates.push(chunk.file_path);
      }
    }
  }

  for (const candidate of relativeCandidates) {
    const childPath = path.resolve(artifactsDir, String(candidate));
    const safeChildPath = assertSafeChildPath(matterOutputDir, childPath, "CAPTURE_CHILD_ARTIFACT");

    if (fs.existsSync(safeChildPath)) {
      map.set(normalizeForMap(safeChildPath), Object.assign({}, runMapping, {
        source_field: "capture_sidecar_child"
      }));
      continue;
    }

    const siblingPath = assertSafeChildPath(matterOutputDir, path.resolve(baseDir, String(candidate)), "CAPTURE_CHILD_ARTIFACT");
    if (fs.existsSync(siblingPath)) {
      map.set(normalizeForMap(siblingPath), Object.assign({}, runMapping, {
        source_field: "capture_sidecar_child"
      }));
    }
  }
}

function buildRunArtifactMap(matterOutputDir, runRecords, observations) {
  if (!Array.isArray(runRecords)) {
    throw new Error("PACKET_MANIFEST_RUN_RECORDS_NOT_ARRAY");
  }

  if (!Array.isArray(observations)) {
    throw new Error("PACKET_MANIFEST_OBSERVATIONS_NOT_ARRAY");
  }

  const map = new Map();

  for (const observation of observations) {
    const runRecord = matchRunRecord(runRecords, observation);

    for (const field of OBSERVATION_ARTIFACT_FIELDS) {
      const artifactPath = pathFromObservationValue(matterOutputDir, observation[field]);
      addArtifactPathMapping(map, artifactPath, runRecord, observation, field);
    }

    const sidecarPath = pathFromObservationValue(matterOutputDir, observation.evidence_screenshot_metadata_path);
    const mapping = sidecarPath ? map.get(normalizeForMap(sidecarPath)) : null;
    if (mapping) {
      addCaptureChildMappings(map, matterOutputDir, sidecarPath, mapping);
    }
  }

  return map;
}

function inferFileType(relativePath) {
  const basename = path.basename(relativePath);
  const ext = path.extname(basename).toLowerCase();

  if (basename === "playwright-summary.json") return "matter_summary";
  if (basename === "determination-record.json") return "determination_record";
  if (basename === "run-records.json") return "run_records";
  if (basename === "playwright-observations.json") return "observation_records";
  if (basename === "external-output-validation-record.json") return "external_output_validation_record";
  if (basename === "determination-output.txt") return "external_determination_output";
  if (basename.endsWith(".capture-v2.json")) return "capture_metadata";
  if (basename.endsWith(".capture-v2-manifest.json")) return "capture_manifest";
  if (basename.endsWith(".elements.json")) return "element_geometry_snapshot";
  if (basename.endsWith(".artifact-error.json")) return "artifact_capture_error_record";
  if (ext === ".png") return "screenshot_png";
  if (ext === ".html") return "captured_html";
  if (ext === ".txt") return "text_record";
  if (ext === ".json") return "json_record";

  return "unknown_artifact";
}

function inferGenerationStep(relativePath, fileType) {
  const basename = path.basename(relativePath);

  if (
    fileType === "matter_summary" ||
    fileType === "determination_record" ||
    fileType === "run_records" ||
    fileType === "observation_records" ||
    fileType === "external_output_validation_record" ||
    fileType === "external_determination_output"
  ) {
    return "run-playwright-intake";
  }

  if (
    fileType === "screenshot_png" ||
    fileType === "capture_metadata" ||
    fileType === "capture_manifest" ||
    fileType === "element_geometry_snapshot" ||
    basename.includes("_chunks/")
  ) {
    return "artifact-capture-v2";
  }

  if (fileType === "captured_html") {
    return "run-playwright-intake-page-content-capture";
  }

  if (fileType === "artifact_capture_error_record") {
    return "artifact-capture-v2-error-record";
  }

  if (fileType === "text_record" || fileType === "json_record") {
    return "auxiliary-output";
  }

  return "unknown_generation_step";
}

function shouldIncludeInPacket(relativePath) {
  const basename = path.basename(relativePath);

  if (DEFAULT_GENERATED_OUTPUT_NAMES.has(basename)) {
    return false;
  }

  if (DEFAULT_LOCAL_REVIEW_OUTPUT_NAMES.has(basename)) {
    return false;
  }

  return true;
}

function buildManifestEntry(matterOutputDir, filePath, runArtifactMap) {
  const stat = fs.statSync(filePath);
  const relativePath = toRelativePath(matterOutputDir, filePath);
  const fileType = inferFileType(relativePath);
  const generationStep = inferGenerationStep(relativePath, fileType);
  const runMapping = runArtifactMap.get(normalizeForMap(filePath)) || null;

  return {
    file_path: relativePath,
    file_type: fileType,
    generation_step: generationStep,
    matter_id: runMapping ? runMapping.matter_id : "",
    run_id: runMapping ? runMapping.run_id : "",
    run_unit_id: runMapping ? runMapping.run_unit_id : "",
    context_id: runMapping ? runMapping.context_id : "",
    sha256: sha256File(filePath),
    created_timestamp: toIsoTimestamp(stat),
    file_size_bytes: stat.size,
    capture_version: "",
    included_in_packet: shouldIncludeInPacket(relativePath)
  };
}

function attachCaptureVersions(entries, matterOutputDir) {
  for (const entry of entries) {
    if (entry.file_type !== "capture_metadata" && entry.file_type !== "capture_manifest") {
      continue;
    }

    try {
      const json = readJson(path.join(matterOutputDir, entry.file_path), "CAPTURE_VERSION_SOURCE");
      entry.capture_version = String(json.capture_version || "");
    } catch (_error) {
      entry.capture_version = "";
    }
  }

  const captureVersionByRun = new Map();
  for (const entry of entries) {
    if (entry.file_type === "capture_metadata" && entry.run_id && entry.capture_version) {
      captureVersionByRun.set(entry.run_id, entry.capture_version);
    }
  }

  for (const entry of entries) {
    if (!entry.capture_version && entry.run_id && captureVersionByRun.has(entry.run_id)) {
      entry.capture_version = captureVersionByRun.get(entry.run_id);
    }
  }
}

function validateManifestEntries(entries) {
  const errors = [];

  for (const entry of entries) {
    if (entry.included_in_packet !== true) {
      continue;
    }

    if (!entry.file_path) errors.push(`ENTRY_MISSING_FILE_PATH:${entry.file_path}`);
    if (!entry.file_type || entry.file_type === "unknown_artifact") errors.push(`ENTRY_MISSING_FILE_TYPE:${entry.file_path}`);
    if (!entry.generation_step || entry.generation_step === "unknown_generation_step") errors.push(`ENTRY_MISSING_GENERATION_STEP:${entry.file_path}`);
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256))) errors.push(`ENTRY_MISSING_SHA256:${entry.file_path}`);
    if (!Number.isInteger(entry.file_size_bytes) || entry.file_size_bytes < 0) errors.push(`ENTRY_MISSING_FILE_SIZE:${entry.file_path}`);
    if (!entry.created_timestamp || Number.isNaN(Date.parse(entry.created_timestamp))) errors.push(`ENTRY_MISSING_CREATED_TIMESTAMP:${entry.file_path}`);

    const perRunArtifact = [
      "screenshot_png",
      "captured_html",
      "capture_metadata",
      "capture_manifest",
      "element_geometry_snapshot",
      "artifact_capture_error_record"
    ].includes(entry.file_type);

    if (perRunArtifact) {
      if (!entry.run_id) errors.push(`ENTRY_MISSING_RUN_ID:${entry.file_path}`);
      if (!entry.run_unit_id) errors.push(`ENTRY_MISSING_RUN_UNIT_ID:${entry.file_path}`);
      if (!entry.context_id) errors.push(`ENTRY_MISSING_CONTEXT_ID:${entry.file_path}`);
    }
  }

  return errors;
}

function buildEnvironmentRecords(matterOutputDir, runRecords, observations) {
  const records = [];

  for (const runRecord of runRecords) {
    const observation = observations.find((candidate) => {
      return candidate.run_unit_id === runRecord.run_unit_id &&
        candidate.context_id === runRecord.context_id &&
        candidate.run_start_epoch_ms === runRecord.run_start_epoch_ms;
    }) || observations.find((candidate) => {
      return candidate.run_unit_id === runRecord.run_unit_id && candidate.context_id === runRecord.context_id;
    }) || null;

    const sidecarPath = observation
      ? pathFromObservationValue(matterOutputDir, observation.evidence_screenshot_metadata_path)
      : "";

    const sidecar = sidecarPath && fs.existsSync(sidecarPath)
      ? readJson(sidecarPath, "ENVIRONMENT_CAPTURE_SIDECAR")
      : null;

    const runtimeViewport = sidecar && sidecar.runtime_viewport ? sidecar.runtime_viewport : {};
    const invariants = sidecar && sidecar.runtime_invariants ? sidecar.runtime_invariants : {};

    records.push({
      environment_record_version: ENVIRONMENT_RECORD_VERSION,
      matter_id: String(runRecord.matter_id || ""),
      run_id: String(runRecord.run_id || ""),
      run_unit_id: String(runRecord.run_unit_id || ""),
      context_id: String(runRecord.context_id || ""),
      browser_engine: "chromium",
      browser_version: null,
      browser_version_source: "not_captured",
      viewport_width: Number.isFinite(Number(runtimeViewport.width)) ? Number(runtimeViewport.width) : null,
      viewport_height: Number.isFinite(Number(runtimeViewport.height)) ? Number(runtimeViewport.height) : null,
      device_scale_factor: Number.isFinite(Number(runtimeViewport.device_pixel_ratio)) ? Number(runtimeViewport.device_pixel_ratio) : null,
      touch_enabled: typeof invariants.has_touch === "boolean" ? invariants.has_touch : null,
      mobile_emulation_enabled: typeof invariants.is_mobile === "boolean" ? invariants.is_mobile : null,
      screenshot_scale: sidecar ? String(sidecar.screenshot_scale || "") : "",
      cache_isolation_state: String(invariants.cache_state || ""),
      storage_isolation_state: "ephemeral_context_per_run",
      network_restrictions: "url_safety_routes_installed_by_runner",
      capture_version: sidecar ? String(sidecar.capture_version || "") : "",
      run_start_local: String(runRecord.run_start_local || ""),
      run_start_epoch_ms: Number.isFinite(Number(runRecord.run_start_epoch_ms)) ? Number(runRecord.run_start_epoch_ms) : null,
      run_end_local: String(runRecord.run_end_local || ""),
      run_end_epoch_ms: Number.isFinite(Number(runRecord.run_end_epoch_ms)) ? Number(runRecord.run_end_epoch_ms) : null,
      source_capture_metadata_path: sidecarPath ? toRelativePath(matterOutputDir, sidecarPath) : ""
    });
  }

  return records;
}

function buildPacketManifest(matterOutputDir) {
  const resolvedMatterOutputDir = path.resolve(matterOutputDir);
  const artifactDir = path.join(resolvedMatterOutputDir, "artifacts");

  assertExistingPath(resolvedMatterOutputDir, "MATTER_OUTPUT_DIR");
  assertExistingPath(artifactDir, "ARTIFACT_DIR");

  for (const relativePath of REQUIRED_MATTER_FILES) {
    assertExistingPath(path.join(resolvedMatterOutputDir, relativePath), relativePath.replace(/[^A-Z0-9]+/gi, "_").toUpperCase());
  }

  const summary = readJson(path.join(resolvedMatterOutputDir, "playwright-summary.json"), "PLAYWRIGHT_SUMMARY");
  const determination = readJson(path.join(resolvedMatterOutputDir, "determination-record.json"), "DETERMINATION_RECORD");
  const runRecords = readJson(path.join(resolvedMatterOutputDir, "run-records.json"), "RUN_RECORDS");
  const observations = readJson(path.join(resolvedMatterOutputDir, "playwright-observations.json"), "PLAYWRIGHT_OBSERVATIONS");

  const runArtifactMap = buildRunArtifactMap(resolvedMatterOutputDir, runRecords, observations);
  const allFiles = listFilesRecursive(resolvedMatterOutputDir);
  const entries = allFiles.map((filePath) => buildManifestEntry(resolvedMatterOutputDir, filePath, runArtifactMap));

  attachCaptureVersions(entries, resolvedMatterOutputDir);

  const validationErrors = validateManifestEntries(entries);
  if (validationErrors.length) {
    throw new Error(`PACKET_MANIFEST_VALIDATION_FAILED:\n${validationErrors.join("\n")}`);
  }

  const environmentRecords = buildEnvironmentRecords(resolvedMatterOutputDir, runRecords, observations);

  return {
    packet_manifest_version: PACKET_MANIFEST_VERSION,
    generated_at_utc: new Date().toISOString(),
    matter_output_dir: resolvedMatterOutputDir,
    matter_id: String(summary.matter_id || determination.matter_id || ""),
    determination_template: String(determination.determination_template || summary.determination_template || ""),
    entries,
    environment_records: environmentRecords,
    validation: {
      included_entry_count: entries.filter((entry) => entry.included_in_packet === true).length,
      excluded_entry_count: entries.filter((entry) => entry.included_in_packet !== true).length,
      validation_error_count: 0
    }
  };
}

function renderPacketManifestText(manifest) {
  const lines = [];

  lines.push("AFDM Packet Manifest");
  lines.push("");
  lines.push(`Version: ${manifest.packet_manifest_version}`);
  lines.push(`Matter: ${manifest.matter_id}`);
  lines.push(`Determination: ${manifest.determination_template}`);
  lines.push(`Generated UTC: ${manifest.generated_at_utc}`);
  lines.push(`Matter output dir: ${manifest.matter_output_dir}`);
  lines.push("");
  lines.push("Validation");
  lines.push(`Included entries: ${manifest.validation.included_entry_count}`);
  lines.push(`Excluded entries: ${manifest.validation.excluded_entry_count}`);
  lines.push(`Validation errors: ${manifest.validation.validation_error_count}`);
  lines.push("");
  lines.push("Environment Records");

  for (const record of manifest.environment_records) {
    lines.push(`${record.run_id} | ${record.run_unit_id} | ${record.context_id} | ${record.viewport_width}x${record.viewport_height} | DPR ${record.device_scale_factor} | mobile=${record.mobile_emulation_enabled} | touch=${record.touch_enabled}`);
  }

  lines.push("");
  lines.push("Packet Entries");

  for (const entry of manifest.entries) {
    lines.push(`${entry.included_in_packet ? "INCLUDED" : "EXCLUDED"} | ${entry.file_path} | ${entry.file_type} | ${entry.generation_step} | ${entry.run_id || "matter"} | ${entry.sha256}`);
  }

  return `${lines.join("\n")}\n`;
}

function writePacketManifestOutputs(manifest, options) {
  const matterOutputDir = manifest.matter_output_dir;
  const outJson = path.resolve(options && options.outJson || path.join(matterOutputDir, "packet_manifest.json"));
  const outText = path.resolve(options && options.outText || path.join(matterOutputDir, "packet_manifest.txt"));
  const outEnvironmentJson = path.resolve(options && options.outEnvironmentJson || path.join(matterOutputDir, "environment_records.json"));

  writeUtf8File(outJson, `${JSON.stringify(manifest, null, 2)}\n`);
  writeUtf8File(outText, renderPacketManifestText(manifest));
  writeUtf8File(outEnvironmentJson, `${JSON.stringify(manifest.environment_records, null, 2)}\n`);

  return {
    outJson,
    outText,
    outEnvironmentJson
  };
}

module.exports = Object.freeze({
  ENVIRONMENT_RECORD_VERSION,
  PACKET_MANIFEST_VERSION,
  buildPacketManifest,
  buildEnvironmentRecords,
  renderPacketManifestText,
  validateManifestEntries,
  writePacketManifestOutputs
});
