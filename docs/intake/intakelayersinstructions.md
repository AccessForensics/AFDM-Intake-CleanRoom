# AF SECTIONS 1 TO 10

# AF INTAKE, LAYER 1-3 UNIFIED IMPLEMENTATION SPEC

Internal Use Only. Governs implementation in the intake branch.

Unified file name: `intakelayersinstructions.md`

## How to use this document

This is the unified implementation spec for AF intake.

It is a consolidation layer across the current standalone source files:

- `1-10 Layer 1 - Authority and Doctrine.md`, for meaning, posture, nondisclosure, feasibility-gate boundary, and doctrinal interpretation
- `1-10 Layer 2 - Jules.md`, for build obligations, validation obligations, test obligations, fixture obligations, delivery obligations, and completion criteria
- `1-10 Layer 3 - Machine-Bindable Specs.md`, for exact machine expression, enums, determination templates, conditionals, sequencing, validation rules, and record contracts

This unified document does not replace the standalone layer files. It unifies them for implementation use.

If this unified document conflicts with a standalone layer file, the standalone layer file governs for that subject.

If doctrine text conflicts with implemented AFDM runtime behavior, runtime behavior governs what the system actually did. That does not authorize silent drift. The conflict must be surfaced and corrected through governance.

When building, modifying, validating, or testing intake:

- do not infer or invent behavior that is not specified
- do not silently weaken a locked rule
- if a requirement is unclear, incomplete, or conflicts with implementation, flag the conflict instead of guessing
- if a rule can be machine-enforced, implement that enforcement
- if a rule cannot yet be machine-enforced, explicitly disclose that gap through the governed limitations path and do not pretend the rule is complete

You must not claim completion unless:

- every locked rule is either implemented or explicitly disclosed as an unresolved governed gap
- required tests are present and passing
- required fixtures are present and valid
- required delivery artifacts are present
- required traceability is complete
- no unresolved locked-rule gap remains undocumented

## Cross-reference rule

When this file refers to a section or subsection in a standalone layer file, it must preserve the style used in that source file.

If the source layer file uses a numbered section with lettered subheads beneath it, references must cite the numbered section and the lettered subhead exactly as used there.

Do not invent composite subsection numbers that do not appear in the source file.

# SECTION 1: PURPOSE AND BOUNDARY OF INTAKE [LOCKED]

## 1.1 Intake as a bounded feasibility gate

Intake is a bounded feasibility gate.

It determines whether the matter qualifies for full forensic execution under controlled browser contexts, using only the complaint or demand materials provided as the scope anchor.

The intake question is:

"Is this matter eligible for full forensic execution under controlled Desktop and Mobile browser contexts, based solely on the complaint or demand materials provided?"

## 1.2 What intake is not

Intake is not:

- a compliance audit
- a defect inventory
- a remediation guide
- a certification
- a legal opinion
- a disguised merits assessment
- a narrative about site quality, claim strength, or party conduct

## 1.3 Intake output boundary

Intake outputs eligibility only.

External-facing intake output must not disclose internal depth, internal selection detail, counts, run volume, or internal sequencing.

External-facing intake output is limited to one eligibility determination line plus doctrine-permitted mechanically neutral scope and context wording.

## 1.4 Locked nondisclosure posture, external outputs

Any external-facing intake output must not disclose:

- number of runs performed
- number of confirmations reached
- any observed or not observed counts
- cap reached status
- which specific asserted conditions were selected as run units during intake
- which asserted conditions were attempted
- per-run sequencing details
- per-run or per-asserted-condition context assignment beyond the matter-level context disclosed by the determination template or other governed external intake template

Matter-level execution context may be disclosed using the locked exact terms Replicated Desktop Browser Context and Replicated Mobile Browser Context, including whether the matter was assessed under Desktop only, Desktop and Mobile, Desktop with Mobile baseline constrained, Mobile only, or Mobile with Desktop baseline constrained.

Such disclosure must remain at the matter level only.

## 1.5 Indirect signaling prohibition

