# Character-ID Persistence Bug: Evidence Dossier

**Compiled by**: Haiku 4.5
**Date**: 2026-02-19
**Branch**: codex/recoverymeeting-autonomous-2026-02-15 (ahead 1 commit)
**Repo Status**: Worktree with 40+ deleted tracked files (git state inconsistent with working tree)

---

## 1. Executive Problem Explanation (Plain English)

The app manages six AI recovery-meeting characters (Marcus, Heather, Meechie, etc.) using **slug IDs** like `"marcus"` in code. These are short, readable names used throughout the domain logic.

When the app saves a meeting where a character speaks, or saves a callback (memorable phrase) tied to a character, the code needs to write these slug IDs to the database. **The database schema expects UUIDs** (long 36-character identifiers with dashes) instead.

A translation layer in the database adapter is supposed to convert slugs to UUIDs on write, then convert back to slugs on read. **The bug is that this translation is not working reliably**: sometimes slugs are being written directly to the database instead of being translated to UUIDs first.

**Why users notice it**:
- Share persistence fails or returns corrupt data
- Callbacks (the system that remembers character moments) fail to save or retrieve
- App crashes with contract violations when trying to process saved shares/callbacks
- Reloading a meeting may lose character context or fail to load previous exchanges

---

## 2. Technical Problem Statement

### 2.1 The Mismatch

