# Plans Agent Guide

Scope: apply these rules for work under `plans/`.

## Plan authority

- `STATUS.md` is the entry point for current work and its tracks. Keep one live execplan per track, as required by the root guide.
- `plans/the-14th-step-execplan.md` contains the overall product plan; do not assume it is the execution plan for every task. Use the relevant track plan and identify unresolved conflicts rather than silently choosing a product or architecture direction.
- For slice-promotion / local-to-remote sync work, maintain the relevant existing plan; create a dedicated plan only when that work needs a separate resumable track.
- Authoring and maintenance requirements are defined in repository-root `PLANS.md`.

## ExecPlan maintenance rules

- Read `PLANS.md` before editing any ExecPlan.
- Keep the plan as a living document by updating:
  - `Progress`
  - `Surprises & Discoveries`
  - `Decision Log`
  - `Outcomes & Retrospective`
- When executing or substantively revising a plan, update affected living sections at stopping points or handoffs. A link repair or document move does not by itself establish new milestone progress, decisions, or lessons.
- Do not ask for "next steps" unless blocked by missing credentials, missing infrastructure access, or conflicting product direction.
- When plan scope or approach changes, add a revision note at the bottom describing what changed and why.

## Definition of done for plan updates

- Progress checkboxes reflect actual state with timestamps.
- Newly discovered risks or surprises are captured with evidence.
- Key decisions are documented with rationale and date.
- Blocking auth, permission, or infrastructure problems are recorded explicitly instead of being silently worked around on paper.
- Changelog/lessons artifacts are updated when milestone outcomes materially change.
