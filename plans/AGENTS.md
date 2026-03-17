# Plans Agent Guide

Scope: apply these rules for work under `plans/`.

## Canonical plan

- The active plan is `plans/the-14th-step-execplan.md`.
- For slice-promotion / local-to-remote sync work, create or maintain a dedicated living ExecPlan alongside the main product plan.
- Authoring and maintenance requirements are defined in repository-root `PLANS.md`.

## ExecPlan maintenance rules

- Read `PLANS.md` before editing any ExecPlan.
- Keep the plan as a living document by updating:
  - `Progress`
  - `Surprises & Discoveries`
  - `Decision Log`
  - `Outcomes & Retrospective`
- At every real stopping point or handoff, update the living sections before treating the plan as current.
- Do not ask for "next steps" unless blocked by missing credentials, missing infrastructure access, or conflicting product direction.
- When plan scope or approach changes, add a revision note at the bottom describing what changed and why.

## Definition of done for plan updates

- Progress checkboxes reflect actual state with timestamps.
- Newly discovered risks or surprises are captured with evidence.
- Key decisions are documented with rationale and date.
- Blocking auth, permission, or infrastructure problems are recorded explicitly instead of being silently worked around on paper.
- Changelog/lessons artifacts are updated when milestone outcomes materially change.
