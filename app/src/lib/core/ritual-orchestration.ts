import type { MeetingPhase, MeetingPhaseState, CharacterProfile } from './types';
import { MeetingPhase as MeetingPhaseEnum } from './types';
import type { SeamResult } from './seam';
import { ok, err, SeamErrorCodes } from './seam';

/**
 * The canonical intro order for the ritual.
 * Core characters first (in order), then random visitors, then user.
 */
export const INTRO_ORDER: string[] = [
	'marcus',
	'heather',
	'meechie',
	'gemini',
	'gypsy',
	'chrystal'
];

/**
 * Phase state machine transition map.
 * Defines which phases can validly transition to which other phases.
 */
const VALID_TRANSITIONS: Record<MeetingPhase, MeetingPhase[]> = {
	[MeetingPhaseEnum.SETUP]: [MeetingPhaseEnum.OPENING, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.OPENING]: [MeetingPhaseEnum.EMPTY_CHAIR, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.EMPTY_CHAIR]: [MeetingPhaseEnum.INTRODUCTIONS, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.INTRODUCTIONS]: [MeetingPhaseEnum.TOPIC_SELECTION, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.TOPIC_SELECTION]: [MeetingPhaseEnum.SHARING_ROUND_1, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.SHARING_ROUND_1]: [MeetingPhaseEnum.SHARING_ROUND_2, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.SHARING_ROUND_2]: [MeetingPhaseEnum.SHARING_ROUND_3, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.SHARING_ROUND_3]: [MeetingPhaseEnum.CLOSING, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.CRISIS_MODE]: [
		MeetingPhaseEnum.SHARING_ROUND_1,
		MeetingPhaseEnum.SHARING_ROUND_2,
		MeetingPhaseEnum.SHARING_ROUND_3,
		MeetingPhaseEnum.CLOSING
	],
	[MeetingPhaseEnum.CLOSING]: [MeetingPhaseEnum.POST_MEETING, MeetingPhaseEnum.CRISIS_MODE],
	[MeetingPhaseEnum.POST_MEETING]: []
};

/**
 * Initialize meeting phase state at meeting start.
 * Sets phase to SETUP with no characters spoken yet.
 */
export function initializeMeetingPhase(): MeetingPhaseState {
	return {
		currentPhase: MeetingPhaseEnum.SETUP,
		phaseStartedAt: new Date(),
		roundNumber: undefined,
		preCrisisPhase: undefined,
		charactersSpokenThisRound: [],
		userHasSharedInRound: false
	};
}

/**
 * Validate phase transition is legal.
 * Returns true if transition from -> to is allowed.
 */
export function isValidTransition(from: MeetingPhase, to: MeetingPhase): boolean {
	const validNextPhases = VALID_TRANSITIONS[from];
	if (!validNextPhases) return false;
	return validNextPhases.includes(to);
}

/**
 * Transition to next phase in the ritual sequence.
 * Returns new phase state or error if transition invalid.
 *
 * Transition triggers:
 * - 'share_complete': A character or user finished sharing
 * - 'user_input': User provided topic selection or input
 * - 'round_complete': A sharing round finished (2 speakers done)
 * - 'meeting_start': Initial transition from SETUP
 */
