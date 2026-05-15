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

function getRunUnitId(runUnit, index) {
  const id = runUnit && (
    runUnit.rununitid ||
    runUnit.run_unit_id ||
    runUnit.id
  );

  return String(id || `RUNUNIT-${index + 1}`).trim();
}

function getAssertedConditionText(runUnit) {
  return String(
    (runUnit && (
      runUnit.assertedconditiontext ||
      runUnit.asserted_condition_text ||
      runUnit.assertedConditionText ||
      runUnit.condition ||
      runUnit.text
    )) ||
    ""
  ).trim();
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

function getSupportedProbeFamilies() {
  return Object.freeze(PROBE_REGISTRY.map((entry) => entry.id));
}

function classifyProbeCoverageForRunUnits(runUnits) {
  if (!Array.isArray(runUnits)) {
    throw new TypeError("runUnits must be an array");
  }

  const runUnitCoverage = runUnits.map((runUnit, index) => {
    const runUnitId = getRunUnitId(runUnit, index);
    const assertedConditionText = getAssertedConditionText(runUnit);
    const resolved = resolveProbe(assertedConditionText);

    if (!assertedConditionText) {
      return Object.freeze({
        run_unit_id: runUnitId,
        asserted_condition_text: assertedConditionText,
        coverage_status: "unsupported_probe_family",
        supported_probe_family: "",
        classification_basis: "missing_asserted_condition_text",
        action: "classify_and_stop"
      });
    }

    if (!resolved) {
      return Object.freeze({
        run_unit_id: runUnitId,
        asserted_condition_text: assertedConditionText,
        coverage_status: "unsupported_probe_family",
        supported_probe_family: "",
        classification_basis: "no_supported_probe_family_for_asserted_condition",
        action: "classify_and_stop"
      });
    }

    return Object.freeze({
      run_unit_id: runUnitId,
      asserted_condition_text: assertedConditionText,
      coverage_status: "supported_probe_family",
      supported_probe_family: resolved.family,
      classification_basis: "asserted_condition_resolves_to_supported_probe_family",
      action: "allow_playwright_execution"
    });
  });

  const unsupportedRunUnits = runUnitCoverage.filter((item) => item.coverage_status === "unsupported_probe_family");

  return Object.freeze({
    preflight_status: unsupportedRunUnits.length > 0 ? "unsupported_current_coverage" : "supported_probe_coverage",
    production_intake_runnable: unsupportedRunUnits.length === 0,
    classification_basis: unsupportedRunUnits.length > 0
      ? "unsupported_probe_family_for_asserted_condition"
      : "all_run_units_resolve_to_supported_probe_family",
    action: unsupportedRunUnits.length > 0 ? "classify_and_stop" : "allow_playwright_execution",
    supported_count: runUnitCoverage.length - unsupportedRunUnits.length,
    unsupported_count: unsupportedRunUnits.length,
    run_unit_coverage: runUnitCoverage,
    unsupported_run_units: unsupportedRunUnits
  });
}

module.exports = Object.freeze({
  resolveProbe,
  getSupportedProbeFamilies,
  classifyProbeCoverageForRunUnits,
  matchesFamily3,
  matchesLawsuit1: matchesFamily1,
  matchesLawsuit2: matchesFamily2
});
