# Appendix F, Current Implementation Gaps and Manual Review Surfaces

This file exists to make remaining completion-risk surfaces explicit instead of implied.

## Current explicit surfaces

### 1. Functional-equivalent language review is not fully machine-final
The locked doctrine treats hedging, indirect signaling, and functional equivalents as reviewer-sensitive in at least some contexts.
Current validator and hardening coverage reduce this risk, but this file does not claim every functional equivalent is exhaustively machine-detected.

### 2. Completion evidence is stronger than before, but not equivalent to total closure
The repo now has:
- runner preflight enforcement,
- unsupported-current-coverage classification,
- fail-closed routing coverage,
- synthetic runner coverage,
- probe contract unification,
- note and output hardening.

This still does not, by itself, prove that every locked intake requirement has a one-to-one completion artifact.

### 3. Fixture and delivery-artifact closure should still be treated as an explicit completion question
The presence of repo files and passing tests is not the same thing as a formally accepted final fixture matrix and final delivery-artifact package.

## What this file is for

- to prevent silent "close enough" completion claims,
- to preserve an explicit place for governed limitations,
- to make remaining manual or partial surfaces visible in-repo.

## What this file is not

- not a declaration that intake is incomplete in every respect,
- not a legal or doctrinal override,
- not a substitute for the locked authority set.

