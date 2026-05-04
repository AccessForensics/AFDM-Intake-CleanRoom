AF Intake, Layer 1–3 Unified Implementation Spec (intakelayersinstructions.md)
Internal use only. Governs implementation in the intake branch.

## How an AI agent must use this document

As the AI agent implementing intake in the intake branch, you must treat this file as a hard contract, not suggestions.

When building or modifying code for intake:

- Do not infer or invent behavior that is not specified here.
- If any requirement is unclear or conflicts with existing behavior, you must flag it as a conflict instead of guessing a behavior.
- You must implement logic so that:
  - All rules in this document are enforced, and
  - All records and outputs that you generate can be validated back to these rules.

If you cannot implement a rule as written, for example because a test, fixture, or schema is missing, you must:

- Explicitly label the rule as not implemented, and
- Surface that gap for governed correction rather than silently ignoring or weakening the rule.

This file unifies:

- Layer 1, doctrine, meaning, posture, nondisclosure, run rules, see `1-10 Layer 1 - Authority and Doctrine.md`
- Layer 2, Jules' build contract, what must be implemented and tested, see `1-10 Layer 2 - Jules.md`
- Layer 3, machine spec, enums, schemas, conditionals, validation, see `1-10 Layer 3 - Machine-Bindable Specs.md`

Implementation must satisfy all rules below.

# 1. Intake phase and scope

1. Implement intake as a bounded feasibility gate. It must only answer:

   "Is this matter eligible for full forensic execution under controlled Desktop/Mobile browser contexts, based solely on the complaint or demand materials provided?"

2. Treat the submitted complaint or demand materials as the only scope anchor. Do not use any other input to create intake eligibility behavior.

3. You must not implement intake or label it as:
   - compliance audit
   - defect inventory
   - remediation guide
   - certification
   - legal opinion
   - merits assessment or narrative about site quality, claim strength, or party conduct

4. External-facing intake output must be limited to one eligibility determination line plus doctrine-permitted neutral scope/context wording. Code must prevent any leakage of internal run counts, depth, selection detail, or sequencing.

# 2. Authority, drift, and conflict handling

1. Treat AFDM repository behavior, current implementation, as the source of truth for:
   - output labels
   - record fields
   - parameter locks
   - constraint handling
   - stop logic
   - determination template usage

2. When doctrine and implementation conflict:
   - You must treat runtime implementation behavior as describing what the system actually did.
   - You must not treat the conflict as permission for silent drift.
   - You must surface the conflict through the governed reporting path and must not patch doctrine by improvising new labels, fields, stop rules, procedures, or metadata classes.

3. You must keep internal intake records non-evaluative:
   - Do not add evaluative fields, intent signals, strength/probability signals, or outcome-leaning metadata.
   - Do not label internal records as findings, violations, or assessments.

4. You must not introduce new external templates, outcome labels, constraint_class values, note types, or scope/anchor types beyond those locked in this spec. If a change is required, it must go through a governed update to all three layers, not by direct code changes alone.

# 3. External language, nondisclosure, and templates

## 3.1 Nondisclosure rules

External-facing intake output must never disclose, or imply, any of:

- number of runs performed
- number of confirmations reached
- any observed/not-observed counts
- cap-reached status
- which asserted conditions were selected or attempted
- per-run sequencing details
- per-run or per-asserted-condition context assignment

Allowed at matter level only:

- whether Desktop, Mobile, or both were in scope
- whether a baseline was constrained, using only the locked terms in Section 3.4 below

## 3.2 Banned framing

External output must reject, and not use:

- pass / fail
- compliant / non-compliant
- violation
- audit or remediation as intake purpose
- certification
- guarantee
- any blame or adversarial posture
- phrases that signal execution depth, including "extensive testing", "limited testing", "we checked everything", "we checked only a few items", and functional equivalents

Output must remain mechanically neutral, describing only:

- what was executed
- what was observed
- what was blocked
- what could not be bounded due to missing specification

Rhetorical burden-shifting language is invalid.

## 3.3 Mandatory scope/context terms

When describing scope and context externally, always use these exact terms, no paraphrase:

