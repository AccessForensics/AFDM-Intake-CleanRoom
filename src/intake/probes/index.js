"use strict";

const { matchesFamily3 } = require("../families/family3.matcher.js");
const { runFamily3Probe } = require("../families/family3.probe.js");
const { detectEnvironmentChallenge } = require("../browser-challenge.js");
const { matchesLawsuit1, runLawsuit1Probe } = require("./lawsuit1.js");
const { runLawsuit2Probe } = require("./lawsuit2.js");
const {
  normalizeFamily3ProbeInput,
  validateProbeResult
} = require("./probe-contract.js");

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

async function runFamily3FromRegistry(page, runUnitOrText, baseUrl) {
  const runUnit = normalizeFamily3ProbeInput(runUnitOrText, baseUrl);
  const result = await runFamily3Probe(page, runUnit, {
    base_url: baseUrl,
    detectEnvironmentChallenge
  });

  return validateProbeResult(result);
}

function resolveProbe(assertedConditionText) {
  const text = normalizeText(assertedConditionText);

  if (matchesFamily3(text)) {
    return Object.freeze({
      family: "family3",
      run: runFamily3FromRegistry
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