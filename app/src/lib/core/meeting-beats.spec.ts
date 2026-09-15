/**
 * Purpose: Verify the pure normal meeting-beat contract before selection exists.
 * Why: Later selection and completion code must accept only renderer-safe beat payloads.
 * Info flow: Unknown boundary values enter the validator and either narrow to a beat or fail closed.
 * Invariants: No I/O, clock, random, persistence, route, or crisis behavior is exercised here.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { DatabasePort, ShareRecord } from '$lib/seams/database/contract';
import { validateAppendShareInput } from '$lib/seams/database/contract';
import {
	CRISIS_RESOURCES,
	isCrisisResourcesPayload,
	isCrisisTrigger,
	isMeetingBeat,
	isNormalMeetingBeat,
	MeetingPhase,
	type NormalMeetingBeat
} from './types';
import {
	nextMeetingBeat,
	OPENING_PAUSE_AFTER_MS,
	type MeetingBeatRosterMember,
	type NextMeetingBeatInput
} from './meeting-beats';

const base = {
	id: 'opening:0:room_cue:moment_of_silence',
	ordinal: 0,
	phase: MeetingPhase.OPENING,
	pauseAfterMs: 0
};

describe('normal meeting beat contract', () => {
	it('keeps room-owned beat values outside the existing persistence contract', () => {
		const share = {
			meetingId: 'meeting-1',
			characterId: null,
			isUserShare: false,
			content: 'The room settles.',
			interactionType: 'standard',
			significanceScore: 0,
			sequenceOrder: 0
		};
		expect(validateAppendShareInput(share)).toBe(true);
		for (const interactionType of ['room_cue', 'empty_chair']) {
			expect(validateAppendShareInput({ ...share, interactionType })).toBe(false);
		}
		expectTypeOf<
			Extract<
				Parameters<DatabasePort['appendShare']>[0]['interactionType'],
				'room_cue' | 'empty_chair'
			>
		>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<ShareRecord['interactionType'], 'room_cue' | 'empty_chair'>
		>().toEqualTypeOf<never>();
	});
	it('accepts every non-crisis beat variant with its exact payload', () => {
		const beats: NormalMeetingBeat[] = [
			{ ...base, kind: 'character_share', characterId: 'marcus', interactionType: 'standard' },
			{ ...base, kind: 'room_cue', cue: 'moment_of_silence' },
			{ ...base, kind: 'generated_room_moment', moment: 'empty_chair' },
			{ ...base, kind: 'user_gate', gate: 'introduction' },
			{ ...base, kind: 'close_meeting' },
			{ ...base, kind: 'finished' }
		];

		for (const beat of beats) expect(isNormalMeetingBeat(beat)).toBe(true);
	});

	it('rejects room-owned interactions on a character beat', () => {
		expect(
			isNormalMeetingBeat({
				...base,
				kind: 'character_share',
				characterId: 'marcus',
				interactionType: 'room_cue'
			})
		).toBe(false);
		expect(
			isNormalMeetingBeat({
				...base,
				kind: 'character_share',
				characterId: 'marcus',
				interactionType: 'empty_chair'
			})
		).toBe(false);
	});

	it('rejects malformed base values, invalid payloads, and surplus variant data', () => {
		expect(isNormalMeetingBeat({ ...base, kind: 'room_cue', cue: 'other' })).toBe(false);
		expect(isNormalMeetingBeat({ ...base, kind: 'user_gate', gate: 'reflection' })).toBe(false);
		expect(isNormalMeetingBeat({ ...base, kind: 'finished', characterId: 'marcus' })).toBe(false);
		expect(isNormalMeetingBeat({ ...base, kind: 'close_meeting', ordinal: -1 })).toBe(false);
		expect(isNormalMeetingBeat({ ...base, kind: 'crisis_support' })).toBe(false);
	});

	it('accepts only canonical typed crisis triggers', () => {
		expect(isCrisisTrigger({ source: 'meeting_intake' })).toBe(true);
		expect(isCrisisTrigger({ source: 'user_share', shareId: 'share-1' })).toBe(true);
		expect(isCrisisTrigger({ source: 'user_share', shareId: '  ' })).toBe(false);
		expect(isCrisisTrigger({ source: 'meeting_intake', userText: 'browser text' })).toBe(false);
	});

	it('accepts a crisis-support beat only with a typed trigger and responder', () => {
		const crisisBeat = {
			...base,
			kind: 'crisis_support' as const,
			trigger: { source: 'user_share' as const, shareId: 'share-1' },
			responderCharacterId: 'marcus'
		};

		expect(isMeetingBeat(crisisBeat)).toBe(true);
		expect(isMeetingBeat({ ...crisisBeat, responderCharacterId: '' })).toBe(false);
		expect(isMeetingBeat({ ...crisisBeat, trigger: { source: 'user_share', shareId: '' } })).toBe(
			false
		);
	});

	it('exports one structurally valid controlled crisis resource payload', () => {
		expect(isCrisisResourcesPayload(CRISIS_RESOURCES)).toBe(true);
		expect(CRISIS_RESOURCES.lines).toContain('Call or text 988 - Suicide & Crisis Lifeline');
		expect(isCrisisResourcesPayload({ ...CRISIS_RESOURCES, sticky: false })).toBe(false);
	});
});

const orderedRoster: readonly MeetingBeatRosterMember[] = [
	{ id: 'marcus', seatOrder: 0 },
	{ id: 'heather', seatOrder: 1 }
];

function versionOneOpeningInput(
	overrides: Partial<NextMeetingBeatInput> = {}
): NextMeetingBeatInput {
	return {
		meetingId: 'meeting-1',
		meetingProtocolVersion: 1,
		phaseState: {
			currentPhase: MeetingPhase.OPENING,
			phaseStartedAt: new Date('2026-09-14T00:00:00.000Z'),
			charactersSpokenThisRound: [],
			userHasSharedInRound: false,
			beatCursor: 0,
			activeBeat: null,
			crisisTrigger: null,
			intakeCrisisHandled: false
		},
		roster: orderedRoster,
		...overrides
	};
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
	if (!result.ok) throw new Error('Expected a selected beat');
	return result.value;
}

describe('C03 opening-beat selection', () => {
	it.each([
		{ name: 'empty roster', roster: [] },
		{
			name: 'duplicate identity',
			roster: [
				{ id: 'marcus', seatOrder: 0 },
				{ id: 'marcus', seatOrder: 1 }
			]
		},
		{
			name: 'duplicate seat',
			roster: [
				{ id: 'marcus', seatOrder: 0 },
				{ id: 'heather', seatOrder: 0 }
			]
		},
		{
			name: 'out-of-order seats',
			roster: [
				{ id: 'marcus', seatOrder: 1 },
				{ id: 'heather', seatOrder: 0 }
			]
		},
		{ name: 'missing speaker', roster: [{ id: 'heather', seatOrder: 0 }] }
	])('rejects $name when replaying a persisted character beat', ({ roster }) => {
		const input = versionOneOpeningInput();
		input.phaseState.activeBeat = unwrap(nextMeetingBeat(input));
		input.roster = roster;
		expect(nextMeetingBeat(input)).toMatchObject({
			ok: false,
			error: { code: 'CONTRACT_VIOLATION' }
		});
	});

	it('rejects an empty meeting id before replay', () => {
		const input = versionOneOpeningInput();
		input.phaseState.activeBeat = unwrap(nextMeetingBeat(input));
		input.meetingId = '  ';
		expect(nextMeetingBeat(input)).toMatchObject({ ok: false, error: { code: 'INPUT_INVALID' } });
	});

	it('validates the crisis responder on replay and preserves a valid active object', () => {
		const input = versionOneOpeningInput();
		const activeBeat = {
			...base,
			kind: 'crisis_support' as const,
			trigger: { source: 'meeting_intake' as const },
			responderCharacterId: 'heather'
		};
		input.phaseState.activeBeat = activeBeat;
		expect(unwrap(nextMeetingBeat(input))).toBe(activeBeat);
		input.roster = [{ id: 'marcus', seatOrder: 0 }];
		expect(nextMeetingBeat(input)).toMatchObject({
			ok: false,
			error: { code: 'CONTRACT_VIOLATION' }
		});
	});

	it('replays a room cue without requiring a character speaker', () => {
		const input = versionOneOpeningInput();
		const activeBeat = { ...base, kind: 'room_cue' as const, cue: 'moment_of_silence' as const };
		input.phaseState.activeBeat = activeBeat;
		expect(unwrap(nextMeetingBeat(input))).toBe(activeBeat);
	});

	it('selects Marcus from the persisted roster with the canonical opening shape and pause', () => {
		const beat = unwrap(nextMeetingBeat(versionOneOpeningInput()));

		expect(beat).toEqual({
			id: 'opening:0:character_share:marcus',
			ordinal: 0,
			phase: MeetingPhase.OPENING,
			pauseAfterMs: OPENING_PAUSE_AFTER_MS,
			kind: 'character_share',
			characterId: 'marcus',
			interactionType: 'standard'
		});
	});

	it('returns a stable opening beat for identical ready inputs without changing the input state', () => {
		const input = versionOneOpeningInput({
			meetingId: 'meeting-stable',
			phaseState: {
				...versionOneOpeningInput().phaseState,
				beatCursor: 4
			}
		});

		const first = unwrap(nextMeetingBeat(input));
		const second = unwrap(nextMeetingBeat(input));

		expect(first).toEqual(second);
		expect(first.id).toBe('opening:4:character_share:marcus');
		expect(input.phaseState.activeBeat).toBeNull();
		expect(input.phaseState.beatCursor).toBe(4);
	});

	it('returns the exact persisted active beat before attempting new selection', () => {
		const activeBeat = {
			id: 'opening:7:character_share:marcus',
			ordinal: 7,
			phase: MeetingPhase.OPENING,
			pauseAfterMs: OPENING_PAUSE_AFTER_MS,
			kind: 'character_share' as const,
			characterId: 'marcus',
			interactionType: 'standard' as const
		};
		const result = nextMeetingBeat(
			versionOneOpeningInput({
				phaseState: {
					...versionOneOpeningInput().phaseState,
					activeBeat
				}
			})
		);

		expect(unwrap(result)).toBe(activeBeat);
	});

	it.each([
		{
			name: 'an unversioned meeting',
			input: versionOneOpeningInput({ meetingProtocolVersion: null })
		},
		{
			name: 'a historical state without the explicit cursor',
			input: versionOneOpeningInput({
				phaseState: {
					currentPhase: MeetingPhase.OPENING,
					phaseStartedAt: new Date('2026-09-14T00:00:00.000Z'),
					charactersSpokenThisRound: [],
					userHasSharedInRound: false,
					activeBeat: null,
					crisisTrigger: null,
					intakeCrisisHandled: false
				}
			})
		}
	])('explicitly rejects $name instead of restarting at cursor zero', ({ input }) => {
		const result = nextMeetingBeat(input);

		expect(result).toMatchObject({
			ok: false,
			error: {
				code: 'CONTRACT_VIOLATION',
				message: 'Meeting state is not ready for version-1 beat execution'
			}
		});
	});

	it('rejects a roster that cannot prove the required opening speaker is an ordered member', () => {
		const result = nextMeetingBeat(
			versionOneOpeningInput({ roster: [{ id: 'heather', seatOrder: 0 }] })
		);

		expect(result).toMatchObject({
			ok: false,
			error: { code: 'CONTRACT_VIOLATION' }
		});
	});
});
