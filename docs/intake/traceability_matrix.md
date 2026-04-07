# Intake Traceability Matrix

This matrix maps major intake obligations to current repo implementation surfaces and test evidence.

| Obligation Area | Current Implementation Surface | Current Test / Proof Surface | Status |
|---|---|---|---|
| Generic runner entry point | `tools/run-playwright-intake.js` | `tests/playwright-intake-synthetic-payload.test.js`, `tests/run-playwright-intake.preflight.test.js` | Partial |
| Probe registry routing | `src/intake/probes/index.js` | `tests/playwright-intake-probe-registry.test.js` | Partial |
| Shared probe contract | `src/intake/probes/probe-contract.js` | `tests/playwright-intake-unified-contract.test.js` | Partial |
| Family 1 implementation | `src/intake/families/family1.matcher.js`, `src/intake/families/family1.probe.js` | `tests/playwright-intake-unified-contract.test.js`, `tests/playwright-intake-fail-closed-routing.test.js` | Partial |
| Family 2 implementation | `src/intake/families/family2.matcher.js`, `src/intake/families/family2.probe.js` | `tests/playwright-intake-unified-contract.test.js`, `tests/playwright-intake-fail-closed-routing.test.js` | Partial |
| Family 3 implementation | `src/intake/families/family3.matcher.js`, `src/intake/families/family3.probe.js` | `tests/playwright-intake-unified-contract.test.js` | Partial |
| Determination routing | `src/intake/determination-router.js` | current repo test suite via `node --test` | Partial |
| External output validation | `src/intake/external-output-validator.js` | current repo test suite via `node --test` | Partial |
| Sufficiency and stop logic | `src/intake/sufficiency-stop.js` | current repo test suite via `node --test` | Partial |
| Internal run record surface | `src/intake/run-record.js` | current repo test suite via `node --test` | Partial |
| Bot mitigation detection and challenge handling | `src/intake/browser-challenge.js` | `tests/playwright-intake-registry-hardening.test.js`, current repo test suite via `node --test` | Partial |
| Unsupported current coverage registry gate | `scripts/hardening/preflight-coverage-check.js`, `intake/hardening/unsupported-current-coverage.registry.json` | `tests/hardening/preflight-coverage-check.test.js` | Partial |
| Runner preflight enforcement | `tools/run-playwright-intake.js` | `tests/run-playwright-intake.preflight.test.js` | Partial |

## Interpretation

- "Partial" means a concrete implementation and proof surface exists.
- This file does not claim every locked requirement is fully closed.
- This matrix is a repo navigation aid, not a substitute for the locked authority documents.

