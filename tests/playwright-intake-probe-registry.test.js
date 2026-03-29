"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveProbe, matchesLawsuit2 } = require("../src/intake/probes/index.js");
const { matchesLawsuit1, runLawsuit1Probe } = require("../src/intake/probes/lawsuit1.js");
const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../src/intake/run-record.js");

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

test("resolveProbe selects lawsuit1 family for heading allegation", () => {
  const resolved = resolveProbe("Heading levels were missing");
  assert.equal(resolved.family, "lawsuit1");
});

test("resolveProbe selects lawsuit2 family for popup allegation", () => {
  const resolved = resolveProbe("Screen reader fails to read advertisement pop up links");
  assert.equal(resolved.family, "lawsuit2");
});

test("resolveProbe returns null for unsupported allegation", () => {
  const resolved = resolveProbe("Color contrast ratio is below minimum");
  assert.equal(resolved, null);
});

test("matchesLawsuit1 identifies supported allegation text", () => {
  assert.equal(matchesLawsuit1("Skip to content link was not implemented"), true);
});

test("matchesLawsuit2 identifies supported allegation text", () => {
  assert.equal(matchesLawsuit2("Website requires the use of the cursor to close the advertisement"), true);
});

test("runLawsuit1Probe returns constrained on challenge-gated page", async () => {
  const page = new MockPage({
    url: "https://example.com/",
    evaluateQueue: [
      {
        title: "Attention Required",
        bodyText: "Verify you are human",
        html: '<html><body>cloudflare managed-challenge</body></html>',
        anchors: [
          { text: "Cloudflare", href: "https://www.cloudflare.com/" }
        ]
      }
    ]
  });

  const result = await runLawsuit1Probe(
    page,
    "Heading levels were missing",
    "https://example.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.CONSTRAINED);
  assert.equal(result.constraint_class, CONSTRAINT_CLASS.BOTMITIGATION);
});

test("runLawsuit1Probe returns observed for heading gap", async () => {
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
      },
      {
        headingCount: 2,
        headings: [
          { level: 2, text: "Hero" },
          { level: 5, text: "Footer" }
        ],
        gapDetected: true
      }
    ]
  });

  const result = await runLawsuit1Probe(
    page,
    "Heading levels were missing",
    "https://example.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("runLawsuit1Probe returns insufficient when no headings are present", async () => {
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
      },
      {
        headingCount: 0,
        headings: [],
        gapDetected: false
      }
    ]
  });

  const result = await runLawsuit1Probe(
    page,
    "Heading hierarchy was not properly defined",
    "https://example.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
});

test("runLawsuit1Probe returns observed when skip link is absent", async () => {
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
      },
      {
        activeText: "Home",
        activeHref: "/",
        skipCandidates: []
      }
    ]
  });

  const result = await runLawsuit1Probe(
    page,
    "Skip to content link was not implemented",
    "https://example.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("runLawsuit1Probe returns observed for missing alt text", async () => {
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
      },
      {
        linkedImageCount: 3,
        missingAltCount: 1,
        samples: [
          { alt: "", src: "/img/a.png" }
        ]
      }
    ]
  });

  const result = await runLawsuit1Probe(
    page,
    "Product images lacked alternative text",
    "https://example.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});