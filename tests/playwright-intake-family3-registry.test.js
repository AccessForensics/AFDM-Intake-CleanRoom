"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveProbe, matchesFamily3 } = require("../src/intake/probes/index.js");

test("resolveProbe selects family3 family for form-label allegation", function () {
  const result = resolveProbe("Search fields lack a label.");

  assert.ok(result);
  assert.equal(result.family, "family3");
  assert.equal(typeof result.run, "function");
});

test("matchesFamily3 identifies supported allegation text", function () {
  assert.equal(matchesFamily3("Search fields lack a label."), true);
});

test("resolveProbe keeps unsupported generic form wording null", function () {
  const result = resolveProbe("The search feature is confusing.");
  assert.equal(result, null);
});