External-facing intake outputs must not imply prohibited internal details indirectly, including through phrases such as:

- extensive testing
- limited testing
- we checked everything
- we checked only a few items

Functional equivalents are also prohibited.

## 1.6 Intake is not a disguised merits process

Intake is a feasibility gate only.

It must not become a disguised assessment, a partial audit, a remediation posture, or an external narrative about site quality, claim strength, party conduct, motive, or responsibility.

# SECTION 2: AUTHORITY, SOURCE OF TRUTH, AND DRIFT CONTROL [LOCKED]

## 2.1 AFDM as the implemented intake system

AFDM is the implemented automated execution system that performs intake runs and emits intake artifacts.

## 2.2 AFDM repository behavior is the source of truth

AFDM repository behavior is the source of truth for:

- output labels
- record fields
- parameter locks
- constraint handling
- stop logic
- template usage

This unified spec must not claim artifacts, parameters, label sets, stop rules, templates, or behaviors that are not supported by the implemented system.

## 2.3 Locked discipline, internal records only

Internal intake records must not contain:

- evaluative fields

- intent signals

- strength indicators

- probability indicators

- outcome-leaning metadata

- requester identity

- requesting party role

- represented party

- opposing party

- conflict status

- engagement-side information

- advocacy-purpose metadata

- settlement-positioning metadata

- liability-positioning metadata

## 2.4 Outcome categories must remain neutral

Internal outcome categories and record fields must not imply:

- compliance posture
- liability posture
- likelihood posture

## 2.5 Record terminology discipline

Internal intake record terminology must not frame entries as:

- findings
- violations
- assessments

## 2.6 Scope note

This section governs internal record structure and metadata discipline.

External-facing vocabulary restrictions are governed by Section 3.

Administrative engagement metadata may exist outside AFDM intake records for client intake, conflict review, billing, or matter administration.

Administrative engagement metadata must remain separate from AFDM intake records and must not alter AFDM execution behavior, intake run records, RUN_UNIT records, outcome labels, context records, mechanical notes, sufficiency logic, constraint classification, or external intake determinations.

## 2.7 Conflict rule

If doctrine text conflicts with implemented AFDM behavior, runtime AFDM behavior governs what the system actually did.

That does not authorize silent drift.

Any identified conflict between doctrine text and implemented behavior must be surfaced and corrected through governance.

## 2.8 Drift control

Operators and implementers must not resolve doctrinal ambiguity by improvising:

- new metadata
- new record fields
- new labels
- new stop logic
- new scope logic
- new context logic
- new procedures
- new external templates
- new note types
- new constraint classes

If implementation and doctrine diverge, governance must correct the doctrine. Operators do not patch doctrine by practice.

## 2.9 No informal expansion rule

No new labels, fields, procedures, stop rules, note types, scope or anchor types, or metadata classes may be introduced informally to resolve ambiguity.

## 2.10 Why this section is hard-edged

This section exists to stop doctrine from drifting into fiction and to stop implementation from drifting into improvisation.

If AFDM does not support it, doctrine must not pretend it does.

If AFDM behaves differently, the doctrine must be corrected through governance, not operator creativity.

# SECTION 3: MECHANICAL OBSERVER LANGUAGE [LOCKED]

## 3.1 Mechanical neutrality

Intake language is mechanically neutral.

It records observed state under bounded execution parameters.

It does not characterize, evaluate, assign responsibility, imply motive, suggest wrongdoing, or imply intent.

## 3.2 Locked banned framing, principle-governed

The following terms are prohibited in all external-facing intake output, along with functional equivalents:

- pass

- fail

- compliant

- non-compliant

- violation

- audit, as intake purpose

- remediation, as intake purpose

- certification

- guarantee

- blame posture

- adversarial posture

External-facing intake output must also reject party-posture framing, including plaintiff-advocacy framing, defense-advocacy framing, rebuttal framing, liability-positioning framing, settlement-leverage framing, or party-positioning framing.

## 3.3 Definition of blame posture or adversarial posture

