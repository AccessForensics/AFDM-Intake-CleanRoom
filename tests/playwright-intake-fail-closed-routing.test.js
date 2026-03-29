"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveProbe } = require("../src/intake/probes/index.js");
const { runLawsuit1Probe } = require("../src/intake/probes/lawsuit1.js");
const { OUTCOME_LABEL } = require("../src/intake/run-record.js");

class MockPage {
  constructor(options = {}) {
    this._url = options.url || "https://example.com/";
    this._evaluateQueue = Array.isArray(options.evaluateQueue) ? [...options.evaluateQueue] : [];
    this.gotoCalls = [];
    this.waitCalls = [];
    this.keyboardCalls = [];
    this.keyboard = {
      press: async (key) => {
        this.keyboardCalls.push(key);
      }
    };
  }

  url() {
    return this._url;
  }

  async goto(url, opts) {
    this._url = url;
    this.gotoCalls.push({ url, opts });
  }

  async waitForTimeout(ms) {
    this.waitCalls.push(ms);
  }

  async evaluate(_fn) {
    if (this._evaluateQueue.length === 0) {
      throw new Error("NO_EVALUATE_RESPONSE_QUEUED");
    }
    return this._evaluateQueue.shift();
  }
}

function buildRunnerFallback(assertedConditionText) {
  const resolved = resolveProbe(assertedConditionText);

  if (!resolved) {
    return {
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "No Playwright probe was implemented for this asserted condition.",
      evidence: {}
    };
  }

  return null;
}

test("registry returns null for unsupported allegation and runner fallback is insufficient", () => {
  const allegation = "Color contrast ratio is below minimum on footer links";
  const resolved = resolveProbe(allegation);

  assert.equal(resolved, null);

  const fallback = buildRunnerFallback(allegation);
  assert.deepEqual(fallback, {
    outcome_label: OUTCOME_LABEL.INSUFFICIENT,
    constraint_class: "",
    mechanical_note: "No Playwright probe was implemented for this asserted condition.",
    evidence: {}
  });
});

test("lawsuit1 family match with unimplemented sub allegation fails closed to insufficient", async () => {
  const page = new MockPage({
    url: "https://example.com/",
    evaluateQueue: [
      {
        title: "Example",
        bodyText: "Retail content",
        html: '<html><body><main>Retail content</main></body></html>',
        anchors: [
          { text: "Home", href: "/" }
        ]
      }
    ]
  });

  const result = await runLawsuit1Probe(
    page,
    "Interactive images used as links were ambiguous in a way not yet extracted into deterministic proof logic",
    "https://example.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
  assert.equal(
    result.mechanical_note,
    "Probe matched Lawsuit 1 family but deterministic proof logic is pending extraction for this allegation."
  );
});

test("unsupported allegation does not overmatch lawsuit1 family", () => {
  const allegation = "Footer contrast and animation timing issue";
  const resolved = resolveProbe(allegation);
  assert.equal(resolved, null);
});

test("unsupported allegation does not overmatch lawsuit2 family", () => {
  const allegation = "Popup styling looked distracting but links were present";
  const resolved = resolveProbe(allegation);
  assert.equal(resolved, null);
});