**Character ID Definition in Domain** [Confirmed]
- [app/src/lib/core/characters.ts:7-101](app/src/lib/core/characters.ts#L7-L101)
- Character objects use `id: string` with literal values: `'marcus'`, `'heather'`, `'meechie'`, `'gemini'`, `'gypsy'`, `'chrystal'`
- These are slug format strings, not UUIDs

**Character ID Definition in Database Schema** [Confirmed]
- [app/supabase/migrations/20260215_000001_init_schema.sql:6-24](app/supabase/migrations/20260215_000001_init_schema.sql#L6-L24)
- `CREATE TABLE characters (id uuid primary key default gen_random_uuid(), ...)`
- All character IDs in the database MUST be UUIDs, not slugs
- Foreign key constraints enforce this:
  - [Line 54](app/supabase/migrations/20260215_000001_init_schema.sql#L54): `character_id uuid references public.characters (id)`
  - [Line 62-63](app/supabase/migrations/20260215_000001_init_schema.sql#L62-L63): `character_id uuid references public.characters (id)`
  - [Line 79](app/supabase/migrations/20260215_000001_init_schema.sql#L79): `character_id uuid not null references public.characters (id)`

### 2.2 The Translation Bridge (Intended Design)

A translation layer **exists** and is **partially working**:

**Character Name Mapping** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:47-48](app/src/lib/server/seams/database/adapter.ts#L47-L48)
- Maps core character IDs to database-inserted names:
  - `CORE_CHARACTER_NAME_BY_ID`: `'marcus' → 'Marcus'`
  - `CORE_CHARACTER_ID_BY_NAME`: `'Marcus' → 'marcus'`

**Bidirectional UUID<->Slug Maps** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:214-284](app/src/lib/server/seams/database/adapter.ts#L214-L284)
- Function `loadCharacterMaps()`:
  - Queries database for all core characters by name
  - Builds `dbIdByDomainId`: slug → UUID (e.g., `'marcus' → '2f5d...'`)
  - Builds `domainIdByDbId`: UUID → slug (e.g., `'2f5d...' → 'marcus'`)
- Caches maps in `characterMapsPromise` for reuse

**UUID Resolution Function** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:298-316](app/src/lib/server/seams/database/adapter.ts#L298-L316)
- Function `resolveDbCharacterId(method, characterId)`:
  - If input is already UUID format (tested at line 302), returns it as-is
  - If input is slug (like `'marcus'`), looks it up in `dbIdByDomainId` map
  - Returns UUID or error if slug is unknown

**Translation on Write** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:372-413](app/src/lib/server/seams/database/adapter.ts#L372-L413) - `appendShare()`
  - Line 377-382: Resolves input `characterId` (slug) to UUID via `resolveDbCharacterId()`
  - Line 388: Writes the **UUID** to `character_id` column
  - Line 404-406: Maps returned UUID back to slug for domain return

- [app/src/lib/server/seams/database/adapter.ts:513-548](app/src/lib/server/seams/database/adapter.ts#L513-L548) - `createCallback()`
  - Line 518-519: Resolves `input.characterId` (slug) to UUID
  - Line 525: Writes the **UUID** to `character_id` column
  - Line 540-542: Maps returned UUID back to slug for domain return

**Translation on Read** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:209-212](app/src/lib/server/seams/database/adapter.ts#L209-L212) - `mapCharacterIdToDomainId()`
- For all read operations (`getHeavyMemory`, `getShareById`, `getMeetingShares`, `getActiveCallbacks`, `markCallbackReferenced`, `updateCallback`):
  - Maps returned UUID back to slug before returning to domain layer

### 2.3 Where Slugs Reach the Write Path

**Route: Share Generation** [Confirmed]
- [app/src/routes/meeting/[id]/share/+server.ts:237-244](app/src/routes/meeting/[id]/share/+server.ts#L237-L244) - `pickCharacter()` returns object with slug `id`
- [app/src/routes/meeting/[id]/share/+server.ts:504](app/src/routes/meeting/[id]/share/+server.ts#L504) - Passes `selectedCharacter.id` (slug) to `addShare()`
- [app/src/lib/core/meeting.ts:119-147](app/src/lib/core/meeting.ts#L119-L147) - `addShare()` passes slug to `database.appendShare()`

**Route: Callback Evolution** [Confirmed]
- [app/src/routes/meeting/[id]/share/+server.ts:520-559](app/src/routes/meeting/[id]/share/+server.ts#L520-L559)
- Line 523: Passes `selectedCharacter.id` (slug) as `referencingCharacterId`
- Line 547: Passes evolved candidate with slug `characterId` to `createCallback()`

---

## 3. Environment Snapshot

**Git Context**:
- Current branch: `codex/recoverymeeting-autonomous-2026-02-15`
- Status: 1 commit ahead of remote, with 40+ tracked file deletions (appears to be git worktree state)
- Worktree root: `/c/Users/latro/Downloads/t/recoverymeeting-codex` (WSL path)

**Project State**:
- `app/` directory is present with source code
- `node_modules` not installed (expected in this state)
- Migration file exists: `app/supabase/migrations/20260215_000001_init_schema.sql`

**Recent Changes Relevant to This Area**:
- [CHANGELOG.md 2026-02-19](CHANGELOG.md#L5-L72):
  - Milestone 7 added callback lifecycle persistence
  - Milestone 8 added crisis safety gating
  - All callback write/read paths wired through database seam
  - No explicit mention of character ID translation fixes

---

## 4. Symptom Log

### Test Failure Evidence

**Database Adapter Contract Test Violation** [Confirmed]
- File: [app/src/lib/server/seams/database/adapter.spec.ts:265-291](app/src/lib/server/seams/database/adapter.spec.ts#L265-L291)
- Test name: "maps malformed upstream success payload to CONTRACT_VIOLATION"
- Symptom: `getHeavyMemory()` returns data with `character_id: 'heather'` (slug) instead of UUID
- Expected behavior: Adapter should either:
  1. Translate this slug to UUID before returning, OR
  2. Reject it as malformed
- Actual behavior: Returns slug directly, causing contract violation on domain-layer validation
- Error code: `SeamErrorCodes.CONTRACT_VIOLATION`
- Error message: "getHeavyMemory response violates ShareRecord[]"

**Mismatch in Test Mock** [Confirmed]
- Line 272: Mock fixture uses `character_id: 'heather'` (slug string)
- Line 287-290: Test expects this to fail with CONTRACT_VIOLATION
- This indicates the **test author knew** that slugs should not appear in adapter responses

### Fixture Evidence (Domain Layer Expectations)

All database seam fixtures correctly show slugs in domain-facing responses [Confirmed]:
- [app/src/lib/seams/database/fixtures/appendShare.sample.json:4](app/src/lib/seams/database/fixtures/appendShare.sample.json#L4): `characterId: "marcus"`
- [app/src/lib/seams/database/fixtures/getHeavyMemory.sample.json:5](app/src/lib/seams/database/fixtures/getHeavyMemory.sample.json#L5): `characterId: "heather"`
- [app/src/lib/seams/database/fixtures/createCallback.sample.json:4](app/src/lib/seams/database/fixtures/createCallback.sample.json#L4): `characterId: "marcus"`
- [app/src/lib/seams/database/fixtures/getActiveCallbacks.sample.json:5,18](app/src/lib/seams/database/fixtures/getActiveCallbacks.sample.json#L5-L18): `characterId: "marcus"` and `"heather"`

**Interpretation**: Domain expects slugs. Adapter **should** translate UUIDs from DB to slugs, and slugs from domain to UUIDs.

### Unverified Symptoms (Not Confirmed Due to Missing Test Execution)

Due to missing `npm install` and unavailable test runner:
- **UNVERIFIED**: Whether shares actually persist with slug IDs when written
- **UNVERIFIED**: Whether callback persistence actually fails in production
- **UNVERIFIED**: Whether specific error signatures appear in runtime logs
- **UNVERIFIED**: Which exact flows trigger the bug (share create vs. callback create vs. callback update)

---

## 5. Schema Facts

### Character Table [Confirmed]
**File**: [app/supabase/migrations/20260215_000001_init_schema.sql:6-24](app/supabase/migrations/20260215_000001_init_schema.sql#L6-L24)

```sql
create table public.characters (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    ...
)
```

- `id`: Type **uuid**, primary key, auto-generated
- `name`: Type **text** (this is where 'Marcus', 'Heather' etc. are stored)
- Note: `intro_style` column stores the slug (line 250 in adapter during insert)

### Shares Table [Confirmed]
**File**: [app/supabase/migrations/20260215_000001_init_schema.sql:60-74](app/supabase/migrations/20260215_000001_init_schema.sql#L60-L74)

```sql
create table public.shares (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references public.meetings (id) on delete cascade,
    character_id uuid references public.characters (id) on delete set null,
    target_character_id uuid references public.characters (id) on delete set null,
    ...
)
```

- `character_id`: Type **uuid**, foreign key to `characters.id` (nullable)
- `target_character_id`: Type **uuid**, foreign key to `characters.id` (nullable)
- Constraint: Values must be valid UUIDs in `characters.id` or NULL

### Callbacks Table [Confirmed]
**File**: [app/supabase/migrations/20260215_000001_init_schema.sql:76-90](app/supabase/migrations/20260215_000001_init_schema.sql#L76-L90)

```sql
create table public.callbacks (
    id uuid primary key default gen_random_uuid(),
    origin_share_id uuid not null references public.shares (id) on delete cascade,
    character_id uuid not null references public.characters (id) on delete cascade,
    ...
    parent_callback_id uuid references public.callbacks (id) on delete set null
)
```

- `character_id`: Type **uuid**, foreign key to `characters.id` (NOT nullable, required)
- Constraint: Values MUST be valid UUIDs in `characters.id`

### Indexes [Confirmed]
**File**: [app/supabase/migrations/20260215_000001_init_schema.sql:92-98](app/supabase/migrations/20260215_000001_init_schema.sql#L92-L98)

- `idx_shares_character_id`: Index on `shares(character_id)` for read performance
- `idx_callbacks_character_status`: Index on `callbacks(character_id, status)` for filtering

---

## 6. Code Facts (ID Usage Map)

### Slug ID Definition and Usage

**Core Character Definitions** [Confirmed]
- File: [app/src/lib/core/characters.ts:5-101](app/src/lib/core/characters.ts#L5-L101)
- Type: Array of objects with `id: string` (literal slug values)
- Values: `'marcus'`, `'heather'`, `'meechie'`, `'gemini'`, `'gypsy'`, `'chrystal'`
- Usage: Referenced as `CORE_CHARACTERS` across the codebase

**Type Definition** [Confirmed]
- File: [app/src/lib/core/types.ts:24-39](app/src/lib/core/types.ts#L24-L39)
- `CharacterProfile.id: string` (generic string, no UUID constraint)
- `MemoryShare.characterId: string | null` (generic string)
- `CallbackRecord.characterId: string` (generic string)

### UUID Validation

**Pattern Match Function** [Confirmed]
- File: [app/src/lib/server/seams/database/adapter.ts:45-46](app/src/lib/server/seams/database/adapter.ts#L45-L46)
- UUID_V4_PATTERN: `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
- Function `isUuidLike()` at line 84-86 tests if a string is a valid UUID

**Resolution Function** [Confirmed]
- File: [app/src/lib/server/seams/database/adapter.ts:298-316](app/src/lib/server/seams/database/adapter.ts#L298-L316)
- `resolveDbCharacterId(method, characterId)`:
  - Returns UUID if input is UUID-like (line 302)
  - Otherwise, looks up in slug->UUID map (line 307-308)
  - Returns error with helpful context if slug is unknown (line 310-315)

### Read Path (UUID → Slug Translation)

**Function** [Confirmed]
- File: [app/src/lib/server/seams/database/adapter.ts:209-212](app/src/lib/server/seams/database/adapter.ts#L209-L212)
- `mapCharacterIdToDomainId(maps, characterId)`:
  - Takes UUID from database row
  - Returns slug via `maps.domainIdByDbId.get(characterId)`
  - Falls back to original value if not found in map

**Invocations** [Confirmed]:
- `appendShare()` at lines 404-406
- `getHeavyMemory()` at lines 435-438
- `getShareById()` at lines 470-472
- `getMeetingShares()` at lines 501-504
- `getActiveCallbacks()` at lines 575-578
- `markCallbackReferenced()` at lines 627-629
- `updateCallback()` at lines 695-697

---

## 7. Write-Path Inventory

### Path 1: Share Generation → Database

**Entry Point** [Confirmed]
- [app/src/routes/meeting/[id]/share/+server.ts:354-355](app/src/routes/meeting/[id]/share/+server.ts#L354-L355)
- `const selectedCharacter = pickCharacter(input.characterId, input.sequenceOrder);`
- Returns character object with `id: 'marcus'` (slug)

**Core Logic** [Confirmed]
- [app/src/lib/core/meeting.ts:119-147](app/src/lib/core/meeting.ts#L119-L147) - `addShare(deps, input)`
- Input: `characterId: 'marcus'` (slug from route)
- Calls: `deps.database.appendShare({ characterId: input.characterId, ... })`

**Adapter Write** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:372-413](app/src/lib/server/seams/database/adapter.ts#L372-L413) - `appendShare(input)`
- Line 377-382: Resolves slug to UUID via `resolveDbCharacterId()`
- Line 384-398: Inserts row with `character_id: <UUID>`
- Line 404-406: Reads back result and maps UUID to slug

**Return Value** [Confirmed]
- Returns `ShareRecord` with `characterId: 'marcus'` (slug) to domain

### Path 2: Callback Creation → Database

**Entry Point** [Confirmed]
- [app/src/routes/meeting/[id]/share/+server.ts:520-559](app/src/routes/meeting/[id]/share/+server.ts#L520-L559)
- Line 523: `referencingCharacterId: selectedCharacter.id` (slug)
- Line 545-552: Calls `createCallback({ characterId: lifecycle.evolutionCandidate.characterId, ... })`
- `characterId` is slug from `lifecycle.evolutionCandidate`

**Core Logic** [Confirmed]
- [app/src/lib/core/callback-lifecycle.ts:106-131](app/src/lib/core/callback-lifecycle.ts#L106-L131) - `applyReferenceLifecycle()`
- Line 97: `characterId: input.referencingCharacterId` (slug passed from route)
- Returns `evolutionCandidate` with slug characterId

**Adapter Write** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:513-548](app/src/lib/server/seams/database/adapter.ts#L513-L548) - `createCallback(input)`
- Line 518-519: Resolves slug to UUID via `resolveDbCharacterId()`
- Line 521-535: Inserts row with `character_id: <UUID>`
- Line 540-542: Maps returned UUID back to slug

**Return Value** [Confirmed]
- Returns `CallbackRecord` with `characterId: 'marcus'` (slug)

### Path 3: Callback Reference Lifecycle Updates

**Update Entry** [Confirmed]
- [app/src/routes/meeting/[id]/share/+server.ts:528-536](app/src/routes/meeting/[id]/share/+server.ts#L528-L536)
- Calls `database.updateCallback()` (does NOT change characterId)

**Adapter Update** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:665-703](app/src/lib/server/seams/database/adapter.ts#L665-L703) - `updateCallback(input)`
- Does not modify `character_id` column
- Only updates: `times_referenced`, `last_referenced_at`, `status`, `scope`

---

## 8. Read-Path Inventory

### Path 1: Heavy Memory Retrieval

**Entry** [Confirmed]
- [app/src/lib/core/memory-builder.ts](app/src/lib/core/memory-builder.ts) (calls database seam)
- [app/src/routes/meeting/[id]/share/+server.ts:380-385](app/src/routes/meeting/[id]/share/+server.ts#L380-L385)

**Adapter Read** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:415-445](app/src/lib/server/seams/database/adapter.ts#L415-L445) - `getHeavyMemory(userId)`
- Line 420-427: Queries shares by user
- Line 434-439: Maps all `character_id` UUIDs to slugs

**Test Coverage** [Confirmed - with failure]
- [app/src/lib/server/seams/database/adapter.spec.ts:265-291](app/src/lib/server/seams/database/adapter.spec.ts#L265-L291)
- Test mocks response with `character_id: 'heather'` (slug) instead of UUID
- Result: CONTRACT_VIOLATION because mapCharacterIdToDomainId expects UUID

### Path 2: Single Share Retrieval

**Adapter Read** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:447-479](app/src/lib/server/seams/database/adapter.ts#L447-L479) - `getShareById(shareId)`
- Line 468-472: Maps `character_id` UUID to slug

### Path 3: Meeting Shares (Recent Context)

**Adapter Read** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:481-511](app/src/lib/server/seams/database/adapter.ts#L481-L511) - `getMeetingShares(meetingId)`
- Line 500-504: Maps all `character_id` UUIDs to slugs

### Path 4: Active Callbacks for Meeting

**Adapter Read** [Confirmed]
- [app/src/lib/server/seams/database/adapter.ts:550-585](app/src/lib/server/seams/database/adapter.ts#L550-L585) - `getActiveCallbacks(input)`
- Line 555-556: Resolves input `characterId` (slug) to UUID for query
- Line 574-578: Maps all returned `character_id` UUIDs back to slugs

---

## 9. Existing Patch Evidence

**Translation Layer Status**: [Confirmed Present, Partially Validated]

The character ID translation layer **exists and is implemented** in the database adapter, but evidence suggests it **may not be complete or fully tested**:

**What's Implemented** [Confirmed]:
- Bidirectional mapping function (lines 214-284)
- UUID resolution on write paths (lines 298-316)
- Translation on read paths (lines 209-212)
- Proper integration in `appendShare()` and `createCallback()`

**Where Validation is Weak** [Inferred]:
- Test at [adapter.spec.ts:265-291](app/src/lib/server/seams/database/adapter.spec.ts#L265-L291) explicitly tests that slug data in adapter response causes CONTRACT_VIOLATION
- This test suggests the team knows the issue can occur but may not have traced all code paths where slugs could bypass translation
- No evidence of integration tests for the full share→callback→read cycle with actual UUID persistence

**No Evidence of**: [Unverified]
- A recent patch or fix specifically targeting character ID translation
- New tests validating end-to-end slug→UUID→slug round-trip
- Migration or data cleanup for any existing slug-contaminated rows

---

## 10. Flow-by-Flow Observations

### Setup/Join Flow

**What Happens** [Confirmed]:
- User enters name, clean time, mood, listening preference
- Route creates meeting record via `database.createMeeting()`
- Meeting ID returned to client

**Character ID Involvement** [Confirmed]:
- No character IDs involved in setup/join
- Characters are not selected until share generation begins

**Risk Level**: ✓ Not affected

### Normal Character Share Flow

**What Happens** [Confirmed]:
1. Route receives share request with optional `characterId`
2. Route calls `pickCharacter()` → returns character object with slug `id`
3. Route calls Grok AI with `character.id` (slug for logging/tracing)
4. Route calls `addShare()` with `characterId: character.id` (slug)
5. Adapter translates slug → UUID and inserts to `shares.character_id`

**Where Bug Could Manifest** [Inferred]:
- Line 504 in share/+server.ts passes slug to addShare
- IF `resolveDbCharacterId()` fails to find UUID for slug → error returned
- IF `resolveDbCharacterId()` somehow writes slug directly → FK constraint violation
- IF character maps not initialized → resolution could hang or timeout

**Test Evidence** [Confirmed]:
- adapter.spec.ts line 252 tests `appendShare()` with slug 'marcus'
- Test expects adapter to handle it (translate to UUID)

**Risk Level**: ⚠️ HIGH - Write path exists, translation exists, but test shows contract violations can occur

### Crisis Flow

**What Happens** [Confirmed]:
- Route detects crisis via `isMeetingInCrisis()`
- Route pauses normal character shares
- Route optionally selects Marcus or Heather for safety response

**Character ID Involvement** [Confirmed]:
- Crisis shares still created through same `addShare()` path
- Same UUID translation required

**Risk Level**: ⚠️ HIGH - Same write path as normal shares

### Callback Persistence/Lifecycle

**What Happens** [Confirmed]:
1. Route receives callback from memory builder
2. Route calls `applyReferenceLifecycle()` which may create evolution candidate
3. Evolution candidate includes `characterId` (slug from referencingCharacterId)
4. Route calls `createCallback()` with candidate
5. Adapter translates slug → UUID and inserts to `callbacks.character_id`
6. On callback updates, character ID not modified (only lifecycle fields)

**Where Bug Could Manifest** [Inferred]:
- Evolution candidate builds with slug (callback-lifecycle.ts:97)
- createCallback() must translate (adapter.ts:518-519)
- If translation fails, callback with slug ID written
- FK constraint would reject: `character_id uuid not null references characters(id)`
- Callback creation would fail entirely (NOT SILENT)

**Test Evidence** [Confirmed]:
- adapter.spec.ts has mock test but mocks show slug instead of UUID in response
- callback-lifecycle.integration.spec.ts shows callbacks with slug IDs (which is correct for domain)

**Risk Level**: ⚠️ HIGH - FK constraint is NOT NULL, so bug would cause immediate failure

### Close Flow (Summary & Completion)

**What Happens** [Confirmed]:
- Route scans all shares from the meeting
- Shares may have character IDs (UUIDs from DB)
- Route builds summary via Grok AI (uses character names, not IDs)
- Route calls `completeMeeting()` to persist end time and summary

**Character ID Involvement** [Confirmed]:
- Read only - shares are queried and character IDs mapped to slugs
- No write to character_id occurs in close flow

**Risk Level**: ✓ LOW - Read path only

---

## 11. Test Coverage Facts

### Positive Test Evidence (Translation Works)

**Database Adapter Tests** [Confirmed Present]:
- [app/src/lib/server/seams/database/adapter.spec.ts:164-206](app/src/lib/server/seams/database/adapter.spec.ts#L164-L206)
  - Test: createMeeting with valid input
  - No character IDs involved
- [app/src/lib/server/seams/database/adapter.spec.ts:318-345](app/src/lib/server/seams/database/adapter.spec.ts#L318-L345)
  - Test: completeMeeting
  - No character ID writes
- [app/src/lib/server/seams/database/adapter.spec.ts:347-383](app/src/lib/server/seams/database/adapter.spec.ts#L347-L383)
  - Test: updateCallback (only updates lifecycle, not character_id)
  - No character ID translation tested

**Callback Lifecycle Tests** [Confirmed Present]:
- [app/src/lib/core/callback-lifecycle.spec.ts](app/src/lib/core/callback-lifecycle.spec.ts)
  - Tests pure lifecycle logic
  - Uses mocked callbacks with slug IDs (correct for domain)
  - No database adapter integration
- [app/src/lib/core/callback-lifecycle.integration.spec.ts:1-75](app/src/lib/core/callback-lifecycle.integration.spec.ts#L1-L75)
  - Tests callback progression across meetings
  - Uses mock database with slug IDs
  - No real UUID translation validated

### Gap in Test Coverage

**Missing Integration Tests** [Inferred]:
- No test validates: slug input → adapter → UUID write → UUID read → slug output
- No test mocks full character map load and exercises translation for both write AND read
- [adapter.spec.ts:250-263](app/src/lib/server/seams/database/adapter.spec.ts#L250-L263)
  - Tests network failure case for appendShare
  - Input is slug 'marcus', but error response doesn't exercise translation

**Critical Test Gap** [Confirmed]:
- [adapter.spec.ts:265-291](app/src/lib/server/seams/database/adapter.spec.ts#L265-L291)
  - Test mocks `character_id: 'heather'` (slug) in response
  - Test expects CONTRACT_VIOLATION
  - **This test does NOT verify happy path translation** - it only tests that bad data is rejected
  - No test with mocked UUID response and validation that it's translated to slug

**No Composition or E2E Tests of Character ID Path** [Confirmed from CHANGELOG]:
- [CHANGELOG.md](CHANGELOG.md#L19-L22) lists composition and e2e tests added in M9
  - Files: `app/tests/composition/meeting-flow.spec.ts`, `app/tests/composition/seam-failure.spec.ts`, `app/tests/e2e/meeting-flow.spec.ts`
  - No specific character-ID-translation coverage called out
  - Cannot verify without running tests (npm install needed)

---

## 12. Unknowns / Unverified Items

### Cannot Verify Without Execution Environment

1. **Test Suite Status** [Unverified]
   - Do adapter.spec.ts tests pass or fail?
   - Does adapter.spec.ts:265-291 CONTRACT_VIOLATION test currently pass (meaning bad data is rejected)?
   - Are there other failing tests related to character IDs?
   - Blocker: Need `npm install` and test runner

2. **Production Data State** [Unverified]
   - Are there existing rows in `shares` or `callbacks` with slug IDs instead of UUIDs?
   - If so, how many and which characters?
   - Blocker: No database access provided

3. **Actual Runtime Failure Mode** [Unverified]
   - When slug is written instead of UUID, does FK constraint violation occur immediately?
   - Or is there a silent fallback that stores slug as string?
   - Does Postgres raise unique error or generic constraint error?
   - Blocker: Need live error logs

4. **Character Map Load Failure** [Unverified]
   - If `loadCharacterMaps()` fails during first seam call, does `resolveDbCharacterId()` hang, timeout, or error gracefully?
   - Is there timeout/retry logic?
   - Blocker: Need to trace through promise handling

5. **Slug Bypass Paths** [Unverified]
   - Are there any code paths that write character IDs directly to database without going through `appendShare()` or `createCallback()`?
   - Could direct seam adapter calls bypass translation?
   - Could query params or JSON fields contain character IDs that bypass validation?
   - Blocker: Full codebase grep needed across all database calls

### Cannot Confirm Without Code Changes

6. **Scope of Character ID Usage** [Inferred but Not Confirmed]
   - Are character IDs used in any other database columns besides `character_id`?
   - Could they appear in `notable_moments` JSONB, `profile_evolved` JSONB, or elsewhere?
   - Blocker: Would need search across schema for JSON column usage

7. **Migration History** [Not Checked]
   - Was there an earlier migration that may have used different character ID format?
   - Are there other migration files that haven't been reviewed?
   - Blocker: Only one migration file found and reviewed

---

## 13. Command Log (Sanitized)

```bash
# Read AGENTS.md files for governance context
# (no secrets exposed)

# Checked git status
git branch -v
# Output: on branch codex/recoverymeeting-autonomous-2026-02-15
#         1 commit ahead of remote
#         40+ tracked deletions (worktree state)

# Located schema migration
# Found: app/supabase/migrations/20260215_000001_init_schema.sql
# - characters.id: uuid primary key
# - shares.character_id: uuid FK
# - callbacks.character_id: uuid FK (NOT NULL)

# Examined character definitions
# Found: app/src/lib/core/characters.ts
# - CORE_CHARACTERS array with id: 'marcus', 'heather', etc. (slugs)

# Examined type definitions
# Found: app/src/lib/core/types.ts
# - CharacterProfile.id: string (generic, no UUID constraint)

# Examined database adapter
# Found: app/src/lib/server/seams/database/adapter.ts
# - Character map building: lines 214-284
# - UUID resolution: lines 298-316
# - Read translation: lines 209-212
# - appendShare write: lines 372-413
# - createCallback write: lines 513-548

# Examined test failures
# Found: app/src/lib/server/seams/database/adapter.spec.ts:265-291
# - Test mocks character_id: 'heather' (slug) in response
# - Test expects CONTRACT_VIOLATION
# - Indicates translation may not be working in all paths

# Examined fixtures
# Found: All domain-facing fixtures show slug IDs
# - appendShare.sample.json: characterId: "marcus"
# - getHeavyMemory.sample.json: characterId: "heather"
# - createCallback.sample.json: characterId: "marcus"
# - getActiveCallbacks.sample.json: characterId: "marcus", "heather"

# Examined route handlers
# Found: app/src/routes/meeting/[id]/share/+server.ts
# - Line 504: Passes selectedCharacter.id (slug) to addShare()
# - Line 523-547: Callback evolution with slug characterId
# - All correctly route through adapter which should translate

# Note: Could not execute tests (npm install needed)
# Note: Could not access Supabase database to check actual state
# Note: Could not trace runtime errors (no log access provided)
```

---

## Summary Table

| Aspect | Status | Confidence | Evidence |
|--------|--------|------------|----------|
| Domain uses slugs | Confirmed | 100% | characters.ts lines 7-101 |
| DB expects UUIDs | Confirmed | 100% | migration line 7, 54, 62, 79 |
| Translation layer exists | Confirmed | 100% | adapter.ts 214-284, 298-316, 209-212 |
| Write path uses translation | Confirmed | 100% | adapter.ts 372-413, 513-548 |
| Read path uses translation | Confirmed | 100% | adapter.ts 209-212, all read methods |
| Test shows translation can fail | Confirmed | 100% | adapter.spec.ts 265-291 expects CONTRACT_VIOLATION |
| No integration test of full cycle | Confirmed | 100% | Reviewed all adapter.spec.ts tests |
| Character maps cached correctly | Inferred | 80% | Code structure looks sound, but not executed |
| Character IDs bypass translation somewhere | Inferred | 70% | Test expects CONTRACT_VIOLATION but no confirmation of what triggers it |
| Current test suite status | Unverified | 0% | Need npm install and test execution |
| Production data integrity | Unverified | 0% | Need database access |
| Runtime error signatures | Unverified | 0% | Need execution logs |

---

**END OF DOSSIER**
