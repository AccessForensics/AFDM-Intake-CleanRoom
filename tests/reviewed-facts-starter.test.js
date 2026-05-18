"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const starterScript = path.join(repoRoot, "tools", "new-reviewed-facts.js");

test("reviewed facts starter creates a matter-specific JSON file without BOM", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-reviewed-facts-starter-"));
  const lawsuitPdfsDir = path.join(tempRoot, "lawsuit_pdfs");
  const factsDir = path.join(tempRoot, "facts");

  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  fs.mkdirSync(lawsuitPdfsDir, { recursive: true });
  fs.writeFileSync(path.join(lawsuitPdfsDir, "Intaketest1.pdf"), "fake pdf placeholder", "utf8");

  execFileSync(
    process.execPath,
    [
      starterScript,
      "--lawsuit-pdfs",
      lawsuitPdfsDir,
      "--facts",
      factsDir,
      "--matter",
      "Intake Test 1",
      "--pdf",
      "Intaketest1.pdf",
      "--site",
      "www.benihana.com"
    ],
    {
      cwd: repoRoot,
      stdio: "pipe"
    }
  );

  const outputPath = path.join(factsDir, "INTAKE_TEST_1_REVIEWED_FACTS.json");
  assert.equal(fs.existsSync(outputPath), true);

  const raw = fs.readFileSync(outputPath);
  assert.notDeepEqual(Array.from(raw.subarray(0, 3)), [0xef, 0xbb, 0xbf]);

  const facts = JSON.parse(raw.toString("utf8"));
  assert.equal(facts.matter_id, "INTAKE_TEST_1");
  assert.equal(facts.raw_pdf_filename, "Intaketest1.pdf");
  assert.equal(facts.source_case.site, "https://www.benihana.com");
  assert.equal(facts.matter_scope, "dual");
  assert.equal(facts.anchors.length, 1);
  assert.match(facts.anchors[0].anchortext, /REPLACE_WITH_FIRST_ACCESSIBILITY_ALLEGATION/);
});

test("reviewed facts starter refuses to overwrite unless overwrite is explicit", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "afdm-reviewed-facts-overwrite-"));
  const lawsuitPdfsDir = path.join(tempRoot, "lawsuit_pdfs");
  const factsDir = path.join(tempRoot, "facts");

  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  fs.mkdirSync(lawsuitPdfsDir, { recursive: true });
  fs.mkdirSync(factsDir, { recursive: true });
  fs.writeFileSync(path.join(lawsuitPdfsDir, "case.pdf"), "fake pdf placeholder", "utf8");
  fs.writeFileSync(path.join(factsDir, "CASE_001_REVIEWED_FACTS.json"), "{}", "utf8");

  assert.throws(
    () => {
      execFileSync(
        process.execPath,
        [
          starterScript,
          "--lawsuit-pdfs",
          lawsuitPdfsDir,
          "--facts",
          factsDir,
          "--matter",
          "CASE-001",
          "--pdf",
          "case.pdf"
        ],
        {
          cwd: repoRoot,
          stdio: "pipe"
        }
      );
    },
    /REVIEWED_FACTS_ALREADY_EXISTS_USE_OVERWRITE/
  );
});