Blame posture or adversarial posture means any language that:

- assigns fault
- implies intent
- suggests wrongdoing
- frames either party as acting improperly

Such framing is prohibited in intake output.

## 3.4 Governing principle

If a term characterizes the site, the claim, or either party, rather than recording a mechanically observed state under bounded parameters, it is prohibited whether or not it appears on the explicit banned list.

Party-posture framing is also prohibited whether or not it appears on the explicit banned list. This includes plaintiff-advocacy framing, defense-advocacy framing, rebuttal framing, liability-positioning framing, settlement-leverage framing, or party-positioning framing.

## 3.5 Locked scope anchor terms, external outputs only, mandatory use

External-facing intake output must use the following exact terms when describing scope and execution context. Paraphrase is not permitted:

- complaint or demand materials provided
- specific website conditions asserted in those materials
- bounded execution parameters
- Replicated Desktop Browser Context
- Replicated Mobile Browser Context

## 3.6 Locked burden rule

Intake must stay literal about:

- what was executed
- what was observed
- what was blocked by a constraint
- what could not be bounded due to missing specification

Rhetorical burden-shifting language is invalid.

### A. Missing bounded target is not a constraint

When the complaint or demand materials provided assert a website condition, but do not identify a bounded page, product, section, flow, component, or other executable surface for that condition, intake must not classify that condition as Constrained.

The correct doctrinal meaning in that circumstance is Insufficiently specified for bounded execution.

A technical constraint exists only where a bounded attempt was available under controlled parameters, but was blocked by an identifiable technical condition.

### B. Bounded narrowing may come only from the complaint or demand materials provided

Intake may narrow a generic allegation only by using bounded references that appear in the complaint or demand materials provided.

Permitted narrowing sources include:

- named URLs
- named products
- named sections
- named flows
- named page types
- other equally bounded references stated in the submitted materials

Intake must not invent a target page, invent a target flow, substitute a preferred page, or otherwise create boundedness that is not present in the submitted materials.

### C. One insufficiently specified asserted condition does not freeze the matter

A matter may contain a mix of sufficiently bounded asserted website conditions and asserted website conditions that are Insufficiently specified for bounded execution.

An insufficiently specified asserted website condition does not invalidate, relabel, suppress, or freeze other bounded RUN_UNIT records in the same matter.

Bounded RUN_UNITs may proceed through intake under the locked sequencing, run-cap, and stop rules even if other normalized RUN_UNITs remain insufficiently specified or unexecuted.

### D. BOTMITIGATION requires prevention of a meaningful bounded attempt

BOTMITIGATION is valid only when the technical condition prevented a meaningful bounded attempt of the asserted website condition under controlled parameters.

Challenge-related scripts, CDN enforcement assets, runtime markers, source markers, DOM markers, or vendor markers alone are not enough.

### E. Challenge signals must yield to actual rendered surface

If the relevant page title, substantive body content, or alleged site surface materially rendered, implementation must not classify the run as BOTMITIGATION solely because challenge-related markers are present in source or DOM.

## 3.7 Why this section is strict

This section is strict because intake is not permitted to become rhetoric.

It must remain a mechanical observer.

# SECTION 4: INTAKE DETERMINATION TEMPLATES [LOCKED]

## 4.1 Locked determination template set, eight options only

Each matter must produce exactly one determination from this locked set, with no paraphrase and no alternates:

- DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD
- DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD
- DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED
- DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD
- DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED
- DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION
- DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (BOTMITIGATION)
- DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (OTHER)

These eight templates are the only permitted external determinations.

## 4.2 Locked nondisclosure, determination line

The determination line must not reveal, directly or indirectly:

- how close intake came to sufficiency
- which asserted conditions were selected or attempted
- what was observed or not observed
- whether any run cap or stop rule was reached

The determination line must not include modifiers or hedging such as:

- provisionally
- appears
- strongly
- weakly
- likely
- unlikely

or functional equivalents.

