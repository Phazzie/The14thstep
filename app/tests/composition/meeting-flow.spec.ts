import { describe, expect, it } from 'vitest';
import { CORE_CHARACTERS } from '$lib/core/characters';
import { buildPromptContext } from '$lib/core/memory-builder';
import { scanForCallbacks } from '$lib/core/callback-scanner';
import { addShare, closeMeeting, createMeeting } from '$lib/core/meeting';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import type {
	CallbackRecord,
	CallbackScope,
	CallbackStatus,
	CallbackType,
	DatabasePort,
	MeetingRecord,
	ShareRecord
} from '$lib/seams/database/contract';

interface InMemoryState {
	users: Array<{
		id: string;
		displayName: string;
		cleanTime: string | null;
		meetingCount: number;
		firstMeetingAt: string | null;
		lastMeetingAt: string | null;
	}>;
	meetings: MeetingRecord[];
	shares: ShareRecord[];
	callbacks: CallbackRecord[];
	ids: {
		meeting: number;
		share: number;
		callback: number;
	};
}

function isoNow(offsetMs = 0): string {
	return new Date(Date.now() + offsetMs).toISOString();
}

function createInMemoryDatabase(userId: string): { state: InMemoryState; database: DatabasePort } {
	const state: InMemoryState = {
		users: [
			{
				id: userId,
				displayName: 'Tester',
				cleanTime: '5 days',
				meetingCount: 0,
				firstMeetingAt: null,
				lastMeetingAt: null
			}
		],
		meetings: [],
		shares: [],
		callbacks: [],
		ids: { meeting: 0, share: 0, callback: 0 }
	};

	const database: DatabasePort = {
		async getUserById(inputUserId) {
			const user = state.users.find((entry) => entry.id === inputUserId);
			if (!user) return err(SeamErrorCodes.NOT_FOUND, 'User not found');
			return ok(user);
		},

		async createMeeting(input) {
			state.ids.meeting += 1;
			const meeting: MeetingRecord = {
				id: `meeting-${state.ids.meeting}`,
				userId: input.userId,
				topic: input.topic,
				userMood: input.userMood,
				listeningOnly: input.listeningOnly,
				startedAt: isoNow(state.ids.meeting * 1000),
				endedAt: null
			};
			state.meetings.push(meeting);

			const user = state.users.find((entry) => entry.id === input.userId);
			if (user) {
				user.meetingCount += 1;
				if (!user.firstMeetingAt) user.firstMeetingAt = meeting.startedAt;
				user.lastMeetingAt = meeting.startedAt;
			}

			return ok(meeting);
		},

		async appendShare(input) {
			state.ids.share += 1;
			const share: ShareRecord = {
				id: `share-${state.ids.share}`,
				meetingId: input.meetingId,
				characterId: input.characterId,
				isUserShare: input.isUserShare,
				content: input.content,
				significanceScore: input.significanceScore,
				sequenceOrder: input.sequenceOrder,
				createdAt: isoNow(state.ids.share * 1000)
			};
			state.shares.push(share);
			return ok(share);
		},

		async getHeavyMemory(inputUserId) {
			const meetingIds = new Set(
				state.meetings
					.filter((meeting) => meeting.userId === inputUserId)
					.map((meeting) => meeting.id)
			);
			const shares = state.shares
				.filter((share) => meetingIds.has(share.meetingId))
				.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
			return ok(shares);
		},

		async getShareById(shareId) {
			const share = state.shares.find((entry) => entry.id === shareId);
			if (!share) return err(SeamErrorCodes.NOT_FOUND, 'Share not found');
			return ok(share);
		},

		async getMeetingShares(meetingId) {
			const shares = state.shares
				.filter((share) => share.meetingId === meetingId)
				.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
			return ok(shares);
		},

		async createCallback(input) {
			state.ids.callback += 1;
			const callback: CallbackRecord = {
				id: `callback-${state.ids.callback}`,
				originShareId: input.originShareId,
				characterId: input.characterId,
				originalText: input.originalText,
				callbackType: input.callbackType,
				scope: input.scope,
				potentialScore: input.potentialScore,
				timesReferenced: 0,
				lastReferencedAt: null,
				status: 'active',
				parentCallbackId: input.parentCallbackId ?? null
			};
			state.callbacks.push(callback);
			return ok(callback);
		},

		async getActiveCallbacks(input) {
			const callbacks = state.callbacks.filter(
				(callback) =>
					callback.status === 'active' &&
					(callback.scope === 'room' || callback.characterId === input.characterId)
			);
			return ok(callbacks);
		},

		async markCallbackReferenced(callbackId) {
			const callback = state.callbacks.find((entry) => entry.id === callbackId);
			if (!callback) return err(SeamErrorCodes.NOT_FOUND, 'Callback not found');
			callback.timesReferenced += 1;
			callback.lastReferencedAt = isoNow();
			return ok(callback);
		},

		async completeMeeting(input) {
			const meeting = state.meetings.find((entry) => entry.id === input.meetingId);
			if (!meeting) return err(SeamErrorCodes.NOT_FOUND, 'Meeting not found');
			meeting.endedAt = isoNow();
			return ok(meeting);
		},

		async updateCallback(input) {
			const callback = state.callbacks.find((entry) => entry.id === input.id);
			if (!callback) return err(SeamErrorCodes.NOT_FOUND, 'Callback not found');

			callback.timesReferenced = input.updates.timesReferenced ?? callback.timesReferenced;
			callback.lastReferencedAt = input.updates.lastReferencedAt ?? callback.lastReferencedAt;
			callback.status = (input.updates.status as CallbackStatus | undefined) ?? callback.status;
			callback.scope = (input.updates.scope as CallbackScope | undefined) ?? callback.scope;
			return ok(callback);
		},

		async getMeetingCountAfterDate(input) {
			const cutoff = Date.parse(input.startedAfter);
			const count = state.meetings.filter(
				(meeting) => meeting.userId === input.userId && Date.parse(meeting.startedAt) > cutoff
			).length;
			return ok(count);
		}
	};

	return { state, database };
}

