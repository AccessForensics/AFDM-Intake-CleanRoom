#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  classifyProbeCoverageForRunUnits
} = require("../../src/intake/probes/index.js");

const EXIT_OK = 0;
const EXIT_BLOCKED = 2;
const EXIT_USAGE = 64;
const EXIT_ERROR = 1;

const repoRoot = path.resolve(__dirname, "..", "..");
const registryPath = path.join(repoRoot, "intake", "hardening", "unsupported-current-coverage.registry.json");

function fail(message, exitCode = EXIT_ERROR) {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
}

function readJsonFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`Failed to read file: ${filePath}\n${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Failed to parse JSON: ${filePath}\n${error.message}`);
  }
}

function loadRegistry() {
  if (!fs.existsSync(registryPath)) {
    fail(`Unsupported coverage registry not found: ${registryPath}`);
  }

  const registry = readJsonFile(registryPath);

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    fail(`Registry root must be an object: ${registryPath}`);
  }

  if (!registry.matters || typeof registry.matters !== "object" || Array.isArray(registry.matters)) {
    fail(`Registry missing "matters" object: ${registryPath}`);
  }

  return registry;
}

function resolveMatterIdFromPayload(payload, inputPath) {
  if (payload && typeof payload.matter_id === "string" && payload.matter_id.trim().length > 0) {
    return payload.matter_id.trim();
  }

  fail(`JSON file does not contain a usable matter_id: ${inputPath}`);
}

function resolveMatterInputFromPath(inputPath) {
  const absolutePath = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absolutePath)) {
    fail(`Path does not exist: ${inputPath}`);
  }

  const stat = fs.statSync(absolutePath);

  if (stat.isDirectory()) {
    return {
      matterId: path.basename(absolutePath),
      payload: null
    };
  }

  if (path.extname(absolutePath).toLowerCase() === ".json") {
    const payload = readJsonFile(absolutePath);
    return {
      matterId: resolveMatterIdFromPayload(payload, inputPath),
      payload
    };
  }

  const raw = fs.readFileSync(absolutePath, "utf8").trim();
  if (!raw) {
    fail(`Text file is empty and does not provide a matter id: ${inputPath}`);
  }

  return {
    matterId: raw.split(/\r?\n/, 1)[0].trim(),
    payload: null
  };
}

function buildNoRegistryBlock(normalizedMatterId, payload) {
  const hasPayloadRunUnits = Boolean(payload && Array.isArray(payload.run_units));

  return {
    matter_id: normalizedMatterId,
    preflight_status: "no_registry_block",
    production_intake_runnable: hasPayloadRunUnits ? true : null,
    classification_basis: hasPayloadRunUnits
      ? "payload_run_units_resolve_to_supported_probe_families"
      : "no_observed_runtime_registry_block",
    action: "allow_existing_process_to_decide",
    note: hasPayloadRunUnits
      ? "Payload run units resolved to currently supported probe families."
      : "This preflight gate does not assert implemented coverage for unknown matters without payload run units."
  };
}

function classifyMatter(registry, matterId, payload = null) {
  const normalizedMatterId = String(matterId || "").trim();

  if (!normalizedMatterId) {
    fail("Matter id must not be empty.", EXIT_USAGE);
  }

  const entry = registry.matters[normalizedMatterId];

  if (entry) {
    return {
      matter_id: normalizedMatterId,
      preflight_status: "unsupported_current_coverage",
      production_intake_runnable: false,
      classification_basis: "observed_runtime_no_implemented_probe",
      action: "classify_and_stop",
      negative_hardening_fixture: true,
      observed_runtime_outcome_label: entry.observed_runtime_outcome_label,
      observed_runtime_mechanical_note: entry.observed_runtime_mechanical_note,
      site: entry.site,
      asserted_condition: entry.asserted_condition
    };
  }

  if (payload && Array.isArray(payload.run_units)) {
    const coverage = classifyProbeCoverageForRunUnits(payload.run_units);

    if (coverage.unsupported_count > 0) {
      return {
        matter_id: normalizedMatterId,
        preflight_status: "unsupported_current_coverage",
        production_intake_runnable: false,
        classification_basis: coverage.classification_basis,
        action: coverage.action,
        negative_hardening_fixture: false,
        supported_probe_family_count: coverage.supported_count,
        unsupported_probe_family_count: coverage.unsupported_count,
        unsupported_run_units: coverage.unsupported_run_units,
        run_unit_coverage: coverage.run_unit_coverage
      };
    }

    return Object.assign(buildNoRegistryBlock(normalizedMatterId, payload), {
      supported_probe_family_count: coverage.supported_count,
      unsupported_probe_family_count: coverage.unsupported_count,
      run_unit_coverage: coverage.run_unit_coverage
    });
  }

  return buildNoRegistryBlock(normalizedMatterId, payload);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    fail("Usage: node scripts/hardening/preflight-coverage-check.js --matter <MATTER_ID> | --matter-file <PATH> | --all", EXIT_USAGE);
  }

  if (args.includes("--all")) {
    if (args.length !== 1) {
      fail("--all cannot be combined with other arguments.", EXIT_USAGE);
    }
    return { mode: "all" };
  }

  const matterIndex = args.indexOf("--matter");
  if (matterIndex !== -1) {
    const value = args[matterIndex + 1];
    if (!value) {
      fail("Missing value for --matter", EXIT_USAGE);
    }
    if (args.length !== 2) {
      fail("--matter must be used by itself with exactly one value.", EXIT_USAGE);
    }
    return { mode: "single", matterId: value, payload: null };
  }

  const matterFileIndex = args.indexOf("--matter-file");
  if (matterFileIndex !== -1) {
    const value = args[matterFileIndex + 1];
    if (!value) {
      fail("Missing value for --matter-file", EXIT_USAGE);
    }
    if (args.length !== 2) {
      fail("--matter-file must be used by itself with exactly one value.", EXIT_USAGE);
    }

    const resolved = resolveMatterInputFromPath(value);
    return { mode: "single", matterId: resolved.matterId, payload: resolved.payload };
  }

  fail("Unsupported arguments. Use --matter, --matter-file, or --all.", EXIT_USAGE);
}

function main() {
  const parsed = parseArgs(process.argv);
  const registry = loadRegistry();

  if (parsed.mode === "all") {
    const classifications = Object.keys(registry.matters)
      .sort()
      .map((matterId) => classifyMatter(registry, matterId));

    const blockedCount = classifications.filter((item) => item.preflight_status === "unsupported_current_coverage").length;

    printJson({
      scope: registry.scope,
      status: registry.status,
      blocked_count: blockedCount,
      classifications
    });

    process.exit(blockedCount > 0 ? EXIT_BLOCKED : EXIT_OK);
  }

  const classification = classifyMatter(registry, parsed.matterId, parsed.payload);
  printJson(classification);
  process.exit(classification.preflight_status === "unsupported_current_coverage" ? EXIT_BLOCKED : EXIT_OK);
}

main();
