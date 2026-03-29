"use strict";

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
  if (matchesLawsuit1(assertedConditionText)) {
    return Object.freeze({
      family: "lawsuit1",
      run: runLawsuit1Probe
    });
  }

  if (matchesLawsuit2(assertedConditionText)) {
    return Object.freeze({
      family: "lawsuit2",
      run: runLawsuit2Probe
    });
  }

  return null;
}

module.exports = Object.freeze({
  resolveProbe,
  matchesLawsuit2
});