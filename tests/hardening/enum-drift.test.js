"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readIntakeFile(fileName) {
  return fs.readFileSync(
    path.join(__dirname, "..", "..", "src", "intake", fileName),
    "utf8"
  );
}

test("PR3 regression: drift-risk modules do not redeclare canonical enum objects", () => {
  const filesToCheck = [
    "sufficiency-stop.js",
    "determination-router.js",
    "state-isolation.js",
    "mechanical-note-rule.js",
  ];

  const forbiddenRedeclarations = [
    {
      name: "OUTCOME_LABEL",
      pattern: /\bconst\s+OUTCOME_LABEL\s*=\s*Object\.freeze\(/,
      source: "run-record.js",
    },
    {
      name: "CONSTRAINT_CLASS",
      pattern: /\bconst\s+CONSTRAINT_CLASS\s*=\s*Object\.freeze\(/,
      source: "run-record.js",
    },
    {
      name: "MATTER_SCOPE",
      pattern: /\bconst\s+MATTER_SCOPE\s*=\s*Object\.freeze\(/,
      source: "sequencing.js",
    },
  ];

  for (const fileName of filesToCheck) {
    const sourceText = readIntakeFile(fileName);

    for (const rule of forbiddenRedeclarations) {
      assert.doesNotMatch(
        sourceText,
        rule.pattern,
        `${fileName} must not redeclare ${rule.name}; import it from ${rule.source}.`
      );
    }
  }
});

test("PR3 regression: drift-risk modules import canonical enum sources", () => {
  const sufficiencyStop = readIntakeFile("sufficiency-stop.js");
  const determinationRouter = readIntakeFile("determination-router.js");
  const stateIsolation = readIntakeFile("state-isolation.js");
  const mechanicalNoteRule = readIntakeFile("mechanical-note-rule.js");

  assert.match(
    sufficiencyStop,
    /require\("\.\/run-record\.js"\)/,
    "sufficiency-stop.js must import OUTCOME_LABEL from run-record.js"
  );

  assert.match(
    determinationRouter,
    /require\("\.\/run-record\.js"\)/,
    "determination-router.js must import OUTCOME_LABEL and CONSTRAINT_CLASS from run-record.js"
  );

  assert.match(
    determinationRouter,
    /require\("\.\/sequencing\.js"\)/,
    "determination-router.js must import MATTER_SCOPE from sequencing.js"
  );

  assert.match(
    stateIsolation,
    /require\("\.\/run-record\.js"\)/,
    "state-isolation.js must import OUTCOME_LABEL, CONSTRAINT_CLASS, and CONSTRAINT_VALUES from run-record.js"
  );

  assert.match(
    mechanicalNoteRule,
    /require\("\.\/run-record\.js"\)/,
    "mechanical-note-rule.js must import OUTCOME_LABEL from run-record.js"
  );
});