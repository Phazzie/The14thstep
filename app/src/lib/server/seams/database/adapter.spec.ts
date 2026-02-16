import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import type { ServiceRoleSupabaseClient } from '$lib/server/supabase';
import { createDatabaseAdapter } from './adapter';

interface QueryErrorLike {
	code?: string;
	message?: string;
	details?: string;
	hint?: string;
	status?: number;
}

interface QueryResponse {
	data: unknown;
	error: QueryErrorLike | null;
	status?: number;
}

interface MockResponses {
	userMaybeSingle?: QueryResponse;
	meetingSingle?: QueryResponse;
	meetingUpdateSingle?: QueryResponse;
	shareSingle?: QueryResponse;
	heavyMemorySelect?: QueryResponse;
}

function createHeavyMemoryChain(response: QueryResponse) {
	return {
		gte: () => ({
			eq: () => ({
				order: () => ({
					order: async () => response
				})
			})
		})
	};
}

function createHarness(responses: MockResponses = {}) {
	const meetingInsertSpy = vi.fn();
	const shareInsertSpy = vi.fn();

	const userMaybeSingle = responses.userMaybeSingle ?? { data: null, error: null, status: 200 };
	const meetingSingle = responses.meetingSingle ?? { data: null, error: null, status: 200 };
	const meetingUpdateSingle = responses.meetingUpdateSingle ?? { data: null, error: null, status: 200 };
	const shareSingle = responses.shareSingle ?? { data: null, error: null, status: 200 };
	const heavyMemorySelect = responses.heavyMemorySelect ?? { data: [], error: null, status: 200 };

	const supabase = {
		from: vi.fn((table: string) => {
			if (table === 'users') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => userMaybeSingle
						})
					})
				};
			}

			if (table === 'meetings') {
				return {
					insert: (payload: unknown) => {
						meetingInsertSpy(payload);
						return {
							select: () => ({
								single: async () => meetingSingle
							})
						};
					},
					update: (_payload: unknown) => ({
						eq: () => ({
							select: () => ({
								single: async () => meetingUpdateSingle
							})
						})
					})
				};
			}

			if (table === 'shares') {
				return {
					insert: (payload: unknown) => {
						shareInsertSpy(payload);
						return {
							select: () => ({
								single: async () => shareSingle
							})
						};
					},
					select: () => createHeavyMemoryChain(heavyMemorySelect)
				};
			}

			throw new Error(`Unexpected table: ${table}`);
		})
	} as unknown as ServiceRoleSupabaseClient;

	return {
		adapter: createDatabaseAdapter({ supabase }),
		meetingInsertSpy,
		shareInsertSpy
	};
}

describe('database supabase adapter', () => {
	it('returns createMeeting success with mapped shape and insert payload', async () => {
		const { adapter, meetingInsertSpy } = createHarness({
			meetingSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Staying when I want to leave',
					user_mood: 'anxious',
					listening_only: false,
					started_at: '2026-02-15T04:00:00.000Z',
					ended_at: null
				},
				error: null,
				status: 201
			}
		});

		const result = await adapter.createMeeting({
			userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Staying when I want to leave',
			userMood: 'anxious',
			listeningOnly: false
		});

		expect(meetingInsertSpy).toHaveBeenCalledWith({
			user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Staying when I want to leave',
			user_mood: 'anxious',
			listening_only: false
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({
				id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
				userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
				topic: 'Staying when I want to leave',
				userMood: 'anxious',
				listeningOnly: false,
				startedAt: '2026-02-15T04:00:00.000Z',
				endedAt: null
			});
		}
	});

	it('maps invalid input to INPUT_INVALID', async () => {
		const { adapter } = createHarness();
		const result = await adapter.createMeeting({
			userId: '',
			topic: 'Topic',
			userMood: 'nervous',
			listeningOnly: false
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});

	it('maps missing user to NOT_FOUND', async () => {
		const { adapter } = createHarness({
			userMaybeSingle: {
				data: null,
				error: null,
				status: 200
			}
		});

		const result = await adapter.getUserById('fab8bc65-1f5e-4ef1-8606-ab51921f9a07');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
		}
	});

	it('maps network-ish upstream failure to UPSTREAM_UNAVAILABLE', async () => {
		const { adapter } = createHarness({
			shareSingle: {
				data: null,
				error: {
					message: 'fetch failed while reaching database'
				},
				status: 503
			}
		});

		const result = await adapter.appendShare({
			meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
			characterId: 'marcus',
			isUserShare: false,
			content: 'Now I can stay in the room.',
			significanceScore: 7,
			sequenceOrder: 4
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
		}
	});

	it('maps malformed upstream success payload to CONTRACT_VIOLATION', async () => {
		const { adapter } = createHarness({
			heavyMemorySelect: {
				data: [
					{
						id: 'f3f9bf9b-0ca5-4f16-8640-66f613e4cc99',
						meeting_id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
						character_id: 'heather',
						is_user_share: false,
						content: 'I called someone before I blew up my life.',
						significance_score: 99,
						sequence_order: 5,
						created_at: '2026-02-15T04:04:45.000Z'
					}
				],
				error: null,
				status: 200
			}
		});

		const result = await adapter.getHeavyMemory('fab8bc65-1f5e-4ef1-8606-ab51921f9a07');

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
		}
	});

	it('maps non-network upstream failures to UPSTREAM_ERROR', async () => {
		const { adapter } = createHarness({
			meetingSingle: {
				data: null,
				error: {
					code: '42501',
					message: 'permission denied for table meetings'
				},
				status: 401
			}
		});

		const result = await adapter.createMeeting({
			userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Honesty',
			userMood: 'hopeful',
			listeningOnly: false
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_ERROR);
		}
	});

	it('completes meeting by writing summary and endedAt', async () => {
		const { adapter } = createHarness({
			meetingUpdateSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Honesty',
					user_mood: 'hopeful',
					listening_only: false,
					started_at: '2026-02-15T04:00:00.000Z',
					ended_at: '2026-02-15T05:00:00.000Z'
				},
				error: null,
				status: 200
			}
		});

		const result = await adapter.completeMeeting({
			meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
			summary: 'Room stayed grounded and connected.',
			notableMoments: { marcus: 'Stayed in his seat.' }
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.endedAt).toBe('2026-02-15T05:00:00.000Z');
		}
	});
});
