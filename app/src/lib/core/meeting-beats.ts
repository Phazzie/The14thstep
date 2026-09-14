/**
 * Purpose: Select the one persisted renderer instruction a version-1 meeting may expose next.
 * Why: A refresh must return the same active instruction rather than recreate browser-owned flow.
 * Info flow: Trusted meeting protocol context, phase state, and ordered roster enter; one beat or
 * an explicit non-executable result leaves.
 * Invariants: No I/O, clock, random source, mutable global, or server import is used here.
 */

import { err, ok, SeamErrorCodes, type SeamResult } from './seam';
import {
	isCrisisTrigger,
	isMeetingBeat,
	MeetingPhase,
	type CrisisTrigger,
	type MeetingBeat,
	type MeetingPhaseState
} from './types';

/** The current ritual's opening share is led by the chair, Marcus. */
export const OPENING_CHARACTER_ID = 'marcus' as const;

/** The shipped renderer waits three seconds after Marcus's opening share before the next cue. */
export const OPENING_PAUSE_AFTER_MS = 3_000;

/**
 * The resolver supplies this in stable persisted seat order. C03 needs only identity and order;
 * later selections may require additional validated participant fields.
 */
export interface MeetingBeatRosterMember {
	id: string;
	seatOrder: number;
}

/**
 * This is intentionally a trusted server-shaped input rather than a browser request payload.
 * `meetingProtocolVersion` is explicit so unversioned historical rooms cannot restart at cursor 0.
 */
export interface NextMeetingBeatInput {
	meetingId: string;
	meetingProtocolVersion: 1 | null | undefined;
	phaseState: MeetingPhaseState;
	roster: readonly MeetingBeatRosterMember[];
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasOwn(value: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(value, key);
}

/**
 * C01/C02 deliberately kept these fields optional for historical display. Selecting a beat requires
 * all of them to have been deliberately written by version-1 initialization.
 */
type VersionOneReadyPhaseState = MeetingPhaseState & {
	beatCursor: number;
	activeBeat: MeetingBeat | null;
	crisisTrigger: CrisisTrigger | null;
	intakeCrisisHandled: boolean;
};

function isVersionOneReadyPhaseState(
	state: MeetingPhaseState
): state is VersionOneReadyPhaseState {
	const beatCursor = state.beatCursor;

	if (
		!hasOwn(state, 'beatCursor') ||
		!hasOwn(state, 'activeBeat') ||
		!hasOwn(state, 'crisisTrigger') ||
		!hasOwn(state, 'intakeCrisisHandled')
	) {
		return false;
	}

	return (
		typeof beatCursor === 'number' &&
		Number.isInteger(beatCursor) &&
		beatCursor >= 0 &&
		(state.activeBeat === null || isMeetingBeat(state.activeBeat)) &&
		(state.crisisTrigger === null || isCrisisTrigger(state.crisisTrigger)) &&
		typeof state.intakeCrisisHandled === 'boolean'
	);
}

function isOrderedRoster(roster: readonly MeetingBeatRosterMember[]): boolean {
	const ids = new Set<string>();

	return roster.every((member, index) => {
		const priorSeatOrder = index === 0 ? -1 : (roster[index - 1]?.seatOrder ?? -1);
		if (
			!member ||
			!isNonEmptyString(member.id) ||
			!Number.isInteger(member.seatOrder) ||
			member.seatOrder < 0 ||
			member.seatOrder <= priorSeatOrder ||
			ids.has(member.id)
		) {
			return false;
		}

		ids.add(member.id);
		return true;
	});
}

/**
 * Return a currently persisted beat unchanged, or select the opening share for a fully initialized
 * version-1 meeting. Later checkpoints add the remaining phase branches without broadening C03.
 */
export function nextMeetingBeat(input: NextMeetingBeatInput): SeamResult<MeetingBeat> {
	const phaseState = input.phaseState;

	if (
		input.meetingProtocolVersion !== 1 ||
		!phaseState ||
		!isVersionOneReadyPhaseState(phaseState)
	) {
		return err(
			SeamErrorCodes.CONTRACT_VIOLATION,
			'Meeting state is not ready for version-1 beat execution'
		);
	}

	if (phaseState.activeBeat) return ok(phaseState.activeBeat);

	if (!isNonEmptyString(input.meetingId)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Meeting id is required for beat selection');
	}

	if (!isOrderedRoster(input.roster)) {
		return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Meeting roster must be in unique seat order');
	}

	if (phaseState.currentPhase !== MeetingPhase.OPENING) {
		return err(
			SeamErrorCodes.UNEXPECTED,
			'C03 only selects an opening beat',
			{ currentPhase: phaseState.currentPhase }
		);
	}

	const openingCharacter = input.roster.find((character) => character.id === OPENING_CHARACTER_ID);
	if (!openingCharacter) {
		return err(
			SeamErrorCodes.CONTRACT_VIOLATION,
			'Opening character is absent from the persisted meeting roster',
			{ characterId: OPENING_CHARACTER_ID }
		);
	}

	const ordinal = phaseState.beatCursor;
	return ok({
		id: `${MeetingPhase.OPENING}:${ordinal}:character_share:${openingCharacter.id}`,
		ordinal,
		phase: MeetingPhase.OPENING,
		pauseAfterMs: OPENING_PAUSE_AFTER_MS,
		kind: 'character_share',
		characterId: openingCharacter.id,
		interactionType: 'standard'
	});
}
