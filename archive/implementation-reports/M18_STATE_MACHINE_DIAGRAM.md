# M18 Ritual Orchestration: State Machine Diagram

## Complete Phase Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MEETING RITUAL STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

Initial State
     │
     ▼
  ┌──────────┐
  │  SETUP   │
  └─────┬────┘
        │ trigger: meeting_start
        │ (Marcus initiates)
        ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  OPENING (2-3 min)                                           │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildRitualOpeningPrompt(userName, character)      │    │
  │  │ - Marcus or Heather speaks                         │    │
  │  │ - Acknowledges empty chair                         │    │
  │  │ - Welcomes room                                    │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: share_complete
             │ (Opening speech delivered)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  EMPTY_CHAIR (1-2 min)                                       │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildRitualReadingPrompt(character)                │    │
  │  │ - Honors members not physically present             │    │
  │  │ - Short reading: 2-3 sentences                      │    │
  │  │ - Street-level wisdom                              │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: share_complete
             │ (Reading concluded)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  INTRODUCTIONS (5-8 min)                                     │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildRitualIntroPrompt(character, isFirstTimer)    │    │
  │  │                                                      │    │
  │  │ Intro Order: (6 core characters)                    │    │
  │  │ 1. Marcus    (The Chair)                           │    │
  │  │ 2. Heather   (The Queen Returned)                  │    │
  │  │ 3. Meechie   (The Truth)                           │    │
  │  │ 4. Gemini    (The War Inside)                      │    │
  │  │ 5. Gypsy     (The Runner Who Stopped)              │    │
  │  │ 6. Chrystal  (The Proof)                           │    │
  │  │ + Random Visitors (2)                              │    │
  │  │ + User                                              │    │
  │  │                                                      │    │
  │  │ Each: 1-2 sentences                                │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: round_complete
             │ (All intros done)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  TOPIC_SELECTION (1-2 min)                                   │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ User selects topic or let room suggest              │    │
  │  │ USER INPUT REQUIRED                                │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: user_input
             │ (Topic selected)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  SHARING_ROUND_1 (8-12 min)                                  │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildCharacterSharePrompt(character, context)      │    │
  │  │ USER INPUT REQUIRED                                │    │
  │  │                                                      │    │
  │  │ Round Complete: 2 speakers                          │    │
  │  │ - Can be 2 characters OR 1 character + user         │    │
  │  │ - Prevents duplicate speakers                       │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: round_complete
             │ (2 speakers done, state resets)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  SHARING_ROUND_2 (8-12 min)                                  │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildCharacterSharePrompt(character, context)      │    │
  │  │ USER INPUT REQUIRED                                │    │
  │  │                                                      │    │
  │  │ New speakers (round state resets from Round 1)      │    │
  │  │ Round Complete: 2 speakers                          │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: round_complete
             │ (2 speakers done, state resets)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  SHARING_ROUND_3 (8-12 min)                                  │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildCharacterSharePrompt(character, context)      │    │
  │  │ USER INPUT REQUIRED                                │    │
  │  │                                                      │    │
  │  │ New speakers (round state resets from Round 2)      │    │
  │  │ Round Complete: 2 speakers                          │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: round_complete
             │ (2 speakers done, state resets)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  CLOSING (2-3 min)                                           │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │ buildRitualClosingPrompt(character, user, summary) │    │
  │  │ - Marcus or Heather closes                         │    │
  │  │ - Thanks user by name                              │    │
  │  │ - Confidentiality reminder                         │    │
  │  │ - "what is said here stays here"                   │    │
  │  └─────────────────────────────────────────────────────┘    │
  └──────────┬───────────────────────────────────────────────────┘
             │ trigger: share_complete
             │ (Closing delivered)
             ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  POST_MEETING                                                │
  │  - Memory extraction                                          │
  │  - Callback recording                                         │
  │  - Meeting archived                                           │
  │  - Meeting complete (no further transitions)                 │
  └──────────────────────────────────────────────────────────────┘