export function transitionToNextPhase(
	currentState: MeetingPhaseState,
	transitionTrigger: 'share_complete' | 'user_input' | 'round_complete' | 'meeting_start'
): SeamResult<MeetingPhaseState> {
	const currentPhase = currentState.currentPhase;
	let nextPreCrisisPhase: MeetingPhase | undefined;

	// Determine next phase based on current phase and trigger
	let nextPhase: MeetingPhase | null = null;

	switch (currentPhase) {
		case MeetingPhaseEnum.SETUP:
			if (transitionTrigger === 'meeting_start') {
				nextPhase = MeetingPhaseEnum.OPENING;
			}
			break;

		case MeetingPhaseEnum.OPENING:
			if (transitionTrigger === 'share_complete') {
				nextPhase = MeetingPhaseEnum.EMPTY_CHAIR;
			}
			break;

		case MeetingPhaseEnum.EMPTY_CHAIR:
			if (transitionTrigger === 'share_complete') {
				nextPhase = MeetingPhaseEnum.INTRODUCTIONS;
			}
			break;

		case MeetingPhaseEnum.INTRODUCTIONS:
			if (transitionTrigger === 'round_complete') {
				nextPhase = MeetingPhaseEnum.TOPIC_SELECTION;
			}
			break;

		case MeetingPhaseEnum.TOPIC_SELECTION:
			if (transitionTrigger === 'share_complete') {
				nextPhase = MeetingPhaseEnum.SHARING_ROUND_1;
			}
			break;

		case MeetingPhaseEnum.SHARING_ROUND_1:
			if (transitionTrigger === 'round_complete') {
				nextPhase = MeetingPhaseEnum.SHARING_ROUND_2;
			}
			break;

		case MeetingPhaseEnum.SHARING_ROUND_2:
			if (transitionTrigger === 'round_complete') {
				nextPhase = MeetingPhaseEnum.SHARING_ROUND_3;
			}
			break;

		case MeetingPhaseEnum.SHARING_ROUND_3:
			if (transitionTrigger === 'round_complete') {
				nextPhase = MeetingPhaseEnum.CLOSING;
			}
			break;

		case MeetingPhaseEnum.CLOSING:
			if (transitionTrigger === 'share_complete') {
				nextPhase = MeetingPhaseEnum.POST_MEETING;
			} else if (transitionTrigger === 'user_input') {
				nextPhase = MeetingPhaseEnum.CRISIS_MODE;
				nextPreCrisisPhase = currentPhase;
			}
			break;

		case MeetingPhaseEnum.POST_MEETING:
			// No further transitions from POST_MEETING
			return err(
				SeamErrorCodes.UNEXPECTED,
				'Cannot transition from POST_MEETING phase',
				{ currentPhase }
			);

		case MeetingPhaseEnum.CRISIS_MODE:
			// Recover to the phase that crisis interrupted when possible.
			if (transitionTrigger === 'share_complete') {
				const recoveryTarget = currentState.preCrisisPhase;
				if (
					recoveryTarget &&
					recoveryTarget !== MeetingPhaseEnum.CRISIS_MODE &&
					isValidTransition(MeetingPhaseEnum.CRISIS_MODE, recoveryTarget)
				) {
					nextPhase = recoveryTarget;
				} else {
					nextPhase = MeetingPhaseEnum.CLOSING;
				}
			}
			break;
	}

	if (!nextPhase) {
		return err(
			SeamErrorCodes.UNEXPECTED,
			`Invalid transition from ${currentPhase} with trigger ${transitionTrigger}`,
			{ currentPhase, transitionTrigger }
		);
	}

	// Validate the transition is legal
	if (!isValidTransition(currentPhase, nextPhase)) {
		return err(
			SeamErrorCodes.UNEXPECTED,
			`Transition not allowed from ${currentPhase} to ${nextPhase}`,
			{ currentPhase, nextPhase }
		);
	}

	// Build new state
	const newState: MeetingPhaseState = {
		currentPhase: nextPhase,
		phaseStartedAt: new Date(),
		roundNumber: getRoundNumber(nextPhase),
		preCrisisPhase: nextPhase === MeetingPhaseEnum.CRISIS_MODE ? nextPreCrisisPhase : undefined,
		charactersSpokenThisRound: [],
		userHasSharedInRound: false
	};

	return ok(newState);
}

/**
 * Get the round number for sharing round phases.
 * Returns undefined for non-sharing phases.
 */
function getRoundNumber(phase: MeetingPhase): number | undefined {
	switch (phase) {
		case MeetingPhaseEnum.SHARING_ROUND_1:
			return 1;
		case MeetingPhaseEnum.SHARING_ROUND_2:
			return 2;
		case MeetingPhaseEnum.SHARING_ROUND_3:
			return 3;
		default:
			return undefined;
	}
}

