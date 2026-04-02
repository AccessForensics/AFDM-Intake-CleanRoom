"use strict";

const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../run-record.js");
const { normalizeText } = require("./family2.matcher.js");
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

async function findPopupSurface(page) {
  return await page.evaluate(() => {
    const selectors = [
      "[role='dialog']",
      "dialog",
      "[aria-modal='true']",
      ".modal",
      ".popup",
      "[class*='modal']",
      "[class*='popup']"
    ];

    const candidates = [];
    for (const selector of selectors) {
      for (const el of Array.from(document.querySelectorAll(selector)).slice(0, 20)) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = rect.width > 10 && rect.height > 10 && style.display !== "none" && style.visibility !== "hidden";
        if (!visible) continue;

        const links = Array.from(el.querySelectorAll("a")).map((a) => ({
          text: (a.innerText || a.textContent || "").trim().replace(/\s+/g, " "),
          ariaLabel: (a.getAttribute("aria-label") || "").trim(),
          title: (a.getAttribute("title") || "").trim(),
          href: (a.getAttribute("href") || "").trim()
        }));

        const keyboardClose = Array.from(el.querySelectorAll("button,[role='button'],summary,[tabindex]")).map((node) => ({
          tag: node.tagName.toLowerCase(),
          text: (node.innerText || node.textContent || "").trim().replace(/\s+/g, " "),
          ariaLabel: (node.getAttribute("aria-label") || "").trim()
        }));

        const pointerOnlyClose = Array.from(el.querySelectorAll("div,span,svg")).map((node) => ({
          text: (node.innerText || node.textContent || "").trim().replace(/\s+/g, " "),
          ariaLabel: (node.getAttribute("aria-label") || "").trim(),
          className: (node.getAttribute("class") || "").trim()
        })).filter((row) => /close|x/i.test([row.text, row.ariaLabel, row.className].join(" ")));

        candidates.push({
          selector,
          text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 300),
          links,
          keyboardClose,
          pointerOnlyClose
        });
      }
    }

    return candidates;
  });
}

async function probePopupUnreadLinks(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const popups = await findPopupSurface(page);
    if (!Array.isArray(popups) || popups.length === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded advertisement or popup surface was located for popup-link readability testing.",
        evidence: { popups: [] }
      };
    }

    const unlabeledLinks = [];
    for (const popup of popups) {
      for (const link of popup.links) {
        const combined = [link.text, link.ariaLabel, link.title].join(" ").trim();
        if (link.href && !combined) {
          unlabeledLinks.push({ popupSelector: popup.selector, link });
        }
      }
    }

    if (unlabeledLinks.length > 0) {
      return {
        outcome_label: OUTCOME_LABEL.OBSERVED,
        constraint_class: "",
        mechanical_note: "",
        evidence: { popups, unlabeledLinks }
      };
    }

    return {
      outcome_label: OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: { popups }
    };
  });
}

async function probeCursorRequiredClose(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const popups = await findPopupSurface(page);
    if (!Array.isArray(popups) || popups.length === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded advertisement or popup surface was located for close-control testing.",
        evidence: { popups: [] }
      };
    }

    const hasKeyboardClose = popups.some((popup) =>
      popup.keyboardClose.some((row) => /close|dismiss|x/i.test([row.text, row.ariaLabel].join(" ")))
    );

    const hasPointerOnlyClose = popups.some((popup) => popup.pointerOnlyClose.length > 0);

    if (!hasKeyboardClose && hasPointerOnlyClose) {
      return {
        outcome_label: OUTCOME_LABEL.OBSERVED,
        constraint_class: "",
        mechanical_note: "",
        evidence: { popups }
      };
    }

    if (hasKeyboardClose) {
      return {
        outcome_label: OUTCOME_LABEL.NOT_OBSERVED,
        constraint_class: "",
        mechanical_note: "",
        evidence: { popups }
      };
    }

    return {
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "Popup surfaced but no bounded close-control pattern was classifiable.",
      evidence: { popups }
    };
  });
}

async function probeUnreadLinks(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a[href]")).slice(0, 300).map((a) => {
        const img = a.querySelector("img");
        const imgAlt = img ? (img.getAttribute("alt") || "").trim() : "";
        return {
          text: (a.innerText || a.textContent || "").trim().replace(/\s+/g, " "),
          ariaLabel: (a.getAttribute("aria-label") || "").trim(),
          title: (a.getAttribute("title") || "").trim(),
          href: (a.getAttribute("href") || "").trim(),
          imgAlt
        };
      });

      const unreadable = anchors.filter((a) => {
        const combined = [a.text, a.ariaLabel, a.title, a.imgAlt].join(" ").trim();
        return a.href && !combined;
      });

      return {
        anchorCount: anchors.length,
        unreadableCount: unreadable.length,
        samples: unreadable.slice(0, 20)
      };
    });

    if (data.unreadableCount > 0) {
      return {
        outcome_label: OUTCOME_LABEL.OBSERVED,
        constraint_class: "",
        mechanical_note: "",
        evidence: data
      };
    }

    return {
      outcome_label: OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function runFamily2Probe(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
  const normalized = normalizeProbeInput(inputOrText, legacyBaseUrlOrOptions, maybeOptions);
  const request = normalized.request;
  const options = normalized.options;
  const text = normalizeText(request.asserted_condition_text);

  if (!request.target_url) {
    return {
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "No target URL was available for bounded Family 2 execution.",
      evidence: {}
    };
  }

  if (text.includes("advertisement pop up links")) {
    return probePopupUnreadLinks(page, request, options);
  }

  if (text.includes("use of the cursor to close the advertisement")) {
    return probeCursorRequiredClose(page, request, options);
  }

  if (text.includes("fails to read links on the website")) {
    return probeUnreadLinks(page, request, options);
  }

  return {
    outcome_label: OUTCOME_LABEL.INSUFFICIENT,
    constraint_class: "",
    mechanical_note: "No Playwright probe was implemented for this asserted condition.",
    evidence: {}
  };
}

module.exports = Object.freeze({
  runFamily2Probe
});