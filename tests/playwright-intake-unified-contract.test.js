"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeProbeInput,
  normalizeProbeRequest,
  buildProbeInputFromPayload,
  validateProbeResult
} = require("../src/intake/probes/probe-contract.js");
const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../src/intake/run-record.js");
const { runFamily1Probe } = require("../src/intake/families/family1.probe.js");
const { runFamily2Probe } = require("../src/intake/families/family2.probe.js");
const { runFamily3Probe } = require("../src/intake/families/family3.probe.js");

function createPageStub(evaluateValue) {
  return {
    async goto() {},
    async waitForTimeout() {},
    async evaluate(callback, arg) {
      if (typeof evaluateValue === "function") {
        return evaluateValue(callback, arg);
      }
      return evaluateValue;
    }
  };
}

test("normalizeProbeInput supports legacy string signature", () => {
  const normalized = normalizeProbeInput(
    "heading levels were missing",
    "https://example.com/products"
  );

  assert.equal(normalized.request.asserted_condition_text, "heading levels were missing");
  assert.equal(normalized.request.target_url, "https://example.com/products");
  assert.equal(normalized.options.base_url, "https://example.com/products");
});

test("normalizeProbeInput supports object request and option object signature", () => {
  const normalized = normalizeProbeInput(
    {
      matter_id: "AF-2026-0001",
      run_unit_id: "RU-1",
      asserted_condition_text: "fields were not programmatically associated with labels",
      target_url: "https://example.com/checkout"
    },
    {
      base_url: "https://example.com"
    }
  );

  assert.equal(normalized.request.matter_id, "AF-2026-0001");
  assert.equal(normalized.request.run_unit_id, "RU-1");
  assert.equal(normalized.request.target_url, "https://example.com/checkout");
  assert.equal(normalized.options.base_url, "https://example.com/");
});

test("buildProbeInputFromPayload maps matter payload and run unit fields", () => {
  const request = buildProbeInputFromPayload(
    {
      matter_id: "AF-2026-0001",
      matter_scope: "desktop_mobile"
    },
    {
      run_unit_id: "RU-2",
      complaint_group_anchor_id: "CGA-1",
      family_id: "family_1_structural_integrity",
      asserted_condition_text: "skip to content link was not implemented",
      target_url: "https://example.com/",
      target_page_hint: "home",
      target_element_hint: "header",
      baseline_scope: "desktop"
    },
    "https://fallback.example.com/"
  );

  assert.equal(request.matter_id, "AF-2026-0001");
  assert.equal(request.run_unit_id, "RU-2");
  assert.equal(request.complaint_group_anchor_id, "CGA-1");
  assert.equal(request.family_id, "family_1_structural_integrity");
  assert.equal(request.target_url, "https://example.com/");
  assert.equal(request.baseline_scope, "desktop");
});

test("validateProbeResult accepts constrained result with one-sentence note", () => {
  const result = validateProbeResult({
    outcome_label: OUTCOME_LABEL.CONSTRAINED,
    constraint_class: CONSTRAINT_CLASS.BOTMITIGATION,
    mechanical_note: "Bot mitigation blocked bounded review.",
    evidence: {
      status: 403
    }
  });

  assert.equal(result.outcome_label, OUTCOME_LABEL.CONSTRAINED);
  assert.equal(result.constraint_class, CONSTRAINT_CLASS.BOTMITIGATION);
  assert.equal(result.mechanical_note, "Bot mitigation blocked bounded review.");
  assert.deepEqual(result.evidence, { status: 403 });
});

test("validateProbeResult rejects mechanical note on observed result", () => {
  assert.throws(
    () =>
      validateProbeResult({
        outcome_label: OUTCOME_LABEL.OBSERVED,
        constraint_class: "",
        mechanical_note: "This should not be allowed."
      }),
    /MECHANICAL_NOTE_NOT_ALLOWED_FOR_OBSERVED_OR_NOT_OBSERVED/
  );
});

test("family 1 heading probe preserves runner-compatible request contract", async () => {
  const page = createPageStub({
    headingCount: 2,
    headings: [
      { level: 1, text: "Main" },
      { level: 3, text: "Skipped" }
    ],
    gapDetected: true
  });

  const result = await runFamily1Probe(
    page,
    {
      asserted_condition_text: "heading hierarchy was not properly defined",
      target_url: "https://example.com/"
    },
    {
      base_url: "https://example.com/",
      detectEnvironmentChallenge: async () => ({
        challengeDetected: false,
        evidence: {}
      })
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family 2 visible focus probe keeps pending extraction fallback", async () => {
  const page = createPageStub({
    focusableCount: 2,
    focusable: [
      { tagName: "button", text: "Buy", className: "btn" },
      { tagName: "a", text: "Checkout", className: "link" }
    ]
  });

  const result = await runFamily2Probe(
    page,
    {
      asserted_condition_text: "keyboard focus indicator was not visible",
      target_url: "https://example.com/checkout"
    },
    {
      base_url: "https://example.com/checkout",
      detectEnvironmentChallenge: async () => ({
        challengeDetected: false,
        evidence: {}
      })
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.PENDING_EXTRACTION);
  assert.equal(result.evidence.pending_extraction, "visible focus requires screenshot review");
});

test("family 2 supports legacy wrapper signature", async () => {
  const page = createPageStub({
    controlCount: 1,
    controls: [
      {
        type: "text",
        name: "email",
        id: "email",
        ariaLabel: "",
        ariaLabelledby: "",
        labels: []
      }
    ],
    unlabeledControls: [
      {
        type: "text",
        name: "email",
        id: "email",
        ariaLabel: "",
        ariaLabelledby: "",
        labels: []
      }
    ]
  });

  const result = await runFamily2Probe(
    page,
    "fields were not programmatically associated with labels",
    "https://example.com/form",
    {
      detectEnvironmentChallenge: async () => ({
        challengeDetected: false,
        evidence: {}
      })
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family 3 probe stays extraction-driven under unified contract", async () => {
  const page = createPageStub({});
  const result = await runFamily3Probe(
    page,
    {
      asserted_condition_text: "form fields were visually labeled but not programmatically associated",
      target_url: "https://example.com/signup"
    },
    {
      base_url: "https://example.com/signup"
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.PENDING_EXTRACTION);
  assert.equal(
    result.evidence.pending_extraction_reason,
    "Family 3 requires extraction-driven form-label review."
  );
});