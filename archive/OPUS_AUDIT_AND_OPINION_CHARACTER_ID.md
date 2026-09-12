# Character-ID Persistence Bug: Independent Audit & Opinion

**Auditor**: Opus 4.6
**Date**: 2026-02-19
**Dossier Under Review**: `OPUS_EVIDENCE_CHARACTER_ID_BUG.md` (compiled by Haiku 4.5)
**Repo**: `c:\Users\latro\Downloads\t\recoverymeeting-codex`

---

## 1. Executive Summary

The Haiku dossier correctly identifies the architectural mismatch between domain slug IDs and database UUIDs, and accurately documents the translation bridge code in `adapter.ts`. However, it **fundamentally mischaracterizes the nature and location of the bug**.

**What the dossier claims**: The translation bridge is unreliable; slugs are reaching the database; the test at adapter.spec.ts:265-291 shows slug-contaminated adapter responses triggering CONTRACT_VIOLATION.

**What the audit found**: The translation bridge code is **correctly implemented**. The test at adapter.spec.ts:265-291 actually **fails with an uncaught exception** (`Error: Unexpected table: characters`) because the test harness is missing a `characters` table mock — it never reaches the CONTRACT_VIOLATION check. In production, the characters table is **completely empty** (0 rows), and share persistence fails with PostgreSQL error `22P02` (invalid UUID syntax) — an infrastructure/bootstrap problem, not a translation logic bug.

**Bottom line**: This is a **test harness gap + production bootstrap failure**, not a translation bridge reliability bug. The adapter code does the right thing; the tests don't exercise it properly, and production has never successfully bootstrapped the character rows that the translation depends on.

---

## 2. Dossier Corrections

### 2.1 Git State — UNVERIFIABLE

The dossier claims branch `codex/recoverymeeting-autonomous-2026-02-15` with "1 commit ahead" and "40+ tracked deletions." Git commands fail entirely:

```
fatal: not a git repository: /mnt/c/Users/latro/Downloads/t/recoverymeeting/.git/worktrees/recoverymeeting-codex
```

The worktree parent repo is missing. All git state claims are **UNVERIFIABLE**.

### 2.2 Line Number Corrections

| Dossier Claim | Actual | Verdict |
|---|---|---|
| characters.ts:7-101 | characters.ts:5-101 (CORE_CHARACTERS starts line 5) | Minor off-by-2 |
| migration:6-24 (characters table) | Correct (lines 6-24) | Confirmed |
| migration:54 (meeting_participants FK) | Correct (line 54) | Confirmed |
| migration:62-63 (shares FK) | Lines 63 + 69 (shares.character_id at 63, target_character_id at 69) | Minor mislabel |
| migration:79 (callbacks FK) | Correct (line 79) | Confirmed |
| adapter.ts:47-48 (name maps) | Correct | Confirmed |
| adapter.ts:214-284 (loadCharacterMaps) | Correct | Confirmed |
| adapter.ts:298-316 (resolveDbCharacterId) | Correct | Confirmed |
| adapter.ts:209-212 (mapCharacterIdToDomainId) | Correct | Confirmed |
| adapter.ts:372-413 (appendShare) | Correct | Confirmed |
| adapter.ts:513-548 (createCallback) | Correct | Confirmed |
| +server.ts:237-244 (pickCharacter) | Correct | Confirmed |
| +server.ts:504 (passes slug to addShare) | Correct | Confirmed |
| callback-lifecycle.ts:97 (characterId from referencingCharacterId) | Correct | Confirmed |

### 2.3 Critical Mischaracterization: Test at adapter.spec.ts:265-291

**Dossier claims**: This test "expects CONTRACT_VIOLATION" because `character_id: 'heather'` (slug) appears in the adapter response, proving that "slugs should not appear in adapter responses."

**Reality**: The test **FAILS with an uncaught exception** before ever reaching the CONTRACT_VIOLATION check. The mock harness at line 152 throws `Error: Unexpected table: characters` when `loadCharacterMaps()` queries the `characters` table, which the harness doesn't mock.

