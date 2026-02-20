# Post-M10 Quality Audit (2026-02-20)

This audit lists the highest-risk implementation weak points after Milestone 10 closeout.

## Top 6 risk items (most likely poor/incorrect)

1. `share/+server.ts` trusted client-provided `recentShares` (prompt poisoning risk).  
   Status: Fixed.
2. `close/+server.ts` trusted client-provided `lastShares` for summaries/memory notes.  
   Status: Fixed.
3. `adapter.ts:getActiveCallbacks` ignored `meetingId`, allowing cross-meeting callback leakage.  
   Status: Fixed.
4. `adapter.ts` character-id map cache did not refresh after late seeding/repair.  
   Status: Fixed (one refresh retry before failure).
5. `+page.svelte` SSE error path treated crisis 409 as generic failure instead of crisis transition.  
   Status: Fixed.
6. `playwright.config.ts` `webServer` timeout was too short for this workspace, causing false e2e failures.  
   Status: Fixed (`180000ms`).

## Additional 6 risk items (next most likely)

1. `crisis-engine.ts` keyword list is narrow and substring-only; misses broader crisis language.
2. Crisis persistence currently behaves as one-way latch per meeting (no explicit clear/resume state).
3. Potential race window between crisis-triggering user-share persistence and concurrent character-share requests.
4. Callback reference counter updates are non-atomic under concurrent share generation.
5. Callback inclusion heuristic uses elapsed days (`estimateMeetingsSinceLastReferenced`) instead of true meeting counts.
6. Playwright e2e currently stubs core meeting endpoints, so backend integration is not fully exercised by browser tests.

## Immediate follow-up recommendation order

1. Address crisis detection/state model gaps (safety first).
2. Make callback reference updates atomic and align callback recency heuristic to actual meeting counts.
3. Add at least one non-stubbed backend-integrated browser flow (or equivalent server integration lane).
