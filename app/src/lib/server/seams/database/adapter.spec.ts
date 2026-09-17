import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import { CORE_CHARACTERS } from '$lib/core/characters';
import { MeetingPhase } from '$lib/core/types';
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
	userInsertSingle?: QueryResponse;
	userUpdateSingle?: QueryResponse;
	meetingSingle?: QueryResponse;
	meetingUpdateSingle?: QueryResponse;
	meetingMaybeSingle?: QueryResponse;
	meetingPhaseMaybeSingle?: QueryResponse;
	meetingPhaseUpdateMaybeSingle?: QueryResponse;
	meetingCountSelect?: QueryResponse;
	shareSingle?: QueryResponse;
	heavyMemorySelect?: QueryResponse;
	meetingParticipantsMaybeSingle?: QueryResponse;
	meetingParticipantsSelect?: QueryResponse;
	meetingParticipantsInsert?: QueryResponse;
	meetingParticipantsUpdateMaybeSingle?: QueryResponse;
	// Optional specific rows to return from the characters mock instead of default generated ones
	characterRows?: Array<{ id: string; name: string; intro_style?: string }>;
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

function defaultCharacterRows(): Array<{ id: string; name: string; intro_style: string }> {
	return CORE_CHARACTERS.map((character, index) => ({
		id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
		name: character.name,
		intro_style: character.id
	}));
}

