"use strict";

const research = require("./family2.research.json");

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

function classifyFamily2(assertedConditionText) {
  const normalized = normalizeText(assertedConditionText);
  const matchedPatterns = includesAny(normalized, research.core_phrase_patterns);
  const matched = matchedPatterns.length > 0;

  return Object.freeze({
    matched,
    family_id: matched ? research.family_id : "",
    family_name: matched ? research.family_name : "",
    normalized_text: normalized,
    matched_patterns: unique(matchedPatterns),
    score: matchedPatterns.length
  });
}

function matchesFamily2(assertedConditionText) {
  return classifyFamily2(assertedConditionText).matched;
}

module.exports = Object.freeze({
  normalizeText,
  classifyFamily2,
  matchesFamily2
});