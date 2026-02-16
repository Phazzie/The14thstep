# Lessons Learned

This file captures practical lessons we want future work to reuse.

## 2026-02-16

### Process
- Keep four artifacts in sync during execution: `plans/the-14th-step-execplan.md`, `decision-log.md`, `CHANGELOG.md`, and this file.
- Fast handoffs depend on lightweight, append-only notes more than perfect prose.
- For long milestones, ship one tested core slice at a time and mark remaining scope explicitly in the ExecPlan.

### Technical
- Probe thresholds should be configurable by environment; fixed latency budgets produce false failures.
- Validate xAI parsing against real payload shapes early, then lock the parser contract in tests.
- SvelteKit/Vite cold starts can be slow; warm the server before timing-sensitive probes.
- `npx`-based CLI usage (`vercel`, `supabase`) reduces setup friction and keeps agent runs reproducible.
- Each git worktree needs its own dependency install; do not assume sibling worktree `node_modules` are available.
- For strict TypeScript contracts, always narrow values extracted from `Record<string, unknown>` before numeric comparisons.
- Encode significance-scoring precedence in tests; mixed-signal shares otherwise create ambiguous expectations.
- Keep deterministic contract fixtures separate from live probe captures (`sample.json` vs `probe.sample.json`) so test baselines are not overwritten.
- Use script-level env loading (`node --env-file-if-exists=.env.local`) for probe commands in isolated worktrees.
- Parallel subagents work best when each owns non-overlapping file sets and one integrator owns final wiring/tests/docs.
- Verify Linux Node toolchain path explicitly (`/home/latro/.nvm/.../bin`) to avoid accidental Windows npm execution drift.
- Advancing a seam-driven milestone often requires expanding seam contracts first; route-level integration is much faster once adapter methods exist.
- Prompt-quality retry loops can be implemented with the same generation seam by treating validator calls as first-class seam interactions.
- Callback engines are safest as pure, test-first modules; route wiring then becomes straightforward and low-risk.
- Crisis-mode behavior is easiest to keep safe when normal generation paths are explicitly gated in both client and server routes.

## 2026-02-15

### Process
- Seam-Driven Development worked well when we implemented probes and contracts before full adapters.
- Keeping governance files at repo root and app code in `app/` reduced churn and avoided risky project moves.

### Technical
- Existing `node_modules` from another platform can break local test runs; a clean `npm install` fixed missing Linux-native Rollup binaries.
- Lint tooling can behave differently from tests/checks in this environment, so verification should include multiple commands and timeout-aware triage.
