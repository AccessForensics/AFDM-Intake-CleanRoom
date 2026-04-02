"use strict";

const { detectEnvironmentChallenge } = require("../browser-challenge.js");
const { matchesFamily3 } = require("../families/family3.matcher.js");
const { runFamily3Probe } = require("../families/family3.probe.js");
const { matchesFamily1 } = require("../families/family1.matcher.js");
const { runFamily1Probe } = require("../families/family1.probe.js");
const { matchesFamily2 } = require("../families/family2.matcher.js");
const { runFamily2Probe } = require("../families/family2.probe.js");
const { validateProbeResult } = require("./probe-contract.js");

const PROBE_REGISTRY = Object.freeze([
  Object.freeze({
    id: "family3",
    matches: matchesFamily3,
    run: runFamily3Probe
  }),
  Object.freeze({
    id: "lawsuit1",
    matches: matchesFamily1,
    run: runFamily1Probe
  }),
  Object.freeze({
    id: "lawsuit2",
    matches: matchesFamily2,
    run: runFamily2Probe
  })
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildRegistryRunner(runFn) {
  return async function registryRunner(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
    if (
      legacyBaseUrlOrOptions &&
      typeof legacyBaseUrlOrOptions === "object" &&
      !Array.isArray(legacyBaseUrlOrOptions) &&
      maybeOptions === undefined
    ) {
      const mergedOptions = Object.assign({}, legacyBaseUrlOrOptions, {
        detectEnvironmentChallenge
      });

      return validateProbeResult(
        await runFn(page, inputOrText, mergedOptions)
      );
    }

    const mergedOptions = Object.assign({}, maybeOptions || {}, {
      detectEnvironmentChallenge
    });

    return validateProbeResult(
      await runFn(page, inputOrText, legacyBaseUrlOrOptions, mergedOptions)
    );
  };
}

function resolveProbe(assertedConditionText) {
  const text = normalizeText(assertedConditionText);

  for (const entry of PROBE_REGISTRY) {
    if (entry.matches(text)) {
      return Object.freeze({
        family: entry.id,
        run: buildRegistryRunner(entry.run)
      });
    }
  }

  return null;
}

module.exports = Object.freeze({
  resolveProbe,
  matchesFamily3,
  matchesLawsuit1: matchesFamily1,
  matchesLawsuit2: matchesFamily2
});