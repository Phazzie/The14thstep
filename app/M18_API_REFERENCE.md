# M18 Ritual Orchestration: API Reference

## Location

- **Main Module**: `/src/lib/core/ritual-orchestration.ts`
- **Prompt Templates**: `/src/lib/core/prompt-templates.ts` (5 new functions)
- **Constants**: `/src/lib/core/style-constitution.ts`
- **Types**: `/src/lib/core/types.ts` (MeetingPhase enum, MeetingPhaseState interface)

## Imports

```typescript
import {
	initializeMeetingPhase,
	transitionToNextPhase,
	selectPromptForPhase,
	requiresUserInput,
	isValidTransition,
	recordCharacterSpoke,
	recordUserShared,
	isRoundComplete,
	areIntroductionsComplete,
	INTRO_ORDER
} from '$lib/core/ritual-orchestration';

import { MeetingPhase, type MeetingPhaseState } from '$lib/core/types';
import { SeamResult, ok, err, SeamErrorCodes } from '$lib/core/seam';
```

## Function Signatures

### 1. `initializeMeetingPhase(): MeetingPhaseState`

**Purpose**: Create initial meeting state

**Returns**:

```typescript
{
  currentPhase: MeetingPhase.SETUP,
  phaseStartedAt: Date,
  roundNumber: undefined,
  charactersSpokenThisRound: [],
  userHasSharedInRound: false
}
```

**Usage**:

```typescript
const state = initializeMeetingPhase();
// Ready for meeting_start trigger
```

---

### 2. `transitionToNextPhase(currentState, trigger): SeamResult<MeetingPhaseState>`

**Purpose**: Move to next phase based on current state and trigger

**Parameters**:

- `currentState: MeetingPhaseState` - Current meeting state
- `trigger: 'share_complete' | 'user_input' | 'round_complete' | 'meeting_start'`
  - `'meeting_start'` - From SETUP to OPENING
  - `'share_complete'` - Character finished speaking
  - `'round_complete'` - 2 speakers done in current round
  - `'user_input'` - User provided required input

**Returns**:

```typescript
// Success
{ ok: true, value: newState }

// Failure
{ ok: false, error: { code, message, details } }
```

**Example**:

```typescript
const result = transitionToNextPhase(state, 'meeting_start');
if (result.ok) {
	state = result.value; // Now in OPENING phase
} else {
	console.error(result.error.message);
}
```

---

### 3. `selectPromptForPhase(phase, character): PromptType`

**Purpose**: Get prompt template type for current phase

**Parameters**:

- `phase: MeetingPhase` - Current meeting phase
- `character: CharacterProfile` - Character (not used in selection, included for future extension)

**Returns**: `'opening' | 'intro' | 'share' | 'closing' | 'reading'`

**Example**:

```typescript
const promptType = selectPromptForPhase(MeetingPhase.INTRODUCTIONS, marcus);
// Returns: 'intro'

// Then call appropriate builder:
if (promptType === 'intro') {
	const prompt = buildRitualIntroPrompt(marcus, isFirstTimer);
}
```

---

### 4. `requiresUserInput(phase): boolean`

**Purpose**: Check if phase needs user interaction to proceed

**Parameters**:

- `phase: MeetingPhase` - Phase to check

**Returns**: `boolean` - true if user input required

**Example**:

```typescript
if (requiresUserInput(state.currentPhase)) {
	// Show input UI for user
	// Display topic selection or sharing prompt
}
```

**Phases requiring input**:

- `TOPIC_SELECTION`
- `SHARING_ROUND_1`
- `SHARING_ROUND_2`
- `SHARING_ROUND_3`

---

### 5. `isValidTransition(from, to): boolean`

**Purpose**: Check if phase transition is allowed

**Parameters**:

- `from: MeetingPhase` - Starting phase
- `to: MeetingPhase` - Target phase

**Returns**: `boolean` - true if transition allowed

**Example**:

```typescript
if (isValidTransition(MeetingPhase.OPENING, MeetingPhase.CLOSING)) {
	// False - must go through intermediate phases
}

if (isValidTransition(MeetingPhase.OPENING, MeetingPhase.EMPTY_CHAIR)) {
	// True - valid transition
}
```

---

### 6. `recordCharacterSpoke(state, characterId): SeamResult<MeetingPhaseState>`

**Purpose**: Track character speaking in current round

**Parameters**:

- `state: MeetingPhaseState` - Current state
- `characterId: string` - Character's ID (e.g., 'marcus', 'heather')

**Returns**: Updated state or error if duplicate

**Example**:

```typescript
const result = recordCharacterSpoke(state, 'marcus');
if (result.ok) {
	state = result.value;
	console.log(`${state.charactersSpokenThisRound.length} speakers so far`);
} else {
	console.error('Marcus already spoke in this round');
}
```

