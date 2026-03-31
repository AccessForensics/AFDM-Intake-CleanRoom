"use strict";

const research = require("./family3.research.json");

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function includesAny(text, patterns) {
  return (patterns || []).filter((pattern) => text.includes(normalizeText(pattern)));
}

function findHeuristicSignals(text) {
  const controlNouns = [
    "input",
    "inputs",
    "field",
    "fields",
    "form",
    "control",
    "controls",
    "search",
    "quantity",
    "qty",
    "textbox",
    "edit field",
    "select",
    "dropdown",
    "newsletter",
    "email"
  ];

  const issueTerms = [
    "label",
    "label element",
    "programmatically associated",
    "accessible name",
    "purpose of the input field",
    "announce the function",
    "announce the purpose",
    "name is missing"
  ];

  return {
    matchedNouns: controlNouns.filter((term) => text.includes(term)),
    matchedIssues: issueTerms.filter((term) => text.includes(term))
  };
}

function findVariantIds(text) {
  const variantIds = [];

  for (const variant of research.known_variants || []) {
    if ((variant.hint_terms || []).some((term) => text.includes(normalizeText(term)))) {
      variantIds.push(variant.variant_id);
    }
  }

  return unique(variantIds);
}

function classifyFamily3(assertedConditionText) {
  const normalized = normalizeText(assertedConditionText);
  const matchedPatterns = includesAny(normalized, research.core_phrase_patterns);
  const matchedCopyPastePatterns = includesAny(normalized, research.copy_paste_patterns);
  const heuristic = findHeuristicSignals(normalized);
  const variantIds = findVariantIds(normalized);

  const matched =
    matchedPatterns.length > 0 ||
    matchedCopyPastePatterns.length > 0 ||
    (heuristic.matchedNouns.length > 0 && heuristic.matchedIssues.length > 0);

  const score =
    (matchedPatterns.length * 3) +
    (matchedCopyPastePatterns.length * 4) +
    (heuristic.matchedNouns.length > 0 ? 1 : 0) +
    (heuristic.matchedIssues.length > 0 ? 1 : 0);

  return Object.freeze({
    matched,
    family_id: matched ? research.family_id : "",
    family_name: matched ? research.family_name : "",
    normalized_text: normalized,
    matched_patterns: unique(matchedPatterns),
    matched_copy_paste_patterns: unique(matchedCopyPastePatterns),
    matched_nouns: unique(heuristic.matchedNouns),
    matched_issues: unique(heuristic.matchedIssues),
    variant_ids: variantIds,
    score
  });
}

function matchesFamily3(assertedConditionText) {
  return classifyFamily3(assertedConditionText).matched;
}

module.exports = Object.freeze({
  normalizeText,
  classifyFamily3,
  matchesFamily3
});