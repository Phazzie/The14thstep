import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes, err, ok } from './seam';
import {
	addShare,
	closeMeeting,
	createMeeting,
	detectConnectionBreakthroughContent,
	detectCrisisContent,
	detectHeavyDisclosureContent,
	scoreSignificance,
	type MeetingWorkflowDeps
} from './meeting';
import type {
	DatabasePort,
	MeetingRecord,
	ShareRecord,
	UserProfile
} from '$lib/seams/database/contract';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';

function createDeps(overrides: Partial<MeetingWorkflowDeps> = {}): MeetingWorkflowDeps {
	const database: DatabasePort = {
		getUserById: async () =>
			ok<UserProfile>({
				id: 'user-1',
				displayName: 'trap',
				cleanTime: '19 days',
				meetingCount: 2,
				firstMeetingAt: null,
				lastMeetingAt: null
			}),
		ensureUserProfile: async () =>
			ok<UserProfile>({
				id: 'user-1',
				displayName: 'trap',
				cleanTime: '19 days',
				meetingCount: 2,
				firstMeetingAt: null,
				lastMeetingAt: null
			}),
		createMeeting: async (input) =>
			ok<MeetingRecord>({
				id: 'meeting-1',
				userId: input.userId,
				topic: input.topic,
				userMood: input.userMood,
				listeningOnly: input.listeningOnly,
				startedAt: '2026-02-16T00:00:00.000Z',
				endedAt: null
			}),
		appendShare: async (input) =>
			ok<ShareRecord>({
				id: 'share-1',
				meetingId: input.meetingId,
				characterId: input.characterId,
				isUserShare: input.isUserShare,
				content: input.content,
				significanceScore: input.significanceScore,
				sequenceOrder: input.sequenceOrder,
				createdAt: '2026-02-16T00:01:00.000Z'
			}),
		getHeavyMemory: async () => ok<ShareRecord[]>([]),
		getShareById: async () =>
			ok<ShareRecord>({
				id: 'share-lookup',
				meetingId: 'meeting-1',
				characterId: 'marcus',
				isUserShare: false,
				content: 'Share lookup',
				significanceScore: 6,
				sequenceOrder: 1,
				createdAt: '2026-02-16T00:01:00.000Z'
			}),
		getMeetingShares: async () => ok<ShareRecord[]>([]),
		updateMeetingPhase: async () => ok(undefined),
		getMeetingPhase: async () => ok(null),
		createCallback: async () =>
			ok({
				id: 'callback-1',
				originShareId: 'share-1',
				characterId: 'marcus',
				originalText: 'Now I stay.',
				callbackType: 'self_deprecation' as const,
				scope: 'character' as const,
				potentialScore: 7,
				timesReferenced: 0,
				lastReferencedAt: null,
				status: 'active' as const,
				parentCallbackId: null
			}),
		getActiveCallbacks: async () => ok([]),
		markCallbackReferenced: async () =>
			ok({
				id: 'callback-1',
				originShareId: 'share-1',
				characterId: 'marcus',
				originalText: 'Now I stay.',
				callbackType: 'self_deprecation' as const,
				scope: 'character' as const,
				potentialScore: 7,
				timesReferenced: 1,
				lastReferencedAt: '2026-02-16T00:01:00.000Z',
				status: 'active' as const,
				parentCallbackId: null
			}),
		completeMeeting: async () =>
			ok<MeetingRecord>({
				id: 'meeting-1',
				userId: 'user-1',
				topic: 'staying in the room',
				userMood: 'anxious',
				listeningOnly: false,
				startedAt: '2026-02-16T00:00:00.000Z',
				endedAt: '2026-02-16T01:00:00.000Z'
			}),
		updateCallback: async () =>
			ok({
				id: 'callback-1',
				originShareId: 'share-1',
				characterId: 'marcus',
				originalText: 'Now I stay.',
				callbackType: 'self_deprecation' as const,
				scope: 'character' as const,
				potentialScore: 7,
				timesReferenced: 1,
				lastReferencedAt: '2026-02-16T00:01:00.000Z',
				status: 'active' as const,
				parentCallbackId: null
			}),
		getMeetingCountAfterDate: async () => ok(0)
	};

	const grokAi: GrokAiPort = {
		generateShare: async () => ok({ shareText: 'Meeting closed with honesty and accountability.' })
	};

	return {
		database,
		grokAi,
		...overrides
	};
}