The test data contains **two** defects: `character_id: 'heather'` (slug) AND `significance_score: 99` (out of valid 0-10 range). Neither is ever validated because the test crashes first.

**This test does NOT demonstrate slug contamination. It demonstrates an incomplete test harness.**

### 2.4 Scope of Test Failures — Understated

The dossier discusses only 1 failing test. In reality, **3 tests fail** in adapter.spec.ts, all with the identical root cause:

1. `maps network-ish upstream failure to UPSTREAM_UNAVAILABLE` — `appendShare('marcus')` calls `resolveDbCharacterId` → `loadCharacterMaps` → `from('characters')` → throws
2. `maps malformed upstream success payload to CONTRACT_VIOLATION` — `getHeavyMemory` → `getCharacterMaps` → throws
3. `updates callbacks with lifecycle fields` — `updateCallback` → `getCharacterMaps` → throws

All three fail because the test harness mock handles `users`, `meetings`, `shares`, and `callbacks` tables but NOT the `characters` table.

### 2.5 Dossier Claim: "Character IDs bypass translation somewhere" (70% confidence)

**Correction**: There is no evidence of bypass. Every write path (`appendShare`, `createCallback`) calls `resolveDbCharacterId()`. Every read path calls `mapCharacterIdToDomainId()`. The code coverage is complete. The 70% confidence is **unjustified speculation** — the actual confidence should be near 0%.

### 2.6 Dossier Claim: "No evidence of recent patch targeting character ID translation"

**Correction**: The translation layer IS the patch — it was implemented as part of the adapter from Milestone 4 onward. There is no "missing fix" because the code is correct. The issue is elsewhere.

---

## 3. Confirmed Runtime Evidence

### 3.1 Production Database State

Queried via Supabase REST API with service role key:

| Table | Row Count | Character ID State |
|---|---|---|
| characters | **0** | Empty — no character rows exist |
| shares | 1 | character_id: NULL (user share) |
| callbacks | 0 | Empty |
| meetings | 5 | From probe/smoke testing |
| users | 2 | Probe User + Prod Smoke User |

**Critical finding**: The characters table has NEVER been populated in production. The `loadCharacterMaps()` auto-bootstrap has never completed successfully.

### 3.2 Production Share Endpoint — Concrete Error

**Request**: POST to `https://the14thstep.vercel.app/meeting/{id}/share`
```json
{
  "topic": "Staying sober today",
  "characterId": "marcus",
  "sequenceOrder": 2,
  "recentShares": [],
  "userName": "Test",
  "userMood": "present"
}
```

**Response**: SSE stream with status 200
- `event: meta` — succeeds (character: marcus, avatar: M)
- `event: chunk` × 9 — text generated successfully by Grok
- `event: error` — **UPSTREAM_ERROR**

```json
{
  "ok": false,
  "error": {
    "code": "UPSTREAM_ERROR",
    "message": "appendShare failed due to upstream error",
    "details": {
      "method": "appendShare",
      "provider": "supabase",
      "code": "22P02",
      "status": 400
    }
  }
}
```

PostgreSQL error `22P02` = "invalid input syntax for type uuid". This error fires during the `appendShare` pathway, which includes `loadCharacterMaps` (called with method `'appendShare'`).

### 3.3 Local Reproduction — loadCharacterMaps Succeeds

Using the same Supabase JS client (`@supabase/supabase-js`) with .env.local credentials:
1. `from('characters').select('id, name').in('name', coreNames)` → 200, 0 rows
2. `from('characters').insert([...]).select('id, name')` → 201, returns valid UUIDs
3. Map construction succeeds: `'marcus' → UUID`, `'heather' → UUID`
4. Cleanup: DELETE succeeds

**This proves**: The adapter code is correct. The Supabase schema accepts character inserts. The local credentials work.

### 3.4 Direct Character Insert via REST API — Succeeds

A manual POST to `/rest/v1/characters` with service role key returns 201 with a valid UUID primary key. The table is writable.

### 3.5 Auth Flow — Works

`trap@trap.com` / `trap` authenticates successfully. Returns user ID matching `PROBE_USER_ID` (fab8bc65...). The user has a matching `public.users` profile row.

