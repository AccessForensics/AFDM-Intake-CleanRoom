"use strict";

const { detectEnvironmentChallenge } = require("../browser-challenge.js");
const { matchesFormLabels } = require("../families/form-labels.matcher.js");
const { runFormLabelsProbe } = require("../families/form-labels.probe.js");
const { matchesFamily1 } = require("../families/family1.matcher.js");
const { runFamily1Probe } = require("../families/family1.probe.js");
const { matchesFamily2 } = require("../families/family2.matcher.js");
const { runFamily2Probe } = require("../families/family2.probe.js");
const { validateProbeResult } = require("./probe-contract.js");

const PROBE_REGISTRY = Object.freeze([
  { id: "form_labels_accessible_names", matches: matchesFormLabels, run: runFormLabelsProbe },
  { id: "lawsuit1", matches: matchesFamily1, run: runFamily1Probe },
  { id: "lawsuit2", matches: matchesFamily2, run: runFamily2Probe }
].map(Object.freeze));

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getRunUnitId(runUnit, index) {
  return String((runUnit && (runUnit.rununitid || runUnit.run_unit_id || runUnit.id)) || `RUNUNIT-${index + 1}`).trim();
}

function getAssertedConditionText(runUnit) {
  return String((runUnit && (runUnit.assertedconditiontext || runUnit.asserted_condition_text || runUnit.assertedConditionText || runUnit.condition || runUnit.text)) || "").trim();
}

function buildRegistryRunner(runFn) {
  return async function registryRunner(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
    const options = legacyBaseUrlOrOptions && typeof legacyBaseUrlOrOptions === "object" && !Array.isArray(legacyBaseUrlOrOptions) && maybeOptions === undefined
      ? legacyBaseUrlOrOptions
      : maybeOptions || {};
    const mergedOptions = Object.assign({}, options, { detectEnvironmentChallenge });
    const result = legacyBaseUrlOrOptions && typeof legacyBaseUrlOrOptions === "string"
      ? await runFn(page, inputOrText, legacyBaseUrlOrOptions, mergedOptions)
      : await runFn(page, inputOrText, mergedOptions);
    return validateProbeResult(result);
  };
}

function resolveProbe(assertedConditionText) {
  const text = normalizeText(assertedConditionText);
  for (const entry of PROBE_REGISTRY) {
    if (entry.matches(text)) {
      return Object.freeze({ probe_id: entry.id, family: entry.id, run: buildRegistryRunner(entry.run) });
    }
  }
  return null;
}

function getSupportedProbeFamilies() {
  return Object.freeze(PROBE_REGISTRY.map((entry) => entry.id));
}

function coverageRow(runUnit, index) {
  const runUnitId = getRunUnitId(runUnit, index);
  const assertedConditionText = getAssertedConditionText(runUnit);
  const resolved = resolveProbe(assertedConditionText);
  if (!assertedConditionText || !resolved) {
    return Object.freeze({
      run_unit_id: runUnitId,
      asserted_condition_text: assertedConditionText,
      coverage_status: "unsupported_probe_family",
      supported_probe_family: "",
      classification_basis: assertedConditionText ? "no_supported_probe_family_for_asserted_condition" : "missing_asserted_condition_text",
      action: "classify_and_stop"
    });
  }
  return Object.freeze({
    run_unit_id: runUnitId,
    asserted_condition_text: assertedConditionText,
    coverage_status: "supported_probe_family",
    supported_probe_family: resolved.probe_id,
    classification_basis: "asserted_condition_resolves_to_supported_probe_family",
    action: "allow_playwright_execution"
  });
}

function classifyProbeCoverageForRunUnits(runUnits) {
  if (!Array.isArray(runUnits)) throw new TypeError("runUnits must be an array");
  const run_unit_coverage = runUnits.map(coverageRow);
  const unsupported_run_units = run_unit_coverage.filter((item) => item.coverage_status === "unsupported_probe_family");
  const blocked = unsupported_run_units.length > 0;
  return Object.freeze({
    preflight_status: blocked ? "unsupported_current_coverage" : "supported_probe_coverage",
    production_intake_runnable: !blocked,
    classification_basis: blocked ? "unsupported_probe_family_for_asserted_condition" : "all_run_units_resolve_to_supported_probe_family",
    action: blocked ? "classify_and_stop" : "allow_playwright_execution",
    supported_count: run_unit_coverage.length - unsupported_run_units.length,
    unsupported_count: unsupported_run_units.length,
    run_unit_coverage,
    unsupported_run_units
  });
}

module.exports = Object.freeze({
  resolveProbe,
  getSupportedProbeFamilies,
  classifyProbeCoverageForRunUnits,
  matchesFormLabels,
  matchesLawsuit1: matchesFamily1,
  matchesLawsuit2: matchesFamily2
});
