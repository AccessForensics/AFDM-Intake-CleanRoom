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

async function probeProgrammaticLabels(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll("input, select, textarea")).map((el) => {
        const labels = [];
        const id = el.getAttribute("id");

        if (id) {
          const explicit = document.querySelector(`label[for="${id}"]`);
          if (explicit) {
            labels.push((explicit.innerText || explicit.textContent || "").trim().replace(/\s+/g, " "));
          }
        }

        const wrappingLabel = el.closest("label");
        if (wrappingLabel) {
          labels.push((wrappingLabel.innerText || wrappingLabel.textContent || "").trim().replace(/\s+/g, " "));
        }

        return {
          type: el.getAttribute("type") || el.tagName.toLowerCase(),
          name: el.getAttribute("name") || "",
          id: id || "",
          ariaLabel: (el.getAttribute("aria-label") || "").trim(),
          ariaLabelledby: (el.getAttribute("aria-labelledby") || "").trim(),
          labels: Array.from(new Set(labels.filter(Boolean)))
        };
      });

      const unlabeledControls = controls.filter((item) => {
        return !item.ariaLabel && !item.ariaLabelledby && item.labels.length === 0;
      });

      return {
        controlCount: controls.length,
        controls,
        unlabeledControls
      };
    });

    if (data.controlCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No form controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.unlabeledControls.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeRequiredFieldIdentification(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll("input, select, textarea")).map((el) => ({
        type: el.getAttribute("type") || el.tagName.toLowerCase(),
        name: el.getAttribute("name") || "",
        required: el.required,
        ariaRequired: el.getAttribute("aria-required"),
        placeholder: el.getAttribute("placeholder") || ""
      }));

      const weakRequiredSignals = controls.filter((item) => {
        const ariaRequired = String(item.ariaRequired || "").toLowerCase();
        return item.required && ariaRequired !== "true";
      });

      return {
        controlCount: controls.length,
        controls,
        weakRequiredSignals
      };
    });

    if (data.controlCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No form controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.weakRequiredSignals.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeErrorIdentification(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const invalidControls = Array.from(document.querySelectorAll('[aria-invalid="true"], .error, .field-error')).map((el) => ({
        tagName: el.tagName.toLowerCase(),
        text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "),
        id: el.getAttribute("id") || "",
        ariaDescribedby: el.getAttribute("aria-describedby") || ""
      }));

      const ambiguousErrors = invalidControls.filter((item) => !item.text);

      return {
        invalidControlCount: invalidControls.length,
        invalidControls,
        ambiguousErrors
      };
    });

    if (data.invalidControlCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No bounded error-state controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.ambiguousErrors.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeErrorAnnouncement(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const liveRegions = Array.from(document.querySelectorAll('[role="alert"], [aria-live]')).map((el) => ({
        role: el.getAttribute("role") || "",
        ariaLive: el.getAttribute("aria-live") || "",
        text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ")
      }));

      return {
        liveRegionCount: liveRegions.length,
        liveRegions
      };
    });

    return {
      outcome_label: data.liveRegionCount > 0 ? OUTCOME_LABEL.NOT_OBSERVED : OUTCOME_LABEL.OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeErrorSuggestions(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const suggestionText = Array.from(document.querySelectorAll("body *"))
        .map((el) => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .filter((text) => {
          const normalized = text.toLowerCase();
          return normalized.includes("try") || normalized.includes("please") || normalized.includes("must");
        });

      return {
        suggestionTextCount: suggestionText.length,
        suggestionText: suggestionText.slice(0, 50)
      };
    });

    return {
      outcome_label: data.suggestionTextCount > 0 ? OUTCOME_LABEL.NOT_OBSERVED : OUTCOME_LABEL.OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeInputPurpose(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const autocompleteCandidates = [
      "name",
      "honorific-prefix",
      "given-name",
      "additional-name",
      "family-name",
      "honorific-suffix",
      "nickname",
      "email",
      "username",
      "new-password",
      "current-password",
      "organization-title",
      "organization",
      "street-address",
      "address-line1",
      "address-line2",
      "address-line3",
      "address-level4",
      "address-level3",
      "address-level2",
      "address-level1",
      "country",
      "country-name",
      "postal-code",
      "cc-name",
      "cc-given-name",
      "cc-additional-name",
      "cc-family-name",
      "cc-number",
      "cc-exp",
      "cc-exp-month",
      "cc-exp-year",
      "cc-csc",
      "cc-type",
      "transaction-currency",
      "transaction-amount",
      "language",
      "bday",
      "bday-day",
      "bday-month",
      "bday-year",
      "sex",
      "tel",
      "tel-country-code",
      "tel-national",
      "tel-area-code",
      "tel-local",
      "tel-extension",
      "impp",
      "url",
      "photo"
    ];

    const data = await page.evaluate((allowedAutocomplete) => {
      const controls = Array.from(document.querySelectorAll("input")).map((el) => ({
        type: el.getAttribute("type") || "text",
        name: el.getAttribute("name") || "",
        autocomplete: (el.getAttribute("autocomplete") || "").trim().toLowerCase()
      }));

      const missingPurpose = controls.filter((item) => {
        if (!["text", "email", "tel", "search", "url"].includes(item.type)) {
          return false;
        }
        return item.autocomplete && !allowedAutocomplete.includes(item.autocomplete);
      });

      return {
        controlCount: controls.length,
        controls,
        missingPurpose
      };
    }, autocompleteCandidates);

    if (data.controlCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No input controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.missingPurpose.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

async function probeVisibleFocus(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const focusable = Array.from(
        document.querySelectorAll('a, button, input, select, textarea, [tabindex]')
      )
        .filter((el) => !el.hasAttribute("disabled"))
        .slice(0, 25)
        .map((el) => ({
          tagName: el.tagName.toLowerCase(),
          text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "),
          className: el.className || ""
        }));

      return {
        focusableCount: focusable.length,
        focusable
      };
    });

    if (data.focusableCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No focusable controls were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: OUTCOME_LABEL.PENDING_EXTRACTION,
      constraint_class: "",
      mechanical_note: "",
      evidence: Object.assign({}, data, {
        pending_extraction: "visible focus requires screenshot review"
      })
    };
  });
}

