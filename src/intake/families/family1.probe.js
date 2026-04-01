"use strict";

const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../run-record.js");
const { normalizeText } = require("./family1.matcher.js");
const { normalizeProbeInput } = require("../probes/probe-contract.js");
const { detectEnvironmentChallenge: defaultDetectEnvironmentChallenge } = require("../browser-challenge.js");

function getChallengeDetector(options) {
  return options && typeof options.detectEnvironmentChallenge === "function"
    ? options.detectEnvironmentChallenge
    : defaultDetectEnvironmentChallenge;
}

async function safeGoto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (typeof page.waitForTimeout === "function") {
    await page.waitForTimeout(1500);
  }
}

function buildChallengeResult(challengeEvidence) {
  return Object.freeze({
    outcome_label: OUTCOME_LABEL.CONSTRAINED,
    constraint_class: CONSTRAINT_CLASS.BOTMITIGATION,
    mechanical_note: "Bot-mitigation challenge page prevented bounded review of the alleged site surface.",
    evidence: challengeEvidence
  });
}

async function withChallengeGate(page, request, options, probeFn) {
  await safeGoto(page, request.target_url);

  const challenge = await getChallengeDetector(options)(page);
  if (challenge.challengeDetected) {
    return buildChallengeResult(challenge.evidence);
  }

  return probeFn();
}

async function probeHeadingStructure(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) => ({
        level: Number(el.tagName.slice(1)),
        text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ")
      }));

      let gapDetected = false;
      for (let i = 1; i < headings.length; i += 1) {
        if (headings[i].level - headings[i - 1].level > 1) {
          gapDetected = true;
          break;
        }
      }

      return {
        headingCount: headings.length,
        headings,
        gapDetected
      };
    });

    if (data.headingCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded heading structure detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.gapDetected ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeSkipLink(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href^="#"]')).map((el) => ({
        text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "),
        href: el.getAttribute("href") || ""
      }));

      const skipCandidates = anchors.filter((anchor) => {
        const normalizedText = (anchor.text || "").toLowerCase();
        return normalizedText.includes("skip") && normalizedText.includes("content");
      });

      return {
        anchorCount: anchors.length,
        skipCandidates
      };
    });

    if (data.anchorCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No in-page anchor controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.skipCandidates.length > 0 ? OUTCOME_LABEL.NOT_OBSERVED : OUTCOME_LABEL.OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeLinkedImagePurpose(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const linkedImages = Array.from(document.querySelectorAll("a img")).map((img) => {
        const anchor = img.closest("a");
        return {
          alt: (img.getAttribute("alt") || "").trim(),
          href: anchor ? anchor.href : "",
          anchorText: anchor ? (anchor.innerText || anchor.textContent || "").trim().replace(/\s+/g, " ") : ""
        };
      });

      const unlabeledLinkedImages = linkedImages.filter((item) => !item.alt && !item.anchorText);

      return {
        linkedImageCount: linkedImages.length,
        linkedImages,
        unlabeledLinkedImages
      };
    });

    if (data.linkedImageCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No linked-image controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.unlabeledLinkedImages.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeNewWindowWarning(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a[target='_blank']")).map((anchor) => ({
        text: (anchor.innerText || anchor.textContent || "").trim().replace(/\s+/g, " "),
        ariaLabel: (anchor.getAttribute("aria-label") || "").trim(),
        title: (anchor.getAttribute("title") || "").trim(),
        rel: (anchor.getAttribute("rel") || "").trim()
      }));

      const warnedAnchors = anchors.filter((anchor) => {
        const combined = `${anchor.text} ${anchor.ariaLabel} ${anchor.title}`.toLowerCase();
        return combined.includes("new window") || combined.includes("opens in a new window");
      });

      return {
        targetBlankCount: anchors.length,
        anchors,
        warnedAnchors
      };
    });

    if (data.targetBlankCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No new-window link controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.warnedAnchors.length === data.targetBlankCount ? OUTCOME_LABEL.NOT_OBSERVED : OUTCOME_LABEL.OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeProductImageAlt(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const images = Array.from(document.images).map((img) => ({
        src: img.currentSrc || img.src || "",
        alt: (img.getAttribute("alt") || "").trim()
      }));

      const missingAltImages = images.filter((img) => !img.alt);

      return {
        imageCount: images.length,
        images,
        missingAltImages
      };
    });

    if (data.imageCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No images were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.missingAltImages.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeMenuStateAnnouncements(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const menuControls = Array.from(
        document.querySelectorAll('[aria-haspopup="true"], [aria-expanded], button[aria-controls]')
      ).map((el) => ({
        text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "),
        ariaExpanded: el.getAttribute("aria-expanded"),
        ariaHaspopup: el.getAttribute("aria-haspopup"),
        tagName: el.tagName.toLowerCase()
      }));

      const missingExpanded = menuControls.filter((item) => item.ariaExpanded === null);

      return {
        controlCount: menuControls.length,
        menuControls,
        missingExpanded
      };
    });

    if (data.controlCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No expandable navigation menu controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.missingExpanded.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

function routeFamily1Probe(assertedConditionText) {
  const normalized = normalizeText(assertedConditionText);

  if (normalized.includes("heading")) {
    return probeHeadingStructure;
  }

  if (normalized.includes("skip to content")) {
    return probeSkipLink;
  }

  if (normalized.includes("interactive images used as links")) {
    return probeLinkedImagePurpose;
  }

  if (normalized.includes("opened new windows")) {
    return probeNewWindowWarning;
  }

  if (normalized.includes("product images lacked alternative text")) {
    return probeProductImageAlt;
  }

  if (normalized.includes("sub-menus") || normalized.includes("collapsed state") || normalized.includes("expanded state")) {
    return probeMenuStateAnnouncements;
  }

  return null;
}

async function runFamily1Probe(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
  const { request, options } = normalizeProbeInput(
    inputOrText,
    legacyBaseUrlOrOptions,
    maybeOptions
  );

  const probe = routeFamily1Probe(request.asserted_condition_text);
  if (!probe) {
    return {
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "No family 1 probe route matched the asserted condition text.",
      evidence: {
        asserted_condition_text: request.asserted_condition_text
      }
    };
  }

  return probe(page, request, options);
}

module.exports = Object.freeze({
  runFamily1Probe,
  probeHeadingStructure,
  probeSkipLink,
  probeLinkedImagePurpose,
  probeNewWindowWarning,
  probeProductImageAlt,
  probeMenuStateAnnouncements
});