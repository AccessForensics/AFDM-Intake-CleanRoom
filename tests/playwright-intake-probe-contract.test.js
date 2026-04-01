"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../src/intake/run-record.js");
const {
  assertAllowedUrl,
  normalizeFamily3ProbeInput,
  validateProbeResult
} = require("../src/intake/probes/probe-contract.js");

test("assertAllowedUrl rejects unsupported javascript protocol", () => {
  assert.throws(
    () => assertAllowedUrl("javascript:alert(1)", "TARGET_URL"),
    /TARGET_URL_UNSUPPORTED_PROTOCOL/
  );
});

test("normalizeFamily3ProbeInput maps legacy runner args into family3 contract", () => {
  const request = normalizeFamily3ProbeInput(
    "Search fields lack a label.",
    "https://example.com/search"
  );

  assert.equal(request.asserted_condition_text, "Search fields lack a label.");
  assert.equal(request.target_url, "https://example.com/search");
  assert.equal(request.target_page_hint, "");
  assert.equal(request.target_element_hint, "");
});

test("validateProbeResult requires constraint class for constrained outcome", () => {
  assert.throws(
    () =>
      validateProbeResult({
        outcome_label: OUTCOME_LABEL.CONSTRAINED,
        constraint_class: "",
        mechanical_note: "Bot-mitigation challenge prevented bounded review of the alleged site surface.",
        evidence: {}
      }),
    /CONSTRAINT_CLASS_REQUIRED_FOR_CONSTRAINED_PROBE_RESULT/
  );
});

test("validateProbeResult preserves valid result shape", () => {
  const result = validateProbeResult({
    outcome_label: OUTCOME_LABEL.CONSTRAINED,
    constraint_class: CONSTRAINT_CLASS.BOTMITIGATION,
    mechanical_note: "Bot-mitigation challenge prevented bounded review of the alleged site surface.",
    evidence: { challenge_kind: "test" }
  });

  assert.equal(result.outcome_label, OUTCOME_LABEL.CONSTRAINED);
  assert.equal(result.constraint_class, CONSTRAINT_CLASS.BOTMITIGATION);
  assert.equal(
    result.mechanical_note,
    "Bot-mitigation challenge prevented bounded review of the alleged site surface."
  );
  assert.deepEqual(result.evidence, { challenge_kind: "test" });
});