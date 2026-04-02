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
    if (this._evaluateQueue.length === 0) { // FIXED: Removed $ from this._evaluateQueue
      throw new Error("NO_EVALUATE_RESPONSE_QUEUED");
    }
    return this._evaluateQueue.shift();
  }
}

test("detectEnvironmentChallenge returns true for challenge text markers", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Just a moment...",
        bodyText: "Verify you are human before proceeding",
        html: "<html><body>retail blocked</body></html>",
        anchors: [
          { text: "Cloudflare", href: "https://www.cloudflare.com/" }
        ],
        scriptSrcs: [],
        domSignals: [],
        runtimeSignals: []
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, true);
  assert.equal(result.evidence.url, "https://www.extractlabs.com/");
  assert.ok(Array.isArray(result.evidence.visibleTextHitMarkers));
  assert.ok(result.evidence.visibleTextHitMarkers.length > 0);
});

test("detectEnvironmentChallenge returns true for strong runtime-only challenge signals", async () => {
  const page = new MockPage({
    url: "https://example.com/shop",
    evaluateQueue: [
      {
        title: "Shop",
        bodyText: "Welcome to the store",
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [],
        domSignals: [],
        runtimeSignals: [
          "window._cf_chl_opt"
        ]
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, true);
  assert.deepEqual(result.evidence.strongRuntimeSignals, ["window._cf_chl_opt"]);
});

test("detectEnvironmentChallenge returns true for strong enforcement script markers", async () => {
  const page = new MockPage({
    url: "https://example.com/shop",
    evaluateQueue: [
      {
        title: "Shop",
        bodyText: "Retail content",
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [
          "https://geo.captcha-delivery.com/captcha/?initialCid=abc"
        ],
        domSignals: [],
        runtimeSignals: []
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, true);
  assert.equal(result.evidence.strongScriptSignalMarkers.length, 1);
});

test("detectEnvironmentChallenge returns true for structural blocker signals without text markers", async () => {
  const page = new MockPage({
    url: "https://example.com/shop",
    evaluateQueue: [
      {
        title: "Shop",
        bodyText: "Retail content",
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [],
        domSignals: [
          "challenge-iframe"
        ],
        runtimeSignals: []
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, true);
  assert.deepEqual(result.evidence.domSignalMarkers, ["challenge-iframe"]);
});

test("detectEnvironmentChallenge does not over-trigger on weak turnstile-only signals", async () => {
  const page = new MockPage({
    url: "https://example.com/contact",
    evaluateQueue: [
      {
        title: "Contact",
        bodyText: "Contact the business",
        html: "<html><head><script src='https://challenges.cloudflare.com/turnstile/v0/api.js'></script></head><body><main>Contact the business</main></body></html>",
        anchors: [
          { text: "Home", href: "/" }
        ],
        scriptSrcs: [
          "https://challenges.cloudflare.com/turnstile/v0/api.js"
        ],
        domSignals: [],
        runtimeSignals: [
          "window.turnstile"
        ]
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, false);
  assert.equal(result.evidence.weakScriptSignalMarkers.length, 1);
  assert.deepEqual(result.evidence.weakRuntimeSignals, ["window.turnstile"]);
});

test("detectEnvironmentChallenge does not over-trigger on weak DataDome-only signals", async () => {
  const page = new MockPage({
    url: "https://example.com/shop",
    evaluateQueue: [
      {
        title: "Shop",
        bodyText: "Retail content",
        html: "<html><head><script src='https://js.datadome.co/tags.js'></script></head><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [
          "https://js.datadome.co/tags.js"
        ],
        domSignals: [],
        runtimeSignals: [
          "window.DataDome",
          "window.ddcid"
        ]
      }
    ]
  });

  const result = await detectEnvironmentChallenge(page);

  assert.equal(result.challengeDetected, false);
  assert.equal(result.evidence.weakScriptSignalMarkers.length, 1);
  assert.deepEqual(result.evidence.weakRuntimeSignals, ["window.datadome", "window.ddcid"]);
});

test("runLawsuit2Probe routes runtime evidence plus hard blocker to constrained bot mitigation", async () => {
  const page = new MockPage({
    url: "https://www.extractlabs.com/",
    evaluateQueue: [
      {
        title: "Shop",
        bodyText: "Retail content",
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [
          "https://js.datadome.co/tags.js"
        ],
        domSignals: [
          "challenge-iframe"
        ],
        runtimeSignals: [
          "window.DataDome"
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
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [],
        domSignals: [],
        runtimeSignals: []
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
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [],
        domSignals: [],
        runtimeSignals: []
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
        html: "<html><body><main>Retail content</main></body></html>",
        anchors: [
          { text: "Shop", href: "/shop" }
        ],
        scriptSrcs: [],
        domSignals: [],
        runtimeSignals: []
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