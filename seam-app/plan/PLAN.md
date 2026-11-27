# Plan (seam-v2 steps 2 and 4, done by hand)

seam-v2 only has stage 1 (the guard) built, so this plan follows `docs/PROCESS.md` by hand:
inventory → seams → contracts → files with steps and promises → skeletons → failing tests →
freeze → build one file at a time → design pass → cutover checklist. Approvals 1, 2 and 3 were
not possible overnight (Trizzy asleep, and the Seam Approve window does not exist yet), so each
is recorded below as "self-approved, check me" instead of pretending.

## Features (from the inventory, approval 1: self-approved, check me)

| # | Feature | Promise ids |
|---|---|---|
| F1 | Intake: name, clean time, mood, what's on your mind, listening only | P1, P2 |
| F2 | The room runs itself in the real ritual order | P3, P4, P5 |
| F3 | Six characters speak in their own voices | P6, P7 |
| F4 | The user can introduce themselves, pick the topic, share, or pass | P4, P8 |
| F5 | A crisis anywhere gets an immediate, human, AI-independent answer with 988 and 911 | P9, P10 |
| F6 | Refresh never duplicates or loses the meeting | P11 |
| F7 | Nothing the user says is stored anywhere but their own device | P12 |
| F8 | The meeting never fails to open: if Grok is down, the house tape plays and says so | P13 |
| F9 | The meeting ends with a signed attendance slip | P14 |

## Seams

| Seam | From → to | Outside service |
|---|---|---|
| S1 intake | form → `Intake` | none |
| S2 script | `Intake` + seed → ordered `Beat[]` | none (pure) |
| S3 share | browser → `/api/share` → `ShareResponse` | xAI Grok |
| S4 grok | server → `https://api.x.ai/v1/chat/completions` | xAI Grok |
| S5 crisis | user text → crisis entry + phone list | none (pure, on purpose) |
| S6 storage | `MeetingState` ↔ `localStorage` | browser |
| S7 runner | `MeetingState` + share fetcher → next `MeetingState` | none (pure-ish, fetcher injected) |

Probe (step 3): the Grok key is production-only in Vercel and was not available to this
session, so no live probe was saved. The Grok seam is built against the documented OpenAI-style
chat completions shape and tested with a stubbed `fetch`. Recorded in `DRIFT-LOG.md`.

## Contracts (`src/lib/contracts/`)

- `intake.ts`: `IntakeSchema` (name 1–40, cleanTime 1–40, mood from the 8 old moods, mind 1–600, listeningOnly).
- `meeting.ts`: `ShareSlot`, `Beat`, `TranscriptEntry`, `MeetingStateSchema` (version 1).
- `share.ts`: `ShareRequestSchema`, `ShareResponseSchema` (`source: 'grok' | 'tape'`).

## Files, steps and promises

### `src/lib/core/characters.ts`
Port of the six core characters, unchanged writing. Steps: 1) copy the profiles; 2) keep `voiceExamples` a required 3-tuple; 3) expose `getCharacter(id)`.
- **P6** every character has exactly three non-empty voice lines.

### `src/lib/core/style.ts`
Steps: 1) port the style constitution; 2) port the therapy blocklist; 3) `findTherapySpeak(text)` returns the matched phrases.
- **P7** "I hear you. That's valid." is caught; an ordinary share is not.

### `src/lib/core/script.ts`
`planMeeting(seed, listeningOnly): Beat[]`. Steps: 1) empty chair ritual, Marcus opens, silence, Chrystal reads; 2) six fixed introductions then the user's intro turn; 3) Marcus names the topic after the user picks; 4) three rounds of two speakers from a seeded shuffle of the five non-chairs, each followed by a user turn, with a hard-question beat gated on the user having shared; 5) Marcus closes, "Keep coming back", one farewell, end.
- **P3** the meeting opens with the empty chair, then Marcus.
- **P4** there is exactly one intro turn, one topic turn and three share turns, in that order.
- **P5** the same seed gives the same meeting; a different seed changes the speaking order.

### `src/lib/core/crisis.ts`
Steps: 1) port the crisis keywords and add common variants; 2) `detectCrisis(text)`; 3) `crisisEntries(name)` returns Marcus's authored reply and the phone list.
- **P9** "I want to die" and "thinking about ending it" are detected; "this meeting is killing me lol" is not a false negative risk we accept, so it is allowed to trigger.
- **P10** the crisis reply always contains 988 and 911 and never depends on the network.

### `src/lib/core/prompts.ts`
`buildSharePrompt(character, request)`. Steps: 1) system: who you are, character foundation with voice lines; 2) style constitution; 3) meeting context, omitting empty sections; 4) slot instruction.
- **P6b** never contains the archetype, "exactly N sentences" or "physical action"; omits empty sections.

### `src/lib/core/tape.ts`
`tapeLine(speakerId, slot, n)`. Steps: 1) authored lines per character per slot; 2) deterministic pick by n; 3) fallback to the character's own voice line.
- **P13** every speaker/slot pair the script can produce has a tape line.

### `src/lib/server/grok.ts` and `src/routes/api/share/+server.ts`
Steps: 1) validate the request; 2) no key → tape; 3) call Grok with a 15 s timeout; 4) reject empty, overlong or therapy-speak output, retry once; 5) otherwise tape, labelled.
- **P8** a valid request always gets text back; an invalid one gets 400.
- **P13b** Grok failure or no key returns `source: 'tape'`, never a 500.

### `src/lib/client/storage.ts`
- **P11a** save then load returns the same state; garbage in storage loads as `null`.
- **P12** the only key written is `the14thstep:meeting:v1`, and nothing is sent anywhere except `/api/share` bodies.

### `src/lib/client/runner.ts`
`advance(state, fetchShare)`. Steps: 1) read the beat at the cursor; 2) ritual/action → append; share → fetch → append; user turn → stop; 3) bump the cursor in the same step as the append.
- **P11** running `advance` twice from a saved state never appends the same beat twice.
- **P14** reaching the end marks the meeting finished, which renders the signed slip.

## Build order

contracts → characters → style → crisis → script → prompts → tape → grok + share route → storage → runner → screens.
