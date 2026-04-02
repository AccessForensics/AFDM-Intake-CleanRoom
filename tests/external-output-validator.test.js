"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { DETERMINATION_TEMPLATE } = require("../src/intake/enums.js");
const {
  SPEC_VERSION,
  renderExternalOutputText,
  createExternalOutputValidationRecord,
  assertExternalOutputMayBeReleased,
} = require("../src/intake/external-output-validator.js");

function makeDetermination(template, note = "") {
  return {
    matter_id: "AF-2026-0001",
    determination_template: template,
    generated_at_local: "2026-03-19T12:00:00-04:00",
    generated_at_epoch_ms: 5000,
    matter_level_note: note,
  };
}

test("valid minimal determination output passes automated checks", () => {
  const determination = makeDetermination(DETERMINATION_TEMPLATE.TEMPLATE_1);
  const outputText = renderExternalOutputText(determination);

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    spec_version: SPEC_VERSION,
    determination_record: determination,
    output_text: outputText,
  });

  assert.equal(record.determination_template_used, DETERMINATION_TEMPLATE.TEMPLATE_1);
  assert.equal(record.forbidden_disclosure_check_passed, true);
  assert.equal(record.forbidden_language_check_passed, true);
  assert.equal(record.mandatory_term_check_passed, true);
  assert.equal(record.per_run_context_leakage_check_passed, true);
  assert.equal(record.indirect_signaling_check_passed, true);

  assert.doesNotThrow(() => assertExternalOutputMayBeReleased(record));
});

test("forbidden language in matter_level_note fails validation even when output_text body is clean", () => {
  const determination = makeDetermination(
    DETERMINATION_TEMPLATE.TEMPLATE_3,
    "This audit found issues."
  );

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    determination_record: determination,
    output_text: "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED",
  });

  assert.equal(record.forbidden_language_check_passed, false);
  assert.throws(() => assertExternalOutputMayBeReleased(record), /EXTERNAL_OUTPUT_VALIDATION_FAILED/);
});

test("indirect signaling phrase in matter_level_note fails validation even when output_text body is clean", () => {
  const determination = makeDetermination(
    DETERMINATION_TEMPLATE.TEMPLATE_3,
    "Extensive testing was completed."
  );

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    determination_record: determination,
    output_text: "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED",
  });

  assert.equal(record.indirect_signaling_check_passed, false);
  assert.throws(() => assertExternalOutputMayBeReleased(record), /EXTERNAL_OUTPUT_VALIDATION_FAILED/);
});

test("functional-equivalent signaling in matter_level_note requires reviewer clearance", () => {
  const determination = makeDetermination(
    DETERMINATION_TEMPLATE.TEMPLATE_3,
    "A thorough review was completed."
  );

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    determination_record: determination,
    output_text: "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED",
  });

  assert.equal(record.functional_equivalent_review_flagged, true);
  assert.throws(
    () => assertExternalOutputMayBeReleased(record),
    /FUNCTIONAL_EQUIVALENT_REVIEW_CLEARANCE_REQUIRED/
  );
});

test("anti-hedging language in matter_level_note requires reviewer clearance", () => {
  const determination = makeDetermination(
    DETERMINATION_TEMPLATE.TEMPLATE_3,
    "This likely applies."
  );

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    determination_record: determination,
    output_text: "DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED",
  });

  assert.equal(record.anti_hedging_review_flagged, true);
  assert.throws(
    () => assertExternalOutputMayBeReleased(record),
    /ANTI_HEDGING_REVIEW_CLEARANCE_REQUIRED/
  );
});

test("matter-level note compliance fails if note is not one sentence", () => {
  const determination = makeDetermination(
    DETERMINATION_TEMPLATE.TEMPLATE_5,
    "GEOBLOCK blocked bounded Desktop baseline access. Another sentence."
  );

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    determination_record: determination,
    output_text: "DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED",
  });

  assert.equal(record.matter_level_note_compliance_check_passed, false);
  assert.throws(() => assertExternalOutputMayBeReleased(record), /EXTERNAL_OUTPUT_VALIDATION_FAILED/);
});

test("note on disallowed template fails validation", () => {
  const determination = makeDetermination(
    DETERMINATION_TEMPLATE.TEMPLATE_7,
    "AUTHWALL blocked bounded Desktop baseline access."
  );

  const record = createExternalOutputValidationRecord({
    matter_id: "AF-2026-0001",
    determination_record: determination,
    output_text: "DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (BOTMITIGATION)",
  });

  assert.equal(record.matter_level_note_compliance_check_passed, false);
  assert.throws(() => assertExternalOutputMayBeReleased(record), /EXTERNAL_OUTPUT_VALIDATION_FAILED/);
});

test("renderExternalOutputText compiles determination and note", () => {
  const rendered = renderExternalOutputText(
    makeDetermination(
      DETERMINATION_TEMPLATE.TEMPLATE_3,
      "AUTHWALL blocked bounded Mobile baseline access."
    )
  );

  assert.match(rendered, /MOBILE BASELINE: CONSTRAINED/);
  assert.match(rendered, /AUTHWALL blocked bounded Mobile baseline access\./);
});