```

## Crisis Mode Interruption

```
From ANY Phase:
     │
     ▼ CRISIS DETECTED
  ┌────────────────────────────────────────────────────┐
  │  CRISIS_MODE                                       │
  │  ┌──────────────────────────────────────────────┐ │
  │  │ buildMarcusCrisisPrompt() OR                 │ │
  │  │ buildHeatherCrisisPrompt()                  │ │
  │  │                                               │ │
  │  │ Direct response to user crisis event         │ │
  │  │ Safety-focused, grounded, human              │ │
  │  └──────────────────────────────────────────────┘ │
  └──────────┬─────────────────────────────────────────┘
             │ trigger: share_complete
             │ (Crisis response delivered)
             │
             ▼ Return to Appropriate Phase
        ┌────────────────────────────────────┐
        │ SHARING_ROUND_1, 2, or 3           │
        │ OR                                 │
        │ CLOSING (if near end)              │
        │                                    │
        │ State carries forward,             │
        │ speaking history preserved         │
        └────────────────────────────────────┘
```

## Phase-to-Prompt Mapping

```
┌──────────────────────┬─────────────────────────────┐
│ Phase                │ Prompt Type                 │
├──────────────────────┼─────────────────────────────┤
│ OPENING              │ 'opening'                   │
│                      │ buildRitualOpeningPrompt()  │
├──────────────────────┼─────────────────────────────┤
│ EMPTY_CHAIR          │ 'reading'                   │
│                      │ buildRitualReadingPrompt()  │
├──────────────────────┼─────────────────────────────┤
│ INTRODUCTIONS        │ 'intro'                     │
│                      │ buildRitualIntroPrompt()    │
├──────────────────────┼─────────────────────────────┤
│ TOPIC_SELECTION      │ 'reading'                   │
│                      │ buildRitualReadingPrompt()  │
├──────────────────────┼─────────────────────────────┤
│ SHARING_ROUND_1      │ 'share'                     │
│ SHARING_ROUND_2      │ buildCharacterSharePrompt() │
│ SHARING_ROUND_3      │ (with context + memory)     │
├──────────────────────┼─────────────────────────────┤
│ CLOSING              │ 'closing'                   │
│                      │ buildRitualClosingPrompt()  │
├──────────────────────┼─────────────────────────────┤
│ CRISIS_MODE          │ 'share'                     │
│                      │ (crisis context)            │
└──────────────────────┴─────────────────────────────┘
```

## User Input Requirements

```
User Input REQUIRED:
  ✓ TOPIC_SELECTION - Select or approve topic
  ✓ SHARING_ROUND_1 - Decide if sharing this round
  ✓ SHARING_ROUND_2 - Decide if sharing this round
  ✓ SHARING_ROUND_3 - Decide if sharing this round

User Input NOT REQUIRED:
  ✗ SETUP - System only
  ✗ OPENING - Character only
  ✗ EMPTY_CHAIR - Character only
  ✗ INTRODUCTIONS - Characters only
  ✗ CLOSING - Character only
  ✗ POST_MEETING - System only
  ✗ CRISIS_MODE - Character response (may solicit input)
```

## State Tracking Per Round

Each round maintains:
- `charactersSpokenThisRound: string[]` (array of character IDs)
- `userHasSharedInRound: boolean` (true or false)

**Round Complete When**: `charactersSpokenThisRound.length + userBoolean >= 2`

**On Phase Transition to New Round**: State resets to `[]` and `false`

## Intro Order (Canonical Sequence)

```
Core Characters (6):
1. Marcus     - id: 'marcus'     - The Chair
2. Heather    - id: 'heather'    - The Queen Returned
3. Meechie    - id: 'meechie'    - The Truth
4. Gemini     - id: 'gemini'     - The War Inside
5. Gypsy      - id: 'gypsy'      - The Runner Who Stopped
6. Chrystal   - id: 'chrystal'   - The Proof

Then:
7. Random Visitor 1
8. Random Visitor 2
9. User
```

## Error Handling

All transitions return `SeamResult<MeetingPhaseState>`:

```typescript
Success: { ok: true, value: newState }
Error:   { ok: false, error: { code, message, details } }

Possible Errors:
- INPUT_INVALID - Malformed state/trigger
- UNEXPECTED - Invalid transition, duplicate speaker, etc.
- (See SeamErrorCodes in src/lib/core/seam.ts)
```

## Transition Determinism

Every transition is **deterministic**: Same input always produces same output.

- No randomness
- No I/O
- No side effects
- Pure functions only
- Testable in isolation
