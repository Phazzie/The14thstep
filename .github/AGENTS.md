# GitHub Automation Agent Guide

Scope: apply these rules for work under `.github/`.

## Workflow design rules

- Prefer parallel CI jobs for faster signal when checks are independent.
- Keep one final aggregation job (`needs`) so branch protection can require a single gate.
- Add `concurrency` groups to cancel stale runs on updated branches.
- Set explicit `timeout-minutes` on each job.

## Review triage automation rules

- Treat AI triage output as advisory unless explicitly configured for auto-action.
- Never auto-close user-authored issues from bot output.
- For auto-created issues, include:
  - source PR/comment link
  - severity
  - concrete acceptance criteria

## Secrets and permissions

- Default to least privileges in workflow `permissions`.
- Do not print secrets or full tokens in logs.
- Keep environment wiring in GitHub Actions secrets, not repository files.

## Verification

- Validate workflow syntax before merge.
- For CI changes, confirm required checks names remain stable for branch protection.
