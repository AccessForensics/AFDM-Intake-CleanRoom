"use strict";

const fs = require("fs");
const path = require("path");

const {
  assertAtomicCandidate,
  splitAnchorTextIntoCandidates
} = require("../src/intake/rununit-builder.js");

const {
  MATTER_SCOPE,
  buildSequencingPlan
} = require("../src/intake/sequencing.js");

const {
  assertAllowedUrl
} = require("../src/intake/probes/probe-contract.js");

function parseArgs(argv) {
  const args = {
    factsDir: path.join(process.cwd(), "intake_work", "facts"),
    payloadsDir: path.join(process.cwd(), "intake_work", "payloads"),
    overwrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--facts") {
      index += 1;
      if (!argv[index]) {
        throw new Error("--facts requires a directory path");
      }
      args.factsDir = path.resolve(argv[index]);
    } else if (value === "--payloads") {
      index += 1;
      if (!argv[index]) {
        throw new Error("--payloads requires a directory path");
      }
      args.payloadsDir = path.resolve(argv[index]);
    } else if (value === "--overwrite") {
      args.overwrite = true;
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
  console.log("  node tools/prepare-intake-payloads.js [--facts <dir>] [--payloads <dir>] [--overwrite]");
  console.log("");
  console.log("Workflow:");
  console.log("  1. Save lawsuit PDFs in intake_work/lawsuit_pdfs.");
  console.log("  2. Create reviewed facts JSON files in intake_work/facts.");
  console.log("  3. Run this tool to generate engine-ready payloads in intake_work/payloads.");
  console.log("  4. Run node tools/run-intake-batch.js.");
  console.log("");
}

function ensureWorkspaceDirs(repoRoot, factsDir, payloadsDir) {
  const lawsuitPdfDir = path.join(repoRoot, "intake_work", "lawsuit_pdfs");
  const outputDir = path.join(repoRoot, "intake_work", "out");

  fs.mkdirSync(lawsuitPdfDir, { recursive: true });
  fs.mkdirSync(factsDir, { recursive: true });
  fs.mkdirSync(payloadsDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  return Object.freeze({
    lawsuitPdfDir,
    factsDir,
    payloadsDir,
    outputDir
  });
}

function writeExampleFactsFile(factsDir) {
  const examplePath = path.join(factsDir, "EXAMPLE_REVIEWED_FACTS.json");

  if (fs.existsSync(examplePath)) {
    return examplePath;
  }

  const example = {
    matter_id: "EXAMPLE-MATTER-001",
    matter_scope: "dual",
    raw_pdf_filename: "example-complaint.pdf",
    source_case: {
      site: "https://example.com"
    },
    anchors: [
      {
        complaintgroupanchorid: "A-001",
        anchortext: "Images lack meaningful alternative text.\nForm fields lack programmatically associated labels.",
        target_url: "",
        target_page_hint: "homepage or product page, if specifically alleged",
        target_element_hint: "image, form field, popup, menu, cart, checkout, or other feature, if specifically alleged"
      }
    ],
    reviewer_notes_internal_only: "Replace this example with facts extracted from the lawsuit PDF after human review."
  };

  fs.writeFileSync(examplePath, JSON.stringify(example, null, 2), "utf8");
  return examplePath;
}

function safeTrim(value) {
  return String(value || "").trim();
}

function normalizePotentialUrl(value) {
  const safe = safeTrim(value);

  if (!safe) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(safe)) {
    return safe;
  }

  if (/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(safe)) {
    return `https://${safe}`;
  }

  return safe;
}

function safeFilePart(value) {
  const safe = safeTrim(value)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  return safe || "matter";
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`FACTS_JSON_PARSE_FAILED: ${filePath}: ${error.message}`);
  }
}

function validateMatterScope(value) {
  const safe = safeTrim(value || MATTER_SCOPE.DUAL);

  if (!Object.values(MATTER_SCOPE).includes(safe)) {
    throw new Error(`INVALID_MATTER_SCOPE: ${value}`);
  }

  return safe;
}

function buildRunUnitsFromReviewedFacts(facts, sourceSite) {
  if (!Array.isArray(facts.anchors) || facts.anchors.length === 0) {
    throw new Error("REVIEWED_FACTS_ANCHORS_REQUIRED");
  }

  const matterScope = validateMatterScope(facts.matter_scope);

  const desktopInScope = matterScope !== MATTER_SCOPE.MOBILE_ONLY;
  const mobileInScope = matterScope !== MATTER_SCOPE.DESKTOP_ONLY;

  const runUnits = [];
  let counter = 0;

  for (const anchor of facts.anchors) {
    const anchorId = safeTrim(anchor.complaintgroupanchorid || anchor.complaint_group_anchor_id);
    const anchorText = safeTrim(anchor.anchortext || anchor.anchor_text);

    if (!anchorId) {
      throw new Error("REVIEWED_FACT_ANCHOR_ID_REQUIRED");
    }

    if (!anchorText) {
      throw new Error(`REVIEWED_FACT_ANCHOR_TEXT_REQUIRED: ${anchorId}`);
    }

    const targetUrlRaw = normalizePotentialUrl(anchor.target_url || anchor.targetUrl || sourceSite);
    const targetUrl = assertAllowedUrl(targetUrlRaw, `TARGET_URL_${anchorId}`, false);

    const candidates = splitAnchorTextIntoCandidates(anchorText);
    if (candidates.length === 0) {
      throw new Error(`NO_ASSERTED_CONDITION_CANDIDATES: ${anchorId}`);
    }

    for (const candidate of candidates) {
      assertAtomicCandidate(candidate);
      counter += 1;

      runUnits.push(Object.freeze({
        rununitid: `RU-${pad3(counter)}`,
        complaintgroupanchorid: anchorId,
        assertedconditiontext: candidate,
        target_url: targetUrl,
        target_page_hint: safeTrim(anchor.target_page_hint || anchor.targetpagehint),
        target_element_hint: safeTrim(anchor.target_element_hint || anchor.targetelementhint),
        desktopinscope: desktopInScope,
        mobileinscope: mobileInScope,
        createdcontextbasis: "reviewed_lawsuit_fact_extraction"
      }));
    }
  }

  return runUnits;
}

