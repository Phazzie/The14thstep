# STATUS

The one page that says what we are building and where it stands. Read this first.

Last updated: 2026-09-14

## What this app is

The 14th Step is a recovery meeting simulator. Someone opens it, answers four
questions, and joins a meeting that is already happening. The room runs itself.
It asks them to speak only where a real meeting would ask.

The people using it are in recovery, sometimes at 3am, sometimes in crisis.
Writing quality is not decoration here. It is the product.

## Where things stand

The room-led meeting flow is on `main` and green. The app cannot serve anyone,
because the Supabase tenant behind production is gone.

Those are independent. Work on the room needs nobody's permission. Production
needs a new database, which needs a human with account access.

## Start here

1. This file.
2. `AGENTS.md`, for the rules that are not negotiable.
3. The epic you are working in, below.
4. The live ExecPlan mapped to that epic in the table below.
5. `reference/original-artifact.jsx` if you need to feel how the original ran.

## The work

Each epic is a GitHub issue. Its tasks are sub-issues, and GitHub tracks what is
done. This table says what each epic is, why it exists, and which live ExecPlan
governs work in that track.

| Epic | What it is | Why it matters | Live ExecPlan |
|---|---|---|---|
| [#77](https://github.com/Phazzie/The14thstep/issues/77) | The server should run the meeting, not the browser | The script lives in a Svelte component and drifts from the server's phase machine. Refresh duplicates the transcript. | [`server-owned-meeting-beats-execplan.md`](plans/server-owned-meeting-beats-execplan.md) |
| [#78](https://github.com/Phazzie/The14thstep/issues/78) | Stop leaking what people tell the room | Intake answers ride in the URL. No route checks who owns a meeting. | [`private-meeting-access-execplan.md`](plans/private-meeting-access-execplan.md) |
| [#71](https://github.com/Phazzie/The14thstep/issues/71) | Restore the production backend | The site is down. Nothing ships until there is a database. | [`production-recovery-and-backlog-execplan.md`](plans/production-recovery-and-backlog-execplan.md) |
| [#79](https://github.com/Phazzie/The14thstep/issues/79) | Make character identity durable | A character's row can split in two and their memory fragments silently. | [`production-recovery-and-backlog-execplan.md`](plans/production-recovery-and-backlog-execplan.md) |
| [#80](https://github.com/Phazzie/The14thstep/issues/80) | Remove the dead weight | Unwired modules and thousand-line files slow every other change. | [`production-recovery-and-backlog-execplan.md`](plans/production-recovery-and-backlog-execplan.md) |

[`the-14th-step-execplan.md`](plans/the-14th-step-execplan.md) preserves the
cross-track product architecture and earlier milestone record. It is reference
for decisions that span tracks, not the automatic execution plan for an epic.

Start with [#84](https://github.com/Phazzie/The14thstep/issues/84) if you want
the highest value per hour. It is small, and the exposure is happening now.

Start with [#81](https://github.com/Phazzie/The14thstep/issues/81) if you want
the change everything else gets easier after. Finish #84 and #85 first so the
new meeting endpoint inherits one ownership gate and a default-deny direct
database boundary. Finish [#79](https://github.com/Phazzie/The14thstep/issues/79)
before #81's database-backed slices so every core character slug resolves to
one migration-seeded UUID instead of a row created by a racing read.
Promote #81 through its database creation fence: keep meeting creation in
`draining` while legacy rooms finish and the version-1 renderer deploys, then
activate stamped version-1 creation only after every serving instance is ready.

## Blocked

- Everything production-facing waits on a new Supabase project. See
  [#71](https://github.com/Phazzie/The14thstep/issues/71). This needs a person
  with account access, not an agent.
- `verify:fixtures` fails on every branch. The seam probe fixtures are past
  their 30-day window and refreshing them needs the live backends, so it is
  blocked behind #71. Tracked in
  [#91](https://github.com/Phazzie/The14thstep/issues/91) and `DEFERRED.md`.
  Every other CI lane is green, so a red `fixtures` alone is expected right now.
  Nothing else red is.

## Older open issues

[#6](https://github.com/Phazzie/The14thstep/issues/6),
[#8](https://github.com/Phazzie/The14thstep/issues/8),
[#10](https://github.com/Phazzie/The14thstep/issues/10) and
[#17](https://github.com/Phazzie/The14thstep/issues/17) predate these epics.
They are still real. Fold each into an epic or close it when you next touch the
area it covers.

## How this repo stays legible

Four files are append-only and always current: `CHANGELOG.md`,
`decision-log.md`, `LESSONS_LEARNED.md`, `DEFERRED.md`.

There is **one live execplan per track**, in `plans/`. When a plan is finished
or abandoned it moves to `archive/`.

A plan that exists only on an unmerged branch does not exist. Nobody starting
from `main` can see it. That is how this project lost six months: the plan
describing the current goal sat on an unmerged branch from March until
September while twenty stale documents held the root directory.

`archive/` is history. Read it for context, never for direction. Paths inside
archived documents describe the layout as it was when they were written.
