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

test("family1 matcher resolves empty-link Young wording", function () {
  const text = "Empty Links That Contain No Text causing the function or purpose of the link to not be presented to the user.";
  const result = classifyFamily1(text);

  assert.equal(matchesFamily1(text), true);
  assert.equal(result.matched, true);
  assert.equal(result.family_id, "family_1_structural_integrity");
});

test("preflight coverage resolves empty-link Young assertion to lawsuit1", function () {
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      rununitid: "AF-FIXTURE-002-RU-EMPTY-LINKS-REPAIRED-01",
      assertedconditiontext: "Empty Links That Contain No Text causing the function or purpose of the link to not be presented to the user.",
      target_element_hint: "links with no discernible text or accessible name"
    })
  ]);

  assert.equal(coverage.preflight_status, "supported_probe_coverage");
  assert.equal(coverage.production_intake_runnable, true);
  assert.equal(coverage.unsupported_count, 0);
  assert.equal(coverage.run_unit_coverage[0].supported_probe_family, "lawsuit1");
});

test("family1 empty-link probe returns observed when link has href but no accessible name", async function () {
  const page = buildMockPage({
    linkCount: 1,
    emptyCount: 1,
    samples: [
      {
        href: "/contact",
        name: "",
        role: ""
      }
    ]
  });

  const result = await runFamily1Probe(
    page,
    buildRunUnit({
      assertedconditiontext: "Empty Links That Contain No Text causing the function or purpose of the link to not be presented to the user.",
      target_element_hint: "links with no discernible text or accessible name"
    }),
    {
      detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
        return { challengeDetected: false, evidence: {} };
      }
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family1 matcher resolves redundant adjacent link Young wording", function () {
  const text = "Redundant Links where adjacent links go to the same URL address which results in additional navigation and repetition for keyboard and screen-reader users;";
  const result = classifyFamily1(text);

  assert.equal(matchesFamily1(text), true);
  assert.equal(result.matched, true);
  assert.equal(result.family_id, "family_1_structural_integrity");
});

test("preflight coverage resolves redundant adjacent link Young assertion to lawsuit1", function () {
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      rununitid: "AF-FIXTURE-002-RU-REDUNDANT-LINKS-REPAIRED-01",
      assertedconditiontext: "Redundant Links where adjacent links go to the same URL address which results in additional navigation and repetition for keyboard and screen-reader users;",
      target_element_hint: "adjacent or repeated links leading to the same target"
    })
  ]);

  assert.equal(coverage.preflight_status, "supported_probe_coverage");
  assert.equal(coverage.production_intake_runnable, true);
  assert.equal(coverage.unsupported_count, 0);
  assert.equal(coverage.run_unit_coverage[0].supported_probe_family, "lawsuit1");
});

test("family1 redundant adjacent link probe returns observed when adjacent links share the same href", async function () {
  const page = buildMockPage({
    linkCount: 2,
    redundantPairCount: 1,
    samples: [
      {
        index: 0,
        href: "https://example.test/listing",
        previousName: "Listing image",
        currentName: "Listing details",
        previousRawHref: "/listing",
        currentRawHref: "/listing"
      }
    ]
  });

  const result = await runFamily1Probe(
    page,
    buildRunUnit({
      assertedconditiontext: "Redundant Links where adjacent links go to the same URL address which results in additional navigation and repetition for keyboard and screen-reader users;",
      target_element_hint: "adjacent or repeated links leading to the same target"
    }),
    {
      detectEnvironmentChallenge: async function detectEnvironmentChallenge() {
        return { challengeDetected: false, evidence: {} };
      }
    }
  );

  assert.equal(result.outcome_label, OUTCOME_LABEL.OBSERVED);
});

test("family1 keeps vague image text alternative wording unsupported", function () {
  const coverage = classifyProbeCoverageForRunUnits([
    buildRunUnit({
      rununitid: "AF-FIXTURE-002-RU-LINKED-IMAGE-ALT-REPAIRED-01",
      assertedconditiontext: "Image text alternative allegation",
      target_element_hint: "linked images or image links missing alternative text"
    })
  ]);

  assert.equal(coverage.preflight_status, "unsupported_current_coverage");
  assert.equal(coverage.production_intake_runnable, false);
  assert.equal(coverage.unsupported_count, 1);
});