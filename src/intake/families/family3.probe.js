"use strict";

const { OUTCOME_LABEL, CONSTRAINT_CLASS } = require("../run-record.js");
const { classifyFamily3, normalizeText } = require("./family3.matcher.js");
const { normalizeProbeInput } = require("../probes/probe-contract.js");
const research = require("./family3.research.json");

const DEFAULT_BOUNDED_RULES = Object.freeze({
  maxControlsPerScope: Number.isInteger(research && research.bounded_probe_rules && research.bounded_probe_rules.max_controls_per_scope)
    ? research.bounded_probe_rules.max_controls_per_scope
    : 25,
  maxRawControls: Number.isInteger(research && research.bounded_probe_rules && research.bounded_probe_rules.max_raw_controls)
    ? research.bounded_probe_rules.max_raw_controls
    : 200,
  allowPageScanWhenHintMissing:
    !research ||
    !research.bounded_probe_rules ||
    research.bounded_probe_rules.allow_page_scan_when_hint_missing !== false
});

function safeTrim(value) {
  return String(value || "").trim();
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function buildResult(outcomeLabel, constraintClass, mechanicalNote, evidence) {
  return Object.freeze({
    outcome_label: outcomeLabel,
    constraint_class: constraintClass || "",
    mechanical_note: mechanicalNote || "",
    evidence: Object.freeze(Object.assign({}, evidence || {}))
  });
}

function resolveBoundedRules(options) {
  return Object.freeze({
    maxControlsPerScope: Number.isInteger(options && options.maxControlsPerScope)
      ? options.maxControlsPerScope
      : DEFAULT_BOUNDED_RULES.maxControlsPerScope,
    maxRawControls: Number.isInteger(options && options.maxRawControls)
      ? options.maxRawControls
      : DEFAULT_BOUNDED_RULES.maxRawControls,
    allowPageScanWhenHintMissing:
      options && Object.prototype.hasOwnProperty.call(options, "allowPageScanWhenHintMissing")
        ? options.allowPageScanWhenHintMissing !== false
        : DEFAULT_BOUNDED_RULES.allowPageScanWhenHintMissing
  });
}

function buildHintTokens(runUnit) {
  const raw = [
    safeTrim(runUnit && runUnit.target_element_hint),
    safeTrim(runUnit && runUnit.target_page_hint),
    safeTrim(runUnit && runUnit.asserted_condition_text)
  ]
    .join(" ")
    .toLowerCase();

  return unique(
    raw
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function controlText(control) {
  return normalizeText(
    [
      control.id,
      control.name,
      control.type,
      control.placeholder,
      control.aria_label,
      control.aria_labelledby_text,
      control.title,
      control.labels_text,
      control.descriptor_text
    ].join(" ")
  );
}

function scoreControl(control, hintTokens) {
  if (!hintTokens.length) {
    return 0;
  }

  const haystack = controlText(control);
  let score = 0;

  for (const token of hintTokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function scopeControls(snapshot, runUnit, options) {
  const rules = resolveBoundedRules(options);
  const controls = Array.isArray(snapshot && snapshot.controls) ? snapshot.controls : [];
  const hintTokens = buildHintTokens(runUnit);

  if (controls.length === 0) {
    return {
      status: "no_controls",
      controls: [],
      hint_tokens: hintTokens,
      max_controls_per_scope: rules.maxControlsPerScope
    };
  }

  const scored = controls.map((control) => ({
    control,
    score: scoreControl(control, hintTokens)
  }));

  const matched = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, rules.maxControlsPerScope)
    .map((entry) => entry.control);

  if (matched.length > 0) {
    return {
      status: "bounded",
      controls: matched,
      hint_tokens: hintTokens,
      max_controls_per_scope: rules.maxControlsPerScope
    };
  }

  if (rules.allowPageScanWhenHintMissing && hintTokens.length === 0) {
    return {
      status: "page_scan",
      controls: controls.slice(0, rules.maxControlsPerScope),
      hint_tokens: hintTokens,
      max_controls_per_scope: rules.maxControlsPerScope
    };
  }

  return {
    status: "unbounded",
    controls: [],
    hint_tokens: hintTokens,
    max_controls_per_scope: rules.maxControlsPerScope
  };
}

function buildFailure(control) {
  return Object.freeze({
    id: control.id || "",
    name: control.name || "",
    type: control.type || "",
    placeholder: control.placeholder || "",
    aria_label: control.aria_label || "",
    aria_labelledby_text: control.aria_labelledby_text || "",
    title: control.title || "",
    labels_text: control.labels_text || "",
    descriptor_text: control.descriptor_text || ""
  });
}

function evaluateFamily3Snapshot(snapshot, runUnit, options) {
  const scoped = scopeControls(snapshot, runUnit, options);

  if (scoped.status === "no_controls") {
    return buildResult(
      OUTCOME_LABEL.INSUFFICIENT,
      "",
      "No candidate form controls were located on the alleged page surface.",
      {
        target_url: safeTrim(runUnit && runUnit.target_url),
        hint_tokens: scoped.hint_tokens,
        scoping_status: scoped.status
      }
    );
  }

  if (scoped.status === "unbounded") {
    return buildResult(
      OUTCOME_LABEL.INSUFFICIENT,
      "",
      "The allegation could not be bounded to a target control or page region under Family 3 rules.",
      {
        target_url: safeTrim(runUnit && runUnit.target_url),
        hint_tokens: scoped.hint_tokens,
        scoping_status: scoped.status
      }
    );
  }

  const failures = scoped.controls
    .filter((control) => !control.has_accessible_name)
    .map(buildFailure);

  return buildResult(
    failures.length > 0 ? OUTCOME_LABEL.OBSERVED : OUTCOME_LABEL.NOT_OBSERVED,
    "",
    "",
    {
      target_url: safeTrim(runUnit && runUnit.target_url),
      scoped_control_count: scoped.controls.length,
      failure_count: failures.length,
      hint_tokens: scoped.hint_tokens,
      scoping_status: scoped.status,
      sample_failures: failures.slice(0, 10)
    }
  );
}

async function safeGoto(page, targetUrl) {
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  if (typeof page.waitForTimeout === "function") {
    await page.waitForTimeout(1500);
  }
}

async function captureFamily3Snapshot(page, options) {
  const rules = resolveBoundedRules(options);

  return page.evaluate((payload) => {
    function safeText(value) {
      return String(value || "").trim();
    }

    function uniqueInner(values) {
      return Array.from(new Set((values || []).filter(Boolean)));
    }

    function labelTextsForElement(el) {
      const directLabels = Array.from(el.labels || [])
        .map((label) => safeText(label.innerText || label.textContent))
        .filter(Boolean);

      const closestLabel = el.closest("label");
      const wrappedLabels = closestLabel
        ? [safeText(closestLabel.innerText || closestLabel.textContent)].filter(Boolean)
        : [];

      return uniqueInner(directLabels.concat(wrappedLabels));
    }

    function ariaLabelledByText(el) {
      const ids = safeText(el.getAttribute("aria-labelledby"))
        .split(/\s+/)
        .map((id) => id.trim())
        .filter(Boolean);

      const texts = ids
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((node) => safeText(node.innerText || node.textContent))
        .filter(Boolean);

      return uniqueInner(texts);
    }

    const controls = Array.from(
      document.querySelectorAll("input:not([type='hidden']), textarea, select")
    )
      .slice(0, payload.maxRawControls)
      .map((el, index) => {
        const labels = labelTextsForElement(el);
        const labelledByTexts = ariaLabelledByText(el);
        const ariaLabel = safeText(el.getAttribute("aria-label"));
        const title = safeText(el.getAttribute("title"));
        const placeholder = safeText(el.getAttribute("placeholder"));
        const id = safeText(el.getAttribute("id"));
        const name = safeText(el.getAttribute("name"));
        const type = el.tagName.toLowerCase() === "input"
          ? safeText(el.getAttribute("type")) || "text"
          : el.tagName.toLowerCase();

        const accessibleNameParts = uniqueInner(
          labels.concat(labelledByTexts).concat([ariaLabel, title])
        );

        return {
          index,
          tag_name: el.tagName.toLowerCase(),
          id,
          name,
          type,
          placeholder,
          aria_label: ariaLabel,
          aria_labelledby_text: labelledByTexts.join(" | "),
          title,
          labels_text: labels.join(" | "),
          has_accessible_name: accessibleNameParts.length > 0,
          descriptor_text: uniqueInner(
            [id, name, type, placeholder, ariaLabel, title]
              .concat(labels)
              .concat(labelledByTexts)
          ).join(" | ")
        };
      });

    return { controls };
  }, { maxRawControls: rules.maxRawControls });
}

async function runFamily3Probe(page, inputOrText, legacyBaseUrlOrOptions, maybeOptions) {
  const normalized = normalizeProbeInput(inputOrText, legacyBaseUrlOrOptions, maybeOptions);
  const request = normalized.request;
  const options = normalized.options;

  const classification = classifyFamily3(request && request.asserted_condition_text);

  if (!classification.matched) {
    return buildResult(
      OUTCOME_LABEL.INSUFFICIENT,
      "",
      "The allegation did not match Family 3 form-label execution rules.",
      {
        family_id: "",
        target_url: safeTrim(request && request.target_url)
      }
    );
  }

  if (!safeTrim(request && request.target_url)) {
    return buildResult(
      OUTCOME_LABEL.INSUFFICIENT,
      "",
      "No target URL was available for bounded Family 3 execution.",
      {
        family_id: classification.family_id
      }
    );
  }

  try {
    await safeGoto(page, request.target_url);

    const challengeDetector =
      options && typeof options.detectEnvironmentChallenge === "function"
        ? options.detectEnvironmentChallenge
        : async function defaultChallengeDetector() {
            return { challengeDetected: false, evidence: {} };
          };

    const challenge = await challengeDetector(page);

    if (challenge && challenge.challengeDetected) {
      return buildResult(
        OUTCOME_LABEL.CONSTRAINED,
        CONSTRAINT_CLASS.BOTMITIGATION,
        "Bot-mitigation challenge prevented bounded review of the alleged site surface.",
        challenge.evidence || {}
      );
    }

    const snapshot = await captureFamily3Snapshot(page, options);
    return evaluateFamily3Snapshot(snapshot, request, options);
  } catch (error) {
    return buildResult(
      OUTCOME_LABEL.CONSTRAINED,
      CONSTRAINT_CLASS.HARDCRASH,
      "Execution error prevented bounded review of the alleged site surface.",
      {
        message: String((error && error.message) || error)
      }
    );
  }
}

module.exports = Object.freeze({
  OUTCOME_LABEL,
  CONSTRAINT_CLASS,
  buildHintTokens,
  evaluateFamily3Snapshot,
  captureFamily3Snapshot,
  runFamily3Probe
});