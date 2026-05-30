"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { OUTCOME_LABEL } = require("../../src/intake/run-record.js");
const { classifyFamily2, matchesFamily2 } = require("../../src/intake/families/family2.matcher.js");
const { runFamily2Probe } = require("../../src/intake/families/family2.probe.js");
const { classifyProbeCoverageForRunUnits } = require("../../src/intake/probes/index.js");

function buildRunUnit(overrides = {}) {
  return {
    rununitid: overrides.rununitid || "AF-FIXTURE-003-RU-ACCESSIBE-OVERLAY-FOCUS-TRAP-CLEAN-01",
    assertedconditiontext: overrides.assertedconditiontext || "",
    target_url: overrides.target_url || "https://example.test",
    target_page_hint: overrides.target_page_hint || "accessibility interface",
    target_element_hint: overrides.target_element_hint || "accessibility interface focus trap"
  };
}

function buildMockPage(evaluationResult) {
  return {
    async goto() {},
    async waitForTimeout() {},
    async evaluate() {
      return evaluationResult;
    }
  };
}

test("family2 matcher resolves Murphy accessiBe overlay focus-trap wording", function () {
  const text = [
    "The accessiBe overlay makes it impossible for some screen reader users to access the Digital Platform after they visit Defendant’s Accessibility Statement.",
    "Screen reader users may tab to Defendant’s Accessibility Statement shortly after entering the Digital Platform.",
    "However, their screen readers become stuck after closing the accessibility interface.",
    "Screen readers can neither tab back nor forward in order to navigate the Digital Platform in a predictable manner."
  ].join(" ");

  const result = classifyFamily2(text);

  assert.equal(matchesFamily2(text), true);
  assert.equal(result.matched, true);
  assert.equal(result.family_id, "family_2_popups_and_links");
});

test("preflight coverage resolves Murphy accessiBe overlay focus-trap assertion to lawsuit2", function () {
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      assertedconditiontext: [
        "The accessiBe overlay makes it impossible for some screen reader users to access the Digital Platform after they visit Defendant’s Accessibility Statement.",
        "However, their screen readers become stuck after closing the accessibility interface.",
        "Screen readers can neither tab back nor forward in order to navigate the Digital Platform in a predictable manner."
      ].join(" ")
    })
  ]);

  assert.equal(coverage.preflight_status, "supported_probe_coverage");
  assert.equal(coverage.production_intake_runnable, true);
  assert.equal(coverage.unsupported_count, 0);
  assert.equal(coverage.run_unit_coverage[0].supported_probe_family, "lawsuit2");
});

test("family2 accessiBe overlay focus-trap probe returns observed for bounded trap signal", async function () {
  const page = buildMockPage({
    accessibeIndicatorCount: 3,
    interfaceCount: 1,
    accessibilityStatementControlCount: 1,
    bodyLocked: true,
    focusTrapSignalCount: 2,
    focusTrapSignals: [
      "document_body_or_root_locked_while_accessibility_interface_visible",
      "accessibility_statement_and_accessibe_interface_surface_detected"
    ],
    samples: {
      interfaceCandidates: [
        {
          selector: "[class*='acsb' i]",
          text: "accessiBe accessibility interface",
          focusableCount: 4,
          closeControlCount: 0,
          hasAccessibeSignal: true,
          hasAccessibilitySignal: true
        }
      ],
      indicatorSamples: ["accessiBe accessibility interface"]
    }
  });

  const result = await runFamily2Probe(
    page,
    buildRunUnit({
      assertedconditiontext: [
        "The accessiBe overlay makes it impossible for some screen reader users to access the Digital Platform after they visit Defendant’s Accessibility Statement.",
        "However, their screen readers become stuck after closing the accessibility interface.",
        "Screen readers can neither tab back nor forward in order to navigate the Digital Platform in a predictable manner."
      ].join(" ")
    }),
    {
      detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
        return { challengeDetected: false, evidence: {} };
      }
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family2 accessiBe overlay focus-trap probe returns insufficient when no bounded interface surface exists", async function () {
  const page = buildMockPage({
    accessibeIndicatorCount: 0,
    interfaceCount: 0,
    accessibilityStatementControlCount: 0,
    bodyLocked: false,
    focusTrapSignalCount: 0,
    focusTrapSignals: [],
    samples: {}
  });

  const result = await runFamily2Probe(
    page,
    buildRunUnit({
      assertedconditiontext: [
        "The accessiBe overlay makes it impossible for some screen reader users to access the Digital Platform after they visit Defendant’s Accessibility Statement.",
        "However, their screen readers become stuck after closing the accessibility interface."
      ].join(" ")
    }),
    {
      detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
        return { challengeDetected: false, evidence: {} };
      }
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.INSUFFICIENT);
});

test("family2 does not overmatch generic accessiBe criticism", function () {
  const text = "accessiBe claims this overlay can automatically bring a website into compliance with the ADA by resolving the website’s underlying accessibility issues.";
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      rununitid: "AF-FIXTURE-003-RU-GENERIC-ACCESSIBE-CRITICISM-NEGATIVE-01",
      assertedconditiontext: text
    })
  ]);

  assert.equal(matchesFamily2(text), false);
  assert.equal(coverage.preflight_status, "unsupported_current_coverage");
  assert.equal(coverage.production_intake_runnable, false);
  assert.equal(coverage.unsupported_count, 1);
});