- "complaint or demand materials provided"
- "specific website conditions asserted in those materials"
- "bounded execution parameters"
- "Replicated Desktop Browser Context"
- "Replicated Mobile Browser Context"

## 3.4 Determination templates, 8 only

Each matter must produce exactly one determination from this locked set:

- DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD
- DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD
- DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED
- DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD
- DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED
- DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION
- DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (BOTMITIGATION)
- DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION - CONSTRAINTS (OTHER)

Routing and validity rules:

- Exactly one determination per matter.
- No paraphrase, no modifiers, no appended explanatory text, no leakage of run counts, sufficiency proximity, or internal reasoning.
- "Mobile-preferred", "Desktop-preferred", and "partial eligibility" outputs are prohibited.

Constraint routing:

- Use Template 6 only when ineligibility is not constraint-driven.
- Use Template 7 only when BOTMITIGATION is the controlling ineligibility basis.
- Use Template 8 only when a non-BOTMITIGATION constraint_class is the controlling basis.
- Never mix these or cross-use them.

# 4. Run units, runs, cap, and sufficiency

## 4.1 Complaint anchors and RunUnitRecord

Normalize complaint or demand materials into ComplaintGroupAnchor records with:

- `anchor_type ∈ {page_paragraph_range, page_bullet_range}`
- `anchor_value = a page-scoped range string`, for `page_paragraph_range`, identify page and paragraph range, for `page_bullet_range`, identify page and bullet range

For each distinct asserted website condition within an anchor, create one RunUnitRecord with at least:

- `run_unit_id`, unique per matter
- `complaint_group_anchor_id`
- `asserted_condition_text`
- `desktop_in_scope`, bool
- `mobile_in_scope`, bool
- `created_context_basis ∈ {generic_accessibility_allegation, materials_cabined_desktop_only, materials_cabined_mobile_only, constrained_peer_baseline}`

One RUN_UNIT equals exactly one asserted condition. No blended or multi-assertion RUN_UNITs.

One run maps to exactly one RUN_UNIT and exactly one browser context.

Pre-execution normalization:

- Create all RunUnitRecords for a matter before any intake runs execute.
- Do not create new RunUnitRecords after the stop condition has been evaluated.

Unexecuted RUN_UNITs:

- If the cap hits before all RUN_UNITs are executed, unexecuted RUN_UNITs remain in the record and are not deleted, relabeled, or treated as errors.

Missing bounded target is not a constraint:

- When the complaint or demand materials provided assert a website condition but do not identify a bounded page, product, section, flow, component, or other executable surface for that condition, intake must not classify that condition as Constrained.
- The correct doctrinal meaning in that circumstance is Insufficiently specified for bounded execution.
- A technical constraint exists only where a bounded attempt was available under controlled parameters, but was blocked by an identifiable technical condition.

Bounded narrowing rule:

- Intake may narrow a generic allegation only by using bounded references that appear in the complaint or demand materials provided.
- Permitted narrowing sources include named URLs, named products, named sections, named flows, named page types, and other equally bounded references stated in the submitted materials.
- Intake must not invent a target page, invent a target flow, substitute a preferred page, or otherwise create boundedness that is not present in the submitted materials.

Mixed-boundedness rule:

- A matter may contain a mix of sufficiently bounded asserted website conditions and asserted website conditions that are Insufficiently specified for bounded execution.
- One insufficiently specified asserted website condition does not invalidate, relabel, suppress, or freeze other bounded RUN_UNIT records in the same matter.
- Bounded RUN_UNITs may proceed through intake under the locked sequencing, run-cap, and stop rules even if other normalized RUN_UNITs remain insufficiently specified or unexecuted.

## 4.2 Outcome labels

Each run must produce exactly one outcome label from this locked set:

- Observed as asserted
- Not observed as asserted
- Constrained
- Insufficiently specified for bounded execution

No paraphrase, sublabels, aggregate labels, or multi-outcome statements per run.

## 4.3 Run cap and sufficiency

Run cap:

- At most 10 intake runs per matter.
- No time cap.
- No assertion-count cap.

A run is one controlled attempt of one RUN_UNIT under one context profile, executed in a fresh, isolated browser session using the locked context parameters.

Qualifying confirmations:

