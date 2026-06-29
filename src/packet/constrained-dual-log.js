"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  buildPacketManifest
} = require("./packet-manifest.js");

const CONSTRAINED_DUAL_LOG_VERSION = "AFDM_CONSTRAINED_DUAL_LOG_V1";

function writeUtf8File(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`CONSTRAINED_DUAL_LOG_INVALID_JSON_${label}: ${filePath}: ${error.message}`);
  }
}

function assertExistingPath(filePath, label) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`CONSTRAINED_DUAL_LOG_MISSING_REQUIRED_${label}: ${filePath}`);
  }
}

function normalizeContextFamily(contextId) {
  const value = String(contextId || "").toLowerCase();

  if (value.includes("desktop")) {
    return "desktop";
  }

  if (value.includes("mobile")) {
    return "mobile";
  }

  return "other";
}

function isConstrainedRun(run) {
  return String(run && run.outcome_label || "") === "Constrained";
}

function getRunArtifactReferences(packetManifest, runId) {
  return packetManifest.entries
    .filter((entry) => entry.included_in_packet === true && entry.run_id === runId)
    .map((entry) => ({
      file_path: entry.file_path,
      file_type: entry.file_type,
      generation_step: entry.generation_step,
      sha256: entry.sha256,
      file_size_bytes: entry.file_size_bytes,
      capture_version: entry.capture_version
    }));
}

function getEnvironmentRecord(packetManifest, runId) {
  return packetManifest.environment_records.find((record) => record.run_id === runId) || null;
}

function buildRunLogEntry(packetManifest, run) {
  const runId = String(run.run_id || "");

  return {
    run_id: runId,
    run_unit_id: String(run.run_unit_id || ""),
    context_id: String(run.context_id || ""),
    outcome_label: String(run.outcome_label || ""),
    constraint_class: String(run.constraint_class || ""),
    mechanical_note: String(run.mechanical_note || ""),
    browser_engine: "chromium",
    browser_version: null,
    browser_version_source: "not_captured",
    environment_record: getEnvironmentRecord(packetManifest, runId),
    run_start_local: String(run.run_start_local || ""),
    run_start_epoch_ms: Number.isFinite(Number(run.run_start_epoch_ms)) ? Number(run.run_start_epoch_ms) : null,
    run_end_local: String(run.run_end_local || ""),
    run_end_epoch_ms: Number.isFinite(Number(run.run_end_epoch_ms)) ? Number(run.run_end_epoch_ms) : null,
    artifact_references: getRunArtifactReferences(packetManifest, runId)
  };
}

function findPeerContextRun(runRecords, constrainedRun) {
  const constrainedContextFamily = normalizeContextFamily(constrainedRun.context_id);

  return runRecords.find((candidate) => {
    if (candidate.run_id === constrainedRun.run_id) {
      return false;
    }

    if (candidate.run_unit_id !== constrainedRun.run_unit_id) {
      return false;
    }

    const candidateContextFamily = normalizeContextFamily(candidate.context_id);
    return candidateContextFamily !== constrainedContextFamily;
  }) || null;
}

function validateDualLogEntry(entry) {
  const errors = [];
  const constraintLog = entry.constraint_log;

  if (!constraintLog.run_id) errors.push("CONSTRAINT_LOG_MISSING_RUN_ID");
  if (!constraintLog.run_unit_id) errors.push("CONSTRAINT_LOG_MISSING_RUN_UNIT_ID");
  if (!constraintLog.context_id) errors.push("CONSTRAINT_LOG_MISSING_CONTEXT_ID");
  if (constraintLog.outcome_label !== "Constrained") errors.push("CONSTRAINT_LOG_OUTCOME_NOT_CONSTRAINED");
  if (!constraintLog.constraint_class) errors.push("CONSTRAINT_LOG_MISSING_CONSTRAINT_CLASS");
  if (!constraintLog.environment_record) errors.push("CONSTRAINT_LOG_MISSING_ENVIRONMENT_RECORD");
  if (!Array.isArray(constraintLog.artifact_references) || constraintLog.artifact_references.length === 0) {
    errors.push("CONSTRAINT_LOG_MISSING_ARTIFACT_REFERENCES");
  }

  if (entry.peer_context_log) {
    const peerLog = entry.peer_context_log;
    if (!peerLog.run_id) errors.push("PEER_CONTEXT_LOG_MISSING_RUN_ID");
    if (!peerLog.run_unit_id) errors.push("PEER_CONTEXT_LOG_MISSING_RUN_UNIT_ID");
    if (!peerLog.context_id) errors.push("PEER_CONTEXT_LOG_MISSING_CONTEXT_ID");
    if (!peerLog.environment_record) errors.push("PEER_CONTEXT_LOG_MISSING_ENVIRONMENT_RECORD");
    if (!Array.isArray(peerLog.artifact_references) || peerLog.artifact_references.length === 0) {
      errors.push("PEER_CONTEXT_LOG_MISSING_ARTIFACT_REFERENCES");
    }
  }

  return errors;
}

