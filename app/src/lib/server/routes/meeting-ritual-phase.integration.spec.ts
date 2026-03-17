import { describe, expect, it } from 'vitest';
import { ok, type SeamResult } from '$lib/core/seam';
import type { MeetingPhaseState } from '$lib/core/types';
import type { CallbackRecord, DatabasePort, MeetingRecord, ShareRecord, UserProfile } from '$lib/seams/database/contract';
import { load as loadMeetingPage } from '../../../routes/meeting/[id]/+page.server';
import { GET as getCharacterShare } from '../../../routes/meeting/[id]/share/+server';
import { POST as postUserShare } from '../../../routes/meeting/[id]/user-share/+server';
import { POST as postClose } from '../../../routes/meeting/[id]/close/+server';

function makeShareRecord(input: {
	id: string;
	meetingId: string;
	characterId: string | null;
	isUserShare: boolean;
	content: string;
	significanceScore: number;
	sequenceOrder: number;
}): ShareRecord {
	return {
		...input,
		createdAt: new Date().toISOString()
	};
}

function createInMemoryDatabase(
	meetingId: string
): DatabasePort & { state: { phaseState: MeetingPhaseState | null } } {
	const state = {
		phaseState: null as MeetingPhaseState | null,
		shares: [] as ShareRecord[],
		callbacks: [] as CallbackRecord[],
		meeting: {
			id: meetingId,
			userId: 'user-1',
			topic: 'staying',
			userMood: 'raw',
			listeningOnly: false,
			startedAt: new Date().toISOString(),
			endedAt: null
		} as MeetingRecord
	};

	const database: DatabasePort = {
		async getUserById(): Promise<SeamResult<UserProfile>> {
			return ok({
				id: 'user-1',
				displayName: 'Tester',
				cleanTime: '10 days',
				meetingCount: 3,
				firstMeetingAt: '2026-02-01T00:00:00.000Z',
				lastMeetingAt: new Date().toISOString()
			});
		},
		async ensureUserProfile(): Promise<SeamResult<UserProfile>> {
			return ok({
				id: 'user-1',
				displayName: 'Tester',
				cleanTime: '10 days',
				meetingCount: 3,
				firstMeetingAt: '2026-02-01T00:00:00.000Z',
				lastMeetingAt: new Date().toISOString()
			});
		},
		async createMeeting(input) {
			state.meeting = {
				...state.meeting,
				id: meetingId,
				userId: input.userId,
				topic: input.topic,
				userMood: input.userMood,
				listeningOnly: input.listeningOnly
			};
			return ok(state.meeting);
		},
		async appendShare(input) {
			const share = makeShareRecord({
				id: `share-${state.shares.length + 1}`,
				meetingId: input.meetingId,
				characterId: input.characterId,
				isUserShare: input.isUserShare,
				content: input.content,
				significanceScore: input.significanceScore,
				sequenceOrder: input.sequenceOrder
			});
			state.shares.push(share);
			return ok(share);
		},
		async getHeavyMemory() {
			return ok([]);
		},
		async getShareById(shareId) {
			const found = state.shares.find((s) => s.id === shareId);
			if (!found) throw new Error(`share not found: ${shareId}`);
			return ok(found);
		},
		async getMeetingShares(id) {
			return ok(
				state.shares
					.filter((s) => s.meetingId === id)
					.sort((a, b) => a.sequenceOrder - b.sequenceOrder)
			);
		},
		async updateMeetingPhase(id, phaseState) {
			if (id !== meetingId) throw new Error(`unexpected meeting id ${id}`);
			state.phaseState = phaseState;
			return ok(undefined);
		},
		async getMeetingPhase(id) {
			if (id !== meetingId) return ok(null);
			return ok(state.phaseState);
		},
		async createCallback(input) {
			const callback: CallbackRecord = {
				id: `cb-${state.callbacks.length + 1}`,
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
		async getActiveCallbacks() {
			return ok([]);
		},
		async markCallbackReferenced(callbackId) {
			const callback = state.callbacks.find((c) => c.id === callbackId);
			if (!callback) throw new Error(`callback not found: ${callbackId}`);
			return ok(callback);
		},
		async completeMeeting(input) {
			state.meeting = {
				...state.meeting,
				id: input.meetingId,
				endedAt: new Date().toISOString()
			};
			return ok(state.meeting);
		},
		async updateCallback(input) {
			const existing = state.callbacks.find((c) => c.id === input.id);
			if (!existing) {
				return ok({
					id: input.id,
					originShareId: 'share-1',
					characterId: 'marcus',
					originalText: 'x',
					callbackType: 'catchphrase',
					scope: 'character',
					potentialScore: 1,
					timesReferenced: input.updates.timesReferenced ?? 0,
					lastReferencedAt: input.updates.lastReferencedAt ?? null,
					status: input.updates.status ?? 'active',
					parentCallbackId: null
				});
			}
			return ok({
				...existing,
				timesReferenced: input.updates.timesReferenced ?? existing.timesReferenced,
				lastReferencedAt: input.updates.lastReferencedAt ?? existing.lastReferencedAt,
				status: input.updates.status ?? existing.status,
				scope: input.updates.scope ?? existing.scope
			});
		},
		async getMeetingCountAfterDate() {
			return ok(0);
		}
	};

	return Object.assign(database, { state: { get phaseState() { return state.phaseState; }, set phaseState(v) { state.phaseState = v; } } });
}

function createGrokStub() {
	return {
		async generateShare(input: { characterId: string }) {
			switch (input.characterId) {
				case 'meeting-narrative-context':
					return ok({
						shareText: JSON.stringify({
							roomFrame: 'The room is quiet.',
							emotionalUndercurrent: 'People are trying.'
						})
					});
				case 'quality-validator':
					return ok({
						shareText: JSON.stringify({
							pass: true,
							voiceConsistency: 8,
							authenticity: 8,
							therapySpeakDetected: false,
							reasons: []
						})
					});
				case 'crisis-triage':
					return ok({
						shareText: JSON.stringify({ crisis: false, confidence: 'high' })
					});
				case 'summary-narrator':
					return ok({ shareText: 'We stayed and told the truth.' });
				case 'memory-extractor':
					return ok({
						shareText: JSON.stringify({
							userMemory: 'User stayed present.',
							highMoment: 'Someone told the truth.',
							characterThreads: {
								marcus: 'Marcus grounded the room.',
								heather: 'Heather stayed direct.',
								meechie: 'Meechie cut through.',
								gemini: 'Gemini showed contradiction.',
								gypsy: 'Gypsy made it human.',
								chrystal: 'Chrystal kept it concrete.'
							}
						})
					});
				case 'callback-scanner':
					return ok({ shareText: '[]' });
				default:
					return ok({ shareText: 'Now I am staying.' });
			}
		}
	};
}

async function readSseEvents(response: Response): Promise<Array<{ event: string; data: unknown }>> {
	const body = response.body;
	if (!body) {
		throw new Error('Expected response body for SSE stream');
	}

	const reader = body.getReader();
	const decoder = new TextDecoder();
	const events: Array<{ event: string; data: unknown }> = [];
	let buffer = '';
	const startedAt = Date.now();

	try {
		while (true) {
			if (Date.now() - startedAt > 5000) {
				throw new Error('Timed out waiting for SSE stream completion');
			}

			const readResult = await Promise.race([
				reader.read(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Timed out waiting for next SSE chunk')), 1500)
				)
			]);
			if (readResult.done) break;

			buffer += decoder.decode(readResult.value, { stream: true });

			while (buffer.includes('\n\n')) {
				const splitIndex = buffer.indexOf('\n\n');
				const chunk = buffer.slice(0, splitIndex);
				buffer = buffer.slice(splitIndex + 2);
				if (!chunk.trim()) continue;

				const lines = chunk.split('\n');
				const eventLine = lines.find((line) => line.startsWith('event: '));
				const dataLine = lines.find((line) => line.startsWith('data: '));
				if (!eventLine || !dataLine) continue;

				const event = eventLine.slice('event: '.length);
				events.push({
					event,
					data: JSON.parse(dataLine.slice('data: '.length))
				});

				if (event === 'done' || event === 'error') {
					await reader.cancel();
					return events;
				}
			}
		}

		return events;
	} finally {
		try {
			await reader.cancel();
		} catch {
			// ignore cancel errors in tests
		}
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readPersistedPhase(events: Array<{ event: string; data: unknown }>): string | undefined {
	const persisted = events.find((event) => event.event === 'persisted');
	if (!persisted || !isObject(persisted.data)) return undefined;
	const value = persisted.data.value;
	if (!isObject(value) || !isObject(value.phaseState)) return undefined;
	const currentPhase = value.phaseState.currentPhase;
	return typeof currentPhase === 'string' ? currentPhase : undefined;
}

async function requestCharacterShare(input: {
	meetingId: string;
	database: DatabasePort;
	grokAi: ReturnType<typeof createGrokStub>;
	sequenceOrder: number;
	characterId?: string;
}) {
	const url = new URL(`http://localhost/meeting/${input.meetingId}/share`);
	url.searchParams.set('topic', 'staying');
	url.searchParams.set('sequenceOrder', String(input.sequenceOrder));
	url.searchParams.set('userName', 'You');
	url.searchParams.set('userMood', 'raw');
	url.searchParams.set('interactionType', 'respond_to');
	url.searchParams.set('crisisMode', '0');
	if (input.characterId) url.searchParams.set('characterId', input.characterId);

	const response = await getCharacterShare({
		params: { id: input.meetingId },
		url,
		locals: {
			userId: null,
			seams: { database: input.database, grokAi: input.grokAi as never, auth: {} as never }
		}
	} as never);
	expect(response.status).toBe(200);
	return readSseEvents(response);
}

async function requestUserShare(input: {
	meetingId: string;
	database: DatabasePort;
	grokAi: ReturnType<typeof createGrokStub>;
	sequenceOrder: number;
	content: string;
}) {
	const response = await postUserShare({
		params: { id: input.meetingId },
		request: new Request(`http://localhost/meeting/${input.meetingId}/user-share`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				content: input.content,
				sequenceOrder: input.sequenceOrder,
				interactionType: 'standard',
				isFirstUserShare: false
			})
		}),
		locals: {
			userId: null,
			seams: { database: input.database, grokAi: input.grokAi as never, auth: {} as never }
		}
	} as never);
	expect(response.status).toBe(200);
	return response.json();
}

describe('meeting ritual phase route integration (server routes + in-memory seam)', () => {
	it('persists and restores ritual phase progression through shares, user turns, and close', async () => {
		const meetingId = 'meeting-int-1';
		const database = createInMemoryDatabase(meetingId);
		const grokAi = createGrokStub();

		const initialLoad = (await loadMeetingPage({
			params: { id: meetingId },
			locals: {
				userId: 'user-1',
				seams: { database, grokAi: grokAi as never, auth: {} as never }
			},
			url: new URL(`http://localhost/meeting/${meetingId}?mind=staying`)
		} as never)) as { phaseState: { currentPhase: string } };
		expect(initialLoad.phaseState.currentPhase).toBe('setup');

		// SETUP -> OPENING -> EMPTY_CHAIR
		let events = await requestCharacterShare({
			meetingId,
			database,
			grokAi,
			sequenceOrder: 0,
			characterId: 'marcus'
		});
			expect(readPersistedPhase(events)).toBe('empty_chair');

		// EMPTY_CHAIR -> INTRODUCTIONS
		events = await requestCharacterShare({
			meetingId,
			database,
			grokAi,
			sequenceOrder: 1,
			characterId: 'heather'
		});
			expect(readPersistedPhase(events)).toBe('introductions');

		// Introductions needs two speakers in current simplified route logic: user + character
		let userPayload = await requestUserShare({
			meetingId,
			database,
			grokAi,
			sequenceOrder: 2,
			content: 'I am here.'
		});
		expect(userPayload.ok).toBe(true);
		expect(userPayload.value.phaseState.currentPhase).toBe('introductions');

		events = await requestCharacterShare({
			meetingId,
			database,
			grokAi,
			sequenceOrder: 3
		});
			expect(readPersistedPhase(events)).toBe('topic_selection');

		// Topic selection -> sharing_round_1 on room-led topic introduction
		events = await requestCharacterShare({
			meetingId,
			database,
			grokAi,
			sequenceOrder: 4
		});
		expect(readPersistedPhase(events)).toBe('sharing_round_1');

		// Advance through sharing rounds with char+user pairs
		events = await requestCharacterShare({ meetingId, database, grokAi, sequenceOrder: 5 });
			expect(readPersistedPhase(events)).toBe('sharing_round_1');

		userPayload = await requestUserShare({ meetingId, database, grokAi, sequenceOrder: 6, content: 'still here' });
		expect(userPayload.value.phaseState.currentPhase).toBe('sharing_round_2');

		events = await requestCharacterShare({ meetingId, database, grokAi, sequenceOrder: 7, characterId: 'heather' });
			expect(readPersistedPhase(events)).toBe('sharing_round_2');

		userPayload = await requestUserShare({ meetingId, database, grokAi, sequenceOrder: 8, content: 'still staying' });
		expect(userPayload.value.phaseState.currentPhase).toBe('sharing_round_3');

		events = await requestCharacterShare({ meetingId, database, grokAi, sequenceOrder: 9, characterId: 'gemini' });
			expect(readPersistedPhase(events)).toBe('sharing_round_3');

		userPayload = await requestUserShare({ meetingId, database, grokAi, sequenceOrder: 10, content: 'closing out' });
		expect(userPayload.value.phaseState.currentPhase).toBe('closing');

		// Close route should persist post_meeting and page load should restore it
		const closeResponse = await postClose({
			params: { id: meetingId },
			request: new Request(`http://localhost/meeting/${meetingId}/close`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ topic: 'staying' })
			}),
			locals: {
				userId: null,
				seams: { database, grokAi: grokAi as never, auth: {} as never }
			}
		} as never);
		expect(closeResponse.status).toBe(200);
		const closePayload = await closeResponse.json();
		expect(closePayload.ok).toBe(true);
		expect(closePayload.value.phaseState.currentPhase).toBe('post_meeting');

		const reloaded = (await loadMeetingPage({
			params: { id: meetingId },
			locals: {
				userId: 'user-1',
				seams: { database, grokAi: grokAi as never, auth: {} as never }
			},
			url: new URL(`http://localhost/meeting/${meetingId}?mind=staying`)
		} as never)) as { phaseState: { currentPhase: string } };
		expect(reloaded.phaseState.currentPhase).toBe('post_meeting');
	});
});