function buildPayloadFromFacts(facts, factsFilePath) {
  const matterId = safeTrim(facts.matter_id || facts.matterId);
  if (!matterId) {
    throw new Error(`MATTER_ID_REQUIRED: ${factsFilePath}`);
  }

  const matterScope = validateMatterScope(facts.matter_scope || facts.matterScope || MATTER_SCOPE.DUAL);

  const sourceCase = facts.source_case && typeof facts.source_case === "object"
    ? facts.source_case
    : {};

  const sourceSiteRaw = normalizePotentialUrl(sourceCase.site || facts.site || facts.website || facts.url);
  const sourceSite = assertAllowedUrl(sourceSiteRaw, "SOURCE_CASE_SITE", false);

  if (!sourceSite) {
    throw new Error(`SOURCE_CASE_SITE_REQUIRED: ${factsFilePath}`);
  }

  const runUnits = buildRunUnitsFromReviewedFacts(
    Object.assign({}, facts, { matter_scope: matterScope }),
    sourceSite
  );

  const sequencingPlan = buildSequencingPlan(runUnits, matterScope);

  return Object.freeze({
    matter_id: matterId,
    matter_scope: matterScope,
    source_case: Object.freeze({
      site: sourceSite
    }),
    run_units: runUnits,
    sequencing_plan: sequencingPlan,
    intake_prep_metadata: Object.freeze({
      source_facts_file: path.basename(factsFilePath),
      raw_pdf_filename: safeTrim(facts.raw_pdf_filename || facts.pdf_filename),
      generated_at_utc: new Date().toISOString(),
      generator: "tools/prepare-intake-payloads.js",
      reviewed_facts_required: true
    })
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const repoRoot = process.cwd();
  const workspace = ensureWorkspaceDirs(repoRoot, args.factsDir, args.payloadsDir);

  const factsFiles = fs
    .readdirSync(args.factsDir)
    .filter((name) => name.toLowerCase().endsWith(".json") && name !== "EXAMPLE_REVIEWED_FACTS.json")
    .sort()
    .map((name) => path.join(args.factsDir, name));

  if (factsFiles.length === 0) {
    const examplePath = writeExampleFactsFile(args.factsDir);

    console.log("");
    console.log("No reviewed facts JSON files were found.");
    console.log("");
    console.log("Workspace folders are ready:");
    console.log(`  Lawsuit PDFs: ${workspace.lawsuitPdfDir}`);
    console.log(`  Reviewed facts: ${workspace.factsDir}`);
    console.log(`  Generated payloads: ${workspace.payloadsDir}`);
    console.log("");
    console.log("I created an example reviewed-facts file:");
    console.log(`  ${examplePath}`);
    console.log("");
    console.log("Next: copy that example, rename it for the lawsuit, fill in the site and allegations, then rerun:");
    console.log("  npm run prep:payloads");
    return;
  }

  let created = 0;
  const rows = [];

  for (const factsFilePath of factsFiles) {
    const facts = readJsonFile(factsFilePath);
    const payload = buildPayloadFromFacts(facts, factsFilePath);
    const outputName = `${safeFilePart(payload.matter_id)}.json`;
    const outputPath = path.join(args.payloadsDir, outputName);

    if (fs.existsSync(outputPath) && !args.overwrite) {
      throw new Error(`PAYLOAD_ALREADY_EXISTS_USE_OVERWRITE: ${outputPath}`);
    }

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
    created += 1;

    rows.push({
      facts_file: path.basename(factsFilePath),
      payload_file: outputName,
      matter_id: payload.matter_id,
      matter_scope: payload.matter_scope,
      run_units: payload.run_units.length,
      sequencing_steps: payload.sequencing_plan.length,
      site: payload.source_case.site
    });
  }

  const manifestPath = path.join(args.payloadsDir, "_payload_prep_manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generated_at_utc: new Date().toISOString(),
        facts_dir: args.factsDir,
        payloads_dir: args.payloadsDir,
        created_payloads: created,
        rows
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("Payload preparation complete.");
  console.log(`Created payloads: ${created}`);
  console.log(`Payload folder: ${args.payloadsDir}`);
  console.log(`Manifest: ${manifestPath}`);
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Payload preparation failed.");
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
}