## 4.3 Peer-baseline eligibility and constraint guardrails

The following guardrails apply:

- Template 1 is the only dual-baseline eligibility template
- Template 2 is the only Desktop-only eligibility template
- Template 3 is the only Desktop-eligible plus Mobile-constrained template
- Template 4 is the only Mobile-only eligibility template
- Template 5 is the only Mobile-eligible plus Desktop-constrained template
- mobile-preferred outputs are invalid
- desktop-preferred outputs are invalid
- partial-eligibility outputs are invalid

For purposes of this rule, partial eligibility means any output that grants eligibility for a baseline not governed by a locked determination template, or that qualifies, limits, or conditions eligibility in a manner not expressed through one of the eight locked determination templates.

Templates 3 and 5 are not partial-eligibility outputs. They are the locked constrained-baseline templates.

## 4.4 Determination rigidity rule

Exactly one external-facing determination is permitted per matter.

No modifiers, alternate phrasings, blended outputs, or supplemental determination lines are allowed.

## 4.5 Why Section 4 is rigid

External intake determination is the only governed external eligibility line.

That makes template drift unacceptable.

## 4.6 Constraint-driven ineligibility routing

Template 6, DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION, is valid only when the matter is not eligible for reasons other than a technical constraint.

Template 7, DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (BOTMITIGATION), is valid only when BOTMITIGATION is the controlling ineligibility basis.

Template 8, DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (OTHER), is valid only when a non-BOTMITIGATION locked constraint class is the controlling ineligibility basis.

## 4.7 Locked note rule

`{{MATTER_LEVEL_NOTE}}` may appear only in Template 3 or Template 5, and only when note permission is authorized under the locked gate.

When present, it must be exactly one mechanical sentence stating the blocking condition only.

If not authorized, omit it entirely.

# SECTION 5: RUN CAP, SUFFICIENCY, AND STOP RULES [LOCKED]

## 5.1 Run cap

At most 10 intake runs may be executed per matter.

There is no time cap.

There is no assertion-count cap.

## 5.2 Run definition

A run is one controlled attempt of one RUN_UNIT under one browser context, executed in a fresh isolated browser session using the locked context parameters.

## 5.3 Qualifying confirmations

Only the following outcomes are qualifying confirmations:

- Observed as asserted
- Not observed as asserted

Constrained and Insufficiently specified for bounded execution are not qualifying confirmations.

## 5.4 Sufficiency threshold

Sufficiency is reached when there are two qualifying confirmations, each produced by a distinct run, across any mix of contexts that are in scope for the matter.

The two qualifying confirmations may come from runs executed against the same RUN_UNIT or against different RUN_UNITs.

Distinct runs are required, not distinct run units.

For matters with only one context in scope, both qualifying confirmations must come from that single in-scope context.

## 5.5 Stop rule

Stop immediately when either condition occurs first:

- sufficiency reached
- 10 runs completed

If sufficiency is reached on the same run that completes the 10-run cap, both conditions are met simultaneously. In that case, stop basis is sufficiency reached.

## 5.6 No runs after stop

No additional runs are permitted after the stop condition is met for that matter.

## 5.7 Intake closure rule

Once a stop condition is met, intake is closed for that matter.

It must not be resumed or extended without a new matter scope submission.

## 5.8 Cap Consumption Rule

Every run consumes one run slot.

A run that produces Constrained or Insufficiently specified for bounded execution still consumes a cap slot.

# SECTION 6: COMPLAINT-ANCHORED NORMALIZATION [LOCKED]

## 6.1 Complaint structure preserved for traceability

Complaint or demand drafting structure must be preserved for traceability, but grouped drafting must not control execution atomics.

## 6.2 Locked normalization ruleset, complaint group anchors

Each complaint or demand grouping must be assigned a complaint group anchor using one of these forms only:

- page_paragraph_range
- page_bullet_range

No alternate anchor types are permitted.

## 6.3 Complaint group anchor is a pointer only

A complaint group anchor is a reference pointer only.

It does not determine the number of executable conditions.

