"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRunUnitsFromAnchors,
  splitAnchorTextIntoCandidates,
} = require("../src/intake/rununit-builder.js");

test("splitAnchorTextIntoCandidates splits comma-also compound allegation", () => {
  const candidates = splitAnchorTextIntoCandidates(
    "Product images lacked alternative text, also the search fields lack a label."
  );

  assert.deepEqual(candidates, [
    "Product images lacked alternative text",
    "the search fields lack a label.",
  ]);
});

test("splitAnchorTextIntoCandidates splits comma-and compound allegation", () => {
  const candidates = splitAnchorTextIntoCandidates(
    "Product images lacked alternative text, and the search fields lack a label."
  );

  assert.deepEqual(candidates, [
    "Product images lacked alternative text",
    "the search fields lack a label.",
  ]);
});

test("buildRunUnitsFromAnchors rejects unsplit compound allegation joined by and", () => {
  assert.throws(
    () => buildRunUnitsFromAnchors([
      Object.freeze({
        complaintgroupanchorid: "CGA-001",
        anchortext: "Product images lacked alternative text and the search fields lack a label.",
      }),
    ]),
    /NON_ATOMIC_ASSERTED_CONDITION/
  );
});

test("buildRunUnitsFromAnchors returns atomic run units for split compound allegation", () => {
  const runUnits = buildRunUnitsFromAnchors([
    Object.freeze({
      complaintgroupanchorid: "CGA-001",
      anchortext: "Product images lacked alternative text, also the search fields lack a label.",
    }),
  ]);

  assert.equal(runUnits.length, 2);
  assert.equal(runUnits[0].assertedconditiontext, "Product images lacked alternative text");
  assert.equal(runUnits[1].assertedconditiontext, "the search fields lack a label.");
});

test("PR1 regression: splitAnchorTextIntoCandidates handles literal newline encodings and squashed bullets", () => {
  const candidates = splitAnchorTextIntoCandidates(
    "-Product images lacked alternative text`n*Search fields lack a label\\n1.Footer links opened new windows without prior warning"
  );

  assert.deepEqual(candidates, [
    "Product images lacked alternative text",
    "Search fields lack a label",
    "Footer links opened new windows without prior warning",
  ]);
});

test("PR1 regression: buildRunUnitsFromAnchors permits natural and phrasing inside one atomic assertion", () => {
  const runUnits = buildRunUnitsFromAnchors([
    Object.freeze({
      complaintgroupanchorid: "CGA-AND-001",
      anchortext: "Keyboard and screen reader users were unable to operate the checkout menu.",
    }),
  ]);

  assert.equal(runUnits.length, 1);
  assert.equal(
    runUnits[0].assertedconditiontext,
    "Keyboard and screen reader users were unable to operate the checkout menu."
  );
});

test("PR1 regression: buildRunUnitsFromAnchors still rejects bundled assertion verbs joined by and", () => {
  assert.throws(
    () => buildRunUnitsFromAnchors([
      Object.freeze({
        complaintgroupanchorid: "CGA-AND-002",
        anchortext: "Product images lacked alternative text and search fields lack a label.",
      }),
    ]),
    /NON_ATOMIC_ASSERTED_CONDITION/
  );
});
