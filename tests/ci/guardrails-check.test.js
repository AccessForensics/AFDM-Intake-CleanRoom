"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const guardrails = require("../../tools/ci/guardrails_check.js");

test("LIM-005 guardrails pass against the current repository state", () => {
  const messages = [];
  const result = guardrails.runAll({
    repoRoot,
    write: (line) => messages.push(line)
  });

  assert.equal(result.ok, true);
  assert.ok(result.passed.includes("runtime unsupported coverage fail-closed markers"));
  assert.ok(result.passed.includes("completion scorecard blocker state"));
  assert.ok(result.passed.includes("GitHub Actions workflow"));
  assert.ok(result.passed.includes("external output leakage coverage"));
  assert.ok(messages.some((line) => line.includes("ok - template spec validation")));
});

test("scorecard guardrail rejects LIM-004 as an open blocker", () => {
  const badScorecard = {
    completion_claim_permitted: false,
    node_test_status: "pass",
    node_test_exit_code: 0,
    node_test_file_count: 26,
    runtime_hardening_status: "lim_004_runtime_fail_closed_resolved",
    resolved_blockers: [],
    open_blockers: [
      { blocker_id: "BLOCK-LIM-003" },
      { blocker_id: "BLOCK-LIM-004" },
      { blocker_id: "BLOCK-LIM-005" }
    ]
  };

  assert.throws(
    () => guardrails.validateScorecardObject(badScorecard),
    /BLOCK-LIM-004 must not remain open/
  );
});

test("scorecard guardrail rejects completion claims with open blockers", () => {
  const badScorecard = {
    completion_claim_permitted: true,
    node_test_status: "pass",
    node_test_exit_code: 0,
    node_test_file_count: 26,
    runtime_hardening_status: "lim_004_runtime_fail_closed_resolved",
    ci_guardrails_status: "lim_005_resolved_by_PR_53",
    completion_boundary: "current_implemented_intake_slice_only",
    resolved_blockers: [
      { blocker_id: "BLOCK-LIM-003" },
      { blocker_id: "BLOCK-LIM-004" },
      { blocker_id: "BLOCK-LIM-005" }
    ],
    open_blockers: [
      { blocker_id: "BLOCK-LIM-005" }
    ]
  };

  assert.throws(
    () => guardrails.validateScorecardObject(badScorecard),
    /completion_claim_permitted true requires zero open blockers/
  );
});

test("scorecard guardrail rejects final completion without LIM-005 resolution", () => {
  const badScorecard = {
    completion_claim_permitted: true,
    node_test_status: "pass",
    node_test_exit_code: 0,
    node_test_file_count: 26,
    runtime_hardening_status: "lim_004_runtime_fail_closed_resolved",
    ci_guardrails_status: "lim_005_resolved_by_PR_53",
    completion_boundary: "current_implemented_intake_slice_only",
    resolved_blockers: [
      { blocker_id: "BLOCK-LIM-003" },
      { blocker_id: "BLOCK-LIM-004" }
    ],
    open_blockers: []
  };

  assert.throws(
    () => guardrails.validateScorecardObject(badScorecard),
    /BLOCK-LIM-005 must be resolved before completion is permitted/
  );
});

test("scorecard guardrail rejects final completion without completion boundary", () => {
  const badScorecard = {
    completion_claim_permitted: true,
    node_test_status: "pass",
    node_test_exit_code: 0,
    node_test_file_count: 26,
    runtime_hardening_status: "lim_004_runtime_fail_closed_resolved",
    ci_guardrails_status: "lim_005_resolved_by_PR_53",
    resolved_blockers: [
      { blocker_id: "BLOCK-LIM-003" },
      { blocker_id: "BLOCK-LIM-004" },
      { blocker_id: "BLOCK-LIM-005" }
    ],
    open_blockers: []
  };

  assert.throws(
    () => guardrails.validateScorecardObject(badScorecard),
    /scorecard must define the completion boundary/
  );
});