function createHarness(responses: MockResponses = {}) {
	const meetingInsertSpy = vi.fn();
	const meetingUpdateSpy = vi.fn();
	const meetingSelectSpy = vi.fn();
	const meetingEqSpy = vi.fn();
	const shareInsertSpy = vi.fn();
	const userInsertSpy = vi.fn();
	const userUpdateSpy = vi.fn();

	const userMaybeSingle = responses.userMaybeSingle ?? { data: null, error: null, status: 200 };
	const userInsertSingle = responses.userInsertSingle ?? { data: null, error: null, status: 201 };
	const userUpdateSingle = responses.userUpdateSingle ?? { data: null, error: null, status: 200 };
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
	const meetingPhaseMaybeSingle = responses.meetingPhaseMaybeSingle ?? { data: null, error: null, status: 200 };
	const meetingPhaseUpdateMaybeSingle = responses.meetingPhaseUpdateMaybeSingle ?? {
		data: { id: 'meeting-1' },
		error: null,
		status: 200
	};
	const shareSingle = responses.shareSingle ?? { data: null, error: null, status: 200 };
	const heavyMemorySelect = responses.heavyMemorySelect ?? { data: [], error: null, status: 200 };
	const meetingParticipantsSelect = responses.meetingParticipantsSelect ?? {
		data: [],
		error: null,
		status: 200
	};
	const meetingParticipantsInsert = responses.meetingParticipantsInsert ?? {
		data: [],
		error: null,
		status: 201
	};
	const meetingParticipantsUpdateMaybeSingle = responses.meetingParticipantsUpdateMaybeSingle ?? {
		data: { meeting_id: 'meeting-1' },
		error: null,
		status: 200
	};
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
					}),
					insert: (payload: unknown) => {
						userInsertSpy(payload);
						return {
							select: () => ({
								single: async () => userInsertSingle
							})
						};
					},
					update: (payload: unknown) => {
						userUpdateSpy(payload);
						return {
							eq: () => ({
								select: () => ({
									single: async () => userUpdateSingle
								})
							})
						};
					}
				};
			}

			if (table === 'meetings') {
				return {
					insert: (payload: unknown) => {
						meetingInsertSpy(payload);
						return {
							select: (columns?: string) => {
								meetingSelectSpy(columns);
								return {
									single: async () => meetingSingle
								};
							}
						};
					},
					update: (payload: unknown) => {
						meetingUpdateSpy(payload);
						return {
							eq: (column: string, value: string) => {
								meetingEqSpy(column, value);
								return {
									select: (columns?: string) => {
										meetingSelectSpy(columns);
										return {
											single: async () => meetingUpdateSingle,
											maybeSingle: async () => meetingPhaseUpdateMaybeSingle
										};
									}
								};
							}
						};
					},
					select: (columns?: string) => {
						meetingSelectSpy(columns);
						return {
							eq: (firstCol: string, firstVal: string) => {
								meetingEqSpy(firstCol, firstVal);
								return {
									gt: async () => meetingCountSelect,
									maybeSingle: async () => meetingPhaseMaybeSingle,
									eq: (secondCol: string, secondVal: string) => {
										meetingEqSpy(secondCol, secondVal);
										return {
											maybeSingle: async () =>
												responses.meetingMaybeSingle ?? { data: null, error: null, status: 200 }
										};
									}
								};
							}
						};
					}
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

			if (table === 'meeting_participants') {
				return {
					select: () => ({
						eq: (_meetingColumn: string, meetingValue: string) => ({
							eq: (_characterColumn: string, characterValue: string) => ({
								maybeSingle: async () =>
									responses.meetingParticipantsMaybeSingle ??
									{
										data:
											(meetingParticipantsSelect.data as Array<Record<string, unknown>> | undefined)?.find(
												(row) =>
													row.meeting_id === meetingValue &&
													row.character_id === characterValue
											) ?? null,
										error: null,
										status: 200
									}
							}),
							order: async () => meetingParticipantsSelect
						})
					}),
					insert: () => meetingParticipantsInsert,
					update: () => ({
						eq: () => ({
							eq: () => ({
								select: () => ({
									maybeSingle: async () => meetingParticipantsUpdateMaybeSingle
								})
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
							// If explicit character rows are provided, prioritize filtering them
							if (responses.characterRows) {
								return {
									data: responses.characterRows.filter((row) => names.includes(row.name)),
									error: null,
									status: 200
								};
							}
							return {
								data: characterRows.filter((row) => names.includes(row.name)),
								error: null,
								status: 200
							};
						},
						eq: (_column: string, value: string) => ({
							maybeSingle: async () => {
								const match = characterRows.find(
									(row) => row.intro_style === value || row.name === value
								);
								return {
									data: match ?? null,
									error: null,
									status: 200
								};
							}
						})
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
											const introStyle =
												typeof record.intro_style === 'string' ? record.intro_style : undefined;
											const created = { id, name, intro_style: introStyle };
											characterRows.push(created);
											return created;
										})
										.filter(
											(row): row is { id: string; name: string; intro_style: string | undefined } =>
												row !== null
										)
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
		userInsertSpy,
		userUpdateSpy,
		meetingInsertSpy,
		meetingUpdateSpy,
		meetingSelectSpy,
		meetingEqSpy,
		shareInsertSpy
	};
}

describe('database supabase adapter', () => {
	it('returns createMeeting success with mapped snapshot fields and insert payload', async () => {
		const { adapter, meetingInsertSpy, meetingSelectSpy } = createHarness({
			meetingSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Staying when I want to leave',
					user_mood: 'anxious',
					user_mind: 'Mind Racing',
					user_display_name: 'Grace',
					user_clean_time: '18 months',
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
			userMind: 'Mind Racing',
			userDisplayName: 'Grace',
			userCleanTime: '18 months',
			listeningOnly: false
		});

		expect(meetingInsertSpy).toHaveBeenCalledWith({
			user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Staying when I want to leave',
			user_mood: 'anxious',
			user_mind: 'Mind Racing',
			user_display_name: 'Grace',
			user_clean_time: '18 months',
			listening_only: false
		});
		expect(meetingSelectSpy).toHaveBeenCalledWith(
			'id, user_id, topic, user_mood, user_mind, user_display_name, user_clean_time, listening_only, started_at, ended_at'
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({
				id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
				userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
				topic: 'Staying when I want to leave',
				userMood: 'anxious',
				userMind: 'Mind Racing',
				userDisplayName: 'Grace',
				userCleanTime: '18 months',
				listeningOnly: false,
				startedAt: '2026-02-15T04:00:00.000Z',
				endedAt: null
			});
		}
	});

	it('createMeeting defaults optional snapshot fields to null', async () => {
		const { adapter, meetingInsertSpy } = createHarness({
			meetingSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Honesty',
					user_mood: 'hopeful',
					user_mind: null,
					user_display_name: null,
					user_clean_time: null,
					listening_only: true,
					started_at: '2026-02-15T04:00:00.000Z',
					ended_at: null
				},
				error: null,
				status: 201
			}
		});

		const result = await adapter.createMeeting({
			userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Honesty',
			userMood: 'hopeful',
			userMind: null,
			userDisplayName: null,
			userCleanTime: null,
			listeningOnly: true
		});

		expect(meetingInsertSpy).toHaveBeenCalledWith({
			user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Honesty',
			user_mood: 'hopeful',
			user_mind: null,
			user_display_name: null,
			user_clean_time: null,
			listening_only: true
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.userMind).toBeNull();
			expect(result.value.userDisplayName).toBeNull();
			expect(result.value.userCleanTime).toBeNull();
		}
	});

	it('maps invalid input to INPUT_INVALID', async () => {
		const { adapter } = createHarness();
		const result = await adapter.createMeeting({
			userId: '',
			topic: 'Topic',
			userMood: 'nervous',
			userMind: null,
			userDisplayName: null,
			userCleanTime: null,
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
			interactionType: 'respond_to',
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
						interaction_type: 'respond_to',
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
			userMind: null,
			userDisplayName: null,
			userCleanTime: null,
			listeningOnly: false
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_ERROR);
		}
	});

	it('completes meeting by writing summary and endedAt and selecting all columns', async () => {
		const { adapter, meetingSelectSpy } = createHarness({
			meetingUpdateSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					user_id: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Honesty',
					user_mood: 'hopeful',
					user_mind: 'Staying clean',
					user_display_name: 'Grace',
					user_clean_time: '18 months',
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

		expect(meetingSelectSpy).toHaveBeenCalledWith(
			'id, user_id, topic, user_mood, user_mind, user_display_name, user_clean_time, listening_only, started_at, ended_at'
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.endedAt).toBe('2026-02-15T05:00:00.000Z');
			expect(result.value.userMind).toBe('Staying clean');
			expect(result.value.userDisplayName).toBe('Grace');
			expect(result.value.userCleanTime).toBe('18 months');
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

	it('updates meeting phase_state with serialized ISO timestamp', async () => {
		const { adapter, meetingUpdateSpy } = createHarness({
			meetingPhaseUpdateMaybeSingle: {
				data: { id: 'meeting-1' },
				error: null,
				status: 200
			}
		});
		const phaseStartedAt = new Date('2026-02-22T22:00:00.000Z');

		const result = await adapter.updateMeetingPhase('meeting-1', {
			currentPhase: MeetingPhase.SHARING_ROUND_1,
			phaseStartedAt,
			roundNumber: 1,
			preCrisisPhase: MeetingPhase.CLOSING,
			charactersSpokenThisRound: ['marcus'],
			userHasSharedInRound: false
		});

		expect(result.ok).toBe(true);
		expect(meetingUpdateSpy).toHaveBeenCalled();
		expect(meetingUpdateSpy.mock.calls[0][0]).toEqual({
			phase_state: {
				currentPhase: 'sharing_round_1',
				phaseStartedAt: phaseStartedAt.toISOString(),
				roundNumber: 1,
				preCrisisPhase: 'closing',
				charactersSpokenThisRound: ['marcus'],
				userHasSharedInRound: false
			}
		});
	});

	it('loads meeting phase_state and maps phaseStartedAt to Date', async () => {
		const { adapter } = createHarness({
			meetingPhaseMaybeSingle: {
				data: {
					phase_state: {
						currentPhase: 'crisis_mode',
						phaseStartedAt: '2026-02-22T22:05:00.000Z',
						roundNumber: 2,
						preCrisisPhase: 'sharing_round_2',
						charactersSpokenThisRound: ['marcus'],
						userHasSharedInRound: true
					}
				},
				error: null,
				status: 200
			}
		});

		const result = await adapter.getMeetingPhase('meeting-1');

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value?.currentPhase).toBe(MeetingPhase.CRISIS_MODE);
			expect(result.value?.phaseStartedAt).toBeInstanceOf(Date);
			expect(result.value?.phaseStartedAt.toISOString()).toBe('2026-02-22T22:05:00.000Z');
			expect(result.value?.preCrisisPhase).toBe(MeetingPhase.SHARING_ROUND_2);
			expect(result.value?.userHasSharedInRound).toBe(true);
		}
	});

	it('returns CONTRACT_VIOLATION for malformed meeting phase_state payload', async () => {
		const { adapter } = createHarness({
			meetingPhaseMaybeSingle: {
				data: {
					phase_state: {
						currentPhase: 'crisis_mode',
						phaseStartedAt: '2026-02-22T22:05:00.000Z',
						preCrisisPhase: 'crisis_mode',
						charactersSpokenThisRound: [],
						userHasSharedInRound: false
					}
				},
				error: null,
				status: 200
			}
		});

		const result = await adapter.getMeetingPhase('meeting-1');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
		}
	});

	it('returns ok(null) when meeting phase_state is absent', async () => {
		const { adapter } = createHarness({
			meetingPhaseMaybeSingle: {
				data: { phase_state: null },
				error: null,
				status: 200
			}
		});

		const result = await adapter.getMeetingPhase('meeting-1');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBeNull();
		}
	});

	it('returns NOT_FOUND when getMeetingPhase meeting row is missing', async () => {
		const { adapter } = createHarness({
			meetingPhaseMaybeSingle: {
				data: null,
				error: null,
				status: 200
			}
		});
		const result = await adapter.getMeetingPhase('missing-meeting');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
			expect(result.error.details).toMatchObject({
				method: 'getMeetingPhase',
				meetingId: 'missing-meeting'
			});
		}
	});

	it('ensureUserProfile inserts missing profile row', async () => {
		const { adapter, userInsertSpy } = createHarness({
			userMaybeSingle: { data: null, error: null, status: 200 },
			userInsertSingle: {
				data: {
					id: 'user-1',
					display_name: 'Guest',
					clean_time: null,
					meeting_count: 0,
					first_meeting_at: null,
					last_meeting_at: null
				},
				error: null,
				status: 201
			}
		});

		const result = await adapter.ensureUserProfile({
			id: 'user-1',
			displayName: 'Guest',
			cleanTime: null,
			isAnonymous: true
		});

		expect(userInsertSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'user-1',
				display_name: 'Guest',
				clean_time: null,
				is_anonymous: true
			})
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.displayName).toBe('Guest');
		}
	});

	it('ensureUserProfile preserves existing profile fields when row already exists', async () => {
		const { adapter, userInsertSpy, userUpdateSpy } = createHarness({
			userMaybeSingle: {
				data: {
					id: 'user-1',
					display_name: 'Johnny',
					clean_time: '2 years',
					meeting_count: 5,
					first_meeting_at: '2026-01-01T00:00:00.000Z',
					last_meeting_at: '2026-02-01T00:00:00.000Z',
					is_anonymous: false
				},
				error: null,
				status: 200
			}
		});

		const result = await adapter.ensureUserProfile({
			id: 'user-1',
			displayName: 'John',
			cleanTime: null,
			isAnonymous: false
		});

		expect(userInsertSpy).not.toHaveBeenCalled();
		expect(userUpdateSpy).not.toHaveBeenCalled();
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.displayName).toBe('Johnny');
			expect(result.value.cleanTime).toBe('2 years');
		}
	});

	it('ensureUserProfile upgrades anonymous flag true -> false without overwriting profile fields', async () => {
		const { adapter, userUpdateSpy } = createHarness({
			userMaybeSingle: {
				data: {
					id: 'user-1',
					display_name: 'Guest',
					clean_time: null,
					meeting_count: 0,
					first_meeting_at: null,
					last_meeting_at: null,
					is_anonymous: true
				},
				error: null,
				status: 200
			},
			userUpdateSingle: {
				data: {
					id: 'user-1',
					display_name: 'Guest',
					clean_time: null,
					meeting_count: 0,
					first_meeting_at: null,
					last_meeting_at: null
				},
				error: null,
				status: 200
			}
		});

		const result = await adapter.ensureUserProfile({
			id: 'user-1',
			displayName: 'Some Name',
			cleanTime: '99 days',
			isAnonymous: false
		});

		expect(userUpdateSpy).toHaveBeenCalledWith({ is_anonymous: false });
		expect(result.ok).toBe(true);
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
			characterRows: [{ id: marcusDbId, name: 'Marcus' }],
			shareSingle: {
				data: {
					id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					meeting_id: 'meeting-1',
					character_id: marcusDbId,
					is_user_share: false,
					content: 'Now I can stay in the room.',
					interaction_type: 'respond_to',
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
			interactionType: 'respond_to',
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

	it('rejects slug with CONTRACT_VIOLATION if map returns non-UUID (fix verification)', async () => {
		const { adapter, shareInsertSpy } = createHarness({
			charactersSelect: {
				data: [{ id: 'marcus', name: 'Marcus' }],
				error: null,
				status: 200
			},
			shareSingle: {
				data: null,
				error: null,
				status: 200
			}
		});

		const result = await adapter.appendShare({
			meetingId: 'meeting-1',
			characterId: 'marcus',
			isUserShare: false,
			content: 'test',
			interactionType: 'standard',
			significanceScore: 5,
			sequenceOrder: 1
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
		}
		expect(shareInsertSpy).not.toHaveBeenCalled();
	});

	describe('getOwnedMeeting', () => {
		const validMeetingId = '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3';
		const validUserId = 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07';

		it('returns meeting when owned by matching user', async () => {
			const { adapter, meetingSelectSpy, meetingEqSpy } = createHarness({
				meetingMaybeSingle: {
					data: {
						id: validMeetingId,
						user_id: validUserId,
						topic: 'Staying grounded',
						user_mood: 'hopeful',
						user_mind: 'One day at a time',
						user_display_name: 'Grace',
						user_clean_time: '90 days',
						listening_only: false,
						started_at: '2026-02-15T04:00:00.000Z',
						ended_at: null
					},
					error: null,
					status: 200
				}
			});

			const result = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: validUserId
			});

			expect(meetingSelectSpy).toHaveBeenCalledWith(
				'id, user_id, topic, user_mood, user_mind, user_display_name, user_clean_time, listening_only, started_at, ended_at'
			);
			expect(meetingEqSpy).toHaveBeenCalledWith('id', validMeetingId);
			expect(meetingEqSpy).toHaveBeenCalledWith('user_id', validUserId);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual({
					id: validMeetingId,
					userId: validUserId,
					topic: 'Staying grounded',
					userMood: 'hopeful',
					userMind: 'One day at a time',
					userDisplayName: 'Grace',
					userCleanTime: '90 days',
					listeningOnly: false,
					startedAt: '2026-02-15T04:00:00.000Z',
					endedAt: null
				});
			}
		});

		it('returns NOT_FOUND when meeting exists but owned by different user (wrong user)', async () => {
			const { adapter, meetingEqSpy } = createHarness({
				meetingMaybeSingle: {
					data: null,
					error: null,
					status: 200
				}
			});

			const result = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: 'attacker-or-other-user-uuid'
			});

			expect(meetingEqSpy).toHaveBeenCalledWith('id', validMeetingId);
			expect(meetingEqSpy).toHaveBeenCalledWith('user_id', 'attacker-or-other-user-uuid');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
				expect(result.error.message).toBe('Meeting not found');
				expect(result.error.details).toMatchObject({
					method: 'getOwnedMeeting',
					provider: 'supabase'
				});
			}
		});

		it('returns NOT_FOUND when meeting does not exist', async () => {
			const { adapter } = createHarness({
				meetingMaybeSingle: {
					data: null,
					error: null,
					status: 200
				}
			});

			const result = await adapter.getOwnedMeeting({
				meetingId: '00000000-0000-0000-0000-000000000000',
				userId: validUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
				expect(result.error.message).toBe('Meeting not found');
			}
		});

		it('produces indistinguishable NOT_FOUND responses for wrong user and non-existent meeting (INV-03)', async () => {
			const wrongUserHarness = createHarness({ meetingMaybeSingle: { data: null, error: null, status: 200 } });
			const nonexistentHarness = createHarness({ meetingMaybeSingle: { data: null, error: null, status: 200 } });

			const wrongUserResult = await wrongUserHarness.adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: 'wrong-user'
			});
			const nonexistentResult = await nonexistentHarness.adapter.getOwnedMeeting({
				meetingId: 'nonexistent-meeting',
				userId: validUserId
			});

			expect(wrongUserResult.ok).toBe(false);
			expect(nonexistentResult.ok).toBe(false);
			if (!wrongUserResult.ok && !nonexistentResult.ok) {
				expect(wrongUserResult.error.code).toBe(nonexistentResult.error.code);
				expect(wrongUserResult.error.message).toBe(nonexistentResult.error.message);
				expect(wrongUserResult.error.code).toBe(SeamErrorCodes.NOT_FOUND);
			}
		});

		it('rejects invalid inputs with INPUT_INVALID', async () => {
			const { adapter } = createHarness();

			const emptyMeeting = await adapter.getOwnedMeeting({ meetingId: '', userId: validUserId });
			expect(emptyMeeting.ok).toBe(false);
			if (!emptyMeeting.ok) expect(emptyMeeting.error.code).toBe(SeamErrorCodes.INPUT_INVALID);

			const emptyUser = await adapter.getOwnedMeeting({ meetingId: validMeetingId, userId: '' });
			expect(emptyUser.ok).toBe(false);
			if (!emptyUser.ok) expect(emptyUser.error.code).toBe(SeamErrorCodes.INPUT_INVALID);

			const nonObject = await adapter.getOwnedMeeting(null as unknown as { meetingId: string; userId: string });
			expect(nonObject.ok).toBe(false);
			if (!nonObject.ok) expect(nonObject.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		});

		it('maps upstream database network failure to UPSTREAM_UNAVAILABLE', async () => {
			const { adapter } = createHarness({
				meetingMaybeSingle: {
					data: null,
					error: { message: 'fetch failed' },
					status: 503
				}
			});

			const result = await adapter.getOwnedMeeting({ meetingId: validMeetingId, userId: validUserId });
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
			}
		});

		it('maps non-network upstream errors to UPSTREAM_ERROR', async () => {
			const { adapter } = createHarness({
				meetingMaybeSingle: {
					data: null,
					error: { code: '42501', message: 'permission denied for table meetings' },
					status: 500
				}
			});

			const result = await adapter.getOwnedMeeting({ meetingId: validMeetingId, userId: validUserId });
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_ERROR);
			}
		});

		it('maps malformed upstream row payload to CONTRACT_VIOLATION', async () => {
			const { adapter } = createHarness({
				meetingMaybeSingle: {
					data: {
						id: validMeetingId,
						// missing user_id, topic, user_mood
						listening_only: false
					},
					error: null,
					status: 200
				}
			});

			const result = await adapter.getOwnedMeeting({ meetingId: validMeetingId, userId: validUserId });
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
			}
		});

		it('normalizes missing or undefined snapshot fields to null without contract violation', async () => {
			const { adapter } = createHarness({
				meetingMaybeSingle: {
					data: {
						id: validMeetingId,
						user_id: validUserId,
						topic: 'Honesty',
						user_mood: 'hopeful',
						// user_mind, user_display_name, user_clean_time omitted completely
						listening_only: false,
						started_at: '2026-02-15T04:00:00.000Z',
						ended_at: null
					},
					error: null,
					status: 200
				}
			});

			const result = await adapter.getOwnedMeeting({ meetingId: validMeetingId, userId: validUserId });
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.userMind).toBeNull();
				expect(result.value.userDisplayName).toBeNull();
				expect(result.value.userCleanTime).toBeNull();
				expect(result.value.userMind).not.toBeUndefined();
				expect(result.value.userDisplayName).not.toBeUndefined();
				expect(result.value.userCleanTime).not.toBeUndefined();
			}
		});
	});
});
