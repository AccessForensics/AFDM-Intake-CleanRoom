"use strict";

const { matchesFamily3 } = require("../families/family3.matcher.js");
const { runFamily3Probe } = require("../families/family3.probe.js");
const { matchesLawsuit1, runLawsuit1Probe } = require("./lawsuit1.js");
const { runLawsuit2Probe } = require("./lawsuit2.js");

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function matchesLawsuit2(assertedConditionText) {
  const text = normalizeText(assertedConditionText);

  return [
    "advertisement pop up links",
    "use of the cursor to close the advertisement",
    "fails to read links on the website"
  ].some((needle) => text.includes(needle));
}

function resolveProbe(assertedConditionText) {
  const text = normalizeText(assertedConditionText);

  if (matchesFamily3(text)) {
    return Object.freeze({
      family: "family3",
      run: runFamily3Probe
    });
  }

  if (matchesLawsuit1(text)) {
    return Object.freeze({
      family: "lawsuit1",
      run: runLawsuit1Probe
    });
  }

  if (matchesLawsuit2(text)) {
    return Object.freeze({
      family: "lawsuit2",
      run: runLawsuit2Probe
    });
  }

  return null;
}

module.exports = Object.freeze({
  resolveProbe,
  matchesFamily3,
  matchesLawsuit1,
  matchesLawsuit2
});
