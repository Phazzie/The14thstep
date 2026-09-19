# Project: Epic #78 — Private Intake & Route Ownership

## Architecture
- **Hexagonal Architecture**:
  - Pure Domain: `src/lib/core/` (zero I/O, zero network, zero server dependencies).
  - Seam Contracts & Mocks: `src/lib/seams/database/` (DatabasePort, type definitions, mock implementations, json fixtures).
  - Adapters: `src/lib/server/seams/database/adapter.ts` (Supabase service-role adapter with two-filter `id` + `user_id` query).
  - Web & Server Hooks: `src/hooks.server.ts`, `src/lib/server/meeting-access.ts` (centralized meeting route gate, UUID validation, auth evaluation, indistinguishable 404s).
  - Route Handlers: `src/routes/+page.server.ts` (guest auto-provisioning, clean redirect), `src/routes/meeting/[id]/+page.server.ts` (context consumption).
  - Database: `supabase/migrations/20260912000100_private_meeting_intake.sql` (PostgREST default-deny RLS, user index, snapshot columns).
  - Preview & E2E Testing: `src/lib/server/testing/server-composition.ts`, `playwright.config.ts`, `tests/e2e/meeting-flow.spec.ts`.

## Code Layout
- `src/lib/core/`: Domain pure logic, workflow definitions, unit tests (`meeting.ts`, `meeting.spec.ts`).
- `src/lib/seams/database/`: DatabasePort interface, validation functions, mock adapter (`contract.ts`, `mock.ts`, `fixtures/`).
- `src/lib/server/seams/database/`: Real Supabase database adapter (`adapter.ts`, `adapter.spec.ts`).
- `src/lib/server/`: Server-only utilities, route ownership gate (`meeting-access.ts`, `meeting-access.spec.ts`).
- `src/lib/server/testing/`: Testing seam compositions (`server-composition.ts`).
- `src/hooks.server.ts`: SvelteKit server hooks, seam initialization, meeting route interception.
- `src/app.d.ts`: TypeScript global definitions for `App.Locals`.
- `src/routes/`: SvelteKit page and server route endpoints (`+page.server.ts`, `meeting/[id]/+page.server.ts`, child endpoints).
- `supabase/migrations/`: Postgres migration SQL files (`20260912000100_private_meeting_intake.sql`).
- `tests/`: Composition tests (`tests/composition/`), E2E tests (`tests/e2e/`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F-01 | Private Intake Snapshot Storage | Persist `userDisplayName`, `userCleanTime`, and `userMind` to `public.meetings` | M1 | execplan § Purpose, contract.ts |
| F-02 | `getOwnedMeeting` Seam Operation | Query `public.meetings` strictly filtered by both `id` AND `user_id` | M1 | execplan § Interfaces, contract.ts |
| F-03 | Database Port Mocks & Fixtures | Update `mock.ts` and JSON fixtures to support `getOwnedMeeting` and snapshot fields | M1 | mock.ts, fixtures |
| F-04 | Test Double Mechanical Updates | Update all 5 inline `DatabasePort` test doubles to implement `getOwnedMeeting` and updated `MeetingRecord` | M1 | hooks.server.ts, test suites |
| F-05 | Database Migration DDL | `20260912000100_private_meeting_intake.sql`: snapshot columns, user index, RLS default-deny, role privilege revocation | M2 | execplan § PRIV-07, ORIGINAL_REQUEST § 5 |
| F-06 | Centralized Meeting Route Gate | Intercept `/meeting/[id]` and child routes in server hook to enforce ownership before route load | M3 | execplan § PRIV-03/04, hooks.server.ts |
| F-07 | Early UUID Format Validation | Validate meeting ID format via UUID v4 regex before executing database I/O | M3 | execplan § Decision Log, uuid contract |
| F-08 | Content-Type Aware 404 Dispatch | Route gate responds with JSON error for API requests and SvelteKit error page for HTML navigation | M3 | ORIGINAL_REQUEST § 3, meeting-access.ts |
| F-09 | In-Flight Guest Auto-Provisioning | `actions.join` provisions guest session via `auth.signInGuest()` if `!locals.userId`, sets cookies, bootstraps profile | M4 | ORIGINAL_REQUEST § 4, +page.server.ts |
| F-10 | Clean Join Redirect | Landing page redirects 303 to `/meeting/[id]` with zero query parameters | M4 | execplan § PRIV-01, +page.server.ts |
| F-11 | Context-Driven Meeting Loader | `src/routes/meeting/[id]/+page.server.ts` reads intake from `locals.meetingContext` without duplicate database fetch | M4 | execplan § Milestone 4/5, meeting load |
| F-12 | Elimination of `PROBE_USER_ID` in Routes | Remove `PROBE_USER_ID` fallbacks in `+page.server.ts`, `share/+server.ts`, and `close/+server.ts` | M4 | ORIGINAL_REQUEST § 4, child routes |
| F-13 | E2E Mock Server Composition | Dedicated in-memory preview composition (`server-composition.ts`) active when `E2E_MOCK_SEAMS=1`, fail closed on `VERCEL=1` | M5 | execplan § Milestone 6, server-composition |
| F-14 | Playwright Preview Isolation | Update `playwright.config.ts` (`webServer.env: { E2E_MOCK_SEAMS: '1' }`, `reuseExistingServer: false`) | M5 | execplan § Milestone 6, playwright.config |
| F-15 | Multi-Session E2E Flow Isolation | Update `meeting-flow.spec.ts` to use join flow, clean URLs, and verify 2nd-browser context 404 isolation | M5 | ORIGINAL_REQUEST § 6, meeting-flow.spec.ts |
| F-16 | Full DoD Verification Pipeline | Verify `npm run check`, `lint:verify`, `verify:core`, `verify:contracts`, `verify:composition`, and `test:unit` all exit 0 | M5 | ORIGINAL_REQUEST DoD |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Seams, Adapters & Test Doubles | `src/lib/core/meeting.ts`, `src/lib/seams/database/contract.ts`, `src/lib/seams/database/mock.ts`, `src/lib/server/seams/database/adapter.ts`, fixtures, and all 5 inline `DatabasePort` test doubles | None | COMPLETED |
| M2 | Database Migration & RLS Default-Deny | `supabase/migrations/20260912000100_private_meeting_intake.sql` | M1 | COMPLETED |
| M3 | Route Ownership & Server Hook Gate | `src/app.d.ts`, `src/lib/server/meeting-access.ts`, `src/hooks.server.ts`, unit tests | M1 | COMPLETED |
| M4 | Guest Auto-Provisioning, Clean Redirect & Loader | `src/routes/+page.server.ts`, `src/routes/meeting/[id]/+page.server.ts`, child endpoints (`share`, `close`, etc.) | M1, M3 | COMPLETED |
| M5 | E2E Preview Isolation & DoD Verification | `src/lib/server/testing/server-composition.ts`, `playwright.config.ts`, `tests/e2e/meeting-flow.spec.ts`, full verification pipeline | M1, M2, M3, M4 | COMPLETED |

## Interface Contracts
### `src/lib/seams/database/contract.ts`
- `MeetingRecord`:
  ```typescript
  export interface MeetingRecord {
      id: string;
      userId: string;
      topic: string;
      userMood: string;
      userMind: string | null;
      userDisplayName: string | null;
      userCleanTime: string | null;
      listeningOnly: boolean;
      startedAt: string;
      endedAt: string | null;
  }
  ```
- `GetOwnedMeetingInput`:
  ```typescript
  export interface GetOwnedMeetingInput {
      meetingId: string;
      userId: string;
  }
  ```
- `DatabasePort`:
  ```typescript
  getOwnedMeeting(input: GetOwnedMeetingInput): Promise<SeamResult<MeetingRecord>>;
  ```
- Validation Functions:
  - `validateGetOwnedMeetingInput(value: unknown): value is GetOwnedMeetingInput`
  - `validateMeetingRecord(value: unknown): value is MeetingRecord` (enforces `isNullableString` for the 3 snapshot fields)

### `src/lib/core/meeting.ts`
- `CreateMeetingInput`:
  ```typescript
  export interface CreateMeetingInput {
      userId: string;
      topic: string;
      userMood: string;
      userMind?: string | null;
      userDisplayName?: string | null;
      userCleanTime?: string | null;
      listeningOnly: boolean;
  }
  ```

### `src/app.d.ts`
- `App.Locals`:
  ```typescript
  interface Locals {
      seams: {
          auth: AuthPort;
          database: DatabasePort;
          grokAi: GrokAiPort;
      };
      userId: string | null;
      meetingContext: MeetingRecord | null;
  }
  ```

### `src/lib/server/meeting-access.ts`
- Functions:
  - `isMeetingRoute(pathname: string): boolean`
  - `resolveMeetingAccess(event: RequestEvent, seams: SeamBundle): Promise<Response | null>`
    - Validates UUID v4 -> generic 404 if invalid (zero DB queries).
    - Checks auth -> if upstream error, preserve 5xx; if unauthenticated, generic 404.
    - Calls `database.getOwnedMeeting({ meetingId, userId })` -> generic 404 if not found / wrong owner.
    - Attaches `event.locals.meetingContext = meetingRecord.value`.
    - Returns `null` on success (allowing request to continue to route handler).
