"use strict";

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {
    repoRoot: process.cwd(),
    lawsuitPdfsDir: "",
    factsDir: "",
    matter: "",
    pdf: "",
    site: "",
    overwrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--matter") {
      index += 1;
      args.matter = argv[index] || "";
    } else if (value === "--pdf") {
      index += 1;
      args.pdf = argv[index] || "";
    } else if (value === "--site") {
      index += 1;
      args.site = argv[index] || "";
    } else if (value === "--lawsuit-pdfs") {
      index += 1;
      args.lawsuitPdfsDir = path.resolve(argv[index] || "");
    } else if (value === "--facts") {
      index += 1;
      args.factsDir = path.resolve(argv[index] || "");
    } else if (value === "--overwrite") {
      args.overwrite = true;
    } else if (value === "--help" || value === "-h") {
      args.help = true;
    } else {
      throw new Error(`UNKNOWN_ARGUMENT: ${value}`);
    }
  }

  args.lawsuitPdfsDir =
    args.lawsuitPdfsDir || path.join(args.repoRoot, "intake_work", "lawsuit_pdfs");
  args.factsDir = args.factsDir || path.join(args.repoRoot, "intake_work", "facts");

  return args;
}

function printHelp() {
  console.log("");
  console.log("Usage:");
  console.log("  npm run facts:new -- --matter <MATTER_ID> --pdf <PDF_FILE_NAME> [--site <WEBSITE>] [--overwrite]");
  console.log("");
  console.log("Example:");
  console.log("  npm run facts:new -- --matter INTAKETEST1 --pdf Intaketest1.pdf --site https://www.benihana.com/");
  console.log("");
  console.log("Creates:");
  console.log("  intake_work/facts/<MATTER_ID>_REVIEWED_FACTS.json");
  console.log("");
}

function safeTrim(value) {
  return String(value || "").trim();
}

function safeMatterId(value) {
  const safe = safeTrim(value)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  if (!safe) {
    throw new Error("MATTER_ID_REQUIRED");
  }

  return safe;
}

function normalizePotentialUrl(value) {
  const safe = safeTrim(value);

  if (!safe) {
    return "REPLACE_WITH_DEFENDANT_WEBSITE";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(safe)) {
    return safe;
  }

  if (/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(safe)) {
    return `https://${safe}`;
  }

  return safe;
}

function assertPdfFileName(value) {
  const safe = safeTrim(value);

  if (!safe) {
    throw new Error("PDF_FILE_NAME_REQUIRED");
  }

  if (safe.includes("/") || safe.includes("\\")) {
    throw new Error("PDF_FILE_NAME_ONLY_DO_NOT_PASS_FULL_PATH");
  }

  if (!safe.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDF_FILE_MUST_END_WITH_PDF");
  }

  return safe;
}

function makeStarterFacts(matterId, pdfFileName, site) {
  return {
    matter_id: matterId,
    matter_scope: "dual",
    raw_pdf_filename: pdfFileName,
    source_case: {
      site: normalizePotentialUrl(site)
    },
    anchors: [
      {
        complaintgroupanchorid: "A-001",
        anchortext: "REPLACE_WITH_FIRST_ACCESSIBILITY_ALLEGATION_FROM_THE_COMPLAINT.",
        target_url: "",
        target_page_hint: "REPLACE_WITH_PAGE_HINT_IF_SPECIFICALLY_ALLEGED_OR_LEAVE_BLANK",
        target_element_hint: "REPLACE_WITH_ELEMENT_HINT_IF_SPECIFICALLY_ALLEGED_OR_LEAVE_BLANK"
      }
    ],
    reviewer_notes_internal_only:
      "Created by tools/new-reviewed-facts.js. Replace placeholders with facts extracted from the lawsuit PDF after human review. Do not edit EXAMPLE_REVIEWED_FACTS.json."
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const matterId = safeMatterId(args.matter);
  const pdfFileName = assertPdfFileName(args.pdf);

  fs.mkdirSync(args.lawsuitPdfsDir, { recursive: true });
  fs.mkdirSync(args.factsDir, { recursive: true });

  const pdfPath = path.join(args.lawsuitPdfsDir, pdfFileName);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF_NOT_FOUND_IN_LAWSUIT_PDFS_FOLDER: ${pdfPath}`);
  }

  const outputPath = path.join(args.factsDir, `${matterId}_REVIEWED_FACTS.json`);
  if (fs.existsSync(outputPath) && !args.overwrite) {
    throw new Error(`REVIEWED_FACTS_ALREADY_EXISTS_USE_OVERWRITE: ${outputPath}`);
  }

  const starterFacts = makeStarterFacts(matterId, pdfFileName, args.site);
  fs.writeFileSync(outputPath, `${JSON.stringify(starterFacts, null, 2)}\n`, "utf8");

  const written = fs.readFileSync(outputPath);
  if (written.length >= 3 && written[0] === 0xef && written[1] === 0xbb && written[2] === 0xbf) {
    throw new Error(`UTF8_BOM_DETECTED: ${outputPath}`);
  }

  JSON.parse(fs.readFileSync(outputPath, "utf8"));

  console.log("");
  console.log("Reviewed-facts starter created:");
  console.log(`  ${outputPath}`);
  console.log("");
  console.log("Next:");
  console.log("  1. Open the JSON file.");
  console.log("  2. Replace the placeholder allegation text with facts from the lawsuit PDF.");
  console.log("  3. Save with Ctrl+S.");
  console.log("  4. Run npm run prep:payloads.");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Reviewed-facts starter creation failed.");
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
}