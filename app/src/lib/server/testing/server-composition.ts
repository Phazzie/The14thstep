import { randomUUID } from 'node:crypto';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import type { AuthPort } from '$lib/seams/auth/contract';
import type { MeetingParticipant } from '$lib/core/types';
import type {
	CompleteMeetingInput,
	DatabasePort,
	MeetingParticipantSeed,
	MeetingRecord,
	ShareRecord
} from '$lib/seams/database/contract';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';
import { createGrokAiMock } from '$lib/seams/grok-ai/mock';

export interface ServerCompositionBundle {
	auth: AuthPort;
	database: DatabasePort;
	grokAi: GrokAiPort;
}

export function isE2eMockSeamsEnabled(): boolean {
	assertNoVercelMockBoundary();
	return process.env.E2E_MOCK_SEAMS === '1';
}

export function assertNoVercelMockBoundary(): void {
	if (process.env.VERCEL === '1' && process.env.E2E_MOCK_SEAMS === '1') {
		throw new Error('E2E_MOCK_SEAMS cannot be activated in a VERCEL deployment environment');
	}
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader
		.split(';')
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${name}=`));
	return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function createServerTestingComposition(): ServerCompositionBundle {
	assertNoVercelMockBoundary();

	const state = {
		users: new Map<string, { id: string; displayName: string; cleanTime: string | null; isAnonymous: boolean }>(),
		sessions: new Map<string, string>(), // token -> userId
		meetings: new Map<string, MeetingRecord>(),
		participants: new Map<string, MeetingParticipant[]>(),
		shares: new Map<string, ShareRecord[]>(),
		phases: new Map<string, unknown>(),
		callbacks: [] as unknown[]
	};

	const auth: AuthPort = {
		async getSession(cookies) {
			const token = parseCookie(cookies, 'sb-access-token');
			if (!token || !state.sessions.has(token)) {
				return err(SeamErrorCodes.UNAUTHORIZED, 'No active auth session');
			}
			const userId = state.sessions.get(token)!;
			return ok({
				userId,
				email: '',
				expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
			});
		},

		async signInGuest() {
			const userId = randomUUID();
			const accessToken = `mock-token-${userId}`;
			const refreshToken = `mock-refresh-${userId}`;
			state.sessions.set(accessToken, userId);
			return ok({
				userId,
				email: null,
				accessToken,
				refreshToken,
				userMetadata: { sessionKind: 'guest' }
			});
		},

		async sendMagicLink() {
			return ok({ success: true });
		},

		async signInWithPassword() {
			const userId = randomUUID();
			const accessToken = `mock-token-${userId}`;
			state.sessions.set(accessToken, userId);
			return ok({
				userId,
				email: 'member@example.com',
				accessToken,
				refreshToken: `mock-refresh-${userId}`,
				userMetadata: { sessionKind: 'member' }
			});
		},

		async completeAuthCallback() {
			const userId = randomUUID();
			const accessToken = `mock-token-${userId}`;
			state.sessions.set(accessToken, userId);
			return ok({
				userId,
				email: 'member@example.com',
				accessToken,
				refreshToken: `mock-refresh-${userId}`,
				userMetadata: { sessionKind: 'member' }
			});
		},

		async signOut(token) {
			if (token) {
				state.sessions.delete(token);
			}
			return ok({ success: true });
		}
	};

	const database: DatabasePort = {
		async getUserById(userId) {
			const user = state.users.get(userId);
			if (!user) return err(SeamErrorCodes.NOT_FOUND, 'User not found');
			return ok({
				...user,
				meetingCount: 0,
				firstMeetingAt: null,
				lastMeetingAt: null
			});
		},

		async ensureUserProfile(input) {
			const existing = state.users.get(input.id);
			if (existing) return ok({ ...existing, meetingCount: 0, firstMeetingAt: null, lastMeetingAt: null });
			const created = {
				id: input.id,
				displayName: input.displayName,
				cleanTime: input.cleanTime ?? null,
				isAnonymous: input.isAnonymous
			};
			state.users.set(input.id, created);
			return ok({ ...created, meetingCount: 0, firstMeetingAt: null, lastMeetingAt: null });
		},

		async createMeeting(input) {
			const id = randomUUID();
			const meeting: MeetingRecord = {
				id,
				userId: input.userId,
				topic: input.topic,
				userMood: input.userMood,
				userMind: input.userMind ?? null,
				userDisplayName: input.userDisplayName ?? null,
				userCleanTime: input.userCleanTime ?? null,
				listeningOnly: input.listeningOnly,
				startedAt: new Date().toISOString(),
				endedAt: null
			};
			state.meetings.set(id, meeting);
			return ok(meeting);
		},

		async getOwnedMeeting(input) {
			const meeting = state.meetings.get(input.meetingId);
			if (!meeting || meeting.userId !== input.userId) {
				return err(SeamErrorCodes.NOT_FOUND, 'Meeting not found');
			}
			return ok({ ...meeting });
		},

		async saveMeetingParticipants(input) {
			const mapped: MeetingParticipant[] = input.participants.map((p) => ({
				...p,
				sharesCount: 0
			}));
			state.participants.set(input.meetingId, mapped);
			return ok(mapped);
		},

		async getMeetingParticipants(meetingId) {
			return ok(state.participants.get(meetingId) ?? []);
		},

		async appendShare(input) {
			const list = state.shares.get(input.meetingId) ?? [];
			const share: ShareRecord = {
				id: randomUUID(),
				meetingId: input.meetingId,
				characterId: input.characterId,
				isUserShare: input.isUserShare,
				content: input.content,
				interactionType: input.interactionType,
				significanceScore: input.significanceScore ?? 1,
				sequenceOrder: input.sequenceOrder,
				createdAt: new Date().toISOString()
			};
			list.push(share);
			state.shares.set(input.meetingId, list);
			return ok(share);
		},

		async getMeetingShares(meetingId) {
			return ok(state.shares.get(meetingId) ?? []);
		},

		async getShareById(id) {
			for (const list of state.shares.values()) {
				const match = list.find((s) => s.id === id);
				if (match) return ok(match);
			}
			return err(SeamErrorCodes.NOT_FOUND, 'Share not found');
		},

		async getMeetingPhase(meetingId) {
			return ok((state.phases.get(meetingId) as never) ?? null);
		},

		async updateMeetingPhase(meetingId, phase) {
			state.phases.set(meetingId, phase);
			return ok(undefined);
		},

		async completeMeeting(input) {
			const meeting = state.meetings.get(input.meetingId);
			if (!meeting) return err(SeamErrorCodes.NOT_FOUND, 'Meeting not found');
			meeting.endedAt = new Date().toISOString();
			return ok({ ...meeting });
		},

		async createCallback() {
			return ok({ id: randomUUID() } as never);
		},

		async getActiveCallbacks() {
			return ok([]);
		},

		async markCallbackReferenced(callbackId) {
			return ok({
				id: callbackId,
				meetingId: 'mock-meeting',
				characterId: 'marcus',
				originShareId: 'mock-share',
				originalText: 'mock',
				callbackType: 'room_meta',
				scope: 'room',
				potentialScore: 1,
				timesReferenced: 1,
				lastReferencedAt: new Date().toISOString(),
				status: 'active',
				parentCallbackId: null
			});
		},

		async updateCallback() {
			return ok({} as never);
		},

		async getHeavyMemory() {
			return ok([]);
		},

		async getMeetingCountAfterDate() {
			return ok(0);
		}
	};

	const grokAi = createGrokAiMock();

	return {
		auth,
		database,
		grokAi
	};
}

let cachedComposition: ServerCompositionBundle | null = null;

export function getServerComposition(): ServerCompositionBundle {
	if (!cachedComposition) {
		cachedComposition = createServerTestingComposition();
	}
	return cachedComposition;
}
