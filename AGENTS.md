# Repository Agent Guide

**Read `STATUS.md` first.** It says what we are building, which epic owns the
work, and what is blocked. This file is the rules; `STATUS.md` is the map.

This root file defines global rules. For detailed instructions, also read the nearest nested `AGENTS.md` in the directory you are editing.

## Global rules

- Keep affected repository governance artifacts current when their status, decisions, or outcomes materially change; do not add entries to every log for every edit:
  - the active execplan for the affected track, identified through `STATUS.md`
  - `decision-log.md`
  - `CHANGELOG.md`
  - `LESSONS_LEARNED.md`
  - `DEFERRED.md`
- Track work as GitHub issues under an epic when GitHub writes are authorized; otherwise use the local handoff. Epics are listed in `STATUS.md`. Keep one live execplan per track; do not add another status document to the repo root.
- `archive/` is finished history. Read it for context, never for direction.
- A plan that lives only on an unmerged branch does not exist. If work is worth resuming, its plan belongs on `main`.
- If work is intentionally deferred, incomplete, or left as a known follow-up, link an existing GitHub issue or create one when GitHub writes are within the user's authorized scope. For local-only work, report the follow-up in the handoff without making external writes a prerequisite to completion.
- Follow Seam-Driven Development for app implementation. Summary order: contract, probe, fixtures, mock, contract test, adapter, composition wiring. See `app/AGENTS.md` for the full workflow and gate checks.
- When implementing a milestone plan, proceed within the assigned scope unless blocked by missing credentials, missing infrastructure access, or conflicting product direction. A bounded documentation task does not authorize continuing into application milestones.
- When promoting local work to remote, use decision-gated slices from current `origin/main`; do not push a dirty lab branch wholesale.
- Do not commit secrets. Keep credentials in local env files only.
- Use commands appropriate to the available shell; keep shared runbook commands explicit about their environment. Do not require Bash for local documentation work in PowerShell.

## Documentation-only work

- For documentation edits and moves that do not change executable behavior, verify content preservation, affected references, and the diff. Application implementation gates and live seam probes do not apply solely because a document lives under `app/`.
- Update existing navigation and affected guidance; do not create a new ExecPlan or status document solely for a bounded cleanup. Preserve substantive history and unresolved product decisions.
- Task-specific limits on commits, external writes, and delegation take precedence over workflow examples below.

## WHAT THIS APP IS

The 14th Step is a recovery meeting simulator. Users are real people - often in recovery, sometimes at 3am, sometimes in crisis. Code quality and writing quality are equally important. Every prompt change affects whether someone at 3am feels less alone.

## ARCHITECTURE

- Real I/O lives in `app/src/lib/server/` only.
- Core logic in `app/src/lib/core/` is pure - no fetch, no database.
- Prompt templates are pure functions that return strings.
- If you're importing a server module from core, stop and restructure.

## PROMPT-CRITICAL FILES

- `app/src/lib/core/prompt-templates.ts`
- `app/src/lib/core/characters.ts`
- `app/src/lib/core/types.ts`
- `app/src/lib/core/style-constitution.ts` - read this before touching any prompt.
- `app/src/lib/core/therapy-blocklist.ts`
- `app/src/routes/meeting/[id]/share/+server.ts`

## HARD CONSTRAINTS - NEVER VIOLATE

- `voiceExamples` is a required 3-tuple. Never make it optional.
- Never add "exactly N sentences" to any generation prompt.
- Never add "include a physical action" to any generation prompt.
- Never pass archetype to the character generation prompt.
- Omit empty sections entirely - never render "SECTION: none".
- Never ship a share with authenticity < 6 or voiceConsistency < 6 - skip the character.
- Never use placeholder text in `voiceExamples` - real lines only.

## EVALUATING GENERATED SHARES

Cut the last sentence. If the share hits harder, it was filler.
A share fails if it ends with a lesson, names an emotion, or could have been said by any character in any meeting.

## PROMOTION VOCABULARY

- Decision-gated slice promotion: move one coherent, user-visible change onto a clean branch from current `origin/main`, critique the slice, validate only the touched behavior honestly, then open a focused PR.

## Non-Obvious Rules: Do and Don't Examples

This section adds concrete examples for rules that can be interpreted multiple ways in practice.

### Global rules examples

- Keep affected repository governance artifacts current when their contents materially change.
  - Do: After finishing a milestone, update its active plan and record actual decisions, shipped changes, and lessons in the relevant logs.
  - Don't: Merge feature code and leave governance docs stale for a later cleanup PR.
- Follow Seam-Driven Development order (contract, probe, fixtures, mock, contract test, adapter, composition wiring).
  - Do: Define/adjust the seam contract first, create probe fixtures, then write adapter and wire routes only after contract tests pass.
  - Don't: Start by editing route handlers and adapter SQL calls, then retrofit contracts and tests afterward.
