# Repository Agent Guide

This root file defines global rules. For detailed instructions, also read the nearest nested `AGENTS.md` in the directory you are editing.

## Global rules

- Keep repository governance artifacts current as work proceeds:
  - `plans/the-14th-step-execplan.md`
  - `decision-log.md`
  - `CHANGELOG.md`
  - `LESSONS_LEARNED.md`
- Follow Seam-Driven Development for app implementation. Summary order: contract, probe, fixtures, mock, contract test, adapter, composition wiring. See `app/AGENTS.md` for the full workflow and gate checks.
- Proceed milestone by milestone unless blocked by missing credentials, missing infrastructure access, or conflicting product direction.
- Do not commit secrets. Keep credentials in local env files only.
- Prefer Linux shell commands and Bash-oriented workflows for reproducibility.

## Nested guides

- App implementation rules: `app/AGENTS.md`
- ExecPlan authoring and maintenance rules: `plans/AGENTS.md`