**Error Cases**:

- Character already in `charactersSpokenThisRound` for current phase

---

### 7. `recordUserShared(state): SeamResult<MeetingPhaseState>`

**Purpose**: Track user sharing in current round

**Parameters**:

- `state: MeetingPhaseState` - Current state

**Returns**: Updated state or error if already shared

**Example**:

```typescript
const result = recordUserShared(state);
if (result.ok) {
	state = result.value;
} else {
	console.error('User already shared in this round');
}
```

**Error Cases**:

- `userHasSharedInRound` already true

---

### 8. `isRoundComplete(state): boolean`

**Purpose**: Check if current round has enough speakers (2)

**Parameters**:

- `state: MeetingPhaseState` - Current state

**Returns**: `boolean` - true if 2 total speakers (characters + user)

**Example**:

```typescript
if (isRoundComplete(state)) {
	// Move to next round
	const result = transitionToNextPhase(state, 'round_complete');
}
```

**Round Complete When**:

- `charactersSpokenThisRound.length + userBoolean >= 2`

---

### 9. `areIntroductionsComplete(state, visitorCount?): boolean`

**Purpose**: Check if all required characters have introduced

**Parameters**:

- `state: MeetingPhaseState` - Current state
- `visitorCount?: number` - Random visitors present (default: 2)

**Returns**: `boolean` - true if all required speakers introduced

**Example**:

```typescript
const complete = areIntroductionsComplete(state);
if (complete) {
	// Proceed to topic selection
	transitionToNextPhase(state, 'round_complete');
}
```

**Required Count**:

- 6 core characters (INTRO_ORDER)
- - visitor count (default 2)
- - 1 user
- **Total**: 9 speakers (by default)

---

### 10. `INTRO_ORDER: string[]`

**Purpose**: Canonical intro sequence for core characters

**Value**:

```typescript
['marcus', 'heather', 'meechie', 'gemini', 'gypsy', 'chrystal'];
```

**Usage**:

```typescript
for (const characterId of INTRO_ORDER) {
	// Call character intro in order
	recordCharacterSpoke(state, characterId);
}
```

---

## Prompt Template Functions

### 11. `buildRitualOpeningPrompt(userName, character): string`

**Location**: `/src/lib/core/prompt-templates.ts`

**Purpose**: Generate opening prompt for meeting

**Parameters**:

- `userName: string` - User's display name
- `character: CharacterProfile` - Character opening (Marcus or Heather)

**Returns**: `string` - AI prompt for character

**Example**:

```typescript
const marcus = CORE_CHARACTERS.find((c) => c.id === 'marcus')!;
const prompt = buildRitualOpeningPrompt('trap', marcus);
// Pass to grok-ai service for generation
```

---

### 12. `buildRitualIntroPrompt(character, isFirstTimer): string`

**Location**: `/src/lib/core/prompt-templates.ts`

**Purpose**: Generate intro prompt for character

**Parameters**:

- `character: CharacterProfile` - Character introducing
- `isFirstTimer: boolean` - Whether user is first-timer

**Returns**: `string` - AI prompt for character

**Example**:

```typescript
const heather = CORE_CHARACTERS.find((c) => c.id === 'heather')!;
const prompt = buildRitualIntroPrompt(heather, true);
// Character will acknowledge the newcomer
```

---

### 13. `buildRitualReadingPrompt(character): string`

**Location**: `/src/lib/core/prompt-templates.ts`

**Purpose**: Generate empty chair reading prompt

**Parameters**:

- `character: CharacterProfile` - Character reading

**Returns**: `string` - AI prompt for character

**Example**:

```typescript
const prompt = buildRitualReadingPrompt(marcus);
// Generates original reading about staying present
```

---

### 14. `buildRitualClosingPrompt(character, userName, meetingSummary): string`

**Location**: `/src/lib/core/prompt-templates.ts`

**Purpose**: Generate closing prompt for meeting

**Parameters**:

- `character: CharacterProfile` - Character closing
- `userName: string` - User's name
- `meetingSummary: string` - Summary of meeting themes

**Returns**: `string` - AI prompt for character

**Example**:

```typescript
const prompt = buildRitualClosingPrompt(marcus, 'trap', 'honesty, accountability, staying present');
```

---

### 15. `buildEmptyChairPrompt(): string`

**Location**: `/src/lib/core/prompt-templates.ts`

**Purpose**: Generate narrative moment for empty chair

**Parameters**: None

**Returns**: `string` - AI prompt for narrative

**Example**:

```typescript
const prompt = buildEmptyChairPrompt();
// Honors those not physically present
```

---

## Type Definitions

