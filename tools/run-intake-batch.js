"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function parseArgs(argv) {
  const args = {
    payloadsDir: path.join(process.cwd(), "intake_work", "payloads"),
    outDir: path.join(process.cwd(), "intake_work", "out"),
    allowFileProtocol: false,
    dryRun: false,
    skipGuardrails: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--payloads") {
      index += 1;
      if (!argv[index]) {
        throw new Error("--payloads requires a directory path");
      }
      args.payloadsDir = path.resolve(argv[index]);
    } else if (value === "--out") {
      index += 1;
      if (!argv[index]) {
        throw new Error("--out requires a directory path");
      }
      args.outDir = path.resolve(argv[index]);
    } else if (value === "--allow-file-protocol") {
      args.allowFileProtocol = true;
    } else if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--skip-guardrails") {
      args.skipGuardrails = true;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else {
      throw new Error(`UNKNOWN_ARGUMENT: ${value}`);
    }
  }

  return args;
}

function printHelp() {
  console.log("");
  console.log("Usage:");
  console.log("  node tools/run-intake-batch.js [--payloads <dir>] [--out <dir>] [--dry-run] [--skip-guardrails]");
  console.log("");
  console.log("Production mode:");
  console.log("  By default, file: URLs are not allowed.");
  console.log("  Do not pass --allow-file-protocol for real lawsuits.");
  console.log("");
}

function safeFilePart(value) {
  const safe = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  return safe || "matter";
}

