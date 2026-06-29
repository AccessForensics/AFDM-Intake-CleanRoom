"use strict";

const path = require("node:path");

const {
  buildPacketManifest,
  writePacketManifestOutputs
} = require("../src/packet/packet-manifest.js");

function printHelp() {
  console.log(`Usage:
  node tools/create-packet-manifest.js --matter-output <matter-output-dir> [--out-json <path>] [--out-text <path>] [--out-env-json <path>]

Purpose:
  Creates packet_manifest.json, packet_manifest.txt, and environment_records.json for a completed AFDM matter output folder.

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
`);
}

function parseArgs(argv) {
  const args = {
    matterOutputDir: "",
    outJson: "",
    outText: "",
    outEnvironmentJson: "",
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

    if (arg === "--out-env-json") {
      args.outEnvironmentJson = String(argv[index + 1] || "");
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

  const manifest = buildPacketManifest(path.resolve(args.matterOutputDir));
  const outputs = writePacketManifestOutputs(manifest, {
    outJson: args.outJson,
    outText: args.outText,
    outEnvironmentJson: args.outEnvironmentJson
  });

  console.log("Packet manifest created.");
  console.log(`JSON: ${outputs.outJson}`);
  console.log(`Text: ${outputs.outText}`);
  console.log(`Environment records: ${outputs.outEnvironmentJson}`);
  console.log("Validation:");
  console.log(JSON.stringify(manifest.validation, null, 2));
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