### 3.6 Production Home Page — Works

`GET https://the14thstep.vercel.app/` returns 200 with the SvelteKit app loaded (Step 1 of 4 setup flow).

---

## 4. Schema and Seam Evidence

### 4.1 Migration Constraints — Confirmed

File: `app/supabase/migrations/20260215_000001_init_schema.sql`

| Column | Type | Constraint | Line |
|---|---|---|---|
| characters.id | uuid | PK, default gen_random_uuid() | 7 |
| meeting_participants.character_id | uuid | FK → characters(id), NOT NULL | 54 |
| shares.character_id | uuid | FK → characters(id), nullable | 63 |
| shares.target_character_id | uuid | FK → characters(id), nullable | 69 |
| callbacks.character_id | uuid | FK → characters(id), NOT NULL | 79 |

**Implication**: Writing a slug string (`'marcus'`) to any `character_id` column would trigger PostgreSQL error `22P02` (type mismatch) BEFORE any FK check. The database schema is a hard wall against slug contamination.

### 4.2 Seam Contract — Confirmed

File: `app/src/lib/seams/database/contract.ts`

- `ShareRecord.characterId: string | null` (line 25) — generic string, no UUID constraint at type level
- `CallbackRecord.characterId: string` (line 47) — generic string
- `validateShareRecord` (lines 189-208) — checks `isNonEmptyString` on characterId, does NOT check UUID format
- `validateCallbackRecord` (lines 231-253) — checks `isNonEmptyString` on characterId, does NOT check UUID format

**Key observation**: The contract validators do NOT enforce UUID format. A slug would pass contract validation. The database schema is the actual enforcement point.

### 4.3 Adapter Translation Bridge — Confirmed Correct

All write paths call `resolveDbCharacterId()` before INSERT:
- `appendShare` (adapter.ts:377-382)
- `createCallback` (adapter.ts:518-519)
- `getActiveCallbacks` (adapter.ts:555-556, for query filter)

All read paths call `mapCharacterIdToDomainId()` after SELECT:
- `appendShare` (adapter.ts:403-406)
- `getHeavyMemory` (adapter.ts:434-438)
- `getShareById` (adapter.ts:468-472)
- `getMeetingShares` (adapter.ts:500-504)
- `createCallback` (adapter.ts:540-542)
- `getActiveCallbacks` (adapter.ts:574-578)
- `markCallbackReferenced` (adapter.ts:627-629)
- `updateCallback` (adapter.ts:695-697)

**The fallback in `mapCharacterIdToDomainId`** (line 211: `maps.domainIdByDbId.get(characterId) ?? characterId`) is a defensive passthrough. If a UUID isn't in the map (e.g., a non-core character), it returns the UUID unchanged. This is correct behavior, not a bug.

### 4.4 Fixture Samples — Confirmed

All domain-facing fixtures correctly use slug IDs:
- `appendShare.sample.json`: `characterId: "marcus"` ✓
- `getHeavyMemory.sample.json`: `characterId: "heather"` ✓
- `createCallback.sample.json`: `characterId: "marcus"` ✓
- `getActiveCallbacks.sample.json`: `characterId: "marcus"`, `"heather"` ✓

These represent the DOMAIN output after UUID→slug translation. They are correct.

---

## 5. Test Evidence

### 5.1 adapter.spec.ts

| Test | Result | Root Cause |
|---|---|---|
| returns createMeeting success | PASS | No character ID involvement |
| maps invalid input to INPUT_INVALID | PASS | No character ID involvement |
| maps missing user to NOT_FOUND | PASS | No character ID involvement |
| maps network-ish upstream failure to UPSTREAM_UNAVAILABLE | **FAIL** | `Error: Unexpected table: characters` |
| maps malformed upstream success payload to CONTRACT_VIOLATION | **FAIL** | `Error: Unexpected table: characters` |
| maps non-network upstream failures to UPSTREAM_ERROR | PASS | No character ID involvement |
| completes meeting by writing summary and endedAt | PASS | No character ID involvement |
| updates callbacks with lifecycle fields | **FAIL** | `Error: Unexpected table: characters` |
| returns meeting counts after a date | PASS | No character ID involvement |

