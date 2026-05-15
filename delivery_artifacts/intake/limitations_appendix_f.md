# Appendix F Limitations

## Resolved limitations in this package

### LIM-001
- limitation_id: LIM-001
- doctrine_section: Appendix E.6 and Appendix F
- requirement_summary: doctrine-to-code traceability matrix must have one row per locked requirement or a defensible locked-requirement grouping with implementation, test, fixture, limitation, and completion status
- prior_state: partially implemented
- current_state: resolved for current implemented intake slice
- resolution_summary: traceability matrix was expanded from a seeded evidence matrix into a doctrine-to-implementation evidence matrix covering the locked Layer 1, Layer 2, Layer 3, Appendix A, Appendix C, Appendix D, Appendix E.5, and Appendix F surfaces relevant to the current implementation slice
- evidence_file: delivery_artifacts/intake/traceability_matrix.csv
- residual_risk: preflight/probe coverage hardening remains separately disclosed under LIM-004
- blocks_completion: false

### LIM-002
- limitation_id: LIM-002
- doctrine_section: Appendix E.5
- requirement_summary: golden artifact verification must show named cases with expected state, validation result, and reference resolution result
- prior_state: partially implemented
- current_state: resolved for implemented Appendix D fixture set D.1-D.13
- resolution_summary: golden artifact verification was replaced with a curated verification table listing each implemented fixture, expected state, validation result, reference resolution result, and status
- evidence_file: delivery_artifacts/intake/golden_artifact_verification.md
- residual_risk: scaffolded hardening fixtures D.14-D.17 remain excluded from completion proof until the related hardening package is implemented
- blocks_completion: false

### LIM-003
- limitation_id: LIM-003
- doctrine_section: Appendix E.1 to E.7
- requirement_summary: delivery package must be complete before completion may be claimed
- prior_state: partially implemented snapshot package
- current_state: partially resolved
- resolution_summary: traceability and golden verification artifacts were upgraded from snapshots to curated evidence artifacts, and the stale test failure status was corrected in the completion scorecard
- evidence_files:
  - delivery_artifacts/intake/traceability_matrix.csv
  - delivery_artifacts/intake/golden_artifact_verification.md
  - delivery_artifacts/intake/audit/completion_scorecard.json
- residual_risk: completion claim remains blocked by open runtime hardening and CI guardrail limitations
- blocks_completion: true
- planned_followup: finish LIM-004 and LIM-005 before final completion claim

## Open limitations carried forward

### LIM-004
- limitation_id: LIM-004
- doctrine_section: Layer 1 Section 3.6, Layer 1 Section 7.5, Layer 2 Section 7.5, Layer 3 Section 7.5, Appendix D hardening fixtures D.14-D.17
- requirement_summary: unsupported probe coverage must not fall through into external doctrinal labels, and missing implemented probe coverage must not be represented as Insufficiently specified for bounded execution
- current_state: open
- why_not_enforced: current implementation includes boundedness and outcome handling, but the general unsupported-probe-family preflight hardening package has not yet been completed
- risk_if_unaddressed: implementation gaps may be mislabeled as doctrinal insufficiency, especially where no Playwright probe family is implemented for a normalized asserted condition
- temporary_controls: known fixture scaffolds D.14-D.17 identify the hardening targets; traceability matrix carries LIM-004 against the affected doctrine surfaces
- tests_missing_or_partial: dedicated unsupported-probe-family tests and fallback-blocking tests still required
- fixtures_missing_or_partial: D.14-D.17 remain scaffolded, not completion proof
- expected_failure_mode: unsupported current coverage may still require manual identification rather than being fully blocked by a general runtime preflight gate
- blocks_completion: true
- planned_followup: implement family-level preflight coverage classification and prove that unsupported coverage cannot become an external doctrinal outcome label

### LIM-005
- limitation_id: LIM-005
- doctrine_section: Appendix E and CI delivery discipline
- requirement_summary: CI guardrails must block regressions in tests, template validation, Appendix F completion blockers, traceability, external-output leakage, unsupported coverage fallthrough, and context drift
- current_state: open
- why_not_enforced: current validation is local and artifact-based; CI guardrails have not yet been added for all completion gates
- risk_if_unaddressed: a future PR could reintroduce doctrine drift, stale completion artifacts, unsupported coverage fallthrough, or external-output leakage without being blocked automatically
- temporary_controls: local Node validation and artifact review are documented in delivery artifacts
- tests_missing_or_partial: CI checks for Appendix F blockers, traceability completeness, unsupported probe coverage fallthrough, and internal-only artifact leakage are still required
- fixtures_missing_or_partial: none specific beyond LIM-004 hardening fixtures
- expected_failure_mode: completion or merge confidence could rely on manual discipline instead of automated guardrails
- blocks_completion: true
- planned_followup: add CI guardrails after preflight/probe coverage hardening is implemented
