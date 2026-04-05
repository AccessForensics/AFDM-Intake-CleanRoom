# Intake Coverage Map

## Status Summary

The following hardening matters were executed successfully as runner invocations, but all returned:

- Outcome: Insufficiently specified for bounded execution
- Mechanical note: No Playwright probe was implemented for this asserted condition.

This means the present issue is probe coverage, not page targeting.

## Doctrine Boundary

The runtime note reflects an implementation gap, not a bounded-specification gap.
These matters must therefore be intercepted internally before formal intake so they are not treated as runnable production matters.

## Unsupported Red Fixtures

### AF-HARDEN-001-MANE-SKIP
- Site: https://heymane.com
- Asserted condition: "Skip to content" link was not implemented.
- Status: Unsupported by current implemented Playwright probe coverage

### AF-HARDEN-002-MANE-IMGLINKS
- Site: https://heymane.com
- Asserted condition: Plaintiff encountered interactive images that were used as links that did not describe the content of the link target.
- Status: Unsupported by current implemented Playwright probe coverage

### AF-HARDEN-003-PRECIOUS-ALT
- Site: https://www.preciousmoments.com
- Asserted condition: Different images of the same product had similar and poorly descriptive alternative text.
- Status: Unsupported by current implemented Playwright probe coverage

### AF-HARDEN-004-PRECIOUS-FORMS
- Site: https://www.preciousmoments.com
- Asserted condition: The Website also lacks prompting information and accommodations necessary to allow visually impaired shoppers who use screen-readers to locate and accurately fill-out online forms.
- Status: Unsupported by current implemented Playwright probe coverage

## Operating Rule

Do not treat unsupported-condition red fixtures as production-ready intake matters.

Before formal intake, internal prep must determine whether the matter is already known to be unsupported by current implemented coverage.

If a matter is listed as unsupported current coverage:
- do not force the matter through production intake as a runnable supported condition
- classify it internally as unsupported current coverage
- stop it before formal intake
- preserve it as a negative hardening fixture for doctrine-safe hardening and future expansion analysis

## Next Build Priority

1. Build internal preflight coverage check
2. Maintain green fixture set separately from red fixture set
3. Revisit future family or probe expansion only after repeated unsupported real complaint patterns accumulate