describe('scoreSignificance', () => {
	it('detects crisis/heavy/breakthrough keywords', () => {
		expect(detectCrisisContent('I want to die tonight')).toBe(true);
		expect(detectHeavyDisclosureContent('I lost custody this year')).toBe(true);
		expect(detectConnectionBreakthroughContent('I asked for help and stayed')).toBe(true);
		expect(detectCrisisContent('I had a rough day')).toBe(false);
	});

	it('returns 10 for crisis language', () => {
		const score = scoreSignificance({
			content: 'I want to die and I cannot go on',
			interactionType: 'standard',
			isUserShare: true
		});
		expect(score).toBe(10);
	});

	it('returns 8 for heavy disclosure content', () => {
		const score = scoreSignificance({
			content: 'I lost custody and ended up back in jail.',
			interactionType: 'standard',
			isUserShare: true
		});
		expect(score).toBe(8);
	});

	it('returns 7 for connection and breakthrough markers', () => {
		const score = scoreSignificance({
			content: 'Tonight I told the truth and called my sponsor.',
			interactionType: 'standard',
			isUserShare: true
		});
		expect(score).toBe(7);
	});

	it('returns 6 for direct response interactions', () => {
		const score = scoreSignificance({
			content: 'That lands hard for me.',
			interactionType: 'respond_to',
			isUserShare: false
		});
		expect(score).toBe(6);
	});

	it('returns 5 for first-time user sharing', () => {
		const score = scoreSignificance({
			content: 'I have never said this out loud before.',
			interactionType: 'standard',
			isUserShare: true,
			isFirstUserShare: true
		});
		expect(score).toBe(5);
	});

	it('returns 1 for brief crosstalk', () => {
		const score = scoreSignificance({
			content: 'Facts, I hear that.',
			interactionType: 'crosstalk',
			isUserShare: false
		});
		expect(score).toBe(1);
	});
});

describe('meeting workflow', () => {
	it('creates a meeting through the database seam', async () => {
		const result = await createMeeting(createDeps(), {
			userId: 'user-1',
			topic: 'staying in the room',
			userMood: 'anxious',
			listeningOnly: false
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.id).toBe('meeting-1');
			expect(result.value.topic).toBe('staying in the room');
		}
	});

	it('adds a share and auto-scores significance when omitted', async () => {
		const appendSpy = vi.fn(async (input: Omit<ShareRecord, 'id' | 'createdAt'>) =>
			ok<ShareRecord>({
				id: 'share-2',
				createdAt: '2026-02-16T00:02:00.000Z',
				...input
			})
		);

		const deps = createDeps({
			database: {
				...createDeps().database,
				appendShare: appendSpy
			}
		});

		const result = await addShare(deps, {
			meetingId: 'meeting-1',
			characterId: null,
			isUserShare: true,
			content: 'I told the truth tonight for the first time.',
			sequenceOrder: 1,
			interactionType: 'standard',
			isFirstUserShare: true
		});

		expect(result.ok).toBe(true);
		expect(appendSpy).toHaveBeenCalledTimes(1);
		expect(appendSpy.mock.calls[0][0].significanceScore).toBe(7);
	});

	it('returns input errors for malformed share commands', async () => {
		const result = await addShare(createDeps(), {
			meetingId: '',
			characterId: null,
			isUserShare: true,
			content: '',
			sequenceOrder: -1,
			interactionType: 'standard'
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});

	it('closes a meeting by requesting a summary from grok-ai seam', async () => {
		const result = await closeMeeting(createDeps(), {
			meetingId: 'meeting-1',
			topic: 'staying in the room',
			lastShares: [
				{ speakerName: 'Marcus', content: 'Now we stay even when it hurts.' },
				{ speakerName: 'User', content: 'I am trying not to run tonight.' }
			]
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.meetingId).toBe('meeting-1');
			expect(result.value.summary).toContain('honesty');
		}
	});

	it('propagates seam errors from summary generation', async () => {
		const deps = createDeps({
			grokAi: {
				generateShare: async () => err(SeamErrorCodes.RATE_LIMITED, 'rate limited')
			}
		});
		const result = await closeMeeting(deps, {
			meetingId: 'meeting-1',
			topic: 'staying in the room',
			lastShares: []
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.RATE_LIMITED);
		}
	});
});