- When implementing a milestone plan, proceed within the assigned scope.
  - Do: Finish the current milestone acceptance criteria before opening unrelated future-milestone implementation work.
  - Don't: Jump from Milestone 5 into Milestone 9 polish while Milestone 5 core acceptance checks are still failing.
- When promoting local work to remote, use decision-gated slices from current `origin/main`; do not push a dirty lab branch wholesale.
  - Do: Extract one coherent user-visible change onto a clean branch, critique it, validate it, then open a focused PR.
  - Don't: Push a huge mixed branch just because it contains some good work somewhere inside it.

### Architecture examples

- Real I/O lives in `app/src/lib/server/` only.
  - Do: Put Supabase queries in `app/src/lib/server/seams/database/adapter.ts` and inject results into core.
  - Don't: Add `createClient(...)` and direct table queries inside `app/src/lib/core/*`.
- Core logic in `app/src/lib/core/` is pure - no fetch, no database.
  - Do: Pass plain data into core functions and return deterministic results.
  - Don't: Call `fetch`, read cookies, or hit environment variables from core modules.
- Prompt templates are pure functions that return strings.
  - Do: `buildPrompt(input) => string` with no side effects.
  - Don't: Perform network calls, DB reads, or runtime mutation inside prompt-template builders.
- If importing a server module from core, stop and restructure.
  - Do: Move the shared type/helper into `app/src/lib/core/` (or a neutral shared module) and keep server imports one-way.
  - Don't: `import { createSupabaseServiceRoleClient } from '$lib/server/supabase'` inside any `app/src/lib/core/*` file.

### Prompt and generation constraints examples

- `voiceExamples` is a required 3-tuple. Never make it optional.
  - Do: Require exactly three real lines for every character profile and enforce it in types/validation.
  - Don't: Use `voiceExamples?: string[]` or allow 0-2 examples.
- Never add "exactly N sentences" to any generation prompt.
  - Do: Ask for a concise share that feels naturally complete.
  - Don't: Instruct "write exactly 4 sentences."
- Never add "include a physical action" to any generation prompt.
  - Do: Let concrete details emerge naturally from voice and memory context.
  - Don't: Force "include one physical action" as a hard prompt rule.
- Never pass archetype to the character generation prompt.
  - Do: Pass the character's own wound/contradiction/voice examples and current context.
  - Don't: Include labels like "archetype: tough-love veteran" in generation input.
- Omit empty sections entirely - never render "SECTION: none".
  - Do: If callbacks are empty, remove the callbacks section from the rendered prompt.
  - Don't: Output placeholder blocks such as `CALLBACKS: none`.
- Never ship a share with authenticity < 6 or voiceConsistency < 6 - skip the character.
  - Do: If validator returns low scores, skip that speaker turn and move to next character.
  - Don't: Show the failed share just to keep strict rotation order.
- Never use placeholder text in `voiceExamples` - real lines only.
  - Do: Store actual candidate lines ("I sat in the car for forty minutes. Engine off.").
  - Don't: Use filler like "example line 1" or "TODO voice sample."

### Evaluating generated shares examples

- Cut the last sentence. If the share hits harder, it was filler.
  - Do: Remove the closing sentence during review; if impact improves, keep the trimmed version.
  - Don't: Keep a weak final "lesson sentence" because grammar seems complete.
- A share fails if it ends with a lesson, names an emotion, or is generic across characters.
  - Do: Reject and retry when text ends in advice, explicit emotion labels, or interchangeable language.
  - Don't: Pass a share that could be spoken by any character in any meeting.

## Nested guides

- App implementation rules: `app/AGENTS.md`
- ExecPlan authoring and maintenance rules: `plans/AGENTS.md`
- Source-level implementation rules: `app/src/AGENTS.md`
- CI/workflow automation rules: `.github/AGENTS.md`

## Subagent usage (Codex)

- Delegation is optional, not a prerequisite for searching or editing. Follow the current task's delegation limits; do not spawn agents when the task asks for one agent working sequentially.
- When delegation is permitted and useful, assign one bounded discovery question or implementation outcome using agent capabilities actually available in the session. Do not assume named `explorer` or `worker` types exist.
- Give each editing agent explicit file ownership. Do not run multiple writers on the same files at the same time or delegate dependent changes concurrently.
- Prefer one precise subagent task over a vague multi-step prompt. Ask for outputs with file paths and line numbers.
- For parallel work, split by independent scope (for example: route audit vs adapter audit), then merge results in the main agent.
- Main agent remains responsible for final integration, conflict resolution, verification, and user-facing summary.
