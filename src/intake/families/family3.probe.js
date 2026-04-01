"use strict";

const { OUTCOME_LABEL } = require("../run-record.js");
const {
  normalizeFamily3ProbeInput,
  buildFamily3ProbeInputFromPayload
} = require("../probes/probe-contract.js");
const { classifyFamily3 } = require("./family3.matcher.js");

function buildInsufficient(reason, evidence) {
  return Object.freeze({
    outcome_label: OUTCOME_LABEL.INSUFFICIENT,
    constraint_class: "",
    mechanical_note: reason,
    evidence: Object.freeze(Object.assign({}, evidence || {}))
  });
}

function buildPendingExtraction(reason, evidence) {
  return Object.freeze({
    outcome_label: OUTCOME_LABEL.PENDING_EXTRACTION,
    constraint_class: "",
    mechanical_note: "",
    evidence: Object.freeze(
      Object.assign({}, evidence || {}, {
        pending_extraction_reason: reason
      })
    )
  });
}

async function runFamily3Probe(page, inputOrRequest, legacyBaseUrlOrOptions, maybeOptions) {
  const normalized = normalizeFamily3ProbeInput(
    inputOrRequest,
    legacyBaseUrlOrOptions,
    maybeOptions
  );

  const classification = classifyFamily3(normalized.asserted_condition_text);
  if (!classification.matched) {
    return buildInsufficient(
      "No family 3 route matched the asserted condition text.",
      {
        asserted_condition_text: normalized.asserted_condition_text
      }
    );
  }

  return buildPendingExtraction(
    "Family 3 requires extraction-driven form-label review.",
    {
      asserted_condition_text: normalized.asserted_condition_text,
      matched_bucket: classification.matched_bucket,
      normalized_text: classification.normalized_text
    }
  );
}

function buildFamily3ProbeInputFromMatter(payload, runUnit, baseUrl) {
  return buildFamily3ProbeInputFromPayload(payload, runUnit, baseUrl);
}

module.exports = Object.freeze({
  runFamily3Probe,
  buildFamily3ProbeInputFromMatter
});