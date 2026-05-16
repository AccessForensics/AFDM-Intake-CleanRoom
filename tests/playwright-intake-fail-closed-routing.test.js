"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  resolveProbe,
  classifyProbeCoverageForRunUnits
} = require("../src/intake/probes/index.js");

const { runLawsuit1Probe } = require("../src/intake/probes/lawsuit1.js");

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

test("registry returns null for unsupported allegation and coverage classifier blocks before runtime", () => {
  const allegation = "Color contrast ratio is below minimum on footer links";
  const resolved = resolveProbe(allegation);

  assert.equal(resolved, null);

  const classification = classifyProbeCoverageForRunUnits([
    {
      rununitid: "RUNUNIT-1",
      assertedconditiontext: allegation
    }
  ]);

  assert.equal(classification.preflight_status, "unsupported_current_coverage");
  assert.equal(classification.production_intake_runnable, false);
  assert.equal(classification.classification_basis, "unsupported_probe_family_for_asserted_condition");
  assert.equal(classification.action, "classify_and_stop");
  assert.equal(classification.unsupported_count, 1);
  assert.equal(classification.supported_count, 0);
  assert.equal(classification.unsupported_run_units[0].coverage_status, "unsupported_probe_family");
});

test("supported allegation resolves to supported probe family coverage", () => {
  const allegation = "Product images lacked alternative text";
  const resolved = resolveProbe(allegation);

  assert.ok(resolved);
  assert.equal(resolved.family, "lawsuit1");

  const classification = classifyProbeCoverageForRunUnits([
    {
      rununitid: "RUNUNIT-1",
      assertedconditiontext: allegation
    }
  ]);

  assert.equal(classification.preflight_status, "supported_probe_coverage");
  assert.equal(classification.production_intake_runnable, true);
  assert.equal(classification.unsupported_count, 0);
  assert.equal(classification.supported_count, 1);
  assert.equal(classification.run_unit_coverage[0].coverage_status, "supported_probe_family");
});

test("runner source no longer contains unsupported probe fallback as doctrinal insufficiency", () => {
  const runnerPath = path.join(__dirname, "..", "tools", "run-playwright-intake.js");
  const runnerText = fs.readFileSync(runnerPath, "utf8");

  assert.doesNotMatch(
    runnerText,
    /No Playwright probe was implemented for this asserted condition\./
  );

  assert.doesNotMatch(
    runnerText,
    /outcome_label:\s*OUTCOME_LABEL\.INSUFFICIENT[\s\S]*No Playwright probe was implemented/
  );

  assert.match(runnerText, /UNSUPPORTED_PROBE_FAMILY_REACHED_RUNTIME/);
});

test("family2 probe no longer emits no-probe mechanical note for matched but unimplemented subconditions", () => {
  const family2Path = path.join(__dirname, "..", "src", "intake", "families", "family2.probe.js");
  const family2Text = fs.readFileSync(family2Path, "utf8");

  assert.doesNotMatch(
    family2Text,
    /No Playwright probe was implemented for this asserted condition\./
  );

  assert.match(family2Text, /FAMILY2_PROBE_IMPLEMENTATION_MISSING/);
});

test("lawsuit1 direct probe throws strict fail-closed error for unimplemented sub allegation", async () => {
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
      }
    ]
  });

  await assert.rejects(
    async () => {
      await runLawsuit1Probe(
        page,
        "Interactive images used as links were ambiguous in a way not yet extracted into deterministic proof logic",
        "https://example.com/"
      );
    },
    /FAMILY1_PROBE_IMPLEMENTATION_MISSING/
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
