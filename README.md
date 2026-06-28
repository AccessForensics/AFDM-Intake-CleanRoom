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

The prior filename `AFintaketemplates1-8.md` is deprecated wherever the governed template filename is required.

The source authority snapshot for this update is recorded in `spec/source-authority-manifest.json`.

A repository state should not be treated as source-aligned unless the five governed source files in `spec/` match that manifest exactly.

## Scope

This repo implements intake as a bounded feasibility gate. Intake uses only the complaint or demand materials provided as the scope anchor.

## Locked External Output Boundary

External-facing intake output expresses eligibility only.

It must not disclose or imply run counts, confirmation counts, selected asserted conditions, attempted asserted conditions, per-run sequencing, or per-run context assignment.

When external output describes scope and context, it must use these exact terms:

- `complaint or demand materials provided`
- `specific website conditions asserted in those materials`
- `bounded execution parameters`
- `Replicated Desktop Browser Context`
- `Replicated Mobile Browser Context`

## Completion Standard

No one may claim this repo is complete unless all locked rules are implemented or disclosed in the governed limitation format, required tests and fixtures are present, validation passes, traceability is complete, and no unresolved completion-blocking limitation remains.

Current status: scaffold / clean-room intake implementation target.
