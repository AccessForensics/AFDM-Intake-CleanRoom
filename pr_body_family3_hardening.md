Summary

This PR hardens the Family 3 execution contract in the Playwright intake engine and closes the current generic-runner mismatch without widening the family surface.

What changed

Added probe contract hardening
src/intake/probes/probe-contract.js

Adds shared helpers to:
- normalize Family 3 probe input from either legacy string args or structured run-unit objects
- validate allowed target URL protocols
- validate probe result shape so malformed outcomes fail closed instead of drifting downstream

Hardened Family 3 registry execution
src/intake/probes/index.js

Adds a Family 3 registry adapter that:
- preserves the existing generic runner call shape
- normalizes legacy runner input into the structured Family 3 contract
- injects shared environment challenge detection
- validates the Family 3 probe result before returning it

Updated Family 3 probe input handling
src/intake/families/family3.probe.js

Allows Family 3 execution to accept normalized legacy input through the shared contract helper while preserving the existing bounded Family 3 logic.

Hardened generic runner validation
tools/run-playwright-intake.js

Updates the runner to:
- validate the payload source_case.site URL before browser execution
- build the structured Family 3 request from payload data
- validate probe results before run-record creation
- preserve existing Lawsuit 1 and Lawsuit 2 execution paths

Added focused regression coverage
tests/playwright-intake-family3-registry.test.js
tests/playwright-intake-synthetic-payload.test.js
tests/playwright-intake-probe-contract.test.js

Adds coverage proving that:
- Family 3 accepts the legacy generic-runner arg shape through the registry
- synthetic Family 3 payloads execute end to end through the real runner
- unsupported URL protocols are rejected
- malformed constrained probe results are rejected
- valid constrained probe results remain accepted

Why this change

Family 3 currently expects a structured run-unit object, but the generic Playwright runner still calls resolved probes with the legacy string-only contract. That creates a real execution gap even though Family 3 routing and direct probe tests exist.

This PR fixes that contract mismatch first, adds fail-closed validation around probe inputs and outputs, and proves the Family 3 path through both registry-level and synthetic runner coverage.

Validation

Run:

node --test

Risk notes

This PR hardens the existing Family 3 execution surface only.
It does not add a new allegation family.
It does not refactor Lawsuit 1 or Lawsuit 2 into the Family 3 architecture.
It does not change intake doctrine, determination templates, or external output posture.