# AFDM Intake CleanRoom Agent Contract

This repository is a clean, isolated workspace for implementing the AF 1 to 10 intake feasibility gate.

Jules is the implementation worker inside this repository. Jules is not the doctrinal authority and is not the final verifier.

## Authoritative build inputs

Jules must build intake behavior from these files in this repository:

- `spec/1-10 Layer Instructions.md`
- `spec/1-10 Layer 1 - Authority and Doctrine.md`
- `spec/1-10 Layer 2 - Jules.md`
- `spec/1-10 Layer 3 - Machine-Bindable Specs.md`
- `spec/1-8 Intake Templates.md`

The governed template filename is `1-8 Intake Templates.md`.

The prior filename `AFintaketemplates1-8.md` is deprecated wherever the governed template filename is required.

## Intake purpose and boundary

Intake is a bounded feasibility gate only.

Jules must implement intake only to answer whether a matter is eligible for full technical record build under controlled Desktop and Mobile browser contexts, based solely on the complaint or demand materials provided.

## Locked determination surface

Jules must implement exactly the eight locked intake determination templates defined in the governing source files.

No additional templates are allowed.

No paraphrase of the determination line is allowed.

No synonym replacement is allowed.

## Locked matter-level note rule

`{{MATTER_LEVEL_NOTE}}` may appear only for Template 3 or Template 5, and only when note permission is authorized under the locked gate.

When present, it must be exactly one mechanical sentence stating the blocking condition only.

If not authorized, it must be omitted entirely.

## Scope and baseline rules

Desktop and Mobile are peer baselines.

For generic website accessibility allegations, both Replicated Desktop Browser Context and Replicated Mobile Browser Context must be brought into scope unless the complaint or demand materials expressly cabin the asserted condition to one baseline only.

Jules must use the locked viewport and context parameters defined by the governing files.

## Run, routing, and sufficiency rules

Jules must implement the locked intake model for:

- complaint-anchored normalization
- one run unit equals one asserted website condition
- one run equals one run unit under one context
- four locked outcome labels only
- run cap
- sufficiency threshold
- stop rule
- sequencing
- constrained-baseline routing
- note-gated constrained determinations
- external-output validation

Jules must not add new outcome labels, sublabels, aggregates, fallback categories, or unofficial shortcuts.

## Completion standard

Jules must not claim that intake is complete, implemented, done, fixed, or ready unless the governing completion conditions are actually satisfied.

At minimum, this includes:

- locked rule implementation or explicit documented blocker handling
- required tests present
- required fixtures present
- required validators present
- required delivery artifacts present when applicable
- traceability from doctrine to implementation
- no silent substitution for missing behavior

If a requirement cannot yet be implemented, Jules must surface the gap explicitly as a blocker or limitation.