- Only Observed as asserted and Not observed as asserted are qualifying confirmations.
- Constrained and Insufficiently specified for bounded execution are not qualifying confirmations.

Sufficiency threshold:

- Sufficiency is reached when there are 2 qualifying confirmations, each from a distinct run, across any mix of in-scope contexts.
- The two runs may target the same RUN_UNIT or different RUN_UNITs.
- Distinct runs are required, not distinct run units.

Stop rule:

- Stop immediately when either:
  - sufficiency is reached, or
  - 10 runs have been completed.
- If sufficiency is reached on the same run that completes the 10-run cap, both conditions are met, and the stop basis is sufficiency.

No additional runs are permitted after stop. Intake is closed for that matter and cannot resume without a new matter submission.

Cap consumption rule:

- Every run, regardless of outcome, consumes one of the 10 slots.
- Constrained and Insufficiently specified runs count against the cap and do not produce confirmations.

Sufficiency remains a mechanical threshold tied to run counts and locked labels, not a narrative confidence signal.

# 5. Context baselines, reflow, and scope

## 5.1 Baseline context profiles

Implement two locked baseline contexts.

Desktop baseline, `context_id = desktop_baseline`:

- `viewport_width: 1366`
- `viewport_height: 900`
- `zoom: 100%`
- `device_scale_factor: 1`
- `orientation: landscape`
- `is_mobile: false`
- `has_touch: false`

Mobile baseline, `context_id = mobile_baseline`:

- `viewport_width: 393`
- `viewport_height: 852`
- `zoom: 100%`
- `device_scale_factor: 1`
- `orientation: portrait`
- `is_mobile: true`
- `has_touch: true`

Layer 1 may refer to these using camelCase, for example `deviceScaleFactor`, `isMobile`, `hasTouch`, but the canonical schema field names are the snake_case forms above.

## 5.2 Peer-baseline scope rule

For generic website accessibility allegations, both Desktop and Mobile baselines must be brought into scope under intake logic.

Generic accessibility phrasing must not be treated as Desktop-only by default.

If submitted materials explicitly cabin the asserted condition to Desktop only or Mobile only, scope only that baseline and issue the corresponding single-baseline determination.

If one baseline is in scope and feasible, and the peer baseline is in scope but blocked under controlled parameters, issue the corresponding constrained-baseline determination, Template 3 or Template 5, with internal constraint_class recorded.

For generic accessibility allegations, implementation must set both `desktop_in_scope` and `mobile_in_scope` to `true` for each affected RunUnitRecord, unless the materials expressly cabin the condition to one baseline.

## 5.3 Reflow, separate from baselines

Implement two reflow contexts, separate from baseline intake.

`reflow_primary`:

- `viewport_width: 320`
- `viewport_height: not fixed`
- `zoom: 100%`
- `orientation: portrait`
- `device_scale_factor: 1`
- `is_mobile: false`
- `has_touch: false`

`reflow_supplemental`:

- `viewport_width: 1280`
- `viewport_height: not fixed`
- `zoom: 400%`
- `effective_width: 320`
- `orientation: portrait`
- `device_scale_factor: 1`
- `is_mobile: false`
- `has_touch: false`

Reflow methods must not change the locked Desktop or Mobile baselines.

# 6. Sequencing, state isolation, and timing

## 6.1 Sequencing

When both baselines are in scope, alternate contexts:

- Desktop, Mobile, Desktop, Mobile, and so on until stop

When only one baseline is in scope:

- execute all runs in that baseline
- no interleaving

When both baselines are in scope but one is blocked, constrained:

- still attempt runs in the constrained baseline in their alternating slots
- each attempt must produce a distinct run record with a locked outcome and applicable constraint_class
- each such run consumes a cap slot
- the sequence does not skip or collapse because one baseline is constrained

Sequencing must not be manipulated to favor any condition, context, or party.

## 6.2 Clean-state isolation

Each run must execute in a fresh, isolated browser context. No carry-over state between runs, including cookies, localStorage, sessionStorage, IndexedDB, Cache API, or service workers.

If clean-state isolation cannot be established for a run:

- the run must not proceed to condition evaluation
- classify the blocking condition using the locked outcome labels and applicable constraint_class, if it maps
- otherwise, label the run Insufficiently specified for bounded execution with a mechanical note describing the missing bounded path or trigger
- record isolation failure as internal metadata for that run, for example via a StateIsolationRecord tied to the run identifier

