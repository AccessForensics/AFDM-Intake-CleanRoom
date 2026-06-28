"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../src/intake/run-record.js");
const {
  assertAllowedUrl,
  normalizeFormLabelsProbeInput,
  validateProbeResult
} = require("../src/intake/probes/probe-contract.js");

test("assertAllowedUrl rejects unsupported data protocol", () => {
  assert.throws(
    () => assertAllowedUrl("data:text/plain,test", "TARGET_URL"),
    /TARGET_URL_UNSUPPORTED_PROTOCOL/
  );
});

test("normalizeFormLabelsProbeInput maps legacy runner args into form-label contract", () => {
  const request = normalizeFormLabelsProbeInput(
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
    () => validateProbeResult({
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
  assert.deepEqual(result.evidence, { challenge_kind: "test" });
});

test("PR4 regression: assertAllowedUrl allows http and https in production mode", () => {
  assert.equal(assertAllowedUrl("http://example.com", "TARGET_URL"), "http://example.com/");
  assert.equal(assertAllowedUrl("https://example.com", "TARGET_URL"), "https://example.com/");
});

test("PR4 regression: assertAllowedUrl rejects file protocol in production mode", () => {
  assert.throws(
    () => assertAllowedUrl("file:///tmp/test.html", "TARGET_URL"),
    /TARGET_URL_UNSUPPORTED_PROTOCOL_FOR_PRODUCTION/
  );
});

test("PR4 regression: assertAllowedUrl allows file protocol only when explicitly permitted for fixtures", () => {
  assert.equal(
    assertAllowedUrl("file:///tmp/test.html", "TARGET_URL", true),
    "file:///tmp/test.html"
  );
});

test("PR4 regression: normalizeFormLabelsProbeInput rejects file protocol unless fixture mode is explicit", () => {
  assert.throws(
    () => normalizeFormLabelsProbeInput("Search fields lack a label.", "file:///tmp/test.html"),
    /BASE_URL_UNSUPPORTED_PROTOCOL_FOR_PRODUCTION/
  );

  const request = normalizeFormLabelsProbeInput(
    "Search fields lack a label.",
    "file:///tmp/test.html",
    true
  );

  assert.equal(request.target_url, "file:///tmp/test.html");
});