## 6.4 Distinct asserted conditions become distinct run units

Each distinct asserted website condition within a complaint group anchor must produce its own RUN_UNIT.

A single complaint group anchor may therefore produce multiple RUN_UNIT records.

## 6.5 Independent execution requirement

Each run must map to exactly one RUN_UNIT.

## 6.6 No blended testing

A single run must not blend multiple asserted conditions.

## 6.7 Locked atomicity rule

One RUN_UNIT equals exactly one asserted website condition.

Blended or multi-assertion RUN_UNITs are invalid.

## 6.8 Locked traceability rule

Each RUN_UNIT must remain traceable back to its originating complaint group anchor and asserted condition text.

## 6.9 Why this normalization exists

This normalization exists so grouped pleading can be preserved for traceability without allowing grouped drafting to control execution atomics.

## 6.10 Pre-execution normalization

All RUN_UNIT records for a matter must be created before any intake runs execute for that matter.

No new RUN_UNIT may be created after the stop condition has been evaluated for that matter.

## 6.11 Unexecuted RUN_UNITs

The run cap may result in normalized RUN_UNIT records that are never executed before the stop condition fires.

Unexecuted RUN_UNITs are not an error condition and must remain in the matter record. They must not be deleted, relabeled, or treated as invalid because no run was executed against them.

## 6.12 Mixed-boundedness matters

A matter may contain a mix of sufficiently bounded asserted website conditions and asserted website conditions that are Insufficiently specified for bounded execution.

An insufficiently specified asserted website condition does not invalidate, relabel, suppress, or freeze other bounded RUN_UNIT records in the same matter.

Bounded RUN_UNITs may proceed through intake under the locked sequencing, run-cap, and stop rules even if other normalized RUN_UNITs remain insufficiently specified or unexecuted.

## 6.13 Bounded target derivation discipline

A target page, target product, target section, target flow, or target component may be used for intake execution only when that bounded surface is directly derivable from the complaint or demand materials provided.

Permitted derivation sources include named URLs, named products, named sections, named flows, named page types, and other equally bounded references stated in the submitted materials.

Operators and implementations must not invent a target surface, substitute a preferred page, or create boundedness that does not exist in the submitted materials.

# SECTION 7: OUTCOME LABEL SET AND DEFINITIONS [LOCKED]

## 7.1 Locked outcome label set

Only these outcome labels are permitted:

- Observed as asserted
- Not observed as asserted
- Constrained
- Insufficiently specified for bounded execution

No additional labels, sublabels, variants, or aggregate labels are permitted.

## 7.2 Observed as asserted

Meaning: under bounded execution parameters for that run unit and browser context, the asserted website condition manifested.

## 7.3 Not observed as asserted

Meaning: under bounded execution parameters for that run unit and browser context, the asserted website condition did not manifest.

## 7.4 Constrained

Constrained is valid only when all of the following are true:

- a bounded target surface existed for the run
- execution encountered an identifiable technical blocker
- the blocker prevented a meaningful bounded attempt of the asserted website condition
- the blocker maps to one of the locked constraint_class values

### A. BOTMITIGATION validity gate

If outcome_label = Constrained and constraint_class = BOTMITIGATION, the run is valid only if both of the following are true:

- blocker_evidence_present = true
- bounded_attempt_prevented = true

For purposes of this rule, blocker_evidence_present may be satisfied by challenge text, runtime challenge takeover behavior, or equivalent structural blocker evidence that demonstrates interference with bounded execution.

Enforcement script only is not sufficient.

If enforcement_script_only = true, challenge_text_present = false, and substantive_title_or_body_present = true, BOTMITIGATION is invalid unless the internal record also demonstrates that bounded_attempt_prevented = true.

### B. Rendered-surface override

If the relevant page title, substantive body content, or alleged site surface materially rendered, implementation must not classify the run as BOTMITIGATION solely because challenge-related markers are present in source or DOM.

## 7.5 Insufficiently specified for bounded execution

