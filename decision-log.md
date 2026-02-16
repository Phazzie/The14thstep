# Decision Log

## 2026-02-15

- Repository execution will follow `plans/the-14th-step-execplan.md` as the canonical working plan.
- Milestone 0 is being implemented inside `app/` (SvelteKit workspace) while root-level governance files (`seam-registry.json`, this log) remain at repo root.
- External probes are scaffolded now and treated as credential-gated until `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are available.