/**
 * Get the appropriate prompt template for current phase.
 * Returns which prompt function to call from prompt-templates.ts
 */
export function selectPromptForPhase(
	phase: MeetingPhase,
	character: CharacterProfile
): 'opening' | 'intro' | 'share' | 'closing' | 'reading' | 'topic_intro' {
	void character;
	switch (phase) {
		case MeetingPhaseEnum.OPENING:
			return 'opening';
		case MeetingPhaseEnum.EMPTY_CHAIR:
			return 'reading';
		case MeetingPhaseEnum.INTRODUCTIONS:
			return 'intro';
		case MeetingPhaseEnum.TOPIC_SELECTION:
			return 'topic_intro';
		case MeetingPhaseEnum.SHARING_ROUND_1:
		case MeetingPhaseEnum.SHARING_ROUND_2:
		case MeetingPhaseEnum.SHARING_ROUND_3:
			return 'share';
		case MeetingPhaseEnum.CLOSING:
			return 'closing';
		case MeetingPhaseEnum.CRISIS_MODE:
			// Crisis uses share template but with crisis context
			return 'share';
		default:
			return 'share';
	}
}

/**
 * Determine if user input is required for this phase.
 * Returns true if the phase requires user interaction to proceed.
 */
export function requiresUserInput(phase: MeetingPhase): boolean {
	return (
		phase === MeetingPhaseEnum.SHARING_ROUND_1 ||
		phase === MeetingPhaseEnum.SHARING_ROUND_2 ||
		phase === MeetingPhaseEnum.SHARING_ROUND_3
	);
}

/**
 * Track that a character has spoken in the current round.
 * Returns updated state or error if invalid.
 */
export function recordCharacterSpoke(
	state: MeetingPhaseState,
	characterId: string
): SeamResult<MeetingPhaseState> {
	// Prevent duplicate speakers in same round
	if (state.charactersSpokenThisRound.includes(characterId)) {
		return err(
			SeamErrorCodes.UNEXPECTED,
			`${characterId} has already spoken in this round`,
			{ characterId, charactersSpokenThisRound: state.charactersSpokenThisRound }
		);
	}

	const updatedState: MeetingPhaseState = {
		...state,
		charactersSpokenThisRound: [...state.charactersSpokenThisRound, characterId]
	};

	return ok(updatedState);
}

/**
 * Track that the user has shared in the current round.
 * Returns updated state or error if user already shared.
 */
export function recordUserShared(state: MeetingPhaseState): SeamResult<MeetingPhaseState> {
	if (state.userHasSharedInRound) {
		return err(
			SeamErrorCodes.UNEXPECTED,
			'User has already shared in this round',
			{ currentPhase: state.currentPhase }
		);
	}

	const updatedState: MeetingPhaseState = {
		...state,
		userHasSharedInRound: true
	};

	return ok(updatedState);
}

/**
 * Check if a sharing round is complete.
 * A round is complete when 2 characters (or character + user) have spoken.
 */
export function isRoundComplete(state: MeetingPhaseState): boolean {
	const speakerCount = state.charactersSpokenThisRound.length + (state.userHasSharedInRound ? 1 : 0);
	return speakerCount >= 2;
}

/**
 * Check if introductions phase is complete.
 * All core characters plus any random visitors/user must introduce.
 * For now, we check if at least the 6 core characters have spoken.
 */
export function areIntroductionsComplete(
	state: MeetingPhaseState,
	randomVisitorCount: number = 2
): boolean {
	const coreCharactersRequired = INTRO_ORDER.length;
	const totalRequired = coreCharactersRequired + randomVisitorCount + 1; // +1 for user
	const totalSpoken = state.charactersSpokenThisRound.length + (state.userHasSharedInRound ? 1 : 0);
	return totalSpoken >= totalRequired;
}