Insufficiently specified for bounded execution is valid when the submitted materials do not provide sufficient bounded specification to attempt the asserted website condition under controlled parameters for that RUN_UNIT and browser context.

This includes generic allegations that do not identify a page, product, section, flow, component, or comparable executable surface and cannot be narrowed directly from the complaint or demand materials provided.

This label also governs any blocking condition that does not map to a locked constraint_class value.

## 7.6 Locked hard constraints on labels

One run must not emit more than one outcome label.

No blended, qualified, or multi-label states are permitted.

## 7.7 One run, one outcome

Each run must produce exactly one outcome label from the locked set.

## 7.8 Why this section is rigid

Outcome labels drive sufficiency, stop rules, notes, validation, and external determination routing.

That makes label drift unacceptable.

# SECTION 8: EXECUTION CONTEXT RIGOR [LOCKED]

## 8.1 Contexts are parameter locks, not suggestions

Desktop and Mobile intake contexts are parameter locks, not descriptive approximations.

## 8.2 Replicated Desktop Browser Context, locked baseline

Locked Desktop baseline parameters:

- viewport_width: 1366
- viewport_height: 900
- zoom: 100%
- device_scale_factor: 1
- orientation: landscape
- is_mobile: false
- has_touch: false

At human-readable doctrine level, camelCase references may appear. The canonical machine field names remain the snake_case forms.

## 8.3 Replicated Mobile Browser Context, locked baseline

Locked Mobile baseline parameters:

- viewport_width: 393
- viewport_height: 852
- zoom: 100%
- device_scale_factor: 1
- orientation: portrait
- is_mobile: true
- has_touch: true

At human-readable doctrine level, camelCase references may appear. The canonical machine field names remain the snake_case forms.

## 8.4 Peer-baseline scope rule

Desktop baseline and Mobile baseline are each first-class intake baselines. Neither is subordinate to the other.

For generic website accessibility allegations, both Replicated Desktop Browser Context and Replicated Mobile Browser Context must be brought into scope.

Where the submitted materials expressly cabin the asserted condition to one baseline only, intake must issue the corresponding single-baseline determination.

Where one baseline is feasible and the peer baseline is blocked under controlled parameters, intake must issue the corresponding constrained-baseline determination.

Generic accessibility phrasing must not be treated as Desktop-only by default.

## 8.5 Reflow separation

Reflow testing under WCAG 1.4.10 is operationally separate from baseline intake capture.

## 8.6 Reflow primary method

- viewport_width: 320
- viewport_height: not fixed, browser-determined
- zoom: 100%
- orientation: portrait
- device_scale_factor: 1
- is_mobile: false
- has_touch: false

## 8.7 Reflow supplemental method

- viewport_width: 1280
- viewport_height: not fixed, browser-determined
- zoom: 400%
- effective_width: 320
- orientation: portrait
- device_scale_factor: 1
- is_mobile: false
- has_touch: false

## 8.8 Reflow does not alter baselines

Reflow methods must not change the locked Desktop or Mobile baselines.

## 8.9 Why context rigor is strict

These contexts are locked because intake feasibility, traceability, and comparability depend on exact parameter discipline.

# SECTION 9: MECHANICAL NOTE DISCIPLINE AND CONSTRAINT CLASSIFICATION [LOCKED]

## 9.1 Purpose of notes

Notes exist only to state the blocking condition where the locked gate permits them.

## 9.2 Note permission gate

Notes are permitted only when:

- outcome_label = Constrained
- outcome_label = Insufficiently specified for bounded execution
- the matter determination is Template 3
- the matter determination is Template 5

Gates 1 and 2 authorize per-run notes.

Gates 3 and 4 authorize matter-level notes recorded in the matter-level determination record.

## 9.3 Notes are prohibited for

Notes are prohibited for:

- Observed as asserted
- Not observed as asserted
- statements about sufficiency reached or not reached
- statements about run ordering, context ordering, or interleaving decisions
- attempts to explain, defend, or argue outcome selection

## 9.4 Mechanical sentence rule