function readJsonOrNull(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function ensureJsonParseable(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`PAYLOAD_JSON_PARSE_FAILED: ${filePath}: ${error.message}`);
  }
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function writeCsv(filePath, rows) {
  const columns = [
    "payload_file",
    "status",
    "exit_code",
    "matter_id",
    "matter_scope",
    "determination_template",
    "stop_basis",
    "executed_steps",
    "run_count",
    "observed_as_asserted",
    "not_observed_as_asserted",
    "constrained",
    "insufficient",
    "preflight_status",
    "output_dir",
    "stdout_log",
    "stderr_log"
  ];

  const lines = [columns.map(csvEscape).join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function runGuardrails(repoRoot) {
  const guardrailsScript = path.join(repoRoot, "tools", "ci", "guardrails_check.js");

  const result = spawnSync(
    process.execPath,
    [guardrailsScript],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw new Error(`Guardrails process failed before batch execution: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Guardrails failed before batch execution with exit code ${result.status}.`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const repoRoot = process.cwd();
  const runnerPath = path.join(repoRoot, "tools", "run-playwright-intake.js");

  if (!fs.existsSync(runnerPath)) {
    throw new Error(`INTAKE_RUNNER_NOT_FOUND: ${runnerPath}`);
  }

  if (!fs.existsSync(args.payloadsDir)) {
    fs.mkdirSync(args.payloadsDir, { recursive: true });
    console.log("");
    console.log("Created payload folder:");
    console.log(`  ${args.payloadsDir}`);
    console.log("");
    console.log("No payloads were found. Run npm run prep:payloads after creating reviewed facts files.");
    return;
  }

  const payloadFiles = fs
    .readdirSync(args.payloadsDir)
    .filter((name) => name.toLowerCase().endsWith(".json") && !name.startsWith("_"))
    .sort()
    .map((name) => path.join(args.payloadsDir, name));

  if (payloadFiles.length === 0) {
    console.log("");
    console.log("No payload JSON files found in:");
    console.log(`  ${args.payloadsDir}`);
    console.log("");
    console.log("Run npm run prep:payloads first.");
    return;
  }

  if (!args.skipGuardrails) {
    console.log("Running guardrails before batch...");
    runGuardrails(repoRoot);
  }

  fs.mkdirSync(args.outDir, { recursive: true });

  const batchStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const batchOutputDir = path.join(args.outDir, `batch_${batchStamp}`);
  fs.mkdirSync(batchOutputDir, { recursive: true });

  const rows = [];
  let successCount = 0;
  let preflightBlockedCount = 0;
  let failureCount = 0;
  let dryRunCount = 0;

  for (const payloadFile of payloadFiles) {
    const payload = ensureJsonParseable(payloadFile);
    const matterId = payload && payload.matter_id ? String(payload.matter_id) : path.basename(payloadFile, ".json");
    const matterOutDir = path.join(batchOutputDir, safeFilePart(matterId));
    fs.mkdirSync(matterOutDir, { recursive: true });

    const stdoutPath = path.join(matterOutDir, "stdout.log");
    const stderrPath = path.join(matterOutDir, "stderr.log");

    let exitCode = 0;
    let status = "";
    let summary = null;
    let determination = null;
    let preflight = null;

    if (args.dryRun) {
      status = "DRY_RUN_READY";
      dryRunCount += 1;
      fs.writeFileSync(stdoutPath, "Dry run only. Runner was not executed.\n", "utf8");
      fs.writeFileSync(stderrPath, "", "utf8");
      console.log(`DRY RUN: ${path.basename(payloadFile)}`);
    } else {
      console.log(`Running payload: ${path.basename(payloadFile)}`);

      const runnerArgs = [
        runnerPath,
        payloadFile,
        matterOutDir
      ];

      if (args.allowFileProtocol) {
        runnerArgs.push("--allow-file-protocol");
      }

      const result = spawnSync(process.execPath, runnerArgs, {
        cwd: repoRoot,
        encoding: "utf8"
      });

      exitCode = typeof result.status === "number" ? result.status : 1;

      fs.writeFileSync(stdoutPath, result.stdout || "", "utf8");
      fs.writeFileSync(stderrPath, result.stderr || "", "utf8");

      summary = readJsonOrNull(path.join(matterOutDir, "playwright-summary.json"));
      determination = readJsonOrNull(path.join(matterOutDir, "determination-record.json"));
      preflight = readJsonOrNull(path.join(matterOutDir, "preflight-classification.json"));

      if (exitCode === 0) {
        status = "SUCCESS";
        successCount += 1;
      } else if (exitCode === 2) {
        status = "PREFLIGHT_BLOCKED_UNSUPPORTED_COVERAGE";
        preflightBlockedCount += 1;
      } else {
        status = "FAILED";
        failureCount += 1;
      }

      console.log(`Result: ${status}`);
    }

    const progress = summary && summary.progress ? summary.progress : null;

    rows.push({
      payload_file: path.basename(payloadFile),
      status,
      exit_code: exitCode,
      matter_id: summary && summary.matter_id ? String(summary.matter_id) : matterId,
      matter_scope: summary && summary.matter_scope ? String(summary.matter_scope) : String(payload.matter_scope || ""),
      determination_template:
        summary && summary.determination_template
          ? String(summary.determination_template)
          : determination && determination.determination_template
            ? String(determination.determination_template)
            : "",
      stop_basis: progress && progress.stop_basis ? String(progress.stop_basis) : "",
      executed_steps: summary && summary.executed_steps != null ? String(summary.executed_steps) : "",
      run_count: summary && summary.run_count != null ? String(summary.run_count) : "",
      observed_as_asserted: summary && summary.observed_as_asserted != null ? String(summary.observed_as_asserted) : "",
      not_observed_as_asserted: summary && summary.not_observed_as_asserted != null ? String(summary.not_observed_as_asserted) : "",
      constrained: summary && summary.constrained != null ? String(summary.constrained) : "",
      insufficient: summary && summary.insufficient != null ? String(summary.insufficient) : "",
      preflight_status: preflight && preflight.preflight_status ? String(preflight.preflight_status) : "",
      output_dir: matterOutDir,
      stdout_log: stdoutPath,
      stderr_log: stderrPath
    });
  }

  const manifestPath = path.join(batchOutputDir, "batch_manifest.json");
  const csvPath = path.join(batchOutputDir, "batch_summary.csv");
  const txtPath = path.join(batchOutputDir, "batch_summary.txt");

  const manifest = {
    batch_stamp: batchStamp,
    repo_root: repoRoot,
    head_commit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout.trim(),
    payloads_dir: args.payloadsDir,
    batch_output_dir: batchOutputDir,
    total_payloads: payloadFiles.length,
    success_count: successCount,
    preflight_blocked_count: preflightBlockedCount,
    failure_count: failureCount,
    dry_run_count: dryRunCount,
    production_mode: args.allowFileProtocol ? "fixture_file_protocol_allowed" : "strict_http_https_only_no_allow_file_protocol",
    rows
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  writeCsv(csvPath, rows);

  const txtLines = [
    "=== AFDM Intake Batch Summary ===",
    `Batch stamp: ${batchStamp}`,
    `Payloads: ${payloadFiles.length}`,
    `Success: ${successCount}`,
    `Preflight blocked unsupported coverage: ${preflightBlockedCount}`,
    `Failed: ${failureCount}`,
    `Dry run ready: ${dryRunCount}`,
    "",
    "Output directory:",
    batchOutputDir,
    "",
    "Rows:"
  ];

  for (const row of rows) {
    txtLines.push(`${row.status} | ${row.payload_file} | matter=${row.matter_id} | template=${row.determination_template} | stop=${row.stop_basis}`);
  }

  fs.writeFileSync(txtPath, `${txtLines.join("\n")}\n`, "utf8");

  console.log("");
  console.log("Batch complete.");
  console.log(`Output: ${batchOutputDir}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Text summary: ${txtPath}`);

  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Batch runner failed.");
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
}