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


async function probeAccessibilityInterfaceFocusTrap(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      function textOf(el) {
        return [
          el.innerText || el.textContent || "",
          el.getAttribute("aria-label") || "",
          el.getAttribute("title") || "",
          el.getAttribute("id") || "",
          el.getAttribute("class") || "",
          el.getAttribute("href") || "",
          el.getAttribute("src") || ""
        ].join(" ").trim().replace(/\s+/g, " ");
      }

      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 5 &&
          rect.height > 5 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0";
      }

      function isFocusable(el) {
        const tag = el.tagName.toLowerCase();
        if (el.hasAttribute("disabled")) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        if (el.hasAttribute("inert")) return false;
        if (el.tabIndex >= 0) return true;
        if (tag === "a" && el.hasAttribute("href")) return true;
        return ["button", "input", "select", "textarea", "summary"].includes(tag);
      }

      const all = Array.from(document.querySelectorAll("*")).slice(0, 1500);
      const indicatorNodes = all.filter((el) => /accessibe|acsb|accessibility interface|accessibility statement/i.test(textOf(el)));

      const interfaceSelectors = [
        "[role='dialog']",
        "[aria-modal='true']",
        "dialog",
        "[id*='accessib' i]",
        "[class*='accessib' i]",
        "[id*='acsb' i]",
        "[class*='acsb' i]",
        "[aria-label*='accessibility' i]",
        "[title*='accessibility' i]"
      ];

      const interfaceCandidates = [];
      for (const selector of interfaceSelectors) {
        for (const el of Array.from(document.querySelectorAll(selector)).slice(0, 40)) {
          if (!isVisible(el)) continue;

          const focusables = Array.from(el.querySelectorAll("a[href],button,input,select,textarea,summary,[tabindex]")).filter(isFocusable);
          const closeControls = focusables.filter((node) => /close|dismiss|hide|exit|back/i.test(textOf(node)));
          const text = textOf(el);

          interfaceCandidates.push({
            selector,
            text: text.slice(0, 300),
            focusableCount: focusables.length,
            closeControlCount: closeControls.length,
            hasAccessibeSignal: /accessibe|acsb/i.test(text),
            hasAccessibilitySignal: /accessibility/i.test(text)
          });
        }
      }

      const bodyLocked =
        document.body.hasAttribute("inert") ||
        document.documentElement.hasAttribute("inert") ||
        document.body.getAttribute("aria-hidden") === "true";

      const visibleInterfaces = interfaceCandidates.length;
      const accessibeIndicatorCount = indicatorNodes.length;
      const interfaceWithNoKeyboardClose = interfaceCandidates.filter((item) =>
        item.focusableCount > 0 &&
        item.closeControlCount === 0 &&
        (item.hasAccessibeSignal || item.hasAccessibilitySignal)
      );

      const statementLinks = Array.from(document.querySelectorAll("a[href],button,[role='button']")).filter((el) =>
        /accessibility statement/i.test(textOf(el))
      );

      const focusTrapSignals = [];

      if (bodyLocked && visibleInterfaces > 0) {
        focusTrapSignals.push("document_body_or_root_locked_while_accessibility_interface_visible");
      }

      if (interfaceWithNoKeyboardClose.length > 0) {
        focusTrapSignals.push("accessibility_interface_has_focusable_content_but_no_keyboard_close_control");
      }

      if (visibleInterfaces > 0 && statementLinks.length > 0 && accessibeIndicatorCount > 0) {
        focusTrapSignals.push("accessibility_statement_and_accessibe_interface_surface_detected");
      }

      return {
        accessibeIndicatorCount,
        interfaceCount: visibleInterfaces,
        accessibilityStatementControlCount: statementLinks.length,
        bodyLocked,
        focusTrapSignalCount: focusTrapSignals.length,
        focusTrapSignals,
        samples: {
          interfaceCandidates: interfaceCandidates.slice(0, 10),
          indicatorSamples: indicatorNodes.slice(0, 10).map((el) => textOf(el).slice(0, 240))
        }
      };
    });

    if (data.accessibeIndicatorCount === 0 && data.interfaceCount === 0 && data.accessibilityStatementControlCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded accessiBe or accessibility-interface surface was located for focus-trap testing.",
        evidence: data
      };
    }

    if (data.focusTrapSignalCount > 0) {
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

function matchesAccessibilityInterfaceFocusTrapAssertion(text) {
  return (
    (
      text.includes("accessibe overlay") &&
      text.includes("screen reader") &&
      (
        text.includes("impossible") ||
        text.includes("become stuck") ||
        text.includes("accessibility statement") ||
        text.includes("cannot tab back") ||
        text.includes("cannot tab forward")
      )
    ) ||
    (
      text.includes("accessibility interface") &&
      text.includes("screen reader") &&
      (
        text.includes("become stuck") ||
        text.includes("cannot tab back") ||
        text.includes("navigate the digital platform in a predictable manner")
      )
    )
  );
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

  if (matchesAccessibilityInterfaceFocusTrapAssertion(text)) {
    return probeAccessibilityInterfaceFocusTrap(page, request, options);
  }

  const error = new Error("FAMILY2_PROBE_IMPLEMENTATION_MISSING");
  error.code = "FAMILY2_PROBE_IMPLEMENTATION_MISSING";
  error.asserted_condition_text = request.asserted_condition_text;
  throw error;
}

module.exports = Object.freeze({
  runFamily2Probe
});