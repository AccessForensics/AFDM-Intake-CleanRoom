"use strict";

function pad3(value) {
  return String(value).padStart(3, "0");
}

function normalizeCandidateText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAnchorDelimiters(anchorText) {
  return String(anchorText || "")
    .replace(/\r\n/g, "\n")
    .replace(/`n(?=\s*(?:[-*]|\d+[.)]))/g, "\n");
}

function splitCommaConjunctions(text) {
  return String(text || "")
    .split(/\s*,\s*(?:and|also|plus|furthermore|moreover)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitAnchorTextIntoCandidates(anchorText) {
  const raw = normalizeAnchorDelimiters(anchorText);

  const linePieces = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstPass = [];
  for (const piece of linePieces) {
    const semicolonSplit = piece
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of semicolonSplit) {
      firstPass.push(part);
    }
  }

  const secondPass = [];
  for (const part of firstPass) {
    const conjunctionSplit = splitCommaConjunctions(part);
    for (const candidate of conjunctionSplit) {
      secondPass.push(candidate);
    }
  }

  return secondPass
    .map((part) => normalizeCandidateText(part))
    .filter(Boolean);
}

function assertAtomicCandidate(candidateText) {
  const obviousBlend = /;\s*|\s+\/\s+|,\s*(?:and|also|plus|furthermore|moreover)\s+|\s+\band\b\s+/i;
  const repeatedAssertionVerb =
    /\b(?:lack(?:s|ed)?|missing|without|did not|does not|fail(?:s|ed)? to|unable to)\b[\s\S]*\band\b[\s\S]*\b(?:lack(?:s|ed)?|missing|without|did not|does not|fail(?:s|ed)? to|unable to)\b/i;

  if (obviousBlend.test(candidateText) || repeatedAssertionVerb.test(candidateText)) {
    throw new Error(`NON_ATOMIC_ASSERTED_CONDITION: ${candidateText}`);
  }
}

function buildRunUnitsFromAnchors(anchors, options = {}) {
  if (!Array.isArray(anchors)) {
    throw new Error("NORMALIZED_ANCHORS_ARRAY_REQUIRED");
  }

  const desktopInScope = options.desktopInScope !== false;
  const mobileInScope = options.mobileInScope === true;
  const createdContextBasis = String(
    options.createdContextBasis || "generic_accessibility_allegation"
  ).trim();

  const runUnits = [];
  let counter = 0;

  for (const anchor of anchors) {
    const anchorId = String(anchor.complaintgroupanchorid || "").trim();
    const anchorText = String(anchor.anchortext || "").trim();

    if (!anchorId) {
      throw new Error("NORMALIZED_ANCHOR_MISSING_ID");
    }

    if (!anchorText) {
      throw new Error(`NORMALIZED_ANCHOR_MISSING_TEXT: ${anchorId}`);
    }

    const candidates = splitAnchorTextIntoCandidates(anchorText);
    if (candidates.length === 0) {
      throw new Error(`NO_ASSERTED_CONDITION_CANDIDATES: ${anchorId}`);
    }

    for (const candidate of candidates) {
      assertAtomicCandidate(candidate);
      counter += 1;

      runUnits.push(
        Object.freeze({
          rununitid: `RU-${pad3(counter)}`,
          complaintgroupanchorid: anchorId,
          assertedconditiontext: candidate,
          desktopinscope: desktopInScope,
          mobileinscope: mobileInScope,
          createdcontextbasis: createdContextBasis,
        })
      );
    }
  }

  return runUnits;
}

module.exports = Object.freeze({
  assertAtomicCandidate,
  buildRunUnitsFromAnchors,
  splitAnchorTextIntoCandidates,
});