### MeetingPhase (enum)

```typescript
enum MeetingPhase {
	SETUP = 'setup',
	OPENING = 'opening',
	EMPTY_CHAIR = 'empty_chair',
	INTRODUCTIONS = 'introductions',
	TOPIC_SELECTION = 'topic_selection',
	SHARING_ROUND_1 = 'sharing_round_1',
	SHARING_ROUND_2 = 'sharing_round_2',
	SHARING_ROUND_3 = 'sharing_round_3',
	CRISIS_MODE = 'crisis_mode',
	CLOSING = 'closing',
	POST_MEETING = 'post_meeting'
}
```

### MeetingPhaseState (interface)

```typescript
interface MeetingPhaseState {
	currentPhase: MeetingPhase;
	phaseStartedAt: Date;
	roundNumber?: number;
	charactersSpokenThisRound: string[]; // UUIDs
	userHasSharedInRound: boolean;
}
```

---

## Workflow Example

```typescript
import {
	initializeMeetingPhase,
	transitionToNextPhase,
	requiresUserInput,
	recordCharacterSpoke,
	recordUserShared,
	isRoundComplete,
	selectPromptForPhase,
	INTRO_ORDER
} from '$lib/core/ritual-orchestration';

// 1. Initialize meeting
let state = initializeMeetingPhase();
// state.currentPhase === SETUP

// 2. Start meeting
let result = transitionToNextPhase(state, 'meeting_start');
state = result.value;
// state.currentPhase === OPENING

// 3. Generate opening
const promptType = selectPromptForPhase(state.currentPhase, marcus);
// promptType === 'opening'
const openingPrompt = buildRitualOpeningPrompt('trap', marcus);

// 4. After opening delivered
result = transitionToNextPhase(state, 'share_complete');
state = result.value;
// state.currentPhase === EMPTY_CHAIR

// 5. Progress through intros
for (const characterId of INTRO_ORDER) {
	result = recordCharacterSpoke(state, characterId);
	state = result.value;
}

// 6. Check if intros complete
if (areIntroductionsComplete(state)) {
	result = transitionToNextPhase(state, 'round_complete');
	state = result.value;
	// state.currentPhase === TOPIC_SELECTION
}

// 7. Require user input
if (requiresUserInput(state.currentPhase)) {
	// Show UI for topic selection
}

// 8. After user input
result = transitionToNextPhase(state, 'user_input');
state = result.value;
// state.currentPhase === SHARING_ROUND_1

// 9. Share round
result = recordCharacterSpoke(state, 'heather');
state = result.value;

if (!isRoundComplete(state)) {
	result = recordCharacterSpoke(state, 'meechie');
	state = result.value;
}

// 10. Round complete
if (isRoundComplete(state)) {
	result = transitionToNextPhase(state, 'round_complete');
	state = result.value;
	// state.currentPhase === SHARING_ROUND_2
	// state.charactersSpokenThisRound === [] (reset)
}
```

---

## Error Handling Pattern

```typescript
const result = transitionToNextPhase(state, trigger);

if (result.ok) {
	// Success - use result.value
	state = result.value;
} else {
	// Error - handle gracefully
	const { code, message, details } = result.error;

	switch (code) {
		case SeamErrorCodes.UNEXPECTED:
			console.error('Invalid transition:', message);
			break;
		case SeamErrorCodes.INPUT_INVALID:
			console.error('Invalid input:', message);
			break;
		default:
			console.error('Error:', message);
	}
}
```

---

## Constants & Values

### STYLE_CONSTITUTION

```typescript
import { STYLE_CONSTITUTION } from '$lib/core/style-constitution';

// Used in all prompt templates automatically
// Rules:
// - Sound like real person, not clinician
// - Use concrete details over abstract advice
// - Keep emotional honesty high, slogans low
// - Natural conversational rhythm
// - Balance accountability and compassion
```

### CORE_CHARACTERS

```typescript
import { CORE_CHARACTERS } from '$lib/core/characters';

// 6 core characters:
// - marcus (The Chair)
// - heather (The Queen Returned)
// - meechie (The Truth)
// - gemini (The War Inside)
// - gypsy (The Runner Who Stopped)
// - chrystal (The Proof)
```

---

## Next Phase (2c) Integration Points

These functions integrate into routes:

1. **GET `/meeting/[id]`** - Display current phase UI
2. **POST `/meeting/[id]/share`** - Character share with prompt selection
3. **POST `/meeting/[id]/user-share`** - Track user input and phase transition
4. **POST `/meeting/[id]/crisis`** - Interrupt with crisis mode
5. **POST `/meeting/[id]/close`** - Generate closing and transition to POST_MEETING

All state management logic here is pure and testable before route integration.
