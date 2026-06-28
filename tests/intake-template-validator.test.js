"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadTemplateSpec,
  validateTemplateSpec,
  renderTemplate,
  DETERMINATION_TEMPLATE,
} = require("../src/intake/template-validator.js");

test("template spec loads and validates", () => {
  const body = loadTemplateSpec(process.cwd());
  assert.equal(validateTemplateSpec(body), true);
});

test("template renderer accepts non-note template without note", () => {
  const out = renderTemplate(
    DETERMINATION_TEMPLATE.TEMPLATE_1,
    "AF-2026-0001"
  );

  assert.match(out, /MATTER ID: AF-2026-0001/);
  assert.match(out, /DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD/);
  assert.doesNotMatch(out, /\{\{MATTER_LEVEL_NOTE\}\}/);
});

test("template renderer accepts note for template 3", () => {
  const out = renderTemplate(
    DETERMINATION_TEMPLATE.TEMPLATE_3,
    "AF-2026-0002",
    "AUTHWALL blocked bounded Mobile baseline access."
  );

  assert.match(out, /MOBILE BASELINE: CONSTRAINED/);
  assert.match(out, /AUTHWALL blocked bounded Mobile baseline access\./);
});

test("template renderer rejects note for template 2", () => {
  assert.throws(
    () => renderTemplate(
      DETERMINATION_TEMPLATE.TEMPLATE_2,
      "AF-2026-0003",
      "This should not appear."
    ),
    /NOTE_NOT_ALLOWED_FOR_TEMPLATE/
  );
});

test("template renderer rejects multi-sentence note for template 5", () => {
  assert.throws(
    () => renderTemplate(
      DETERMINATION_TEMPLATE.TEMPLATE_5,
      "AF-2026-0004",
      "GEOBLOCK blocked bounded Desktop baseline access. Another sentence."
    ),
    /MATTER_LEVEL_NOTE_MUST_BE_ONE_MECHANICAL_SENTENCE/
  );
});

test("template renderer requires matter id", () => {
  assert.throws(
    () => renderTemplate(
      DETERMINATION_TEMPLATE.TEMPLATE_6,
      ""
    ),
    /MATTER_ID_REQUIRED/
  );
});

test("PR1 regression: template spec validator accepts governed filename, escaped locked note token, and escaped headings", () => {
  const syntheticSpec = [
    "File name: `1-8 Intake Templates.md`",
    "{{MATTER\_LEVEL\_NOTE}} may appear only in Template 3 or Template 5, and only when note permission is authorized under the locked gate.",
    "## **TEMPLATE 1: ELIGIBLE\_DESKTOP\_MOBILE.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_1,
    "## **TEMPLATE 2: ELIGIBLE\_DESKTOP.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_2,
    "## **TEMPLATE 3: ELIGIBLE\_DESKTOP\_WITH\_MOBILE\_CONSTRAINT\_NOTE.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_3,
    "## **TEMPLATE 4: ELIGIBLE\_MOBILE.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_4,
    "## **TEMPLATE 5: ELIGIBLE\_MOBILE\_WITH\_DESKTOP\_CONSTRAINT\_NOTE.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_5,
    "## **TEMPLATE 6: NOT\_ELIGIBLE\_INTAKE.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_6,
    "## **TEMPLATE 7: NOT\_ELIGIBLE\_CONSTRAINTS\_BOT.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_7.replace(" - ", " \- "),
    "## **TEMPLATE 8: NOT\_ELIGIBLE\_CONSTRAINTS\_OTHER.md**",
    DETERMINATION_TEMPLATE.TEMPLATE_8.replace(" - ", " \- "),
  ].join("\n\n");

  assert.equal(validateTemplateSpec(syntheticSpec), true);
});
