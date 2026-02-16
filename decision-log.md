# Decision Log

## 2026-02-15

- Repository execution will follow `plans/the-14th-step-execplan.md` as the canonical working plan.
- Milestone 0 is being implemented inside `app/` (SvelteKit workspace) while root-level governance files (`seam-registry.json`, this log) remain at repo root.
- External probes are scaffolded now and treated as credential-gated until `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are available.

## 2026-02-16

- Created nested agent guidance (`app/AGENTS.md`, `plans/AGENTS.md`) and kept root `AGENTS.md` minimal with pointers.
- Added dedicated governance artifacts `CHANGELOG.md` and `LESSONS_LEARNED.md` and made them mandatory in agent instructions.
- Standardized seam contracts to export runtime validators and reused them in fixture-backed mocks and contract tests for Milestone 1.
- Implemented Milestone 2 incrementally by shipping `app/src/lib/core/meeting.ts` (create/add/close workflow + pure significance scoring) before broader core modules.
- Completed remaining Milestone 2 core modules with tests: `character-selector`, `prompt-templates`, `memory-builder`, and `callback-scanner`.
- Added live Grok probe tooling at `app/src/lib/seams/grok-ai/probe.ts` and `quality-cycle.ts`, and captured live pass-rate evidence in seam fixtures.
- Separated deterministic contract fixtures from live probe captures (`probe.sample.json`, `probe.fault.json`) to avoid test-fixture drift.
- Updated probe commands to load `.env.local` automatically via `node --env-file-if-exists=.env.local`.
- Completed Milestone 4 using a parallel subagent pattern, then integrated centrally with full check/unit verification.
- Expanded the `database` seam contract/adapter to include callback and share-lookup methods (`getShareById`, `getMeetingShares`, `createCallback`, `getActiveCallbacks`, `markCallbackReferenced`) to unblock Milestone 6 integration.
- Integrated callback-aware memory prompts in `meeting/[id]/share/+server.ts` via `buildPromptContext` and a new pure `callback-engine.ts` probability matrix.
- Added close-route callback scanning/persistence and a new expand-share endpoint (`meeting/[id]/expand/+server.ts`) to complete Milestone 5/6 functional flow and advance Milestone 7.
- Added a dedicated crisis endpoint (`meeting/[id]/crisis/+server.ts`) and client-side crisis-mode gating so normal character shares pause once crisis is detected.
