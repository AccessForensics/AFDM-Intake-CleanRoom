# AFDM Intake Clean Room

Internal use only.

This repository is the clean-room implementation target for AF Sections 1 to 10 intake feasibility gating.

## Current Authority Set

The governed intake authority set is:

1. `spec/1-10 Layer Instructions.md`
2. `spec/1-10 Layer 1 - Authority and Doctrine.md`
3. `spec/1-10 Layer 2 - Jules.md`
4. `spec/1-10 Layer 3 - Machine-Bindable Specs.md`
5. `spec/1-8 Intake Templates.md`

The governed intake template filename is `1-8 Intake Templates.md`.

The source authority snapshot for this update is recorded in `spec/source-authority-manifest.json`.

A repository state must not be treated as source-aligned unless the five governed source files in `spec/` match that manifest exactly.

## Suggested Repository Layout

The implementation target must use the governed Markdown authority files, not PDF authority files:

- `spec/1-10 Layer Instructions.md`
- `spec/1-10 Layer 1 - Authority and Doctrine.md`
- `spec/1-10 Layer 2 - Jules.md`
- `spec/1-10 Layer 3 - Machine-Bindable Specs.md`
- `spec/1-8 Intake Templates.md`
- `spec/source-authority-manifest.json`
- `src/intake/`
- `fixtures/intake/`
- `tests/`
- `tools/ci/`
- `delivery_artifacts/intake/`

No active repository path, manifest entry, README instruction, fixture instruction, test instruction, environment variable, or validator may point to a deprecated intake-template filename.

## Scope

This repo implements intake as a bounded feasibility gate. Intake uses only the complaint or demand materials provided as the scope anchor.

Intake may decide whether a matter is eligible for a technical record build. Intake must not become remediation, compliance advice, legal conclusion generation, attorney briefing, or a secondary validation program.

## Locked External Output Boundary

External-facing intake output expresses eligibility only.

It must not disclose or imply run counts, confirmation counts, selected asserted conditions, attempted asserted conditions, per-run sequencing, or per-run context assignment.

When external output describes scope and context, it must use these exact terms:

- `complaint or demand materials provided`
- `specific website conditions asserted in those materials`
- `bounded execution parameters`
- `Replicated Desktop Browser Context`
- `Replicated Mobile Browser Context`

Internal labels, internal evidence states, probe-family labels, execution routing labels, and attorney-facing analysis language must never leak into external output.

## Locked Determination Surface

The implementation must preserve the eight governed intake determination templates and no others.

The only permitted external-facing determination lines are the lines governed by `spec/1-8 Intake Templates.md`.

No implementation may create a ninth template, a secondary family of determinations, a shadow class, a new outcome label, or a substitute determination string.

## Required Fixtures

The repository must include all 18 Layer 2 Appendix D fixtures before completion may be claimed:

1. Fixture 1: eligible desktop and mobile technical record build
2. Fixture 2: eligible desktop technical record build
3. Fixture 3: eligible desktop technical record build with mobile baseline constrained
4. Fixture 4: eligible mobile technical record build
5. Fixture 5: eligible mobile technical record build with desktop baseline constrained
6. Fixture 6: not eligible for forensic execution
7. Fixture 7: not eligible for forensic execution - constraints BOTMITIGATION
8. Fixture 8: not eligible for forensic execution - constraints OTHER
9. Fixture 9: grouped complaint structure preserved while execution atomics remain bounded
10. Fixture 10: external output excludes internal execution and run-detail leakage
11. Fixture 11: matter-level note appears only where authorized
12. Fixture 12: prohibited external vocabulary failure
13. Fixture 13: indirect-signaling output failure
14. Fixture 14: generic-alt-text allegation without bounded page
15. Fixture 15: mixed-boundedness matter
16. Fixture 16: challenge-script plus rendered-content page with BOTMITIGATION override
17. Fixture 17: true challenge-wall page
18. Fixture 18: doctrine-bridge and post-intake boundary enforcement

A completion claim must fail if any required fixture is missing, renamed into a non-equivalent concept, or replaced by a broad summary.

## Required Tests

The repository must include physically written tests for the Appendix C negative and boundary conditions. Broad summaries are not enough.

The test matrix must prove at least the following:

- the validator rejects any external output that leaks internal evidence-state labels, including internal `Present` and `Not Present` labels
- the validator rejects attorney briefing language, legal conclusions, remediation language, compliance language, certification language, guarantee language, and audit-style language in external output
- the validator rejects external disclosure of run counts, confirmation counts, attempted asserted conditions, selected asserted conditions, per-run sequencing, per-run context assignment, selector detail, screenshot counts, raw tool outputs, or internal routing explanations
- the validator rejects isolated template-string edits that are not synchronized with the governed eight-template surface
- the validator rejects any template filename drift away from `1-8 Intake Templates.md`
- the validator rejects addition of a ninth template, substitute determination string, new outcome class, or shadow template family
- the validator rejects matter-level notes outside the locked authorization gates
- the validator rejects matter-level notes that become legal, argumentative, hedged, remediation-oriented, compliance-oriented, or attorney-facing
- the validator rejects use of implementation-only probe-family labels as external outcome labels
- the validator proves challenge-script plus rendered-content cases route to the BOTMITIGATION override only when the locked condition is satisfied
- the validator proves true challenge-wall cases remain constrained and do not become a clean eligibility or merits finding
- the validator proves generic-alt-text allegations without a bounded page do not create unbounded execution authority
- the validator proves mixed-boundedness matters preserve the complaint structure while refusing unbounded expansion
- the validator proves doctrine-bridge and post-intake boundary enforcement prevents intake output from becoming downstream legal or remediation work

## Prohibited Family and Hardening Drift

The implementation must not use `Family 3` as a completion category, external label, template class, or substitute for the locked eight-template intake surface.

Any internal probe grouping must map back to locked enums and locked intake determination templates. Internal implementation labels must remain implementation details and must not create new operator-facing or external-facing classes.

Hardening scripts must not act as an unauthorized secondary validation loop. Any retained validation script must be limited to verifying locked rules from the governed authority set. It must not alter scope, stop rules, outcome labels, eligibility determinations, template text, or external output posture.

Repository artifacts or scripts that cannot meet that boundary must be removed, archived outside the active build path, or replaced with locked-rule validators.

## Completion Standard

No one may claim this repo is complete unless all locked rules are implemented or disclosed in the governed limitation format, required tests and fixtures are present, validation passes, traceability is complete, and no unresolved completion-blocking limitation remains.

Current status: scaffold / clean-room intake implementation target. Completion remains blocked until source-body mirroring, fixture coverage, test coverage, and traceability all pass the governed authority checks.
