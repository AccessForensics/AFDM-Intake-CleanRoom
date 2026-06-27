"use strict";

const fs = require("fs");
const path = require("path");
const {
  DETERMINATION_TEMPLATE,
  TEMPLATE_VALUES,
  NOTE_ALLOWED_TEMPLATES,
} = require("./enums.js");

const GOVERNED_TEMPLATE_FILENAME = "1-8 Intake Templates.md";
const DEPRECATED_TEMPLATE_FILENAME = "AFintaketemplates1-8.md";

function getSpecTemplatePath(repoRoot = process.cwd()) {
  const override = process.env.AFDM_INTAKE_SPEC_PATH;
  if (override && override.trim()) {
    return path.resolve(repoRoot, override.trim());
  }
  return path.join(repoRoot, "spec", GOVERNED_TEMPLATE_FILENAME);
}

function loadTemplateSpec(repoRoot = process.cwd()) {
  const target = getSpecTemplatePath(repoRoot);
  if (!fs.existsSync(target)) {
    const legacyTarget = path.join(repoRoot, "spec", DEPRECATED_TEMPLATE_FILENAME);
    if (fs.existsSync(legacyTarget)) {
      throw new Error(
        `GOVERNED_TEMPLATE_FILE_MISSING: expected ${GOVERNED_TEMPLATE_FILENAME}, found deprecated ${DEPRECATED_TEMPLATE_FILENAME}`
      );
    }
    throw new Error(`GOVERNED_TEMPLATE_FILE_MISSING: ${target}`);
  }
  if (path.basename(target) === DEPRECATED_TEMPLATE_FILENAME) {
    throw new Error(
      `DEPRECATED_TEMPLATE_FILENAME: ${DEPRECATED_TEMPLATE_FILENAME}`
    );
  }
  return fs.readFileSync(target, "utf8").replace(/^\uFEFF/, "");
}

function normalizeSpecForMatching(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\\_/g, "_")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\-/g, "-")
    .replace(/\*\*/g, "");
}

function validateTemplateSpec(text) {
  const body = String(text || "");
  const normalizedBody = normalizeSpecForMatching(body);

  if (!normalizedBody.includes(`File name: \`${GOVERNED_TEMPLATE_FILENAME}\``)) {
    throw new Error("TEMPLATE_SPEC_MISSING_GOVERNED_FILENAME");
  }

  const noteRulePattern =
    /\{\{MATTER_LEVEL_NOTE\}\}\s+may appear only in Template 3 or Template 5\b/;
  if (!noteRulePattern.test(normalizedBody)) {
    throw new Error("TEMPLATE_SPEC_MISSING_INTERNAL_NOTE_RULE");
  }

  for (let templateNumber = 1; templateNumber <= 8; templateNumber += 1) {
    const headingPattern = new RegExp(
      `(^|\\n)#\\s+TEMPLATE\\s+${templateNumber}:`,
      "m"
    );
    if (!headingPattern.test(normalizedBody)) {
      throw new Error(
        `TEMPLATE_SPEC_MISSING_HEADING: # TEMPLATE ${templateNumber}:`
      );
    }
  }

  for (const line of TEMPLATE_VALUES) {
    if (!normalizedBody.includes(line)) {
      throw new Error(`TEMPLATE_SPEC_MISSING_DETERMINATION: ${line}`);
    }
  }

  const forbiddenLegacy =
    /NEXT STEPS|WHAT IS REQUIRED TO REOPEN INTAKE|COUNSEL ACTION OPTION|REASON:/i;
  if (forbiddenLegacy.test(normalizedBody)) {
    throw new Error("TEMPLATE_SPEC_CONTAINS_LEGACY_VERBOSE_SECTIONS");
  }

  return true;
}

function renderTemplate(templateValue, matterId, matterLevelNote = "") {
  if (!TEMPLATE_VALUES.includes(templateValue)) {
    throw new Error(`INVALID_TEMPLATE: ${templateValue}`);
  }

  const safeMatterId = String(matterId || "").trim();
  if (!safeMatterId) {
    throw new Error("MATTER_ID_REQUIRED");
  }

  const safeNote = String(matterLevelNote || "").trim();
  const noteAllowed = NOTE_ALLOWED_TEMPLATES.has(templateValue);

  if (!noteAllowed && safeNote) {
    throw new Error("NOTE_NOT_ALLOWED_FOR_TEMPLATE");
  }

  if (noteAllowed && safeNote) {
    const sentenceCount = safeNote
      .split(/[.!?]+/)
      .map((part) => part.trim())
      .filter(Boolean).length;

    if (sentenceCount !== 1) {
      throw new Error("MATTER_LEVEL_NOTE_MUST_BE_ONE_MECHANICAL_SENTENCE");
    }
  }

  const lines = [
    "ACCESS FORENSICS",
    "INTAKE DETERMINATION",
    `MATTER ID: ${safeMatterId}`,
    "",
    templateValue,
  ];

  if (noteAllowed && safeNote) {
    lines.push("", safeNote);
  }

  return lines.join("\n");
}

module.exports = Object.freeze({
  loadTemplateSpec,
  validateTemplateSpec,
  renderTemplate,
  getSpecTemplatePath,
  GOVERNED_TEMPLATE_FILENAME,
  DEPRECATED_TEMPLATE_FILENAME,
  DETERMINATION_TEMPLATE,
});
