# Golden Artifact Verification

Status: curated_verification_table

## Verification boundary

This document records the current golden-artifact verification state for the AFDM Intake CleanRoom implementation slice.

It verifies the Appendix D fixture set that is implemented and exercised by the current Node test suite. Scaffolded follow-up fixtures remain listed separately and do not support a completion claim for the hardening items they represent.

## Validation run referenced

- Local validation date: 2026-05-07
- Test command: `node --test <all discovered test files>`
- Test file count: 25
- Result: passed
- Exit code: 0
- Local evidence file: `C:\Users\mskir\Desktop\AFDM_IntakeCleanRoom_Diagnostics\layer-encoding-commit-node-test-output-20260507-123548.txt`

## Required minimum cases from Appendix E

| Requirement | Fixture evidence | Expected state | Validation result | Reference resolution result | Status |
|---|---|---|---|---|---|
| valid Desktop-only intake matter | D.1, `fixtures/intake/appendix-d/d1_desktop_only_eligible.json` | Template 2, Desktop technical record build eligible | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| valid Desktop and Mobile intake matter | D.2, `fixtures/intake/appendix-d/d2_desktop_and_mobile_eligible.json` | Template 1, Desktop and Mobile technical record build eligible | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| valid Desktop with Mobile constrained matter | D.3, `fixtures/intake/appendix-d/d3_desktop_eligible_mobile_constrained.json` | Template 3, Desktop eligible with Mobile baseline constrained | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| valid Mobile-only intake matter | D.4, `fixtures/intake/appendix-d/d4_mobile_only_eligible.json` | Template 4, Mobile technical record build eligible | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| valid Mobile with Desktop constrained matter | D.5, `fixtures/intake/appendix-d/d5_mobile_eligible_desktop_constrained.json` | Template 5, Mobile eligible with Desktop baseline constrained | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| ineligible generic matter | D.6, `fixtures/intake/appendix-d/d6_not_eligible_generic.json` | Template 6, not eligible for forensic execution | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| ineligible BOTMITIGATION matter | D.7, `fixtures/intake/appendix-d/d7_not_eligible_botmitigation.json` | Template 7, not eligible due to BOTMITIGATION constraints | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| ineligible other-constraint matter | D.8, `fixtures/intake/appendix-d/d8_not_eligible_constraints_other.json` | Template 8, not eligible due to non-BOTMITIGATION constraints | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| note-gated constrained run | D.9, `fixtures/intake/appendix-d/d9_note_gated_constrained_run.json` | mechanical note allowed only under locked note gate | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| invalid note on observed run | D.10, `fixtures/intake/appendix-d/d10_invalid_note_on_observed_run.json` | validation failure | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| invalid sequencing case | D.11, `fixtures/intake/appendix-d/d11_non_alternating_sequencing_failure.json` | validation failure | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| invalid state-isolation case | D.12, `fixtures/intake/appendix-d/d12_state_persistence_failure.json` | validation failure | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |
| invalid external-output case | D.13, `fixtures/intake/appendix-d/d13_indirect_signaling_output_failure.json` | validation failure | Covered by local passing Node suite | Fixture path present in fixture inventory and referenced by traceability matrix | pass |

## Scaffolded follow-up fixtures, not completion proof

These fixtures are present in the fixture inventory but remain scaffolded follow-up evidence. They do not close the preflight/probe-coverage hardening limitation until the related implementation and tests are completed.

| Fixture | Expected state | Current use | Status |
|---|---|---|---|
| D.14, `fixtures/intake/appendix-d/d14_unbounded_alt_text_insufficiently_specified.json` | unbounded alt text is Insufficiently specified for bounded execution | scaffold for boundedness hardening | scaffolded |
| D.15, `fixtures/intake/appendix-d/d15_mixed_boundedness_preserves_bounded_execution.json` | mixed boundedness preserves bounded execution | scaffold for mixed-boundedness hardening | scaffolded |
| D.16, `fixtures/intake/appendix-d/d16_marker_only_not_botmitigation.json` | challenge marker alone is not BOTMITIGATION | scaffold for BOTMITIGATION hardening | scaffolded |
| D.17, `fixtures/intake/appendix-d/d17_true_challenge_wall_botmitigation.json` | true challenge wall may classify as BOTMITIGATION | scaffold for BOTMITIGATION hardening | scaffolded |

## Verification conclusion

The implemented Appendix D fixture set D.1-D.13 satisfies the current golden verification requirement for the implemented intake slice.

The hardening fixtures D.14-D.17 remain scaffolded and are carried forward under the preflight/probe coverage hardening limitation. They must not be used to claim that unsupported probe coverage or BOTMITIGATION edge behavior is fully closed.
