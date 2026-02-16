# Decision Log

## 2026-02-15

- Repository execution will follow `plans/the-14th-step-execplan.md` as the canonical working plan.
- Milestone 0 is being implemented inside `app/` (SvelteKit workspace) while root-level governance files (`seam-registry.json`, this log) remain at repo root.
- External probes are scaffolded now and treated as credential-gated until `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are available.

## 2026-02-16

- Created nested agent guidance (`app/AGENTS.md`, `plans/AGENTS.md`) and kept root `AGENTS.md` minimal with pointers.
- Added dedicated governance artifacts `CHANGELOG.md` and `LESSONS_LEARNED.md` and made them mandatory in agent instructions.
- Standardized seam contracts to export runtime validators and reused them in fixture-backed mocks and contract tests for Milestone 1.
