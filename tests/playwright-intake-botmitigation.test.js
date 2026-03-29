"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { detectEnvironmentChallenge } = require("../src/intake/browser-challenge.js");
const { runLawsuit2Probe } = require("../src/intake/probes/lawsuit2.js");
const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../src/intake/run-record.js");

class MockPage {
  constructor(options = {}) {
    this._url = options.url || "https://example.com/";
    this._evaluateQueue = Array.isArray(options.evaluateQueue) ? [...options.evaluateQueue] : [];
    this.gotoCalls = [];
    this.waitCalls = [];
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

test("detectEnvironmentChallenge returns true for challenge markers", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Just a moment...",
        bodyText: "Verify you are human before proceeding",
        html: '<html><body>cloudflare challenge-platform</body></html>',
        anchors: [
          { text: "Cloudflare", href: "https://www.cloudflare.com/" }
        ]
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, true);
  assert.equal(result.evidence.url, "https://www.extractlabs.com/");
  assert.ok(Array.isArray(result.evidence.hitMarkers));
  assert.ok(result.evidence.hitMarkers.length > 0);
});

test("detectEnvironmentChallenge returns false for non-challenge page state", async () => {
  const page = new MockPage({
    url: "https://example.com/shop",
    evaluateQueue: [
      {
        title: "Shop",
        bodyText: "Welcome to the store",
        html: '<html><body><main><a href="/shop">Shop</a></main></body></html>',
        anchors: [
          { text: "Shop", href: "/shop" }
        ]
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, false);
  assert.deepEqual(result.evidence.hitMarkers, []);
});

test("runLawsuit2Probe routes challenge state to constrained bot mitigation", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Attention Required",
        bodyText: "Cloudflare Verify you are human",
        html: '<html><body>managed-challenge</body></html>',
        anchors: [
          { text: "Cloudflare", href: "https://www.cloudflare.com/" }
        ]
      }
    ]
  });

  const result = await runLawsuit2Probe(
    page,
    "Screen reader fails to read links on the website",
    "https://www.extractlabs.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.CONSTRAINED);
  assert.equal(result.constraint_class, CONSTRAINT_CLASS.BOTMITIGATION);
  assert.equal(
    result.mechanical_note,
    "Bot-mitigation challenge page prevented bounded review of the alleged site surface."
  );
});

test("runLawsuit2Probe returns insufficient when popup allegation has no bounded popup surface", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Extract Labs",
        bodyText: "Retail site content",
        html: '<html><body><main>Retail content</main></body></html>',
        anchors: [
          { text: "Shop", href: "/shop" }
        ]
      },
      []
    ]
  });

  const result = await runLawsuit2Probe(
    page,
    "Screen reader fails to read advertisement pop up links",
    "https://www.extractlabs.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
  assert.equal(result.constraint_class, "");
  assert.equal(
    result.mechanical_note,
    "No bounded advertisement or popup surface was located for popup-link readability testing."
  );
});

test("runLawsuit2Probe returns observed when popup contains unlabeled link", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Extract Labs",
        bodyText: "Retail site content",
        html: '<html><body><main>Retail content</main></body></html>',
        anchors: [
          { text: "Shop", href: "/shop" }
        ]
      },
      [
        {
          selector: ".popup",
          text: "Promo popup",
          links: [
            { text: "", ariaLabel: "", title: "", href: "/promo" }
          ],
          keyboardClose: [],
          pointerOnlyClose: []
        }
      ]
    ]
  });

  const result = await runLawsuit2Probe(
    page,
    "Screen reader fails to read advertisement pop up links",
    "https://www.extractlabs.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
  assert.equal(result.constraint_class, "");
  assert.ok(Array.isArray(result.evidence.unlabeledLinks));
  assert.equal(result.evidence.unlabeledLinks.length, 1);
});

test("runLawsuit2Probe returns not observed when sampled links are readable", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Extract Labs",
        bodyText: "Retail site content",
        html: '<html><body><main>Retail content</main></body></html>',
        anchors: [
          { text: "Shop", href: "/shop" }
        ]
      },
      {
        anchorCount: 10,
        unreadableCount: 0,
        samples: []
      }
    ]
  });

  const result = await runLawsuit2Probe(
    page,
    "Screen reader fails to read links on the website",
    "https://www.extractlabs.com/"
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.NOT_OBSERVED);
  assert.equal(result.constraint_class, "");
  assert.equal(result.evidence.anchorCount, 10);
  assert.equal(result.evidence.unreadableCount, 0);
});