function buildConstrainedDualLog(matterOutputDir) {
  const resolvedMatterOutputDir = path.resolve(matterOutputDir);
  const runRecordsPath = path.join(resolvedMatterOutputDir, "run-records.json");

  assertExistingPath(resolvedMatterOutputDir, "MATTER_OUTPUT_DIR");
  assertExistingPath(runRecordsPath, "RUN_RECORDS");

  const runRecords = readJson(runRecordsPath, "RUN_RECORDS");
  if (!Array.isArray(runRecords)) {
    throw new Error("CONSTRAINED_DUAL_LOG_RUN_RECORDS_NOT_ARRAY");
  }

  const packetManifest = buildPacketManifest(resolvedMatterOutputDir);
  const constrainedRuns = runRecords.filter(isConstrainedRun);
  const entries = [];
  const validationErrors = [];

  for (const run of constrainedRuns) {
    const peerRun = findPeerContextRun(runRecords, run);
    const entry = {
      run_unit_id: String(run.run_unit_id || ""),
      comparison_status: peerRun ? "peer_context_available" : "peer_context_not_available",
      constraint_log: buildRunLogEntry(packetManifest, run),
      peer_context_log: peerRun ? buildRunLogEntry(packetManifest, peerRun) : null
    };

    const entryErrors = validateDualLogEntry(entry);
    if (entryErrors.length) {
      validationErrors.push({
        run_id: String(run.run_id || ""),
        errors: entryErrors
      });
    }

    entries.push(entry);
  }

  if (validationErrors.length) {
    throw new Error(`CONSTRAINED_DUAL_LOG_VALIDATION_FAILED:\n${JSON.stringify(validationErrors, null, 2)}`);
  }

  return {
    constrained_dual_log_version: CONSTRAINED_DUAL_LOG_VERSION,
    generated_at_utc: new Date().toISOString(),
    matter_output_dir: resolvedMatterOutputDir,
    matter_id: String(packetManifest.matter_id || ""),
    constrained_run_count: constrainedRuns.length,
    peer_context_available_count: entries.filter((entry) => entry.comparison_status === "peer_context_available").length,
    peer_context_not_available_count: entries.filter((entry) => entry.comparison_status === "peer_context_not_available").length,
    entries,
    validation: {
      validation_error_count: 0
    }
  };
}

function renderConstrainedDualLogText(dualLog) {
  const lines = [];

  lines.push("AFDM Constrained Dual Log");
  lines.push("");
  lines.push(`Version: ${dualLog.constrained_dual_log_version}`);
  lines.push(`Matter: ${dualLog.matter_id}`);
  lines.push(`Generated UTC: ${dualLog.generated_at_utc}`);
  lines.push(`Matter output dir: ${dualLog.matter_output_dir}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`Constrained runs: ${dualLog.constrained_run_count}`);
  lines.push(`Peer context available: ${dualLog.peer_context_available_count}`);
  lines.push(`Peer context not available: ${dualLog.peer_context_not_available_count}`);
  lines.push("");

  for (const entry of dualLog.entries) {
    lines.push(`Run unit: ${entry.run_unit_id}`);
    lines.push(`Comparison status: ${entry.comparison_status}`);
    lines.push("Constraint Log");
    lines.push(`${entry.constraint_log.run_id} | ${entry.constraint_log.context_id} | ${entry.constraint_log.outcome_label} | ${entry.constraint_log.constraint_class}`);
    lines.push(`Artifacts: ${entry.constraint_log.artifact_references.length}`);

    if (entry.peer_context_log) {
      lines.push("Peer Context Log");
      lines.push(`${entry.peer_context_log.run_id} | ${entry.peer_context_log.context_id} | ${entry.peer_context_log.outcome_label} | ${entry.peer_context_log.constraint_class || ""}`);
      lines.push(`Artifacts: ${entry.peer_context_log.artifact_references.length}`);
    } else {
      lines.push("Peer Context Log");
      lines.push("No peer context run was available in the completed matter output.");
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function writeConstrainedDualLogOutputs(dualLog, options) {
  const matterOutputDir = dualLog.matter_output_dir;
  const outJson = path.resolve(options && options.outJson || path.join(matterOutputDir, "constrained_dual_log.json"));
  const outText = path.resolve(options && options.outText || path.join(matterOutputDir, "constrained_dual_log.txt"));

  writeUtf8File(outJson, `${JSON.stringify(dualLog, null, 2)}\n`);
  writeUtf8File(outText, renderConstrainedDualLogText(dualLog));

  return {
    outJson,
    outText
  };
}

module.exports = Object.freeze({
  CONSTRAINED_DUAL_LOG_VERSION,
  buildConstrainedDualLog,
  renderConstrainedDualLogText,
  writeConstrainedDualLogOutputs
});