Clean-state isolation applies identically to Desktop and Mobile runs.

## 6.3 Timing metadata, internal only

For each run, record internal timestamps:

- `run_start_local`, `run_start_epoch_ms`
- `run_end_local`, `run_end_epoch_ms`

These timestamps are internal only and must never appear in external-facing output, nor be hinted at via language like "lengthy", "brief", or "extensive".

# 7. Notes and constraints

## 7.1 Note permission gates

Notes are permitted only when:

- `outcome_label = Constrained`, per-run note
- `outcome_label = Insufficiently specified for bounded execution`, per-run note
- `determination = Desktop eligible / Mobile baseline constrained`, matter-level note
- `determination = Mobile eligible / Desktop baseline constrained`, matter-level note

Per-run notes attach to runs. Matter-level notes attach to the determination record.

## 7.2 Note format and content

When permitted:

- Exactly one mechanical sentence stating only the blocking condition.
- No legal terms, evaluative language, blame language, speculation, motive, severity, or probability framing.

Notes are prohibited for:

- Observed as asserted
- Not observed as asserted
- statements about sufficiency reached or not reached
- statements about run ordering or context ordering
- any attempt to explain, defend, or argue outcome selection

## 7.3 constraint_class enum

If `outcome_label = Constrained`, `constraint_class` must be exactly one of:

- AUTHWALL
- BOTMITIGATION
- GEOBLOCK
- HARDCRASH
- NAVIMPEDIMENT

No new values may be introduced.

If a blocking condition does not map to any of these:

- label the run Insufficiently specified for bounded execution, and
- use the mechanical note to state the missing bounded path or trigger

BOTMITIGATION validity rule:

- BOTMITIGATION must not be assigned solely because source, DOM, or rendered HTML contains challenge-platform scripts, CDN enforcement assets, or similar vendor markers.
- If meaningful page title, substantive page content, or the alleged site surface rendered, implementation must evaluate whether bounded condition review remained possible.
- If bounded condition review remained possible, the run must not auto-route to BOTMITIGATION.
- BOTMITIGATION is valid only when the technical condition prevented a meaningful bounded attempt of the asserted condition under controlled parameters.

## 7.4 note_basis enum, internal classification

When a note is permitted, `note_basis` must be one of:

- `outcome_constrained`
- `outcome_insufficiently_specified`
- `determination_desktop_eligible_mobile_constrained`
- `determination_mobile_eligible_desktop_constrained`

`note_basis` is stored in the MechanicalNoteRuleRecord associated with the run and must comply with the same gate and content restrictions as the note itself.

No other `note_basis` values are allowed.

# 8. Records and external output validation, high level

Implementation must satisfy the record contracts implied by Layer 3 Appendix A and preserved in Layer 2 Appendix A:

- IntakeRunRecord, one run, one RUN_UNIT, one context, one outcome, optional constraint_class and mechanical_note, run timing fields present and internal-only
- ComplaintGroupAnchorRecord, locked `anchor_type` and `anchor_value` representing the page-scoped range
- RunUnitRecord, exactly one asserted condition, `desktop_in_scope` and `mobile_in_scope` booleans reflecting scope rule, `created_context_basis` indicating how baselines were brought into scope
- IntakeDeterminationRecord, exactly one per matter, `determination_template` is one of the eight locked templates, optional matter-level note only for constrained-baseline determinations
- IntakeManifestRecord, ties together all runs, RUN_UNITs, anchors, determination, and internal timing, includes unexecuted RUN_UNITs
- MechanicalNoteRuleRecord, ContextProfileRecord, SequencingRecord, StateIsolationRecord, ExternalOutputValidationRecord, as defined in Layer 3 and enforced via Layer 2 tests

Before any intake determination is exposed externally, implementation must generate an ExternalOutputValidationRecord and require that all automated checks pass, including:

- forbidden disclosure
- forbidden language
- mandatory terms
- matter-level context disclosure
- per-run context leakage
- indirect signaling
- anti-hedging
- matter-level note compliance

Any failure must block external output until cleared through governed review where required.