function createGrokStub() {
	return {
		async generateShare(input: {
			meetingId: string;
			characterId: string;
			prompt: string;
			contextMessages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
		}) {
			if (input.characterId === 'quality-validator') {
				return ok({ shareText: '{"pass":true}' });
			}
			if (input.characterId === 'callback-scanner') {
				const originMatch = /id=([^\s]+)/.exec(input.prompt);
				const originShareId = originMatch ? originMatch[1] : 'share-1';
				const payload = [
					{
						originShareId,
						characterId: 'marcus',
						originalText: 'Coffee always tasted like burnt pennies.',
						callbackType: 'quirk_habit' as CallbackType,
						scope: 'room' as CallbackScope,
						potentialScore: 7
					}
				];
				return ok({ shareText: JSON.stringify(payload) });
			}
			if (input.characterId === 'summary-narrator') {
				return ok({ shareText: 'The room stayed honest and grounded.' });
			}
			if (input.characterId.startsWith('memory-')) {
				return ok({ shareText: 'Memory note: stayed present and connected.' });
			}

			return ok({ shareText: `${input.characterId} share about staying clean today.` });
		}
	};
}

describe('composition: end-to-end meeting workflow with seam bundle', () => {
	it('runs create -> character shares -> user share -> close and builds memory for a second meeting', async () => {
		const userId = 'user-1';
		const { state, database } = createInMemoryDatabase(userId);
		const grokAi = createGrokStub();

		const firstMeeting = await createMeeting(
			{ database, grokAi },
			{
				userId,
				topic: 'Staying sober today',
				userMood: 'hopeful',
				listeningOnly: false
			}
		);
		expect(firstMeeting.ok).toBe(true);
		if (!firstMeeting.ok) return;
		const firstMeetingId = firstMeeting.value.id;

		for (const [index, character] of CORE_CHARACTERS.entries()) {
			const generated = await grokAi.generateShare({
				meetingId: firstMeetingId,
				characterId: character.id,
				prompt: `share for ${character.name}`,
				contextMessages: []
			});
			expect(generated.ok).toBe(true);
			if (!generated.ok) return;

			const persisted = await addShare(
				{ database, grokAi },
				{
					meetingId: firstMeetingId,
					characterId: character.id,
					isUserShare: false,
					content: generated.value.shareText,
					sequenceOrder: index,
					interactionType: 'standard'
				}
			);
			expect(persisted.ok).toBe(true);
		}

		const userShare = await addShare(
			{ database, grokAi },
			{
				meetingId: firstMeetingId,
				characterId: null,
				isUserShare: true,
				content: 'I asked for help instead of isolating tonight.',
				sequenceOrder: CORE_CHARACTERS.length,
				interactionType: 'standard',
				isFirstUserShare: true
			}
		);
		expect(userShare.ok).toBe(true);

		const closeResult = await closeMeeting(
			{ database, grokAi },
			{
				meetingId: firstMeetingId,
				topic: 'Staying sober today',
				lastShares: state.shares
					.filter((share) => share.meetingId === firstMeetingId)
					.slice(-8)
					.map((share) => ({
						speakerName: share.isUserShare ? 'Tester' : (share.characterId ?? 'Character'),
						content: share.content
					}))
			}
		);
		expect(closeResult.ok).toBe(true);
		if (!closeResult.ok) return;

		const completeResult = await database.completeMeeting({
			meetingId: firstMeetingId,
			summary: closeResult.value.summary,
			notableMoments: { marcus: 'Stayed grounded.' }
		});
		expect(completeResult.ok).toBe(true);

		const callbackScan = await scanForCallbacks({
			meetingId: firstMeetingId,
			shares: state.shares
				.filter((share) => share.meetingId === firstMeetingId)
				.map((share) => ({
					id: share.id,
					meetingId: share.meetingId,
					characterId: share.characterId,
					content: share.content,
					interactionType: 'standard'
				})),
			grokAi,
			database: {
				createCallback: async (candidate) => {
					const created = await database.createCallback(candidate);
					if (!created.ok) return created;
					return ok({ id: created.value.id });
				}
			}
		});
		expect(callbackScan.ok).toBe(true);
		if (!callbackScan.ok) return;
		expect(callbackScan.value.detected).toBeGreaterThan(0);
		expect(callbackScan.value.saved).toBeGreaterThan(0);

		const closedMeeting = state.meetings.find((meeting) => meeting.id === firstMeetingId);
		expect(closedMeeting).toBeTruthy();
		expect(closedMeeting?.endedAt).not.toBeNull();
		expect(
			state.shares.every(
				(share) =>
					Number.isInteger(share.significanceScore) &&
					share.significanceScore >= 0 &&
					share.significanceScore <= 10
			)
		).toBe(true);
		expect(state.callbacks.length).toBeGreaterThan(0);

		const secondMeeting = await createMeeting(
			{ database, grokAi },
			{
				userId,
				topic: 'Coming back again tomorrow',
				userMood: 'tired',
				listeningOnly: false
			}
		);
		expect(secondMeeting.ok).toBe(true);
		if (!secondMeeting.ok) return;

		await addShare(
			{ database, grokAi },
			{
				meetingId: secondMeeting.value.id,
				characterId: null,
				isUserShare: true,
				content: 'I came back because this room helps me stay honest.',
				sequenceOrder: 0,
				interactionType: 'standard',
				isFirstUserShare: true
			}
		);

		const memoryContext = await buildPromptContext({
			userId,
			characterId: 'marcus',
			meetingId: secondMeeting.value.id,
			database
		});
		expect(memoryContext.ok).toBe(true);
		if (!memoryContext.ok) return;
		expect(memoryContext.value.heavyMemory.length).toBeGreaterThan(0);
		expect(memoryContext.value.continuityLines.length).toBeGreaterThan(0);
		expect(memoryContext.value.continuityLines.join(' ')).toContain('Attendance count');
	});
});
