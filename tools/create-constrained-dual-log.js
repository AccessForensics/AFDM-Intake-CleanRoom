"use strict";

const path = require("node:path");

const {
  buildConstrainedDualLog,
  writeConstrainedDualLogOutputs
} = require("../src/packet/constrained-dual-log.js");

function printHelp() {
  console.log(`Usage:
  node tools/create-constrained-dual-log.js --matter-output <matter-output-dir> [--out-json <path>] [--out-text <path>]

Purpose:
  Creates constrained_dual_log.json and constrained_dual_log.txt for a completed AFDM matter output folder.

Required matter output files:
  playwright-summary.json
  determination-record.json
  run-records.json
  playwright-observations.json
  external-output-validation-record.json
  determination-output.txt
  artifacts/

Notes:
  This is a post-intake packet/technical-record utility.
  It does not change intake determinations, run records, screenshots, HTML captures, or source code.
  It records constrained runs and, where available in the completed matter output, the peer context run for the same run unit.
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

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.matterOutputDir) {
    throw new Error("MISSING_REQUIRED_ARGUMENT: --matter-output");
  }

  const dualLog = buildConstrainedDualLog(path.resolve(args.matterOutputDir));
  const outputs = writeConstrainedDualLogOutputs(dualLog, {
    outJson: args.outJson,
    outText: args.outText
  });

  console.log("Constrained dual log created.");
  console.log(`JSON: ${outputs.outJson}`);
  console.log(`Text: ${outputs.outText}`);
  console.log("Summary:");
  console.log(JSON.stringify({
    constrained_run_count: dualLog.constrained_run_count,
    peer_context_available_count: dualLog.peer_context_available_count,
    peer_context_not_available_count: dualLog.peer_context_not_available_count,
    validation: dualLog.validation
  }, null, 2));
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
  parseArgs
});
