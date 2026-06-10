# AFintaketemplates1-8.md

Internal Use Only. Governs the locked external intake determination templates for AF intake.

## TEMPLATE FILE GUARDRAILS

The eight template bodies below are the only permitted external-facing intake determination templates.

Do not modify template determination lines based on requester identity, requester role, represented party, opposing party, litigation side, advocacy purpose, settlement posture, expected result, or preferred narrative.

The generated external-facing output must not add requester identity, requester role, represented party, opposing party, plaintiff-side framing, defense-side framing, advocacy framing, settlement framing, liability framing, explanation of internal run count, explanation of sufficiency, selected or attempted asserted conditions, run sequencing, observed or not observed counts, or any additional explanation outside the locked determination line and permitted matter-level note.

## LOCKED NOTE RULE

{{MATTER\_LEVEL\_NOTE}} may appear only in Template 3 or Template 5, and only when note permission is allowed under the locked gate. When present, it must be exactly one mechanical sentence stating the blocking condition only. If not allowed, omit it entirely.

## **TEMPLATE 1: ELIGIBLE\_DESKTOP\_MOBILE.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: ELIGIBLE FOR DESKTOP AND MOBILE TECHNICAL RECORD BUILD

## **TEMPLATE 2: ELIGIBLE\_DESKTOP.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD

## **TEMPLATE 3: ELIGIBLE\_DESKTOP\_WITH\_MOBILE\_CONSTRAINT\_NOTE.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: ELIGIBLE FOR DESKTOP TECHNICAL RECORD BUILD / MOBILE BASELINE: CONSTRAINED

{{MATTER\_LEVEL\_NOTE}}

## **TEMPLATE 4: ELIGIBLE\_MOBILE.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD

## **TEMPLATE 5: ELIGIBLE\_MOBILE\_WITH\_DESKTOP\_CONSTRAINT\_NOTE.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: ELIGIBLE FOR MOBILE TECHNICAL RECORD BUILD / DESKTOP BASELINE: CONSTRAINED

{{MATTER\_LEVEL\_NOTE}}

## **TEMPLATE 6: NOT\_ELIGIBLE\_INTAKE.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION

## **TEMPLATE 7: NOT\_ELIGIBLE\_CONSTRAINTS\_BOT.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION \- CONSTRAINTS (BOTMITIGATION)

## **TEMPLATE 8: NOT\_ELIGIBLE\_CONSTRAINTS\_OTHER.md**

ACCESS FORENSICS  
INTAKE DETERMINATION  
MATTER ID: \[AF-YYYY-NNNN\]

DETERMINATION: NOT ELIGIBLE FOR FORENSIC EXECUTION \- CONSTRAINTS (OTHER)
