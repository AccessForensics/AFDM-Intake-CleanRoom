"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveProbe, matchesFamily3 } = require("../src/intake/probes/index.js");
const { OUTCOME_LABEL } = require("../src/intake/run-record.js");

function buildMockPage(evaluateQueue) {
  return {
    goto: async function goto() {
      return undefined;
    },
    waitForTimeout: async function waitForTimeout() {
      return undefined;
    },
    evaluate: async function evaluate() {
      if (!Array.isArray(evaluateQueue) || evaluateQueue.length === 0) {
        throw new Error("NO_EVALUATE_RESPONSE_QUEUED");
      }

      return evaluateQueue.shift();
    },
    url: function url() {
      return "https://example.com/search";
    }
  };
}

test("resolveProbe selects family3 family for form-label allegation", function () {
  const result = resolveProbe("Search fields lack a label.");

  assert.ok(result);
  assert.equal(result.family, "family3");
  assert.equal(typeof result.run, "function");
});

test("matchesFamily3 identifies supported allegation text", function () {
  assert.equal(matchesFamily3("Search fields lack a label."), true);
});

test("resolveProbe keeps unsupported generic form wording null", function () {
  const result = resolveProbe("The search feature is confusing.");
  assert.equal(result, null);
});

test("family3 registry run supports legacy generic-runner args", async function () {
  const result = resolveProbe("Search fields lack a label.");
  assert.ok(result);

  const page = buildMockPage([
    {
      title: "Search",
      bodyText: "Search products",
      html: "<html><body><form><input id='site-search'></form></body></html>",
      anchors: [
        { text: "Home", href: "/" }
      ]
    },
    {
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
    }
  ]);

  const probeResult = await result.run(
    page,
    "Search fields lack a label.",
    "https://example.com/search"
  );

  assert.equal(probeResult.outcome_label, OUTCOME_LABEL.OBSERVED);
});