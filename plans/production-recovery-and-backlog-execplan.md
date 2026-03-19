# Restore Production Reliability And Mine The Next Safe Backlog Slices

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with [PLANS.md](/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/PLANS.md).

## Purpose / Big Picture

The immediate goal is to make `https://14thstep.com` reliably usable again for real people. After the work in this plan is complete, a guest or member should be able to open the site, start a meeting, and see the meeting continue into actual room behavior instead of failing during authentication or bootstrap. Once production is stable, the same workflow should keep moving forward by landing the smallest safe backlog slices instead of reopening large messy branches.

The plan is intentionally ordered around user-visible recovery first, then merge hygiene, then backlog throughput. The site being healthy matters more than new features. After production is healthy, the work should continue in small decision-gated slices so local work, GitHub, and Vercel remain synchronized.

This plan also assumes a high-agency implementation style. The executing agent should be decisive, should not stop for routine ambiguity, and should prefer the clean root-cause fix over timid symptom-patching. The only acceptable reason to pause is a true external blocker such as missing credentials, destructive irreversible risk, or the need for a user-owned production secret that cannot be inferred safely.

## Progress

- [x] (2026-03-18 09:50Z) Confirmed the live Vercel production project is `app` and that the public domains `14thstep.com`, `www.14thstep.com`, and `the14thstep.vercel.app` point to deployment `dpl_44ARFMByHcJhKrTCXgjEyieVJ8DH`.
- [x] (2026-03-18 09:50Z) Merged the Clerk session-cookie hotfix as PR `#68` / commit `b7bcdd8`, which fixed the member-session issue where Clerk suffixed cookies such as `__session_*` were ignored by the server.
- [x] (2026-03-18 09:50Z) Confirmed the user rotated the xAI key and that Vercel reported a fresh successful production deployment after the rotation.
- [x] (2026-03-18 09:50Z) Reproduced the remaining live failure: landing page loads, but guest bootstrap still returns `503` on production.
- [x] (2026-03-18 09:50Z) Pulled production env from the real live `app` Vercel project at the repo root and confirmed that `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` still point at `https://tmcpfhftdrexsjrcrxbo.supabase.co`.
- [x] (2026-03-18 09:50Z) Confirmed the stale project ref `tmcpfhftdrexsjrcrxbo` is also encoded into the current `SUPABASE_SERVICE_ROLE_KEY`.
- [x] (2026-03-18 09:50Z) Confirmed the direct Postgres pooler host in `POSTGRES_URL` resolves, while the Supabase REST host does not.
- [x] (2026-03-18 09:50Z) Opened PR `#69` (`fix(auth): harden Clerk session cookie selection`) to address the review follow-up where multiple Clerk session cookies should be tried in order instead of failing on the first stale token.
- [x] (2026-03-18 20:10Z) Confirmed that all three production Postgres URLs (`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) fail with `Tenant or user not found`, so the direct pooler path is not a viable unattended recovery target.
- [x] (2026-03-18 20:12Z) Confirmed Supabase CLI is not installed on this machine and there is no saved Supabase auth/config, so a fresh Supabase reprovision cannot be completed autonomously from the current environment.
- [x] (2026-03-18 20:45Z) Landed the bounded issue `#10` hardening slice on branch `codex/narrative-context-hardening-2026-03-18` and opened draft PR `#70` (`fix(core): harden narrative context fallback handling`).
- [x] (2026-03-18 20:50Z) Commented a concrete prompt-surface inventory onto issue `#17`, including grouped runtime surfaces and the smallest safe follow-up slices.
- [x] (2026-03-18 20:53Z) Opened issue `#71` to track production database backend reprovisioning as the current external blocker.
- [ ] Provision or recover a real production database target, apply the existing schema, and update the live Vercel project to use it.
- [ ] Land the minimum production recovery change or env update, redeploy, and verify both guest and member meeting start on the real public site.
- [ ] Merge or close PR `#69` after the production recovery decision is made so auth work does not linger as half-finished local state.
- [ ] Review and ship or revise draft PR `#70` after a trustworthy narrow test/build pass is available.
- [ ] After production is stable, turn the issue `#17` inventory into the next 2-3 prompt-writing slices instead of one giant rewrite.

## Surprises & Discoveries

- Observation: The repo root and `/home/latro/The14thstep` are linked to the healthy Vercel `app` project, but `app/.vercel/project.json` inside this checkout still points to the retired `the14thstep` project.
  Evidence: The root `.vercel/project.json` contains `"projectName":"app"` while `app/.vercel/project.json` contains `"projectName":"the14thstep"`. Use the repo root, not `app/`, for Vercel env inspection and env mutation.

- Observation: The remaining live failure is not the Clerk cookie hotfix and not the rotated xAI key.
  Evidence: `gh api repos/Phazzie/The14thstep/commits/b7bcdd8361a5809ae45aebc2f87ad7540219492a/status` reports Vercel success for the hotfix deploy, but `vercel logs https://14thstep.com --no-follow --json` still shows `POST /` returning `503`.

- Observation: The live project is configured with a Supabase project ref that no longer resolves as a REST host.
  Evidence: `vercel env pull` from the root-linked `app` project shows `SUPABASE_URL="https://tmcpfhftdrexsjrcrxbo.supabase.co"`, and direct bootstrap probing failed with `getaddrinfo ENOTFOUND tmcpfhftdrexsjrcrxbo.supabase.co`.

- Observation: The direct Postgres pooler host in the same production env is still DNS-resolvable.
  Evidence: `getent hosts aws-1-us-east-1.pooler.supabase.com` returns live addresses while `getent hosts tmcpfhftdrexsjrcrxbo.supabase.co` returns nothing.

- Observation: The DNS-resolvable pooler host is not enough to recover production because every live Postgres URL still points at a dead tenant.
  Evidence: Probing `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING` with the `pg` client against the live pulled env returned `Tenant or user not found` / `XX000` for all three URLs.

- Observation: Autonomous Supabase reprovisioning is blocked by missing local Supabase tooling and auth, not by uncertainty about what the app needs.
  Evidence: `supabase --version` fails with `command not found`, and there is no `~/.supabase` or `~/.config/supabase` state on disk.

- Observation: The production guest flow surfaces `503` from the server, but the browser-level auth warning is only incidental.
  Evidence: Playwright against the public site reaches `/?/continueGuest`, and `vercel logs` show `responseStatusCode:503` with `[auth.session] unresolved code=UNAUTHORIZED message=No active auth session` on the same POST. The unresolved auth line is expected before bootstrap; the real failure is the `503` during the action.

## Decision Log

- Decision: Treat production recovery as a database-path problem, not an auth/UI problem.
  Rationale: The Clerk cookie bug is already merged and deployed. The remaining production `503` persists after that fix and after xAI rotation, so continuing to tweak auth or prompts would be drift.
  Date/Author: 2026-03-18 / Codex

- Decision: Use the repo root for all future Vercel environment inspection and mutation.
  Rationale: The nested `app/.vercel/project.json` still points to the retired `the14thstep` project and will mislead any future environment work.
  Date/Author: 2026-03-18 / Codex

- Decision: Prefer restoring a valid backend reference over a large adapter rewrite.
  Rationale: Swapping the database seam from Supabase REST to direct Postgres can be done cleanly, but it is still a meaningful architectural change. The least-debt fix is to restore a valid existing backend if one is available.
  Date/Author: 2026-03-18 / Codex

- Decision: If no valid Supabase REST project can be restored from available credentials and local context, implement a clean Postgres-backed `DatabasePort` adapter rather than patching around the dead REST host.
  Rationale: The direct Postgres pooler host still resolves, and the current code already separates database access behind `DatabasePort`. A real adapter is acceptable; ad hoc route-level SQL would be debt.
  Date/Author: 2026-03-18 / Codex

- Decision: Do not continue building a Postgres-backed production adapter against the currently configured production credentials.
  Rationale: The live Postgres URLs are not merely using the wrong transport; they all fail with `Tenant or user not found`, so there is no actual database target to restore against. Building the adapter now would create speculative code without an operational backend.
  Date/Author: 2026-03-18 / Codex

- Decision: Treat production recovery as externally blocked pending a newly provisioned database target, and use the blocked time to mine bounded backlog work that does not overlap the database outage.
  Rationale: The remaining work that can be done autonomously with high confidence is code hardening and diagnosis on slices that do not depend on the dead backend.
  Date/Author: 2026-03-18 / Codex

- Decision: Convert backlog work into durable artifacts while production is blocked: a real PR for issue `#10`, an issue comment inventory for issue `#17`, and a first-class outage issue for the missing backend.
  Rationale: This keeps momentum without pretending the live outage is fixed, and it prevents the blocked time from collapsing into undocumented local analysis.
  Date/Author: 2026-03-18 / Codex

- Decision: Keep backlog mining strictly secondary to production recovery.
  Rationale: The site is currently broken for real users, so backlog work should only begin after guest/member start flows are verified live.
  Date/Author: 2026-03-18 / Codex

## Outcomes & Retrospective

This section is not complete yet. The current state is that auth reliability improved materially with PR `#68`, but production still has a backend bootstrap outage because the configured backend no longer exists. The main lesson so far is that project-link drift (`app/.vercel` vs root `.vercel`) and env drift can masquerade as app bugs, and that a resolvable host is not the same thing as a live database. The next contributor should assume that external state is part of the bug until proven otherwise.

## Context and Orientation

The application is a SvelteKit app in `app/`. The public production site is served by Vercel project `app`, not by the retired project `the14thstep`. The live root checkout for Vercel commands is the repository root `/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run`, not `/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/app`.

The user-visible entry point is `app/src/routes/+page.svelte` and `app/src/routes/+page.server.ts`. Guests click `Continue as Guest`; members use Clerk sign-in/sign-up. The server creates request-scoped seams in `app/src/hooks.server.ts`. Those seams include:

- `auth`, implemented in `app/src/lib/server/seams/auth/adapter.ts`
- `database`, implemented in `app/src/lib/server/seams/database/adapter.ts`
- `grokAi`, implemented in `app/src/lib/server/seams/grok-ai/adapter.ts`

The important production facts right now are:

- PR `#68` is merged to `main` as commit `b7bcdd8` and deployed.
- PR `#69` exists to harden multi-cookie Clerk session selection and is not part of the immediate production outage.
- The live site still returns `503` during guest bootstrap.
- The live Vercel `app` project currently has:
  - `SUPABASE_URL="https://tmcpfhftdrexsjrcrxbo.supabase.co"`
  - `NEXT_PUBLIC_SUPABASE_URL="https://tmcpfhftdrexsjrcrxbo.supabase.co"`
  - `POSTGRES_URL="postgres://postgres.tmcpfhftdrexsjrcrxbo:...@aws-1-us-east-1.pooler.supabase.com:6543/postgres?..."`
- The Supabase REST host is dead, and every configured Postgres URL also fails with `Tenant or user not found`.

The phrase "decision-gated promotion" means: prove a change locally, push a small PR, handle review, merge, and only then begin the next slice. This repository already uses that workflow and it should continue.

The phrase "subagent" means a separate smaller agent thread used in parallel for bounded work. In this plan, subagents are used for exploration, log collection, and non-overlapping backlog slices; the main agent remains the final integrator.

This plan uses three review phrases in a precise way:

- A "root-cause review" means asking whether the proposed fix attacks the actual failure source or only a surface symptom.
- A "harsh but fair critique" means deliberately arguing against the chosen fix as if reviewing it for regressions, shortcuts, or architecture drift.
- An "architecture review" means checking whether the change belongs at the seam, adapter, route, or UI layer, and rejecting fixes that solve the bug in the wrong layer.

## Plan of Work

The work is divided into two large phases: recover production first, then mine safe backlog slices.

The first production milestone begins with proof, not code. From the repo root, pull the real `app` production env into a temp file and verify the Supabase values. Then try to discover whether a valid current Supabase REST project exists anywhere accessible from local context. Search all checked-in env examples, docs, handoff files, and linked local repos for a different active project ref or host. Before changing anything, write a short root-cause note in this plan that answers three questions in plain language: what is broken, what evidence proves it, and what are the two or three most plausible repair paths. After that note exists, run a harsh but fair critique against those candidate paths and explicitly reject the weaker ones.

That root-cause review is now settled: the production environment points at a deleted or otherwise dead Supabase tenant. The evidence is direct and redundant: the REST hostname does not resolve, the service-role token is still tied to that dead ref, all three Postgres URLs fail with `Tenant or user not found`, and no alternate live project ref exists in local context. The only clean repair paths left are to reprovision a real backend target or to wait until one is provided.

If a current valid project ref is found, update the live Vercel `app` project envs (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and any matching Supabase publishable/anon values if they are tied to the project) to the correct values and redeploy. Re-run the live guest and member flows after the deploy. If both flows work, skip the adapter rewrite entirely. Do not continue into a larger code change once the smaller configuration fix is proven.

If no valid Supabase REST project can be found from accessible local/remote state, the second production milestone is to replace the broken server database transport cleanly. Before writing code, do an architecture review and answer: why is an adapter-level change the right layer, what would be wrong about route-level SQL, and what are the risks of choosing direct Postgres as the primary transport. Once that review is written, add a new adapter module under `app/src/lib/server/seams/database/` that implements `DatabasePort` over the direct Postgres pooler connection from `POSTGRES_URL`. Keep the existing Supabase-backed adapter intact and give the code a clear selection point: either add a `createSupabaseDatabaseAdapter` export for the current code and introduce `createPostgresDatabaseAdapter`, or move shared row-mapping helpers into a shared module and let `createDatabaseAdapter()` choose the transport. Do not scatter SQL across routes. The seam boundary must stay intact.

The Postgres-backed adapter must fully support the methods actually used in the live runtime: `getUserById`, `ensureUserProfile`, `createMeeting`, `appendShare`, `getMeetingShares`, `getHeavyMemory`, `getShareById`, `updateMeetingPhase`, `getMeetingPhase`, `createCallback`, `getActiveCallbacks`, `markCallbackReferenced`, `completeMeeting`, `updateCallback`, and `getMeetingCountAfterDate`. The current Supabase adapter is the specification for behavior and error mapping; port the semantics, not just the SQL. Reuse the validation helpers in `app/src/lib/seams/database/contract.ts` and the seam error mapping style from the existing adapter. Prefer one new shared module for row mappers and one transport-specific adapter rather than duplicating the entire file.

After the production path is fixed, redeploy from `main`, then run live browser verification against `https://14thstep.com`. Use one guest flow and one member flow. A valid result is not merely "page loads"; it is: the user reaches `/meeting/<id>`, the room UI appears, and after a brief wait the room begins speaking instead of dying in bootstrap. Before merge, run a final harsh but fair critique on the exact shipped diff and answer: what shortcut would a lazy fix have taken here, and how does the chosen fix avoid that shortcut.

Only after that should backlog mining begin. Each backlog slice must repeat the same discipline: diagnose first, enumerate at least two candidate fixes or approaches, write a harsh but fair critique of the leading option, then implement the smallest root-cause fix that survives critique. The first implementation slice should be issue `#10`, which is bounded and code-oriented: harden narrative-context generator error handling and fallback cache behavior. The second slice should be issue `#17`, but only as an analysis/inventory pass first. That pass should identify every prompt surface and propose a minimal follow-up change list; it should not rewrite all prompt logic in one go. Issues `#7` and `#8` remain product-decision-heavy and should stay deferred unless the restored live behavior provides enough evidence to settle them.

## Autonomous Execution, Review, And Quality Gates

This section is the operating spine of the plan. The main agent should follow it for production recovery and for every later backlog slice.

Start every slice with a diagnosis memo written into this plan. That memo must explain the problem in plain language, list the evidence, and name at least two plausible fixes. One of those fixes may be "do nothing yet" if the evidence is too weak. Then write a harsh but fair critique of the most tempting fix. The critique must actively look for symptom-patching, wrong-layer changes, regressions, hidden coupling, and merge-risk. If the critique exposes a fatal weakness, revise the plan before changing code.

After diagnosis and critique, do an architecture review. The architecture review must answer which layer owns the problem in this repository. In this codebase the allowed strong layers are seams, adapters, core logic, route handlers, and UI. Fixes should land in the highest-leverage correct layer. For example, a dead database transport belongs in a database adapter, not in a route-level conditional. A session-cookie parsing bug belongs in auth/session helpers, not in every route.

Once the architecture layer is chosen, the main agent should make a decisive call and proceed. "Decisive" here means choosing a path and executing it fully, not continuing to hedge after the evidence is strong. The agent should still be brave enough to choose a bigger but cleaner fix when the smaller one is obviously wrong. Avoid the false virtue of minimalism when minimalism would preserve the bug.

Subagents should be used in parallel but with disjoint scopes. One explorer should gather live evidence. Another explorer should challenge assumptions or inspect schema/runtime details. Workers should only edit disjoint code areas. The main agent owns the final diff, the final test selection, the final PR, and the final merge decision.

Before every PR, run a merge-readiness review. That review must ask:

- Does this change fix the root cause or just hide it?
- Does it reduce architectural debt, preserve it, or increase it?
- Are the tests proving the real behavior, or only proving the code moved?
- Is there a smaller or cleaner seam-level change that would have been better?
- What is the most likely regression, and how was it checked?

After every merge, update this plan's `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` sections immediately. Then re-base the next step on the new `main`, not on stale local residue.

## Concrete Steps

Work from the repository root unless a step explicitly says `app/`.

First, verify and snapshot the current production state:

    cd /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run
    npx vercel inspect https://14thstep.com
    gh api repos/Phazzie/The14thstep/commits/main/status
    npx vercel logs https://14thstep.com --no-follow --json

Expected result: Vercel reports a ready production deployment, GitHub shows the latest `main` deployment status as success, and logs still show `POST /` failures when the guest flow is attempted.

Then pull the real production env from the live `app` project. This must be run from the repo root, not `app/`:

    cd /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run
    npx vercel env pull /tmp/live-app-prod.env --environment production
    grep -E '^(SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|POSTGRES_HOST|POSTGRES_URL)=' /tmp/live-app-prod.env

Expected result: the Supabase REST host still points at `tmcpfhftdrexsjrcrxbo.supabase.co`.

To see whether a current valid Supabase project is already known anywhere locally, search repo and sibling worktrees:

    rg -n 'supabase.co|SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|project ref' \
      /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run \
      /home/latro/The14thstep \
      -g '!**/node_modules/**' -g '!**/.svelte-kit/**'

If a different live project ref is found and can be trusted, update the Vercel `app` project env through the root-linked checkout and redeploy:

    cd /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run
    printf '%s' 'https://<correct-project-ref>.supabase.co' | npx vercel env add SUPABASE_URL production
    printf '%s' 'https://<correct-project-ref>.supabase.co' | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
    npx vercel --prod

If no valid REST host can be restored, do not proceed straight to a Postgres-backed seam implementation. First, probe every configured Postgres URL. If they fail to authenticate or return `Tenant or user not found`, stop and mark the database itself as externally blocked instead of building an adapter against a dead backend.

Only if a real working Postgres target exists should work continue into a Postgres-backed seam implementation. At that point, create a new adapter module in `app/src/lib/server/seams/database/` and a shared helper module if needed. Add the Postgres client dependency in `app/package.json`, install it, and implement the adapter over the live `POSTGRES_URL`. Keep the existing Supabase adapter in place for comparison and tests. Update `app/src/hooks.server.ts` or the database adapter entry point so production chooses the transport deterministically and safely.

After the code path changes, run the narrowest verification first:

    cd /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/app
    npx vitest run src/lib/server/seams/database/adapter.spec.ts
    npm run build

Then run live verification using a real browser against the public site. Use a script or Playwright CLI, but the observable behavior must be:

    1. Open https://14thstep.com
    2. Click Continue as Guest
    3. Complete the 4-step setup flow
    4. Submit Join Meeting
    5. Observe redirect to /meeting/<id>
    6. Wait up to 20 seconds and observe room content appearing

For member verification, repeat with a real test account or a newly created one. A valid result is not only successful login; it is successful meeting start.

After local verification but before PR, run one red-team pass through a subagent or separate review thread. That review should inspect only the proposed diff and should be instructed to find the strongest reason the fix should not ship. Address immediate findings before opening the PR.

Once production is healthy, continue with the first backlog slice:

    cd /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run
    gh issue view 10

Implement only the narrative-context hardening work in a fresh branch from updated `main`, verify it, open a PR, and merge it before starting the next issue.

Then do the issue `#17` analysis slice:

    cd /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run
    gh issue view 17

Produce a prompt-surface inventory, a recommendation, and either a PR with documentation-only guidance or a follow-up issue expansion if code changes are not yet justified.

## Validation and Acceptance

Production recovery is accepted only if all of the following are true:

- `https://14thstep.com` loads and the landing page presents guest/member entry points.
- A guest can click `Continue as Guest`, complete setup, submit `Join Meeting`, and reach a meeting URL without a `503`.
- A member can sign in or sign up and also reach a meeting URL without bootstrap failure.
- After reaching `/meeting/<id>`, the room continues into actual content. The meeting does not stall before AI output.
- `vercel logs https://14thstep.com --no-follow --json` no longer shows the guest/member bootstrap `503` for the tested flows.

The fallback adapter path is accepted only if:

- The database seam behavior matches the existing contract semantics.
- The app builds successfully with `npm run build`.
- Focused tests for the database seam pass.
- Live browser verification on production succeeds for both guest and member entry.

Backlog mining is accepted only if each slice is shipped as its own PR and leaves `main` deployable after merge.

No slice is accepted if the only proof is unit tests. Each production-facing slice must include one human-verifiable behavior check or a real runtime log check that demonstrates the user-visible improvement.

## Idempotence and Recovery

All Vercel env inspection commands are safe to repeat. `vercel env pull` can be run repeatedly to refresh `/tmp/live-app-prod.env`; it should not be committed.

If env mutation is needed, always update the `app` project from the repo root. Do not run Vercel env commands from `app/` because that nested directory is still linked to the retired `the14thstep` project.

If a valid Supabase REST host is found and applied, redeploy before testing. If the redeploy makes production worse, restore the previous env values from the pulled temp file and redeploy again.

If the Postgres-backed adapter path is chosen, keep the existing Supabase adapter alongside it until production verification passes. This is an intentional parallel implementation to reduce risk. Retire the broken transport only after the new path is proven live.

If the direct Postgres path cannot authenticate or the underlying database is unreachable, stop and record that in `Surprises & Discoveries`. At that point the external backend itself is unavailable, and the next step requires either a restored Supabase project or a new production database provisioned by the user.

If review feedback identifies a real wrong-layer fix, do not defend the existing patch out of sunk-cost loyalty. Rewrite or replace it while the slice is still small. This plan explicitly prefers correctness and clean architecture over preserving already-written code.

## Artifacts and Notes

These short evidence snippets are the current grounding for the plan:

    Root-linked live project:
      /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/.vercel/project.json
      {"projectId":"prj_JvQ6xLJe0Pfpp1pdJc8mcA1TyMeo","projectName":"app"}

    Nested stale project link:
      /mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/app/.vercel/project.json
      {"projectId":"prj_z7nTd2jFUKwI9rvpgUeqKjocIzOS","projectName":"the14thstep"}

    Live env from the real project:
      NEXT_PUBLIC_SUPABASE_URL="https://tmcpfhftdrexsjrcrxbo.supabase.co"
      SUPABASE_URL="https://tmcpfhftdrexsjrcrxbo.supabase.co"
      POSTGRES_URL="postgres://postgres.tmcpfhftdrexsjrcrxbo:...@aws-1-us-east-1.pooler.supabase.com:6543/postgres?..."

    Live production failure:
      vercel logs https://14thstep.com --no-follow --json
      {"requestMethod":"POST","requestPath":"/","responseStatusCode":503,"message":"[auth.session] unresolved code=UNAUTHORIZED message=No active auth session"}

    Direct DNS evidence:
      getent hosts tmcpfhftdrexsjrcrxbo.supabase.co
      <no output>

      getent hosts aws-1-us-east-1.pooler.supabase.com
      3.227.209.82 ...

## Interfaces and Dependencies

If the Postgres fallback path is used, add exactly one server-side database client dependency to `app/package.json`. Prefer a mature driver that works well in Node 24 and serverless environments. The new transport must still implement the existing `DatabasePort` from `app/src/lib/seams/database/contract.ts`; do not change route code to know or care which backend transport is used.

Subagent routing for autonomous continuation should follow this split:

- Subagent `Aristotle` (explorer): production state collection, Vercel deployment/env/log verification, and precise evidence gathering.
- Subagent `Ampere` (explorer): backend proof-of-life exploration for the direct Postgres path, including schema inspection and SQL query shape planning.
- Subagent `Kant` (worker): if the Postgres path is chosen, implement user/profile/meeting bootstrap methods (`getUserById`, `ensureUserProfile`, `createMeeting`) plus the smallest supporting helpers.
- Subagent `Faraday` (worker): if the Postgres path is chosen, implement the share/callback/phase methods in a disjoint write scope and add or update the relevant tests.

After production recovery is complete, subagent usage for backlog mining should be:

- One worker on issue `#10` implementation.
- One explorer on issue `#17` prompt-surface inventory and recommendation.
- The main agent keeps integration ownership and merge-readiness checks.

Revision note (2026-03-18 / Codex): Created this plan after confirming that the merged Clerk auth fix is live, the xAI key has been rotated, and the remaining production outage is tied to the stale Supabase project ref still configured in the real `app` Vercel project. Revised the plan the same day to add explicit root-cause review, harsh-critique loops, architecture review gates, red-team review before PRs, and a higher-agency standard for decisive implementation.
