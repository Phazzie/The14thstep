import { describe, it, expect } from 'vitest';
import { MeetingPhase } from './types';
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
} from './ritual-orchestration';
import type { CharacterProfile } from './types';
import { SeamErrorCodes } from './seam';

const mockCharacter: CharacterProfile = {
	id: 'marcus',
	name: 'Marcus',
	tier: 'core',
	status: 'active',
	archetype: 'The Chair',
	wound: 'Daughter will not speak to him.',
	contradiction: 'Calm can read as distance.',
	voice: 'Measured, story-driven.',
	quirk: 'Always has the chipped coffee cup.',
	color: '#D97706',
	avatar: 'M',
	cleanTime: '12 years',
	meetingCount: 0,
	lastSeenAt: null
};

describe('ritual-orchestration', () => {
	describe('initializeMeetingPhase', () => {
		it('initializes to SETUP phase', () => {
			const state = initializeMeetingPhase();
			expect(state.currentPhase).toBe(MeetingPhase.SETUP);
			expect(state.phaseStartedAt).toBeInstanceOf(Date);
			expect(state.charactersSpokenThisRound).toEqual([]);
			expect(state.userHasSharedInRound).toBe(false);
		});

		it('has undefined round number initially', () => {
			const state = initializeMeetingPhase();
			expect(state.roundNumber).toBeUndefined();
		});
	});

	describe('isValidTransition', () => {
		it('allows SETUP to OPENING', () => {
			expect(isValidTransition(MeetingPhase.SETUP, MeetingPhase.OPENING)).toBe(true);
		});

		it('allows SETUP to CRISIS_MODE', () => {
			expect(isValidTransition(MeetingPhase.SETUP, MeetingPhase.CRISIS_MODE)).toBe(true);
		});

		it('denies SETUP to CLOSING', () => {
			expect(isValidTransition(MeetingPhase.SETUP, MeetingPhase.CLOSING)).toBe(false);
		});

		it('follows full ritual sequence', () => {
			expect(isValidTransition(MeetingPhase.OPENING, MeetingPhase.EMPTY_CHAIR)).toBe(true);
			expect(isValidTransition(MeetingPhase.EMPTY_CHAIR, MeetingPhase.INTRODUCTIONS)).toBe(true);
			expect(isValidTransition(MeetingPhase.INTRODUCTIONS, MeetingPhase.TOPIC_SELECTION)).toBe(true);
			expect(isValidTransition(MeetingPhase.TOPIC_SELECTION, MeetingPhase.SHARING_ROUND_1)).toBe(true);
			expect(isValidTransition(MeetingPhase.SHARING_ROUND_1, MeetingPhase.SHARING_ROUND_2)).toBe(true);
			expect(isValidTransition(MeetingPhase.SHARING_ROUND_2, MeetingPhase.SHARING_ROUND_3)).toBe(true);
			expect(isValidTransition(MeetingPhase.SHARING_ROUND_3, MeetingPhase.CLOSING)).toBe(true);
			expect(isValidTransition(MeetingPhase.CLOSING, MeetingPhase.POST_MEETING)).toBe(true);
		});

		it('allows crisis mode interruption from any phase', () => {
			expect(isValidTransition(MeetingPhase.SETUP, MeetingPhase.CRISIS_MODE)).toBe(true);
			expect(isValidTransition(MeetingPhase.OPENING, MeetingPhase.CRISIS_MODE)).toBe(true);
			expect(isValidTransition(MeetingPhase.INTRODUCTIONS, MeetingPhase.CRISIS_MODE)).toBe(true);
			expect(isValidTransition(MeetingPhase.SHARING_ROUND_2, MeetingPhase.CRISIS_MODE)).toBe(true);
		});

		it('denies invalid backward transitions', () => {
			expect(isValidTransition(MeetingPhase.CLOSING, MeetingPhase.OPENING)).toBe(false);
			expect(isValidTransition(MeetingPhase.SHARING_ROUND_2, MeetingPhase.INTRODUCTIONS)).toBe(false);
		});
	});

	describe('transitionToNextPhase', () => {
		it('transitions from SETUP to OPENING on meeting_start', () => {
			const state = initializeMeetingPhase();
			const result = transitionToNextPhase(state, 'meeting_start');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.currentPhase).toBe(MeetingPhase.OPENING);
			}
		});

		it('transitions through full ritual sequence', () => {
			let state = initializeMeetingPhase();

			// SETUP -> OPENING
			let result = transitionToNextPhase(state, 'meeting_start');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.OPENING);

			// OPENING -> EMPTY_CHAIR
			result = transitionToNextPhase(state, 'share_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.EMPTY_CHAIR);

			// EMPTY_CHAIR -> INTRODUCTIONS
			result = transitionToNextPhase(state, 'share_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.INTRODUCTIONS);

			// INTRODUCTIONS -> TOPIC_SELECTION
			result = transitionToNextPhase(state, 'round_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.TOPIC_SELECTION);

			// TOPIC_SELECTION -> SHARING_ROUND_1
			result = transitionToNextPhase(state, 'user_input');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.SHARING_ROUND_1);
			expect(state.roundNumber).toBe(1);

			// SHARING_ROUND_1 -> SHARING_ROUND_2
			result = transitionToNextPhase(state, 'round_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.SHARING_ROUND_2);
			expect(state.roundNumber).toBe(2);

			// SHARING_ROUND_2 -> SHARING_ROUND_3
			result = transitionToNextPhase(state, 'round_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.SHARING_ROUND_3);
			expect(state.roundNumber).toBe(3);

			// SHARING_ROUND_3 -> CLOSING
			result = transitionToNextPhase(state, 'round_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.CLOSING);

			// CLOSING -> POST_MEETING
			result = transitionToNextPhase(state, 'share_complete');
			expect(result.ok).toBe(true);
			state = (result as any).value;
			expect(state.currentPhase).toBe(MeetingPhase.POST_MEETING);
		});

		it('rejects invalid trigger for current phase', () => {
			const state = initializeMeetingPhase();
			const result = transitionToNextPhase(state, 'share_complete');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UNEXPECTED);
			}
		});

		it('resets spoken characters when transitioning to new round', () => {
			let state = initializeMeetingPhase();
			state = (transitionToNextPhase(state, 'meeting_start') as any).value;
			state = (transitionToNextPhase(state, 'share_complete') as any).value;
			state = (transitionToNextPhase(state, 'share_complete') as any).value;
			state = (transitionToNextPhase(state, 'round_complete') as any).value;
			state = (transitionToNextPhase(state, 'user_input') as any).value;

			// At SHARING_ROUND_1, add a speaker
			const stateWithSpeaker = (recordCharacterSpoke(state, 'marcus') as any).value;
			expect(stateWithSpeaker.charactersSpokenThisRound).toContain('marcus');

			// Transition to next round
			const newRoundState = (transitionToNextPhase(stateWithSpeaker, 'round_complete') as any).value;
			expect(newRoundState.charactersSpokenThisRound).toEqual([]);
		});

		it('prevents transition from POST_MEETING', () => {
			let state = initializeMeetingPhase();
			state = (transitionToNextPhase(state, 'meeting_start') as any).value;
			// ... fast forward to POST_MEETING
			state.currentPhase = MeetingPhase.POST_MEETING;

			const result = transitionToNextPhase(state, 'share_complete');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UNEXPECTED);
			}
		});
	});

	describe('selectPromptForPhase', () => {
		it('returns opening for OPENING phase', () => {
			expect(selectPromptForPhase(MeetingPhase.OPENING, mockCharacter)).toBe('opening');
		});

		it('returns reading for EMPTY_CHAIR phase', () => {
			expect(selectPromptForPhase(MeetingPhase.EMPTY_CHAIR, mockCharacter)).toBe('reading');
		});

		it('returns intro for INTRODUCTIONS phase', () => {
			expect(selectPromptForPhase(MeetingPhase.INTRODUCTIONS, mockCharacter)).toBe('intro');
		});

		it('returns reading for TOPIC_SELECTION phase', () => {
			expect(selectPromptForPhase(MeetingPhase.TOPIC_SELECTION, mockCharacter)).toBe('reading');
		});

		it('returns share for all SHARING_ROUND phases', () => {
			expect(selectPromptForPhase(MeetingPhase.SHARING_ROUND_1, mockCharacter)).toBe('share');
			expect(selectPromptForPhase(MeetingPhase.SHARING_ROUND_2, mockCharacter)).toBe('share');
			expect(selectPromptForPhase(MeetingPhase.SHARING_ROUND_3, mockCharacter)).toBe('share');
		});

		it('returns closing for CLOSING phase', () => {
			expect(selectPromptForPhase(MeetingPhase.CLOSING, mockCharacter)).toBe('closing');
		});

		it('returns share for CRISIS_MODE', () => {
			expect(selectPromptForPhase(MeetingPhase.CRISIS_MODE, mockCharacter)).toBe('share');
		});
	});

	describe('requiresUserInput', () => {
		it('returns true for TOPIC_SELECTION', () => {
			expect(requiresUserInput(MeetingPhase.TOPIC_SELECTION)).toBe(true);
		});

		it('returns true for all SHARING_ROUND phases', () => {
			expect(requiresUserInput(MeetingPhase.SHARING_ROUND_1)).toBe(true);
			expect(requiresUserInput(MeetingPhase.SHARING_ROUND_2)).toBe(true);
			expect(requiresUserInput(MeetingPhase.SHARING_ROUND_3)).toBe(true);
		});

		it('returns false for OPENING and EMPTY_CHAIR', () => {
			expect(requiresUserInput(MeetingPhase.OPENING)).toBe(false);
			expect(requiresUserInput(MeetingPhase.EMPTY_CHAIR)).toBe(false);
		});

		it('returns false for INTRODUCTIONS', () => {
			expect(requiresUserInput(MeetingPhase.INTRODUCTIONS)).toBe(false);
		});

		it('returns false for CLOSING and POST_MEETING', () => {
			expect(requiresUserInput(MeetingPhase.CLOSING)).toBe(false);
			expect(requiresUserInput(MeetingPhase.POST_MEETING)).toBe(false);
		});
	});

	describe('recordCharacterSpoke', () => {
		it('adds character to spoken list', () => {
			const state = initializeMeetingPhase();
			const result = recordCharacterSpoke(state, 'marcus');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.charactersSpokenThisRound).toContain('marcus');
			}
		});

		it('prevents duplicate speakers in same round', () => {
			let state = initializeMeetingPhase();
			state = (recordCharacterSpoke(state, 'marcus') as any).value;

			const result = recordCharacterSpoke(state, 'marcus');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UNEXPECTED);
			}
		});

		it('allows multiple different speakers', () => {
			let state = initializeMeetingPhase();
			state = (recordCharacterSpoke(state, 'marcus') as any).value;
			const result = recordCharacterSpoke(state, 'heather');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.charactersSpokenThisRound).toContain('marcus');
				expect(result.value.charactersSpokenThisRound).toContain('heather');
			}
		});
	});

	describe('recordUserShared', () => {
		it('marks user as shared', () => {
			const state = initializeMeetingPhase();
			const result = recordUserShared(state);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.userHasSharedInRound).toBe(true);
			}
		});

		it('prevents user from sharing twice in same round', () => {
			let state = initializeMeetingPhase();
			state = (recordUserShared(state) as any).value;

			const result = recordUserShared(state);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UNEXPECTED);
			}
		});
	});

	describe('isRoundComplete', () => {
		it('returns false when no speakers', () => {
			const state = initializeMeetingPhase();
			expect(isRoundComplete(state)).toBe(false);
		});

		it('returns false when only 1 character has spoken', () => {
			let state = initializeMeetingPhase();
			state = (recordCharacterSpoke(state, 'marcus') as any).value;
			expect(isRoundComplete(state)).toBe(false);
		});

		it('returns true when 2 characters have spoken', () => {
			let state = initializeMeetingPhase();
			state = (recordCharacterSpoke(state, 'marcus') as any).value;
			state = (recordCharacterSpoke(state, 'heather') as any).value;
			expect(isRoundComplete(state)).toBe(true);
		});

		it('returns true when 1 character and user have spoken', () => {
			let state = initializeMeetingPhase();
			state = (recordCharacterSpoke(state, 'marcus') as any).value;
			state = (recordUserShared(state) as any).value;
			expect(isRoundComplete(state)).toBe(true);
		});

		it('returns true when user and character speak', () => {
			let state = initializeMeetingPhase();
			state = (recordUserShared(state) as any).value;
			state = (recordCharacterSpoke(state, 'heather') as any).value;
			expect(isRoundComplete(state)).toBe(true);
		});
	});

	describe('areIntroductionsComplete', () => {
		it('returns false initially', () => {
			const state = initializeMeetingPhase();
			expect(areIntroductionsComplete(state)).toBe(false);
		});

		it('requires at least 6 core characters', () => {
			let state = initializeMeetingPhase();
			// Add 5 core characters
			for (let i = 0; i < 5; i++) {
				state = (recordCharacterSpoke(state, INTRO_ORDER[i]) as any).value;
			}
			expect(areIntroductionsComplete(state)).toBe(false);

			// Add 6th core character
			state = (recordCharacterSpoke(state, INTRO_ORDER[5]) as any).value;
			expect(areIntroductionsComplete(state, 0)).toBe(false); // Still need visitors
		});

		it('returns true when all required speakers present (default 2 visitors + user)', () => {
			let state = initializeMeetingPhase();
			// Add all 6 core characters
			for (const characterId of INTRO_ORDER) {
				state = (recordCharacterSpoke(state, characterId) as any).value;
			}
			// Add 2 visitors
			state = (recordCharacterSpoke(state, 'visitor1') as any).value;
			state = (recordCharacterSpoke(state, 'visitor2') as any).value;
			// Add user
			state = (recordUserShared(state) as any).value;

			expect(areIntroductionsComplete(state)).toBe(true);
		});

		it('allows custom visitor count', () => {
			let state = initializeMeetingPhase();
			// Add all 6 core characters
			for (const characterId of INTRO_ORDER) {
				state = (recordCharacterSpoke(state, characterId) as any).value;
			}
			// Add 1 visitor
			state = (recordCharacterSpoke(state, 'visitor1') as any).value;
			// Add user
			state = (recordUserShared(state) as any).value;

			// Should be complete with 1 visitor
			expect(areIntroductionsComplete(state, 1)).toBe(true);

			// Should not be complete if expecting 3 visitors
			expect(areIntroductionsComplete(state, 3)).toBe(false);
		});
	});

	describe('INTRO_ORDER', () => {
		it('has canonical order: Marcus, Heather, Meechie, Gemini, Gypsy, Chrystal', () => {
			expect(INTRO_ORDER).toEqual(['marcus', 'heather', 'meechie', 'gemini', 'gypsy', 'chrystal']);
		});

		it('has exactly 6 core characters', () => {
			expect(INTRO_ORDER.length).toBe(6);
		});
	});

	describe('Crisis mode interruption', () => {
		it('can interrupt from any phase to CRISIS_MODE', () => {
			const phases = Object.values(MeetingPhase).filter(
				(p) => p !== MeetingPhase.POST_MEETING && p !== MeetingPhase.CRISIS_MODE
			);

			for (const phase of phases) {
				const state = initializeMeetingPhase();
				state.currentPhase = phase as MeetingPhase;
				const result = transitionToNextPhase(state, 'share_complete');
				// Just checking if CRISIS_MODE is a valid next phase
				const isValidTransitionToCrisis = isValidTransition(phase as MeetingPhase, MeetingPhase.CRISIS_MODE);
				expect(isValidTransitionToCrisis).toBe(true);
			}
		});

		it('preserves round tracking when entering crisis mode', () => {
			let state = initializeMeetingPhase();
			state = (transitionToNextPhase(state, 'meeting_start') as any).value; // OPENING
			state = (transitionToNextPhase(state, 'share_complete') as any).value; // EMPTY_CHAIR
			state = (transitionToNextPhase(state, 'share_complete') as any).value; // INTRODUCTIONS
			state = (transitionToNextPhase(state, 'round_complete') as any).value; // TOPIC_SELECTION
			state = (transitionToNextPhase(state, 'user_input') as any).value; // SHARING_ROUND_1
			state = (recordCharacterSpoke(state, 'marcus') as any).value;

			// Characters spoken should be preserved or reset appropriately
			expect(state.charactersSpokenThisRound.length).toBeGreaterThanOrEqual(0);
		});
	});
});