async function probeFormInstructions(page, request, options) {
  return withChallengeGate(page, request, options, async () => {
    const data = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
        text: (form.innerText || form.textContent || "").trim().replace(/\s+/g, " ").slice(0, 500),
        ariaDescribedby: form.getAttribute("aria-describedby") || "",
        hasFieldset: Boolean(form.querySelector("fieldset"))
      }));

      const withInstructions = forms.filter((item) => {
        const normalized = (item.text || "").toLowerCase();
        return normalized.includes("required") || normalized.includes("optional") || normalized.includes("fields marked");
      });

      return {
        formCount: forms.length,
        forms,
        withInstructions
      };
    });

    if (data.formCount === 0) {
      return {
        outcome_label: OUTCOME_LABEL.INSUFFICIENT,
        constraint_class: "",
        mechanical_note: "No forms were detected on the target page.",
        evidence: data
      };
    }

    return {
      outcome_label: data.withInstructions.length > 0 ? OUTCOME_LABEL.NOT_OBSERVED : OUTCOME_LABEL.OBSERVED,
      constraint_class: "",
      mechanical_note: "",
      evidence: data
    };
  });
}

function routeFamily2Probe(assertedConditionText) {
  const normalized = normalizeText(assertedConditionText);

  if (normalized.includes("programmatically associated with labels")) {
    return probeProgrammaticLabels;
  }

  if (normalized.includes("required fields were not identified")) {
    return probeRequiredFieldIdentification;
  }

  if (normalized.includes("error messages did not identify the field in error")) {
    return probeErrorIdentification;
  }

  if (normalized.includes("error messages were not announced")) {
    return probeErrorAnnouncement;
  }

  if (normalized.includes("error suggestions were not provided")) {
    return probeErrorSuggestions;
  }

  if (normalized.includes("input purpose was not programmatically identified")) {
    return probeInputPurpose;
  }

  if (normalized.includes("keyboard focus indicator was not visible")) {
    return probeVisibleFocus;
  }

  if (normalized.includes("form instructions were missing")) {
    return probeFormInstructions;
  }

  return null;
}

async function runFamily2Probe(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
  const { request, options } = normalizeProbeInput(
    inputOrText,
    legacyBaseUrlOrOptions,
    maybeOptions
  );

  const probe = routeFamily2Probe(request.asserted_condition_text);
  if (!probe) {
    return {
      outcome_label: OUTCOME_LABEL.INSUFFICIENT,
      constraint_class: "",
      mechanical_note: "No family 2 probe route matched the asserted condition text.",
      evidence: {
        asserted_condition_text: request.asserted_condition_text
      }
    };
  }

  return probe(page, request, options);
}

module.exports = Object.freeze({
  runFamily2Probe,
  probeProgrammaticLabels,
  probeRequiredFieldIdentification,
  probeErrorIdentification,
  probeErrorAnnouncement,
  probeErrorSuggestions,
  probeInputPurpose,
  probeVisibleFocus,
  probeFormInstructions
});