Any permitted note must be exactly one mechanical sentence stating the blocking condition only.

## 9.5 Content restrictions for notes

Permitted notes must contain:

- no legal terms

- no evaluative language

- no blame language

- no speculation

- no motive framing

- no severity framing

- no probability framing

- no party-posture framing prohibited by Section 3

## 9.6 Locked constraint_class enum set

If outcome_label = Constrained, constraint_class must be exactly one of:

- AUTHWALL
- BOTMITIGATION
- GEOBLOCK
- HARDCRASH
- NAVIMPEDIMENT

No additional values are permitted.

## 9.7 Unmapped blocking condition rule and BOTMITIGATION validity gate

If a blocking condition does not map to one of the locked constraint_class values, the run must not be labeled Constrained.

It must instead be labeled Insufficiently specified for bounded execution, with the mechanical note stating the missing bounded path or trigger.

BOTMITIGATION must satisfy the meaningful bounded-attempt-prevention rule in Section 7.4A and the rendered-surface override in Section 7.4B.

## 9.8 Locked note_basis enum

If note_permitted = true, note_basis must be exactly one of:

- outcome_constrained
- outcome_insufficiently_specified
- determination_desktop_eligible_mobile_constrained
- determination_mobile_eligible_desktop_constrained

No additional note_basis values are permitted.

# SECTION 10: RUN SEQUENCING, STATE ISOLATION, AND TEMPORAL LOGGING [LOCKED]

## 10.1 Sequencing rule

When both Desktop and Mobile contexts are in scope, run order must alternate:

- Desktop
- Mobile
- Desktop
- Mobile

continuing until a stop condition is reached.

When only one baseline is in scope, all runs must execute in that baseline context and no interleaving occurs.

When both baselines are in scope but one baseline is blocked by a constraint, runs in the constrained context must still be physically attempted in their alternating slot. Each alternating slot for a constrained baseline requires a fresh physical attempt regardless of prior constraint outcomes for that context. The result of each such attempt must be recorded as a distinct IntakeRunRecord using the locked outcome label set and the applicable constraint_class. It consumes a run slot. The alternating sequence does not skip or collapse because one baseline is constrained.

## 10.2 Anti-manipulation sequencing rule

Run sequence must not be reordered, clustered, or manipulated to favor any asserted condition, context, or party.

## 10.3 Clean-state isolation between every run

Each run must execute in a fresh isolated browser context.

Storage state must not persist between runs. Storage isolation applies to all browser-managed state mechanisms, including:

- cookies
- localStorage
- sessionStorage
- IndexedDB
- Cache API
- service worker registrations

## 10.4 Clean-state failure handling

If clean-state isolation cannot be established for a run, a StateIsolationRecord must be generated for that run with fresh_browser_context = false and storage_state_persisted = true.

The run must not proceed to condition evaluation.

If the isolation failure maps to an identifiable technical blocker that fits exactly one locked constraint_class value, the run must be labeled Constrained with the applicable constraint_class.

If the isolation failure does not map to any locked constraint_class value, the run must be labeled Insufficiently specified for bounded execution.

## 10.5 Temporal logging

Each run must record internal timestamps sufficient to show sequencing and separation, at minimum:

- run_start
- run_end

## 10.6 Temporal logging is internal only

These timestamps are internal execution metadata only.

They must not appear in any external-facing intake output and must not be indirectly signaled through language such as lengthy, brief, or extensive.

## 10.7 Why this section exists

This section exists to preserve reproducibility, sequencing discipline, fresh-state integrity, and internal traceability without leaking execution depth externally.

## Appendix note for the unified file

This unified file intentionally does not restate the full appendix contracts from Layer 2 and Layer 3.

For exact machine schemas, exact required tests, exact fixture matrix, exact delivery package requirements, exact limitations disclosure format, and exact external validation record structure, use the standalone appendices in:

- `1-10 Layer 2 - Jules.md`
- `1-10 Layer 3 - Machine-Bindable Specs.md`
