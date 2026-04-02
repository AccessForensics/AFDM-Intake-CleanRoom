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
    await page.keyboard.press("Tab");

    const data = await page.evaluate(() => {
      const active = document.activeElement;
      const activeText = active ? ((active.innerText || active.textContent || "").trim()) : "";
      const activeHref = active ? ((active.getAttribute("href") || "").trim()) : "";
      const skipCandidates = Array.from(document.querySelectorAll("a[href^='#']")).map((a) => ({
        text: (a.innerText || a.textContent || "").trim(),
        href: (a.getAttribute("href") || "").trim()
      }));

      return {
        activeText,
        activeHref,
        skipCandidates
      };
    });

    const focusedLooksLikeSkip = /skip/i.test(data.activeText) || /^#(main|content)/i.test(data.activeHref);
    const anySkipCandidate = data.skipCandidates.some((item) => /skip/i.test(item.text) || /^#(main|content)/i.test(item.href));

    return {
      outcome_label: (focusedLooksLikeSkip || anySkipCandidate) ? OUTCOME_LABEL.NOT_OBSERVED : OUTCOME_LABEL.OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeImageLinkPurpose(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("a")).slice(0, 250).map((a) => {
        const img = a.querySelector("img");
        if (!img) return null;

        return {
          href: (a.getAttribute("href") || "").trim(),
          linkText: (a.innerText || a.textContent || "").trim().replace(/\s+/g, " "),
          alt: (img.getAttribute("alt") || "").trim()
        };
      }).filter(Boolean);

      const weak = rows.filter((row) => row.href && !row.linkText && !row.alt);

      return {
        linkedImageCount: rows.length,
        weakCount: weak.length,
        samples: weak.slice(0, 10)
      };
    });

    if (data.linkedImageCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded linked-image surface was located for link-purpose testing.",
        evidence: data
      };
    }

    return {
      outcome_label: data.weakCount > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeAltText(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const linkedImages = Array.from(document.querySelectorAll("a img")).slice(0, 200).map((img) => ({
        alt: (img.getAttribute("alt") || "").trim(),
        src: (img.getAttribute("src") || "").trim()
      }));

      const missingAlt = linkedImages.filter((img) => !img.alt);

      return {
        linkedImageCount: linkedImages.length,
        missingAltCount: missingAlt.length,
        samples: missingAlt.slice(0, 10)
      };
    });

    if (data.linkedImageCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded linked-image surface was located for alternative-text testing.",
        evidence: data
      };
    }

    return {
      outcome_label: data.missingAltCount > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeNewWindowWarning(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const blankLinks = Array.from(document.querySelectorAll("a[target='_blank']")).slice(0, 150).map((a) => ({
        text: (a.innerText || a.textContent || "").trim().replace(/\s+/g, " "),
        ariaLabel: (a.getAttribute("aria-label") || "").trim(),
        href: (a.getAttribute("href") || "").trim()
      }));

      const unwarned = blankLinks.filter((row) => {
        const combined = [row.text, row.ariaLabel].join(" ").toLowerCase();
        return !/new window|opens in|external/.test(combined);
      });

      return {
        blankLinkCount: blankLinks.length,
        unwarnedCount: unwarned.length,
        samples: unwarned.slice(0, 10)
      };
    });

    if (data.blankLinkCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded new-window link was located for warning testing.",
        evidence: data
      };
    }

    return {
      outcome_label: data.unwarnedCount > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeMenuStateAnnouncement(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll("nav button, nav [role='button'], header button, header [role='button'], [aria-haspopup='true']")
      ).slice(0, 80).map((el) => ({
        text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "),
        ariaExpanded: (el.getAttribute("aria-expanded") || "").trim(),
        ariaHaspopup: (el.getAttribute("aria-haspopup") || "").trim()
      }));

      const missingState = candidates.filter((row) => row.ariaHaspopup === "true" && !row.ariaExpanded);

      return {
        candidateCount: candidates.length,
        missingStateCount: missingState.length,
        samples: missingState.slice(0, 10)
      };
    });

    if (data.candidateCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded menu-state control was located for state-announcement testing.",
        evidence: data
      };
    }

    return {
      outcome_label: data.missingStateCount > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function runFamily1Probe(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
  const normalized = normalizeProbeInput(inputOrText, legacyBaseUrlOrOptions, maybeOptions);
  const request = normalized.request;
  const options = normalized.options;
  const text = normalizeText(request.asserted_condition_text);

  if (!request.target_url) {
    return {
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "No target URL was available for bounded Family 1 execution.",
      evidence: {}
    };
  }

  if (text.includes("heading hierarchy was not properly defined") || text.includes("heading levels were missing")) {
    return probeHeadingStructure(page, request, options);
  }

  if (text.includes("skip to content link was not implemented")) {
    return probeSkipLink(page, request, options);
  }

  if (text.includes("interactive images used as links did not describe the content of the link target")) {
    return probeImageLinkPurpose(page, request, options);
  }

  if (text.includes("links opened new windows without prior warning")) {
    return probeNewWindowWarning(page, request, options);
  }

  if (text.includes("product images lacked alternative text")) {
    return probeAltText(page, request, options);
  }

  if (text.includes("did not announce collapsed state") || text.includes("did not announce expanded state")) {
    return probeMenuStateAnnouncement(page, request, options);
  }

  throw new Error("FAMILY1_PROBE_IMPLEMENTATION_MISSING: The matched allegation sub-variant lacks bounded execution logic.");
}

module.exports = Object.freeze({
  runFamily1Probe
});