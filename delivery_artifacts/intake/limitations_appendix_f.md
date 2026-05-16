# Appendix F Limitations

## Resolved limitations

### LIM-001
- limitation_id: LIM-001
- doctrine_section: Appendix E.6 and Appendix F
- requirement_summary: doctrine-to-code traceability matrix must have one row per locked requirement or a defensible locked-requirement grouping with implementation, test, fixture, limitation, and completion status
- prior_state: partially implemented
- current_state: resolved for current implemented intake slice
- resolution_summary: traceability matrix was expanded from a seeded evidence matrix into a doctrine-to-implementation evidence matrix covering the locked Layer 1, Layer 2, Layer 3, Appendix A, Appendix C, Appendix D, Appendix E.5, and Appendix F surfaces relevant to the current implementation slice
- evidence_file: delivery_artifacts/intake/traceability_matrix.csv
- blocks_completion: false

### LIM-002
- limitation_id: LIM-002
- doctrine_section: Appendix E.5
- requirement_summary: golden artifact verification must show named cases with expected state, validation result, and reference resolution result
- prior_state: partially implemented
- current_state: resolved for implemented Appendix D fixture set D.1-D.13
- resolution_summary: golden artifact verification was replaced with a curated verification table listing each implemented fixture, expected state, validation result, reference resolution result, and status
- evidence_file: delivery_artifacts/intake/golden_artifact_verification.md
- residual_note: scaffolded hardening fixtures D.14-D.17 remain identified as follow-up fixture expansion items, not as evidence that blocks the current implemented slice
- blocks_completion: false

### LIM-004
- limitation_id: LIM-004
- doctrine_section: Layer 1 Section 3.6, Layer 1 Section 7.5, Layer 2 Section 7.5, Layer 3 Section 7.5, Appendix D hardening fixtures D.14-D.17
- requirement_summary: unsupported probe coverage must not fall through into external doctrinal labels, and missing implemented probe coverage must not be represented as Insufficiently specified for bounded execution
- prior_state: open
- current_state: resolved for runtime fail-closed enforcement in the implemented intake slice
- resolution_summary: PR #51 added fail-closed preflight behavior for unsupported probe coverage, removed the runner fallback that converted missing Playwright probe coverage into an Insufficiently specified outcome, and updated Family 2 fallback behavior to throw a strict implementation-missing error instead of emitting the no-probe mechanical note
- evidence_files:
  - tools/run-playwright-intake.js
  - src/intake/families/family2.probe.js
  - tests/hardening/preflight-coverage-check.test.js
  - tests/playwright-intake-fail-closed-routing.test.js
  - tests/playwright-intake-synthetic-payload.test.js
- validation_evidence:
  - focused LIM-004 tests passed: 18 tests, 0 failures
  - full Node test suite passed: 25 test files, exit code 0
  - local evidence file: C:\Users\mskir\Desktop\AFDM_IntakeCleanRoom_Diagnostics\pr51-rebased-full-node-test-output-20260516-112727.txt
  - merged PR: #51, Fail closed on unsupported probe coverage
  - merge commit: 8ca9cacad141e3739cdeea7b2bd2fea7463022e3
- residual_note: D.14-D.17 remain useful follow-up fixtures for broader edge-case coverage, but the specific runtime fallthrough blocker is closed for the implemented intake slice
- blocks_completion: false

## Partially resolved limitation carried forward

### LIM-003
- limitation_id: LIM-003
- doctrine_section: Appendix E.1 to E.7
- requirement_summary: delivery package must be complete before completion may be claimed
- prior_state: partially implemented snapshot package
- current_state: partially resolved
- resolution_summary: traceability, golden verification, completion scorecard, and runtime fail-closed hardening have been updated; the delivery package remains blocked only by CI guardrail automation
- evidence_files:
  - delivery_artifacts/intake/traceability_matrix.csv
  - delivery_artifacts/intake/golden_artifact_verification.md
  - delivery_artifacts/intake/audit/completion_scorecard.json
  - delivery_artifacts/intake/limitations_appendix_f.md
- residual_risk: completion claim remains blocked by LIM-005 because CI guardrails are not yet enforcing the gates automatically
- blocks_completion: true
- planned_followup: finish LIM-005 before final completion claim

## Open limitations carried forward

### LIM-005
- limitation_id: LIM-005
- doctrine_section: Appendix E and CI delivery discipline
- requirement_summary: CI guardrails must block regressions in tests, template validation, Appendix F completion blockers, traceability, external-output leakage, unsupported coverage fallthrough, and context drift
- current_state: open
- why_not_enforced: current validation is local and artifact-based; CI guardrails have not yet been added for all completion gates
- risk_if_unaddressed: a future PR could reintroduce doctrine drift, stale completion artifacts, unsupported coverage fallthrough, external-output leakage, or stale completion claims without being blocked automatically
- temporary_controls: local Node validation and artifact review are documented in delivery artifacts and pull request descriptions
- tests_missing_or_partial: CI checks for full Node tests, template validation, Appendix F blockers, traceability completeness, unsupported probe coverage fallthrough, context drift, and internal-only artifact leakage are still required
- fixtures_missing_or_partial: none specific beyond future edge-case expansion fixtures
- expected_failure_mode: completion or merge confidence could rely on manual discipline instead of automated guardrails
- blocks_completion: true
- planned_followup: add CI guardrails as the next engineering package