**Summary**: 6 passed, 3 failed. All failures share the same cause: the mock harness at line 72-154 does not handle `supabase.from('characters')`.

### 5.2 meeting-share.spec.ts

| Test | Result |
|---|---|
| returns 409 when crisisMode is enabled | PASS |
| returns 409 when persisted meeting state is in crisis | PASS |

**Summary**: 2 passed, 0 failed.

### 5.3 meeting-crisis.spec.ts

| Test | Result |
|---|---|
| enforces pause and returns Marcus then Heather responses | PASS |

Note: This test mocks `appendShare` directly, returning slug character IDs in the mock response (`characterId: 'marcus'`, `characterId: 'heather'`). This is correct because the mock represents the DOMAIN-facing adapter output (after UUID→slug translation).

**Summary**: 1 passed, 0 failed.

### 5.4 Full Suite

**27 test files, 108 tests total: 105 passed, 3 failed.**

All 3 failures are in adapter.spec.ts with the identical root cause.

---

## 6. Claim Confidence Matrix

| # | Dossier Claim | Verdict | Confidence |
|---|---|---|---|
| 1 | Domain uses slug IDs ('marcus', 'heather', etc.) | **Confirmed** | 100% |
| 2 | Database schema expects UUIDs for character_id columns | **Confirmed** | 100% |
| 3 | Translation bridge exists in adapter.ts | **Confirmed** | 100% |
| 4 | Write paths use resolveDbCharacterId() | **Confirmed** | 100% |
| 5 | Read paths use mapCharacterIdToDomainId() | **Confirmed** | 100% |
| 6 | Test at adapter.spec.ts:265-291 shows slug data → CONTRACT_VIOLATION | **WRONG** | 0% — test throws before reaching validation |
| 7 | Translation "is not working reliably" | **WRONG** | 0% — code is correct; issue is infrastructure |
| 8 | "Character IDs bypass translation somewhere" (70% confidence) | **WRONG** | 0% — no bypass exists in any code path |
| 9 | No integration test of full slug→UUID→slug cycle | **Confirmed** | 100% — and the test harness gap proves this |
| 10 | Fixture shapes show correct domain-facing slugs | **Confirmed** | 100% |
| 11 | Production shares/callbacks fail | **Confirmed** | 100% — but for different reason than dossier claims |
| 12 | Character maps cached correctly (80% confidence) | **Confirmed** | 95% — code is correct; cache reset on failure works |
| 13 | No recent patch targeting character ID translation | **Misleading** | N/A — the translation IS the implementation, not a patch |
| 14 | node_modules not installed | **WRONG** | 0% — node_modules present (wrong platform) |

---

## 7. Options Considered

### Option A: Fix the Test Harness Mock (Dossier's Implied Path)

Add a `characters` table handler to the adapter.spec.ts mock harness so `loadCharacterMaps()` can complete. This unblocks the 3 failing tests and enables writing a proper happy-path UUID→slug translation test.

**Pros**: Directly addresses the test gap; low risk; fast.
**Cons**: Doesn't fix the production bootstrap failure.

### Option B: Fix Production Bootstrap + Test Harness

Fix both the test harness (Option A) AND diagnose/fix why `loadCharacterMaps()` fails on the Vercel production function. The production failure is likely one of:
- Vercel env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) differ from local
- RLS policies on the `characters` table block inserts from the service role
- The Supabase JS client in the Vercel runtime behaves differently

**Pros**: Fixes both the test gap AND the production bug.
**Cons**: Requires Vercel env investigation; production debugging.

### Option C: Pre-Seed Characters + Fix Tests (Belt and Suspenders)

Instead of relying on `loadCharacterMaps()` to auto-insert characters on first use, pre-seed the 6 core characters in the Supabase migration (or as a production bootstrap step). Then fix the test harness to mock the characters table.

