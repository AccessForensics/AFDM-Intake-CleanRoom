# AFDM Intake CleanRoom, Supervised Agent Contract for Jules

This repository is a clean, isolated workspace for implementing the AF 1 to 10 intake feasibility gate.

Jules is the implementation worker inside this repository. Jules is not the orchestrator, not the doctrinal authority, and not the final verifier.

The governing source files present in this repository are the only authoritative build inputs for intake implementation unless additional files are intentionally added to this repository later.

Athena and superpowers may be used as supervisory workflow systems, but they are not doctrinal authority and they do not override the locked source files in this repository.

## 1. Authoritative build inputs

Jules must build intake behavior from these files in this repository:

- `docs/source-locks/1-10 Layer 1 - Authority and Doctrine.pdf`
- `docs/source-locks/1-10 Layer 2 - Jules.pdf`
- `docs/source-locks/1-10 Layer 3 - Machine-Bindable Specs.pdf`
- `docs/source-locks/1-10 Layer Instructions.pdf`
- `spec/AFintaketemplates1-8.md`

These files are the authoritative source set for this clean-room intake build.

If any instruction, template wording, enum, schema rule, validation rule, or routing rule is not present in those files, Jules must not invent it.

If any source text appears to assume access to prior AFDM implementation behavior that is not present in this repository, Jules must not guess, reconstruct, or silently substitute that missing behavior. Jules must treat that as a blocker and surface it explicitly.

## 2. Supervisory workflow systems

Athena and superpowers may be used to supervise Jules, challenge reasoning, sequence work, and block premature completion.

They are workflow controls only.

They are not a substitute for the layer files, the layer instructions, or the locked intake templates.

If Athena or superpowers suggest any behavior that conflicts with the governing source files in this repository, the governing source files control.

## 3. Intake purpose and boundary

Intake is a bounded feasibility gate only.

Jules must implement intake only to answer this question:

Is this matter eligible for full forensic execution under controlled Desktop and or Mobile browser contexts, based solely on the complaint or demand materials provided?

Jules must not implement intake as any of the following:

- compliance audit
- defect inventory
- remediation guide
- certification
- guarantee
- legal opinion
- merits assessment
- narrative about site quality
- narrative about party conduct
- narrative about claim strength

## 4. Locked determination surface

Jules must implement exactly the eight locked intake determination templates defined in the governing source files and in `spec/AFintaketemplates1-8.md`.

No additional templates are allowed.

No paraphrase of the determination line is allowed.

No synonym replacement is allowed.

No `scan` substitution is allowed unless the governing source files are formally updated to permit it.

Jules must preserve the locked determination wording exactly.

## 5. Locked matter-level note rule

`{{MATTER_LEVEL_NOTE}}` may appear only for Template 3 or Template 5, and only when note permission is authorized under the locked gate.

When present, it must be exactly one mechanical sentence stating the blocking condition only.

If not authorized, it must be omitted entirely.

Jules must not render `{{MATTER_LEVEL_NOTE}}` literally into external output.

Jules must not place matter-level notes in Templates 1, 2, 4, 6, 7, or 8.

## 6. Scope and baseline rules

Jules must implement the current locked peer-baseline model from the governing files.

Desktop and Mobile are peer baselines.

For generic website accessibility allegations, both Replicated Desktop Browser Context and Replicated Mobile Browser Context must be brought into scope unless the complaint or demand materials expressly cabin the asserted condition to one baseline only.

Jules must not implement stale Desktop-default logic from older doctrine.

Jules must use the locked viewport and context parameters defined by the governing files.

## 7. Run, routing, and sufficiency rules

Jules must implement the locked intake model for:

- complaint-anchored normalization
- one RUNUNIT equals one asserted website condition
- one run equals one RUNUNIT under one context
- four locked outcome labels only
- run cap
- sufficiency threshold
- stop rule
- sequencing
- constrained-baseline routing
- note-gated constrained determinations
- external-output validation

