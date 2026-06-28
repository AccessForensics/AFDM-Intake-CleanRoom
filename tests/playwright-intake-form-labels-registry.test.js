"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveProbe, matchesFormLabels } = require("../src/intake/probes/index.js");

test("resolveProbe selects neutral form-label probe for label allegation", function () {
  const result = resolveProbe("Search fields lack a label.");
  assert.ok(result);
  assert.equal(result.probe_id, "form_labels_accessible_names");
  assert.equal(typeof result.run, "function");
});

test("matchesFormLabels identifies supported allegation text", function () {
  assert.equal(matchesFormLabels("Search fields lack a label."), true);
});

test("resolveProbe keeps unsupported generic form wording null", function () {
  const result = resolveProbe("The search feature is confusing.");
  assert.equal(result, null);
});
