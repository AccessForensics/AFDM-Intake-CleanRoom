"use strict";

const {
  OUTCOME_LABEL,
  OUTCOME_VALUES,
  CONSTRAINT_VALUES
} = require("../run-record.js");

const PRODUCTION_PROTOCOLS = Object.freeze(new Set(["http:", "https:"]));
const FIXTURE_PROTOCOLS = Object.freeze(new Set(["http:", "https:", "file:"]));

function safeTrim(value) {
  return String(value || "").trim();
}

function pickFirstNonEmpty() {
  for (const value of arguments) {
    const safe = safeTrim(value);
    if (safe) return safe;
  }
  return "";
}

function countSentences(text) {
  return safeTrim(text).split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
}

function resolveAllowedProtocols(allowFileProtocol) {
  return allowFileProtocol === true ? FIXTURE_PROTOCOLS : PRODUCTION_PROTOCOLS;
}

function assertAllowedUrl(value, fieldName, allowFileProtocol = false) {
  const safe = safeTrim(value);
  if (!safe) return "";
  let parsed;
  try {
    parsed = new URL(safe);
  } catch (_error) {
    throw new Error(`${fieldName || "URL"}_INVALID: ${safe}`);
  }
  if (parsed.protocol === "file:" && allowFileProtocol !== true) {
    throw new Error(`${fieldName || "URL"}_UNSUPPORTED_PROTOCOL_FOR_PRODUCTION: ${parsed.protocol}`);
  }
  if (!resolveAllowedProtocols(allowFileProtocol).has(parsed.protocol)) {
    throw new Error(`${fieldName || "URL"}_UNSUPPORTED_PROTOCOL: ${parsed.protocol}`);
  }
  return parsed.toString();
}

function normalizeProbeRequest(input, fallbackBaseUrl, allowFileProtocol = false) {
  const normalizedFallbackUrl = assertAllowedUrl(fallbackBaseUrl, "BASE_URL", allowFileProtocol);
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return Object.freeze({
      matter_id: pickFirstNonEmpty(input.matter_id),
      run_unit_id: pickFirstNonEmpty(input.run_unit_id, input.rununitid),
      complaint_group_anchor_id: pickFirstNonEmpty(input.complaint_group_anchor_id, input.complaintgroupanchorid),
      probe_group_id: pickFirstNonEmpty(input.probe_group_id),
      asserted_condition_text: pickFirstNonEmpty(input.asserted_condition_text, input.assertedconditiontext),
      target_url: assertAllowedUrl(pickFirstNonEmpty(input.target_url, normalizedFallbackUrl), "TARGET_URL", allowFileProtocol),
      target_page_hint: pickFirstNonEmpty(input.target_page_hint, input.targetpagehint),
      target_element_hint: pickFirstNonEmpty(input.target_element_hint, input.targetelementhint),
      baseline_scope: pickFirstNonEmpty(input.baseline_scope, input.baselineScope, input.matter_scope)
    });
  }
  return Object.freeze({
    matter_id: "",
    run_unit_id: "",
    complaint_group_anchor_id: "",
    probe_group_id: "",
    asserted_condition_text: pickFirstNonEmpty(input),
    target_url: normalizedFallbackUrl,
    target_page_hint: "",
    target_element_hint: "",
    baseline_scope: ""
  });
}

function normalizeProbeInput(inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
  const options = legacyBaseUrlOrOptions && typeof legacyBaseUrlOrOptions === "object" && !Array.isArray(legacyBaseUrlOrOptions) && maybeOptions === undefined
    ? legacyBaseUrlOrOptions
    : maybeOptions && typeof maybeOptions === "object" && !Array.isArray(maybeOptions)
      ? maybeOptions
      : {};
  const fallbackBaseUrl = typeof legacyBaseUrlOrOptions === "string"
    ? legacyBaseUrlOrOptions
    : pickFirstNonEmpty(options.base_url, options.baseUrl, options.target_url);
  const allowFileProtocol = options.allowFileProtocol === true || options.allow_file_protocol === true || options.fixtureMode === true || options.fixture_mode === true;
  const normalizedOptions = Object.freeze(Object.assign({}, options, {
    allowFileProtocol,
    base_url: assertAllowedUrl(fallbackBaseUrl, "BASE_URL", allowFileProtocol)
  }));
  return Object.freeze({
    request: normalizeProbeRequest(inputOrText, normalizedOptions.base_url, allowFileProtocol),
    options: normalizedOptions
  });
}

function buildProbeInputFromPayload(payload, runUnit, baseUrl, allowFileProtocol = false) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("PAYLOAD_OBJECT_REQUIRED");
  if (!runUnit || typeof runUnit !== "object" || Array.isArray(runUnit)) throw new Error("RUN_UNIT_OBJECT_REQUIRED");
  return normalizeProbeRequest({
    matter_id: payload.matter_id,
    matter_scope: payload.matter_scope,
    run_unit_id: runUnit.run_unit_id,
    rununitid: runUnit.rununitid,
    complaint_group_anchor_id: runUnit.complaint_group_anchor_id,
    complaintgroupanchorid: runUnit.complaintgroupanchorid,
    probe_group_id: runUnit.probe_group_id,
    asserted_condition_text: runUnit.asserted_condition_text,
    assertedconditiontext: runUnit.assertedconditiontext,
    target_url: runUnit.target_url,
    target_page_hint: runUnit.target_page_hint,
    target_element_hint: runUnit.target_element_hint,
    baseline_scope: runUnit.baseline_scope || payload.matter_scope
  }, baseUrl, allowFileProtocol);
}

function validateProbeResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("PROBE_RESULT_OBJECT_REQUIRED");
  const outcome_label = safeTrim(result.outcome_label);
  if (!OUTCOME_VALUES.includes(outcome_label)) throw new Error(`INVALID_PROBE_OUTCOME_LABEL: ${result.outcome_label}`);
  const constraint_class = safeTrim(result.constraint_class);
  if (outcome_label === OUTCOME_LABEL.CONSTRAINED) {
    if (!CONSTRAINT_VALUES.includes(constraint_class)) throw new Error(`CONSTRAINT_CLASS_REQUIRED_FOR_CONSTRAINED_PROBE_RESULT: ${result.constraint_class}`);
  } else if (constraint_class) {
    throw new Error("CONSTRAINT_CLASS_NOT_ALLOWED_FOR_NON_CONSTRAINED_PROBE_RESULT");
  }
  const mechanical_note = safeTrim(result.mechanical_note);
  if (mechanical_note) {
    const noteAllowed = outcome_label === OUTCOME_LABEL.CONSTRAINED || outcome_label === OUTCOME_LABEL.INSUFFICIENT;
    if (!noteAllowed) throw new Error("MECHANICAL_NOTE_NOT_ALLOWED_FOR_OBSERVED_OR_NOT_OBSERVED");
    if (countSentences(mechanical_note) !== 1) throw new Error("PROBE_MECHANICAL_NOTE_MUST_BE_ONE_SENTENCE");
  }
  const evidence = result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence)
    ? Object.freeze(Object.assign({}, result.evidence))
    : Object.freeze({});
  return Object.freeze({ outcome_label, constraint_class, mechanical_note, evidence });
}

module.exports = Object.freeze({
  assertAllowedUrl,
  normalizeProbeRequest,
  normalizeProbeInput,
  buildProbeInputFromPayload,
  validateProbeResult,
  normalizeFormLabelsProbeInput: normalizeProbeRequest,
  buildFormLabelsProbeInputFromPayload: buildProbeInputFromPayload
});