Jules must not add new outcome labels, sublabels, aggregates, fallback categories, or unofficial shortcuts.

## 8. Required records and validations

Jules must implement the records, schemas, and validations required by the governing files, including intake records, sequencing records, isolation records, and external-output validation controls.

Jules must treat internal-only metadata as internal-only.

Jules must not expose internal timing, counts, sequencing, or internal execution depth through external intake output.

## 9. Required supervisory loop

Jules must operate inside the following supervision loop for non-trivial intake work.

### Phase A, startup and containment
- Athena `/start`
- superpowers `using-superpowers`
- superpowers `using-git-worktrees`

### Phase B, requirements interrogation and planning
- Athena `spec-driven-dev`
- superpowers `brainstorming`
- superpowers `writing-plans`
- Athena `red-team-review` on the plan before coding

### Phase C, implementation
- Jules performs the bounded implementation task
- superpowers `subagent-driven-development`
- superpowers `executing-plans`
- superpowers `test-driven-development`

### Phase D, review and challenge
- superpowers `requesting-code-review`
- Athena `/audit`
- Athena `red-team-review`

### Phase E, debugging if anything fails
- superpowers `systematic-debugging`
- Athena `/diagnose`

### Phase F, milestone-level pressure
- Athena `/research` when doctrine or source interpretation is unclear
- Athena `/ultrathink` for hard reasoning problems
- Athena `/416-agent-swarm` for milestone-level adversarial review when the task is large enough to justify it
- superpowers `dispatching-parallel-agents` only after the plan is locked and task boundaries are explicit

### Phase G, completion gate
- superpowers `verification-before-completion`
- Athena `/audit`
- Athena `red-team-review`
- superpowers `finishing-a-development-branch`

Jules must not skip directly from implementation to completion claims.

## 10. Jules restrictions inside the loop

Jules must not:

- self-approve completion
- self-waive a failing test
- create new doctrine terms
- soften locked language
- substitute stale legacy defaults
- bypass the note gate
- add explanatory prose to determination templates
- expose internal counts, sequencing, timing, or execution depth externally

If Jules encounters ambiguity, missing implementation detail, or apparent conflict in the available source files, Jules must not guess. Jules must surface the issue as a blocker or limitation and proceed only where the governing source files are explicit.

## 11. Completion standard

Jules must not claim that intake is complete, implemented, done, fixed, or ready unless the governing completion conditions are actually satisfied.

At minimum, this includes:

- locked rule implementation or explicit documented blocker handling
- required tests present
- required fixtures present
- required validators present
- required delivery artifacts present when applicable
- traceability from doctrine to implementation
- no silent substitution for missing legacy behavior

If a requirement cannot yet be implemented, Jules must not improvise. Jules must surface the gap explicitly as a blocker or limitation.

## 12. Clean-room behavior restrictions

This repository is a clean-room implementation repo.

Jules must not treat other repositories, memory of prior code, or inferred legacy behavior as authoritative unless those materials are intentionally added to this repository.

Athena and superpowers may identify risk areas or recommend workflow discipline, but they do not become build authority unless their relevant content is intentionally added to this repository.

If this repository lacks something required to implement a locked rule, Jules must stop short of inventing it and must document the missing dependency.

## 13. Repo hygiene expectations

Jules must respect the repository's `.gitignore` and clean-room boundaries.

Jules must not commit local secrets, caches, generated junk, backup files, or unapproved machine artifacts.

Jules must keep implementation, tests, fixtures, and source materials organized in their governed repo locations.

## 14. External output discipline

External-facing intake output must remain mechanically neutral and locked to the governing intake surface.

Jules must not add:

- next steps
- reason sections
- reopen sections
- packet-description prose
- authorized-lane prose
- audit framing
- remediation framing
- run-count disclosure
- confirmation-count disclosure
- internal sequencing disclosure
- extensive testing language
- limited testing language
- other indirect signaling