"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { runFamily1Probe } = require("../src/intake/families/family1.probe.js");
const { runFamily2Probe } = require("../src/intake/families/family2.probe.js");
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

test("runFamily1Probe accepts structured probe request", async () => {
  const page = new MockPage({
    url: "https://example.com/",
    evaluateQueue: [
      {
        title: "Example",
        bodyText: "Retail content",
        html: "<html><body><main>Retail content</main></body></html>",
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

  const result = await runFamily1Probe(
    page,
    {
      asserted_condition_text: "Heading levels were missing",
      target_url: "https://example.com/"
    },
    {
      base_url: "https://example.com/"
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("runFamily2Probe accepts structured probe request", async () => {
  const page = new MockPage({
    url: "https://example.com/",
    evaluateQueue: [
      {
        title: "Example",
        bodyText: "Retail content",
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Home", href: "/" }
        ]
      },
      {
        anchorCount: 10,
        unreadableCount: 1,
        samples: [
          { href: "/promo", text: "", ariaLabel: "", title: "", imgAlt: "" }
        ]
      }
    ]
  });

  const result = await runFamily2Probe(
    page,
    {
      asserted_condition_text: "Screen reader fails to read links on the website",
      target_url: "https://example.com/"
    },
    {
      base_url: "https://example.com/"
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});