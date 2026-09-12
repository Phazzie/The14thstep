# Catch-Up Note - 2026-03-19

This is the fastest way to get back into the project without rereading the whole thread.

## Current Truth

- The app code is not currently the main blocker.
- The live production site is still pointed at a dead Supabase tenant.
- The current dead project ref is `tmcpfhftdrexsjrcrxbo`.
- Both Vercel projects, `app` and `the14thstep`, were configured with that same stale backend.
- That means the Vercel project/domain switch did not cut off a healthy database. It carried forward an already-dead database config.

## What We Proved

- `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` both point to `https://tmcpfhftdrexsjrcrxbo.supabase.co`.
- That host does not resolve.
- All three production Postgres URLs tied to that same tenant fail with `Tenant or user not found`.
- The remaining production failure is therefore an infrastructure/backend problem, not a prompt problem and not an auth/UI problem.
- Clerk cookie handling was still worth fixing, and that fix was real, but it was not the final production blocker.

## What Already Landed

- PR `#68` merged: Clerk member session cookie handling fix.
- PR `#69` merged: Clerk cookie selection hardening follow-up.
- Room-led meeting flow work is already on `main`.

## What Is Open

- PR `#70` is open as a draft:
  - `fix(core): harden narrative context fallback handling`
- Issue `#71` is open:
  - restore production database backend after dead Supabase tenant outage

## Why Production Is Still Broken

The site can load, but meeting start still fails because the server cannot talk to a real backend. The current Supabase tenant appears gone, and the corresponding Postgres credentials also appear dead. There is no honest app-side shortcut that restores production without reconnecting the app to a real database target.

## No-Shortcuts Fix

Because old production data does not matter, the proper fix is:

1. Create a fresh Supabase project.
2. Apply the existing schema/migrations from [app/supabase/migrations](/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/app/supabase/migrations).
3. Update the live Vercel `app` project env vars to the new Supabase project.
4. Redeploy.
5. Verify guest meeting start, member meeting start, and actual room behavior on the real site.

## Why We Did Not Keep Patching

We explicitly rejected the following because they would add debt:

- route-level workarounds
- in-memory production fallback
- partial database bypasses
- speculative adapter rewrites against dead production credentials
- pretending the problem was auth-only after the backend evidence was clear

## Exact Things To Reuse

- Live recovery plan:
  - [plans/production-recovery-and-backlog-execplan.md](/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/plans/production-recovery-and-backlog-execplan.md)
- Lessons log:
  - [LESSONS_LEARNED.md](/mnt/c/users/latro/downloads/t/recoverymeeting-autonomous-run/LESSONS_LEARNED.md)
- Draft hardening PR:
  - `#70`
- Production blocker issue:
  - `#71`

## Important Repo/Branch State

- Current branch when this note was written:
  - `codex/production-db-recovery-2026-03-18`
- That branch contains the blocker documentation, not the production fix.
- The production fix itself has not happened yet because the real next step is a new database target.

## Best Resume Point

If resuming cold, start with this question:

`Do we now have a fresh Supabase project to wire into Vercel?`

- If yes: do the no-shortcuts reconnect path.
- If no: do not thrash on app code. Keep working only on independent backlog slices like PR `#70`.
