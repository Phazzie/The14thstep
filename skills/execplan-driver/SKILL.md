---
name: execplan-driver
description: Drive milestone-by-milestone ExecPlan implementation and keep living-plan sections current. Use when working from plans/the-14th-step-execplan.md (or any PLANS.md-governed ExecPlan) to summarize progress, check off milestones, and append discoveries, decisions, outcomes, or revision notes in a consistent format.
---

# ExecPlan Driver

Use the bundled script to keep an ExecPlan up to date while implementing.

## Run

From repo root, run:

    python skills/execplan-driver/scripts/execplan_driver.py summary --plan plans/the-14th-step-execplan.md

## Commands

- `summary`: Show total/complete/open checklist items in `## Progress`.
- `check`: Mark the first matching unchecked `Progress` item as complete.
- `add-discovery`: Append an observation/evidence pair to `## Surprises & Discoveries`.
- `add-decision`: Append a decision entry to `## Decision Log`.
- `add-outcome`: Append an outcome note to `## Outcomes & Retrospective`.
- `add-revision-note`: Append a `Revision note (YYYY-MM-DD): ...` line at the end of the file.

## Examples

    python skills/execplan-driver/scripts/execplan_driver.py check --plan plans/the-14th-step-execplan.md --item "Milestone 0"
    python skills/execplan-driver/scripts/execplan_driver.py add-decision --plan plans/the-14th-step-execplan.md --decision "Use Supabase" --rationale "Relational memory query support" --author "codex"

## Notes

- Keep headings unchanged: `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`.
- Use `summary` before and after edits to confirm updates.
