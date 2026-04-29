# Fixture Inventory

Status: evidence_snapshot_only

## Appendix D fixtures

- D.1, fixture_1_desktop_only_eligible, expected state: Template 2, status: implemented, fixture path: fixtures/intake/appendix-d/d1_desktop_only_eligible.json
- D.2, fixture_2_desktop_and_mobile_eligible, expected state: Template 1, status: implemented, fixture path: fixtures/intake/appendix-d/d2_desktop_and_mobile_eligible.json
- D.3, fixture_3_desktop_eligible_mobile_constrained, expected state: Template 3, status: implemented, fixture path: fixtures/intake/appendix-d/d3_desktop_eligible_mobile_constrained.json
- D.4, fixture_4_mobile_only_eligible, expected state: Template 4, status: implemented, fixture path: fixtures/intake/appendix-d/d4_mobile_only_eligible.json
- D.5, fixture_5_mobile_eligible_desktop_constrained, expected state: Template 5, status: implemented, fixture path: fixtures/intake/appendix-d/d5_mobile_eligible_desktop_constrained.json
- D.6, fixture_6_not_eligible_generic, expected state: Template 6, status: implemented, fixture path: fixtures/intake/appendix-d/d6_not_eligible_generic.json
- D.7, fixture_7_not_eligible_botmitigation, expected state: Template 7, status: implemented, fixture path: fixtures/intake/appendix-d/d7_not_eligible_botmitigation.json
- D.8, fixture_8_not_eligible_constraints_other, expected state: Template 8, status: implemented, fixture path: fixtures/intake/appendix-d/d8_not_eligible_constraints_other.json
- D.9, fixture_9_note_gated_constrained_run, expected state: note passes validation, status: implemented, fixture path: fixtures/intake/appendix-d/d9_note_gated_constrained_run.json
- D.10, fixture_10_invalid_note_on_observed_run, expected state: validation failure, status: implemented, fixture path: fixtures/intake/appendix-d/d10_invalid_note_on_observed_run.json
- D.11, fixture_11_non_alternating_sequencing_failure, expected state: validation failure, status: implemented, fixture path: fixtures/intake/appendix-d/d11_non_alternating_sequencing_failure.json
- D.12, fixture_12_state_persistence_failure, expected state: validation failure, status: implemented, fixture path: fixtures/intake/appendix-d/d12_state_persistence_failure.json
- D.13, fixture_13_indirect_signaling_output_failure, expected state: validation failure, status: implemented, fixture path: fixtures/intake/appendix-d/d13_indirect_signaling_output_failure.json
- D.14, fixture_14_unbounded_alt_text_insufficiently_specified, expected state: Insufficiently specified for bounded execution, status: scaffolded, fixture path: fixtures/intake/appendix-d/d14_unbounded_alt_text_insufficiently_specified.json
- D.15, fixture_15_mixed_boundedness_preserves_bounded_execution, expected state: bounded execution preserved, status: scaffolded, fixture path: fixtures/intake/appendix-d/d15_mixed_boundedness_preserves_bounded_execution.json
- D.16, fixture_16_marker_only_not_botmitigation, expected state: not BOTMITIGATION by marker presence alone, status: scaffolded, fixture path: fixtures/intake/appendix-d/d16_marker_only_not_botmitigation.json
- D.17, fixture_17_true_challenge_wall_botmitigation, expected state: BOTMITIGATION, status: scaffolded, fixture path: fixtures/intake/appendix-d/d17_true_challenge_wall_botmitigation.json

## Validation result note

- implemented fixtures are proven only to the extent current local tests pass
- scaffolded fixtures are present in the scaffold but are not yet treated as implemented proof
- scaffolded or partial areas must remain disclosed in Appendix F until fully verified