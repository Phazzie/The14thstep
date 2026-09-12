---
name: execplan-driver
description: Drive a selected live ExecPlan milestone by milestone and keep its living sections current. Use only after STATUS.md identifies the relevant track and plan.
---

# ExecPlan Driver

Use the bundled script to keep an ExecPlan up to date while implementing.

## Run

From repo root, run:

    python skills/execplan-driver/scripts/execplan_driver.py summary --plan <selected-plan-path>

## Commands

- `summary`: Show total/complete/open checklist items in `## Progress`.
- `check`: Mark the first matching unchecked `Progress` item as complete.
- `add-discovery`: Append an observation/evidence pair to `## Surprises & Discoveries`.
- `add-decision`: Append a decision entry to `## Decision Log`.
- `add-outcome`: Append an outcome note to `## Outcomes & Retrospective`.
- `add-revision-note`: Append a `Revision note (YYYY-MM-DD): ...` line at the end of the file.

## Examples

    python skills/execplan-driver/scripts/execplan_driver.py check --plan plans/<selected-plan>.md --item "Milestone 0"
    python skills/execplan-driver/scripts/execplan_driver.py add-decision --plan plans/<selected-plan>.md --decision "Use Supabase" --rationale "Relational memory query support" --author "codex"

## Notes

- Keep headings unchanged: `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`.
- Use `summary` before and after edits to confirm updates.
- Do not use this skill for link repairs, document moves, or other work that is
  not executing a selected plan.