**Pros**: Eliminates the bootstrap race condition entirely; more deterministic.
**Cons**: Requires a migration or manual data insert; changes the auto-bootstrap design.

### Option D: Full Contract Hardening

All of the above, PLUS:
- Add UUID format validation to `validateShareRecord` and `validateCallbackRecord` in the contract
- Add a dedicated integration test: slug input → adapter → UUID write → UUID read → slug output
- Add a production smoke test that verifies character persistence after a share

**Pros**: Most thorough; prevents regression.
**Cons**: Largest scope; highest implementation cost.

---

## 8. Recommended Path

**Option B + elements of D** (Fix Production Bootstrap + Test Harness + Key Integration Test)

### Rationale

1. The test harness fix (Option A) is necessary but insufficient — it masks the real production failure.
2. The production bootstrap failure is the actual blocker for Milestone 10 completion. Share persistence doesn't work.
3. Pre-seeding characters (Option C) is a good defensive measure but doesn't explain WHY the auto-bootstrap fails in production.
4. A single integration test proving the slug→UUID→slug round-trip closes the most critical coverage gap.

### Implementation Order

1. **Diagnose production `loadCharacterMaps` failure** (~30 min)
   - Compare Vercel env fingerprints for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` against local
   - Check Supabase dashboard for RLS policies on `characters` table
   - Add temporary logging to `loadCharacterMaps` and redeploy to capture the actual error

2. **Fix test harness** (~15 min)
   - Add `characters` table handler to `createHarness()` in adapter.spec.ts
   - Mock `from('characters').select().in()` to return core character rows with UUID IDs
   - Fix mock data: change `significance_score: 99` to valid range (e.g., `8`)
   - Verify the existing test at line 265 now properly tests CONTRACT_VIOLATION (with a slug character_id that passes through `mapCharacterIdToDomainId` unchanged)

3. **Add happy-path integration test** (~15 min)
   - Test: `appendShare({characterId: 'marcus'})` → mock returns `character_id: <UUID>` → adapter returns `characterId: 'marcus'`
   - Test: `getHeavyMemory()` → mock returns `character_id: <UUID>` → adapter returns `characterId: 'heather'`

4. **Fix production bootstrap** (~15-30 min, depending on diagnosis)
   - Either fix the env/RLS issue OR pre-seed characters via migration/bootstrap script
   - Redeploy and verify share persistence end-to-end

5. **Verify** (~10 min)
   - Run full test suite: all 108 tests should pass
   - Run production smoke: POST share → verify `persisted` event (not `error`)
   - Verify characters table has 6 rows

---

## 9. Rollout + Rollback

### Rollout Plan

1. Fix test harness + add integration test (local only, no deploy)
2. Run `npm run test:unit -- --run` — all 108+ tests must pass
3. Diagnose and fix production bootstrap
4. Deploy to Vercel preview
5. Run share endpoint smoke against preview deployment
6. Verify characters table populated (6 rows with UUID IDs)
7. Verify shares table has new character share with UUID character_id
8. Promote to production
9. Run production smoke: full setup → share → verify persistence → close

### Rollback Plan

- **Test changes**: Revert commits (pure additive, no regression risk)
- **Env changes**: Revert Vercel env vars to previous values
- **Data changes**: If characters were pre-seeded, they're additive (no destructive DDL). If auto-bootstrap was fixed, the characters table is populated on demand — reverting code just means the next cold start auto-inserts again.
- **Nuclear option**: The only destructive data scenario is if character UUIDs change between deployments (breaking FK references in shares/callbacks). Current production has 0 characters, 0 callbacks, and 1 user share with null character_id — there is nothing to break.

---

## 10. Acceptance Gates

| Gate | Criterion | Evidence Required |
|---|---|---|
| G1 | adapter.spec.ts: 0 failures | Test output showing 9/9 pass |
| G2 | Full suite: 0 failures | `npm run test:unit -- --run` with 108+ pass, 0 fail |
| G3 | Happy-path slug→UUID→slug test exists and passes | New test in adapter.spec.ts |
| G4 | Characters table populated in production | Query: `SELECT count(*) FROM characters` = 6 |
| G5 | Production share persistence works | POST share → `event: persisted` (not `event: error`) |
| G6 | Production shares.character_id contains valid UUIDs | Query: all non-null character_id values pass UUID regex |
| G7 | `npm run check` passes | Zero svelte-check diagnostics |

---

## 11. Open Questions

1. **Why does `loadCharacterMaps` fail on Vercel but succeed locally?** The most likely cause is an env var mismatch or RLS policy, but this is unconfirmed. Checking Vercel env fingerprints would resolve this in minutes.

2. **Is there an RLS policy on the `characters` table?** The migration does not include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `CREATE POLICY`, but Supabase may enable RLS by default on new projects or tables. This should be checked in the Supabase dashboard.

3. **Should the contract validators enforce UUID format?** Currently `validateShareRecord` and `validateCallbackRecord` only check `isNonEmptyString` on characterId. Adding UUID validation at the contract level would catch translation failures earlier. This is a design decision.

4. **Should the `mapCharacterIdToDomainId` fallback be changed?** The current `maps.domainIdByDbId.get(characterId) ?? characterId` silently passes through unrecognized UUIDs. This is correct for non-core characters but could mask bugs. Should it log a warning?

5. **Was the Milestone 10 smoke test incomplete?** The milestone status claims "SSE share stream" passed, but the smoke only checked for `meta` + `chunk` events, not `persisted` or `error`. The text was generated but never persisted. Should the smoke test be expanded?

---

## 12. Command Log (Sanitized)

```bash
# Git state check (FAILED — worktree parent missing)
git branch -v
# → fatal: not a git repository: .../recoverymeeting/.git/worktrees/recoverymeeting-codex

