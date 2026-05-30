"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { classifyFamily1, matchesFamily1 } = require("../../src/intake/families/family1.matcher.js");
const { OUTCOME_LABEL } = require("../../src/intake/run-record.js");
const { runFamily1Probe } = require("../../src/intake/families/family1.probe.js");
const { classifyProbeCoverageForRunUnits } = require("../../src/intake/probes/index.js");

function buildRunUnit(overrides) {
  return Object.assign(
    {
      rununitid: "AF-FIXTURE-001-RU-HEADING-01",
      assertedconditiontext: "On the home page, heading hierarchy on the website was not properly defined, and there was a missing heading level 1.",
      target_url: "https://example.test",
      target_page_hint: "home page",
      target_element_hint: "heading hierarchy and missing heading level 1"
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

test("family1 matcher resolves Toro-style homepage heading hierarchy language", function () {
  const text = "On the home page, heading hierarchy on the website was not properly defined, and there was a missing heading level 1.";
  const result = classifyFamily1(text);

  assert.equal(matchesFamily1(text), true);
  assert.equal(result.matched, true);
  assert.equal(result.family_id, "family_1_structural_integrity");
});

test("preflight coverage resolves Toro-style homepage heading assertion to a supported probe family", function () {
  const coverage = classifyProbeCoverageForRunUnits([buildRunUnit()]);

  assert.equal(coverage.preflight_status, "supported_probe_coverage");
  assert.equal(coverage.production_intake_runnable, true);
  assert.equal(coverage.unsupported_count, 0);
  assert.equal(coverage.run_unit_coverage[0].coverage_status, "supported_probe_family");
  assert.equal(coverage.run_unit_coverage[0].supported_probe_family, "lawsuit1");
});

test("family1 heading probe returns not observed when heading hierarchy has no level gaps", async function () {
  const page = buildMockPage({
    headingCount: 3,
    headings: [
      { level: 1, text: "Home" },
      { level: 2, text: "Featured" },
      { level: 3, text: "Games" }
    ],
    gapDetected: false
  });

  const result = await runFamily1Probe(page, buildRunUnit(), {
    detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
      return { challengeDetected: false, evidence: {} };
    }
  });

  assert.equal(result.outcome_label, OUTCOME_LABEL.NOT_OBSERVED);
});

test("family1 heading probe returns observed when heading hierarchy has a level gap", async function () {
  const page = buildMockPage({
    headingCount: 2,
    headings: [
      { level: 1, text: "Home" },
      { level: 3, text: "Featured" }
    ],
    gapDetected: true
  });

  const result = await runFamily1Probe(page, buildRunUnit(), {
    detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
      return { challengeDetected: false, evidence: {} };
    }
  });

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family1 matcher resolves linked-image purpose wording", function () {
  const text = "On the home page, image links did not describe the content of the link target.";
  const result = classifyFamily1(text);

  assert.equal(matchesFamily1(text), true);
  assert.equal(result.matched, true);
  assert.equal(result.family_id, "family_1_structural_integrity");
});

test("preflight coverage resolves linked-image purpose assertion to lawsuit1", function () {
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      rununitid: "AF-FIXTURE-001-RU-IMAGE-LINK-PURPOSE-01",
      assertedconditiontext: "On the home page, image links did not describe the content of the link target.",
      target_element_hint: "image links and link target purpose"
    })
  ]);

  assert.equal(coverage.preflight_status, "supported_probe_coverage");
  assert.equal(coverage.production_intake_runnable, true);
  assert.equal(coverage.unsupported_count, 0);
  assert.equal(coverage.run_unit_coverage[0].supported_probe_family, "lawsuit1");
});

test("family1 image-link purpose probe returns observed when linked image lacks text and alt", async function () {
  const page = buildMockPage({
    linkedImageCount: 1,
    weakCount: 1,
    samples: [
      {
        href: "/collections/example",
        linkText: "",
        alt: ""
      }
    ]
  });

  const result = await runFamily1Probe(
    page,
    buildRunUnit({
      assertedconditiontext: "On the home page, image links did not describe the content of the link target.",
      target_element_hint: "image links and link target purpose"
    }),
    {
      detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
        return { challengeDetected: false, evidence: {} };
      }
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family1 matcher resolves linked-image alternative text wording", function () {
  const text = "On the home page, social media links did not have appropriate alternative text.";
  const result = classifyFamily1(text);

  assert.equal(matchesFamily1(text), true);
  assert.equal(result.matched, true);
  assert.equal(result.family_id, "family_1_structural_integrity");
});

test("preflight coverage resolves linked-image alternative text assertion to lawsuit1", function () {
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      rununitid: "AF-FIXTURE-001-RU-LINKED-IMAGE-ALT-01",
      assertedconditiontext: "On the home page, social media links did not have appropriate alternative text.",
      target_element_hint: "social media linked images and alternative text"
    })
  ]);

  assert.equal(coverage.preflight_status, "supported_probe_coverage");
  assert.equal(coverage.production_intake_runnable, true);
  assert.equal(coverage.unsupported_count, 0);
  assert.equal(coverage.run_unit_coverage[0].supported_probe_family, "lawsuit1");
});

test("family1 linked-image alt text probe returns observed when linked image lacks alt", async function () {
  const page = buildMockPage({
    linkedImageCount: 1,
    missingAltCount: 1,
    samples: [
      {
        src: "/social/icon.svg",
        alt: ""
      }
    ]
  });

  const result = await runFamily1Probe(
    page,
    buildRunUnit({
      assertedconditiontext: "On the home page, social media links did not have appropriate alternative text.",
      target_element_hint: "social media linked images and alternative text"
    }),
    {
      detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
        return { challengeDetected: false, evidence: {} };
      }
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});
