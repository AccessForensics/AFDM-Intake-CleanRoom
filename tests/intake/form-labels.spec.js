"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { classifyFormLabels, matchesFormLabels } = require("../../src/intake/families/form-labels.matcher.js");
const {
  OUTCOME_LABEL,
  CONSTRAINT_CLASS,
  evaluateFormLabelsSnapshot,
  runFormLabelsProbe
} = require("../../src/intake/families/form-labels.probe.js");

function buildRunUnit(overrides) {
  return Object.assign(
    {
      matter_id: "AF-TEST-0001",
      run_unit_id: "RU-001",
      probe_group_id: "form_labels_accessible_names",
      asserted_condition_text: "search fields lack a label",
      target_url: "https://example.com/search",
      target_page_hint: "search page",
      target_element_hint: "search field",
      baseline_scope: "both"
    },
    overrides || {}
  );
}

function buildMockPage(snapshot) {
  return {
    goto: async function goto() {
      return undefined;
    },
    waitForTimeout: async function waitForTimeout() {
      return undefined;
    },
    evaluate: async function evaluate() {
      return snapshot;
    }
  };
}

test("form-label matcher matches exact label allegation", function () {
  assert.equal(matchesFormLabels("Search fields lack a label."), true);
});

test("form-label matcher matches heuristic combination", function () {
  const result = classifyFormLabels("The search input field is missing an accessible name.");
  assert.equal(result.matched, true);
  assert.equal(result.probe_group_id, "form_labels_accessible_names");
});

test("form-label matcher does not match unrelated allegation", function () {
  const result = classifyFormLabels("The site has low color contrast on buttons.");
  assert.equal(result.matched, false);
});

test("form-label snapshot evaluation returns insufficient when no controls are present", function () {
  const result = evaluateFormLabelsSnapshot({ controls: [] }, buildRunUnit(), {});
  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
});

test("form-label snapshot evaluation returns observed when scoped target control lacks accessible name", function () {
  const snapshot = {
    controls: [
      {
        id: "site-search",
        name: "q",
        type: "text",
        placeholder: "Search products",
        aria_label: "",
        aria_labelledby_text: "",
        title: "",
        labels_text: "",
        descriptor_text: "site-search q text Search products",
        has_accessible_name: false
      }
    ]
  };

  const result = evaluateFormLabelsSnapshot(snapshot, buildRunUnit(), {});
  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
  assert.equal(result.evidence.failure_count, 1);
});

test("form-label snapshot evaluation returns not observed when scoped target control has accessible name", function () {
  const snapshot = {
    controls: [
      {
        id: "site-search",
        name: "q",
        type: "text",
        placeholder: "Search products",
        aria_label: "Search",
        aria_labelledby_text: "",
        title: "",
        labels_text: "",
        descriptor_text: "site-search q text Search products Search",
        has_accessible_name: true
      }
    ]
  };

  const result = evaluateFormLabelsSnapshot(snapshot, buildRunUnit(), {});
  assert.equal(result.outcome_label, OUTCOME_LABEL.NOT_OBSERVED);
  assert.equal(result.evidence.failure_count, 0);
});

test("form-label snapshot evaluation returns insufficient when hint cannot be bounded", function () {
  const snapshot = {
    controls: [
      {
        id: "newsletter-email",
        name: "email",
        type: "email",
        placeholder: "Email address",
        aria_label: "Email address",
        aria_labelledby_text: "",
        title: "",
        labels_text: "",
        descriptor_text: "newsletter-email email email Email address",
        has_accessible_name: true
      }
    ]
  };

  const result = evaluateFormLabelsSnapshot(
    snapshot,
    buildRunUnit({
      target_element_hint: "quantity selector",
      target_page_hint: "cart page"
    }),
    {}
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
});

test("form-label probe returns constrained on bot challenge", async function () {
  const page = buildMockPage({ controls: [] });

  const result = await runFormLabelsProbe(page, buildRunUnit(), {
    detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
      return { challengeDetected: true, evidence: { challenge_kind: "test" } };
    }
  });

  assert.equal(result.outcome_label, OUTCOME_LABEL.CONSTRAINED);
  assert.equal(result.constraint_class, CONSTRAINT_CLASS.BOTMITIGATION);
});

test("form-label probe returns insufficient when target_url is missing", async function () {
  const page = buildMockPage({ controls: [] });
  const result = await runFormLabelsProbe(page, buildRunUnit({ target_url: "" }), {});
  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
});

test("form-label probe returns hardcrash constrained when snapshot capture fails", async function () {
  const page = {
    goto: async function goto() {
      return undefined;
    },
    waitForTimeout: async function waitForTimeout() {
      return undefined;
    },
    evaluate: async function evaluate() {
      throw new Error("snapshot failed");
    }
  };

  const result = await runFormLabelsProbe(page, buildRunUnit(), {});
  assert.equal(result.outcome_label, OUTCOME_LABEL.CONSTRAINED);
  assert.equal(result.constraint_class, CONSTRAINT_CLASS.HARDCRASH);
});