git status --short
# → same fatal error

# npm install (platform fix — node_modules were from Linux)
cd app && npm install
# → added 3 packages, removed 3 packages, audited 234

# Targeted test: adapter.spec.ts
npx vitest run src/lib/server/seams/database/adapter.spec.ts
# → 6 passed, 3 FAILED (all "Unexpected table: characters")

# Targeted test: meeting-share.spec.ts
npx vitest run src/lib/server/routes/meeting-share.spec.ts
# → 2 passed, 0 failed

# Targeted test: meeting-crisis.spec.ts
npx vitest run src/lib/server/routes/meeting-crisis.spec.ts
# → 1 passed, 0 failed

# Full suite
npx vitest run --reporter verbose
# → 27 files, 108 tests: 105 passed, 3 failed

# Env var inventory (names only, no values)
# Present: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          NEXT_PUBLIC_SUPABASE_URL, PROBE_USER_ID, XAI_API_KEY,
#          VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID, POSTGRES_*

# Production database queries (via Supabase REST API + service role key)
# characters: 0 rows
# shares: 1 row (user share, character_id NULL)
# callbacks: 0 rows
# meetings: 5 rows
# users: 2 rows (Probe User, Prod Smoke User)

# Auth test
# POST /auth/v1/token (trap@trap.com / trap) → 200, user_id = PROBE_USER_ID

# Production share endpoint test
# POST https://the14thstep.vercel.app/meeting/{id}/share
# → 200, text/event-stream
# → event: meta (ok, character: marcus)
# → event: chunk × 9 (text generated)
# → event: error (UPSTREAM_ERROR, code: 22P02, status: 400)

# Local loadCharacterMaps reproduction (Supabase JS client)
# Query characters → 0 rows
# Insert 2 test characters → 201, valid UUIDs returned
# Cleanup → DELETE 204

# Direct REST API character insert
# POST /rest/v1/characters → 201, UUID id generated
# Cleanup → DELETE 204

# Production home page
# GET https://the14thstep.vercel.app/ → 200, SvelteKit app loads

# Credential fingerprints (SHA-256 prefix, no values)
# SUPABASE_URL (local): 325ee6... len=40
# SUPABASE_SERVICE_ROLE_KEY (local): d2c13c... len=219

# Vercel project check
# Project: the14thstep, latest deployment: READY, domains: the14thstep.vercel.app
```

---

**END OF AUDIT**
