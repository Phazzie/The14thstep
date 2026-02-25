# Repository Agent Guide

This root file defines global rules. For detailed instructions, also read the nearest nested `AGENTS.md` in the directory you are editing.

## Global rules

- Keep repository governance artifacts current as work proceeds:
  - `plans/the-14th-step-execplan.md`
  - `decision-log.md`
  - `CHANGELOG.md`
  - `LESSONS_LEARNED.md`
- If work is intentionally deferred, incomplete, or left as a known follow-up, create a GitHub issue before finishing the task/PR and link it in your summary.
- Follow Seam-Driven Development for app implementation. Summary order: contract, probe, fixtures, mock, contract test, adapter, composition wiring. See `app/AGENTS.md` for the full workflow and gate checks.
- Proceed milestone by milestone unless blocked by missing credentials, missing infrastructure access, or conflicting product direction.
- Do not commit secrets. Keep credentials in local env files only.
- Prefer Linux shell commands and Bash-oriented workflows for reproducibility.

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

## Non-Obvious Rules: Do and Don't Examples

This section adds concrete examples for rules that can be interpreted multiple ways in practice.

### Global rules examples

- Keep repository governance artifacts current as work proceeds.
  - Do: After finishing Milestone 8 work, update `plans/the-14th-step-execplan.md`, add an entry to `decision-log.md`, and append to `CHANGELOG.md` and `LESSONS_LEARNED.md` in the same PR.
  - Don't: Merge feature code and leave governance docs stale for a later cleanup PR.
- Follow Seam-Driven Development order (contract, probe, fixtures, mock, contract test, adapter, composition wiring).
  - Do: Define/adjust the seam contract first, create probe fixtures, then write adapter and wire routes only after contract tests pass.
  - Don't: Start by editing route handlers and adapter SQL calls, then retrofit contracts and tests afterward.
- Proceed milestone by milestone unless blocked by missing credentials, missing infrastructure access, or conflicting product direction.
  - Do: Finish the current milestone acceptance criteria before opening unrelated future-milestone implementation work.
  - Don't: Jump from Milestone 5 into Milestone 9 polish while Milestone 5 core acceptance checks are still failing.

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

## Line Items Without Examples (And Why)

- `## WHAT THIS APP IS` mission paragraph: no Do/Don't example because it is product purpose context, not an executable rule.
- `## PROMPT-CRITICAL FILES` paths: no Do/Don't examples per path because these are location references, not behavioral constraints.
- `Do not commit secrets. Keep credentials in local env files only.` no example added because the rule is already explicit and safety-critical without interpretation room.
- `Prefer Linux shell commands and Bash-oriented workflows for reproducibility.` no example added because it is a straightforward tooling preference with low ambiguity.
- `## Nested guides` paths: no Do/Don't example because these are pointers to deeper instructions, not action rules by themselves.

## Nested guides

- App implementation rules: `app/AGENTS.md`
- ExecPlan authoring and maintenance rules: `plans/AGENTS.md`

## Subagent usage (Codex)

- `explorer` subagents are best for fast codebase reconnaissance: finding files, line numbers, existing helpers, and summarizing what is already implemented.
- Use `explorer` before manual searching when a task starts with "where is X?" or "what already exists?".
- `worker` subagents are for implementation work (editing files, fixing tests, scoped refactors). Assign clear ownership (specific files or one subsystem).
- Use `worker` only for non-overlapping edits. Do not run multiple workers on the same files at the same time.
- Default subagents are general-purpose and useful for small, self-contained tasks that do not need deep repo expertise or broad code search.
- Prefer one precise subagent task over a vague multi-step prompt. Ask for outputs with file paths and line numbers.
- For parallel work, split by independent scope (for example: route audit vs adapter audit), then merge results in the main agent.
- Main agent remains responsible for final integration, conflict resolution, verification, and user-facing summary.
