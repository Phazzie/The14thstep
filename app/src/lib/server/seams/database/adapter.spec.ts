import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import { CORE_CHARACTERS } from '$lib/core/characters';
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
	count?: number | null;
}

interface MockResponses {
	userMaybeSingle?: QueryResponse;
	meetingSingle?: QueryResponse;
	meetingUpdateSingle?: QueryResponse;
	meetingCountSelect?: QueryResponse;
	shareSingle?: QueryResponse;
	heavyMemorySelect?: QueryResponse;
	characterRows?: Array<{ id: string; name: string }>;
	charactersSelect?: QueryResponse;
	characterInsertSelect?: QueryResponse;
}

function createCallbackLookupChain(response: QueryResponse) {
	return {
		eq: () => ({
			maybeSingle: async () => response
		})
	};
}

function createCallbacksSelectChain(response: QueryResponse) {
	const secondOrderChain = {
		limit: async () => response
	};

	const firstOrderChain = {
		order: () => secondOrderChain
	};

	const eqChain = {
		order: () => firstOrderChain
	};

	return {
		in: () => ({
			or: () => ({
				eq: () => eqChain,
				order: () => firstOrderChain
			})
		})
	};
}

function defaultCharacterRows(): Array<{ id: string; name: string }> {
	return CORE_CHARACTERS.map((character, index) => ({
		id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
		name: character.name
	}));
}

function createHarness(responses: MockResponses = {}) {
	const meetingInsertSpy = vi.fn();
	const shareInsertSpy = vi.fn();

	const userMaybeSingle = responses.userMaybeSingle ?? { data: null, error: null, status: 200 };
	const meetingSingle = responses.meetingSingle ?? { data: null, error: null, status: 200 };
	const meetingUpdateSingle = responses.meetingUpdateSingle ?? {
		data: null,
		error: null,
		status: 200
	};
	const meetingCountSelect = responses.meetingCountSelect ?? {
		data: null,
		error: null,
		status: 200,
		count: 0
	};
	const shareSingle = responses.shareSingle ?? { data: null, error: null, status: 200 };
	const heavyMemorySelect = responses.heavyMemorySelect ?? { data: [], error: null, status: 200 };
	const charactersSelect = responses.charactersSelect;
	const characterInsertSelect = responses.characterInsertSelect;
	const characterRows = [...(responses.characterRows ?? defaultCharacterRows())];

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
					update: () => ({
						eq: () => ({
							select: () => ({
								single: async () => meetingUpdateSingle
							})
						})
					}),
					select: () => ({
						eq: () => ({
							gt: async () => meetingCountSelect
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
					select: () => ({
						eq: () => ({
							maybeSingle: async () => shareSingle,
							order: () => ({
								order: async () => heavyMemorySelect,
								limit: async () => heavyMemorySelect
							})
						})
					})
				};
			}

			if (table === 'callbacks') {
				return {
					select: () => ({
						...createCallbacksSelectChain(heavyMemorySelect),
						...createCallbackLookupChain(shareSingle)
					}),
					insert: () => ({
						select: () => ({
							single: async () => shareSingle
						})
					}),
					update: () => ({
						eq: () => ({
							select: () => ({
								single: async () => shareSingle
							})
						})
					})
				};
			}

			if (table === 'characters') {
				return {
					select: () => ({
						in: async (_column: string, names: string[]) => {
							if (charactersSelect) return charactersSelect;
							return {
								data: characterRows.filter((row) => names.includes(row.name)),
								error: null,
								status: 200
							};
						}
					}),
					insert: (payload: unknown) => {
						const inserted =
							Array.isArray(payload) && payload.length > 0
								? payload
										.map((row, index) => {
											if (!row || typeof row !== 'object') return null;
											const record = row as Record<string, unknown>;
											const name = typeof record.name === 'string' ? record.name : null;
											if (!name) return null;
											const id = `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
											const created = { id, name };
											characterRows.push(created);
											return created;
										})
										.filter((row): row is { id: string; name: string } => row !== null)
								: [];

						return {
							select: async () => {
								if (characterInsertSelect) return characterInsertSelect;
								return {
									data: inserted,
									error: null,
									status: 201
								};
							}
						};
					}
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

	it('updates callbacks with lifecycle fields', async () => {
		const { adapter } = createHarness({
			shareSingle: {
				data: {
					id: '17b9f6ab-0f63-4b06-90d8-06bcdb54922d',
					origin_share_id: '6eaf7ef6-d1d8-4b12-bf99-135f2aef0568',
					character_id: 'marcus',
					original_text: 'I almost bounced and stayed in my chair.',
					callback_type: 'self_deprecation',
					scope: 'room',
					potential_score: 8,
					times_referenced: 12,
					last_referenced_at: '2026-02-18T10:00:00.000Z',
					status: 'stale',
					parent_callback_id: null
				},
				error: null,
				status: 200
			}
		});

		const result = await adapter.updateCallback({
			id: '17b9f6ab-0f63-4b06-90d8-06bcdb54922d',
			updates: {
				scope: 'room',
				status: 'stale',
				timesReferenced: 12,
				lastReferencedAt: '2026-02-18T10:00:00.000Z'
			}
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.status).toBe('stale');
			expect(result.value.scope).toBe('room');
		}
	});

	it('returns meeting counts after a date', async () => {
		const { adapter } = createHarness({
			meetingCountSelect: {
				data: null,
				error: null,
				status: 200,
				count: 18
			}
		});

		const result = await adapter.getMeetingCountAfterDate({
			userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			startedAfter: '2026-01-01T00:00:00.000Z'
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe(18);
		}
	});

	it('loads active callbacks scoped to the meeting and maps character ids', async () => {
		const marcusDbId = '00000000-0000-4000-8000-000000000001';
		const { adapter } = createHarness({
			heavyMemorySelect: {
				data: [
					{
						id: '17b9f6ab-0f63-4b06-90d8-06bcdb54922d',
						origin_share_id: '6eaf7ef6-d1d8-4b12-bf99-135f2aef0568',
						character_id: marcusDbId,
						original_text: 'I almost bounced and stayed in my chair.',
						callback_type: 'self_deprecation',
						scope: 'room',
						potential_score: 8,
						times_referenced: 2,
						last_referenced_at: '2026-02-18T10:00:00.000Z',
						status: 'active',
						parent_callback_id: null,
						shares: { meeting_id: 'meeting-1' }
					}
				],
				error: null,
				status: 200
			}
		});

		const result = await adapter.getActiveCallbacks({
			characterId: 'marcus',
			meetingId: 'meeting-1'
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toHaveLength(1);
			expect(result.value[0]?.characterId).toBe('marcus');
		}
	});

	it('translates slug ids to UUID for writes and maps UUID back to slug on reads', async () => {
		const marcusDbId = '00000000-0000-4000-8000-000000000001';
		const { adapter, shareInsertSpy } = createHarness({
			shareSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					meeting_id: 'meeting-1',
					character_id: marcusDbId,
					is_user_share: false,
					content: 'Now I can stay in the room.',
					significance_score: 7,
					sequence_order: 3,
					created_at: '2026-02-15T04:00:00.000Z'
				},
				error: null,
				status: 201
			}
		});

		const result = await adapter.appendShare({
			meetingId: 'meeting-1',
			characterId: 'marcus',
			isUserShare: false,
			content: 'Now I can stay in the room.',
			significanceScore: 7,
			sequenceOrder: 3
		});

		expect(shareInsertSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				character_id: marcusDbId
			})
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.characterId).toBe('marcus');
		}
	});
});
