"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveProbe, matchesLawsuit2 } = require("../src/intake/probes/index.js");
const { matchesLawsuit1 } = require("../src/intake/probes/lawsuit1.js");

test("matchesLawsuit1 does not overmatch generic heading wording", () => {
  assert.equal(matchesLawsuit1("The heading color is blue"), false);
});

test("matchesLawsuit1 does not overmatch generic menu wording", () => {
  assert.equal(matchesLawsuit1("The menu is visible"), false);
});

test("matchesLawsuit2 does not overmatch generic popup wording", () => {
  assert.equal(matchesLawsuit2("Popup appears on page"), false);
});

test("matchesLawsuit2 does not overmatch generic link wording", () => {
  assert.equal(matchesLawsuit2("Links are present on the website"), false);
});

test("resolveProbe keeps exact lawsuit1 phrase support", () => {
  const resolved = resolveProbe("Heading hierarchy was not properly defined");
  assert.equal(resolved.family, "lawsuit1");
});

test("resolveProbe keeps exact lawsuit2 phrase support", () => {
  const resolved = resolveProbe("Screen reader fails to read links on the website");
  assert.equal(resolved.family, "lawsuit2");
});

test("resolveProbe returns null for weak partial popup phrasing", () => {
  const resolved = resolveProbe("There was a popup issue");
  assert.equal(resolved, null);
});

test("resolveProbe returns null for weak partial heading phrasing", () => {
  const resolved = resolveProbe("Heading issue observed");
  assert.equal(resolved, null);
});