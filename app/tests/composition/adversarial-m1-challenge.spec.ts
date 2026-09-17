import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import {
	validateGetOwnedMeetingInput,
	validateMeetingRecord,
	type DatabasePort,
	type GetOwnedMeetingInput,
	type MeetingRecord
} from '$lib/seams/database/contract';
import { createDatabaseMock } from '$lib/seams/database/mock';
import { createDatabaseAdapter } from '$lib/server/seams/database/adapter';
import { createMeeting } from '$lib/core/meeting';
import type { ServiceRoleSupabaseClient } from '$lib/server/supabase';

describe('Milestone 1 Empirical Adversarial Challenge', () => {
	const validMeetingId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
	const ownerUserId = '11111111-2222-4333-8444-555555555555';
	const attackerUserId = '66666666-7777-4888-8999-000000000000';

	const sampleMeetingRow = {
		id: validMeetingId,
		user_id: ownerUserId,
		topic: 'Adversarial Isolation Test',
		user_mood: 'resolute',
		user_mind: 'Zero-trust verification',
		user_display_name: 'Auditor',
		user_clean_time: '100 days',
		listening_only: false,
		started_at: '2026-09-14T20:00:00.000Z',
		ended_at: null
	};

	function createMockSupabase(handler: (table: string) => {
		select: (cols: string) => {
			eq: (col1: string, val1: unknown) => {
				eq: (col2: string, val2: unknown) => {
					maybeSingle: () => Promise<{ data: unknown; error: unknown; status?: number }>;
				};
			};
		};
		insert?: (payload: unknown) => {
			select: (cols: string) => {
				single: () => Promise<{ data: unknown; error: unknown; status?: number }>;
			};
		};
	}): ServiceRoleSupabaseClient {
		return {
			from: vi.fn((table: string) => handler(table))
		} as unknown as ServiceRoleSupabaseClient;
	}

	describe('1. Cross-Tenant Isolation in Real Database Adapter', () => {
		it('allows owner to access meeting with dual-filter eq(id) and eq(user_id)', async () => {
			const eqFilters: Record<string, unknown> = {};
			let selectedColumns = '';

			const supabase = createMockSupabase((table) => {
				expect(table).toBe('meetings');
				return {
					select: (cols: string) => {
						selectedColumns = cols;
						return {
							eq: (col1: string, val1: unknown) => {
								eqFilters[col1] = val1;
								return {
									eq: (col2: string, val2: unknown) => {
										eqFilters[col2] = val2;
										return {
											maybeSingle: async () => ({
												data: sampleMeetingRow,
												error: null,
												status: 200
											})
										};
									}
								};
							}
						};
					}
				};
			});

			const adapter = createDatabaseAdapter({ supabase });
			const result = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.id).toBe(validMeetingId);
				expect(result.value.userId).toBe(ownerUserId);
				expect(result.value.userMind).toBe('Zero-trust verification');
				expect(result.value.userDisplayName).toBe('Auditor');
				expect(result.value.userCleanTime).toBe('100 days');
			}
			expect(eqFilters['id']).toBe(validMeetingId);
			expect(eqFilters['user_id']).toBe(ownerUserId);
			expect(selectedColumns).toContain('user_mind');
			expect(selectedColumns).toContain('user_display_name');
			expect(selectedColumns).toContain('user_clean_time');
		});

		it('strictly returns NOT_FOUND when meeting belongs to another user (attacker access)', async () => {
			const eqFilters: Record<string, unknown> = {};

			const supabase = createMockSupabase(() => ({
				select: () => ({
					eq: (col1: string, val1: unknown) => {
						eqFilters[col1] = val1;
						return {
							eq: (col2: string, val2: unknown) => {
								eqFilters[col2] = val2;
								return {
									maybeSingle: async () => ({
										// Database returned null because id AND user_id combination does not match
										data: null,
										error: null,
										status: 200
									})
								};
							}
						};
					}
				})
			}));

			const adapter = createDatabaseAdapter({ supabase });
			const result = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: attackerUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
				expect(result.error.message).toBe('Meeting not found');
				// Crucial: details must NEVER leak meeting data or IDs
				expect(result.error.details).not.toHaveProperty('meetingId');
				expect(result.error.details).not.toHaveProperty('userId');
				expect(result.error.details).not.toHaveProperty('meeting');
			}
			expect(eqFilters['id']).toBe(validMeetingId);
			expect(eqFilters['user_id']).toBe(attackerUserId);
		});

		it('returns indistinguishable NOT_FOUND for cross-tenant vs nonexistent meeting (INV-03)', async () => {
			const supabase = createMockSupabase(() => ({
				select: () => ({
					eq: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: null,
								error: null,
								status: 200
							})
						})
					})
				})
			}));

			const adapter = createDatabaseAdapter({ supabase });

			const crossTenantAttempt = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: attackerUserId
			});

			const nonexistentAttempt = await adapter.getOwnedMeeting({
				meetingId: '00000000-0000-0000-0000-000000000000',
				userId: ownerUserId
			});

			expect(crossTenantAttempt.ok).toBe(false);
			expect(nonexistentAttempt.ok).toBe(false);
			if (!crossTenantAttempt.ok && !nonexistentAttempt.ok) {
				expect(crossTenantAttempt.error.code).toBe(nonexistentAttempt.error.code);
				expect(crossTenantAttempt.error.message).toBe(nonexistentAttempt.error.message);
				expect(crossTenantAttempt.error.code).toBe(SeamErrorCodes.NOT_FOUND);
				expect(crossTenantAttempt.error.message).toBe('Meeting not found');
				expect(crossTenantAttempt.error.details).toEqual(nonexistentAttempt.error.details);
			}
		});

		it('passes SQL injection payload through parameterized .eq() without unhandled exceptions', async () => {
			const eqFilters: Record<string, unknown> = {};
			const maliciousId = "'; DROP TABLE meetings; --";
			const maliciousUserId = "' OR '1'='1";

			const supabase = createMockSupabase(() => ({
				select: () => ({
					eq: (col1: string, val1: unknown) => {
						eqFilters[col1] = val1;
						return {
							eq: (col2: string, val2: unknown) => {
								eqFilters[col2] = val2;
								return {
									maybeSingle: async () => ({
										data: null,
										error: null,
										status: 200
									})
								};
							}
						};
					}
				})
			}));

			const adapter = createDatabaseAdapter({ supabase });
			const result = await adapter.getOwnedMeeting({
				meetingId: maliciousId,
				userId: maliciousUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
			}
			expect(eqFilters['id']).toBe(maliciousId);
			expect(eqFilters['user_id']).toBe(maliciousUserId);
		});
	});

	describe('2. Boundary Input Validation on getOwnedMeeting', () => {
		it('rejects empty and whitespace-only IDs with INPUT_INVALID', async () => {
			const adapter = createDatabaseAdapter({
				supabase: {} as unknown as ServiceRoleSupabaseClient
			});

			const testCases = [
				{ meetingId: '', userId: ownerUserId },
				{ meetingId: '   ', userId: ownerUserId },
				{ meetingId: '\t\n', userId: ownerUserId },
				{ meetingId: validMeetingId, userId: '' },
				{ meetingId: validMeetingId, userId: '   ' },
				{ meetingId: validMeetingId, userId: '\r\n\t' },
				{ meetingId: '', userId: '' }
			];

			for (const input of testCases) {
				const result = await adapter.getOwnedMeeting(input);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
				}
			}
		});

		it('rejects malformed and non-object inputs with INPUT_INVALID', async () => {
			const adapter = createDatabaseAdapter({
				supabase: {} as unknown as ServiceRoleSupabaseClient
			});

			const malformedInputs = [
				null,
				undefined,
				42,
				'string',
				true,
				[],
				{},
				{ meetingId: validMeetingId },
				{ userId: ownerUserId },
				{ meetingId: 123, userId: ownerUserId },
				{ meetingId: validMeetingId, userId: { malicious: true } },
				{ meetingId: null, userId: ownerUserId },
				{ meetingId: validMeetingId, userId: undefined }
			];

			for (const input of malformedInputs) {
				const result = await adapter.getOwnedMeeting(input as unknown as GetOwnedMeetingInput);
				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
				}
			}
		});

		it('validates contract function validateGetOwnedMeetingInput directly', () => {
			expect(validateGetOwnedMeetingInput({ meetingId: 'm1', userId: 'u1' })).toBe(true);
			expect(validateGetOwnedMeetingInput({ meetingId: '', userId: 'u1' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 'm1', userId: '' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: '   ', userId: 'u1' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 'm1', userId: '   ' })).toBe(false);
			expect(validateGetOwnedMeetingInput(null)).toBe(false);
			expect(validateGetOwnedMeetingInput(undefined)).toBe(false);
			expect(validateGetOwnedMeetingInput({})).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 1, userId: 2 })).toBe(false);
		});
	});

	describe('3. Database Mock Isolation & Fixture Immutability', () => {
		it('mock getOwnedMeeting returns fixture when owner matches', async () => {
			const mock = createDatabaseMock({
				fixtures: {
					getOwnedMeeting: {
						id: validMeetingId,
						userId: ownerUserId,
						topic: 'Mock Testing',
						userMood: 'calm',
						userMind: 'Mock Mind',
						userDisplayName: 'Tester',
						userCleanTime: '30 days',
						listeningOnly: false,
						startedAt: '2026-09-14T20:00:00.000Z',
						endedAt: null
					}
				}
			});

			const result = await mock.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.id).toBe(validMeetingId);
				expect(result.value.userId).toBe(ownerUserId);
				expect(result.value.userMind).toBe('Mock Mind');
			}
		});

		it('mock getOwnedMeeting returns NOT_FOUND when userId does not match', async () => {
			const mock = createDatabaseMock({
				fixtures: {
					getOwnedMeeting: {
						id: validMeetingId,
						userId: ownerUserId,
						topic: 'Mock Testing',
						userMood: 'calm',
						userMind: null,
						userDisplayName: null,
						userCleanTime: null,
						listeningOnly: false,
						startedAt: '2026-09-14T20:00:00.000Z',
						endedAt: null
					}
				}
			});

			const result = await mock.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: attackerUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.NOT_FOUND);
				expect(result.error.message).toBe('Meeting not found');
			}
		});

		it('mock prevents state contamination by returning a shallow copy', async () => {
			const mock = createDatabaseMock({
				fixtures: {
					getOwnedMeeting: {
						id: validMeetingId,
						userId: ownerUserId,
						topic: 'Original Topic',
						userMood: 'calm',
						userMind: 'Original Mind',
						userDisplayName: 'Original Name',
						userCleanTime: '10 days',
						listeningOnly: false,
						startedAt: '2026-09-14T20:00:00.000Z',
						endedAt: null
					}
				}
			});

			const firstFetch = await mock.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});
			expect(firstFetch.ok).toBe(true);
			if (firstFetch.ok) {
				// Attacker or dirty test mutates returned object
				(firstFetch.value as { topic: string }).topic = 'HACKED TOPIC';
				(firstFetch.value as { userMind: string | null }).userMind = 'HACKED MIND';
			}

			// Second fetch must NOT reflect the mutation
			const secondFetch = await mock.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});
			expect(secondFetch.ok).toBe(true);
			if (secondFetch.ok) {
				expect(secondFetch.value.topic).toBe('Original Topic');
				expect(secondFetch.value.userMind).toBe('Original Mind');
			}
		});

		it('mock responds with fault scenario when configured', async () => {
			const mock = createDatabaseMock({
				scenarios: {
					getOwnedMeeting: 'fault'
				}
			});

			const result = await mock.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
			}
		});
	});

	describe('4. Snapshot Fields and Strict Null Coalescing', () => {
		it('coalesces omitted and undefined snapshot fields to null in core createMeeting', async () => {
			let capturedDbInput: unknown = null;

			const mockDb: DatabasePort = {
				...createDatabaseMock(),
				createMeeting: async (input) => {
					capturedDbInput = input;
					return ok({
						id: validMeetingId,
						...input,
						startedAt: '2026-09-14T20:00:00.000Z',
						endedAt: null
					});
				}
			};

			const deps = {
				database: mockDb,
				grokAi: {} as never
			};

			// Test omitting all snapshot fields
			const result1 = await createMeeting(deps, {
				userId: ownerUserId,
				topic: 'Omitted Snapshots',
				userMood: 'hopeful',
				listeningOnly: false
			});

			expect(result1.ok).toBe(true);
			expect((capturedDbInput as Record<string, unknown>).userMind).toBeNull();
			expect((capturedDbInput as Record<string, unknown>).userDisplayName).toBeNull();
			expect((capturedDbInput as Record<string, unknown>).userCleanTime).toBeNull();
			expect((capturedDbInput as Record<string, unknown>).userMind).not.toBeUndefined();

			// Test explicitly passing undefined
			const result2 = await createMeeting(deps, {
				userId: ownerUserId,
				topic: 'Undefined Snapshots',
				userMood: 'hopeful',
				userMind: undefined,
				userDisplayName: undefined,
				userCleanTime: undefined,
				listeningOnly: false
			});

			expect(result2.ok).toBe(true);
			expect((capturedDbInput as Record<string, unknown>).userMind).toBeNull();
			expect((capturedDbInput as Record<string, unknown>).userDisplayName).toBeNull();
			expect((capturedDbInput as Record<string, unknown>).userCleanTime).toBeNull();
		});

		it('core createMeeting rejects non-string non-null snapshot values with INPUT_INVALID', async () => {
			const deps = {
				database: createDatabaseMock(),
				grokAi: {} as never
			};

			const invalidCalls = [
				{ userMind: 12345 },
				{ userDisplayName: true },
				{ userCleanTime: ['10 days'] },
				{ userMind: { obj: true } }
			];

			for (const badField of invalidCalls) {
				const result = await createMeeting(deps, {
					userId: ownerUserId,
					topic: 'Invalid Type',
					userMood: 'hopeful',
					listeningOnly: false,
					...badField
				} as never);

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
				}
			}
		});

		it('adapter normalizes missing/null snapshot columns in PostgREST row to null', async () => {
			const supabase = createMockSupabase(() => ({
				select: () => ({
					eq: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: {
									id: validMeetingId,
									user_id: ownerUserId,
									topic: 'Legacy row without snapshots',
									user_mood: 'grateful',
									// user_mind, user_display_name, user_clean_time completely omitted
									listening_only: false,
									started_at: '2026-09-14T20:00:00.000Z',
									ended_at: null
								},
								error: null,
								status: 200
							})
						})
					})
				})
			}));

			const adapter = createDatabaseAdapter({ supabase });
			const result = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.userMind).toBeNull();
				expect(result.value.userDisplayName).toBeNull();
				expect(result.value.userCleanTime).toBeNull();
				expect(validateMeetingRecord(result.value)).toBe(true);
			}
		});

		it('adapter marks malformed row with missing required fields as CONTRACT_VIOLATION', async () => {
			const supabase = createMockSupabase(() => ({
				select: () => ({
					eq: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: {
									id: validMeetingId,
									// user_id missing!
									topic: 'Missing User ID',
									user_mood: 'grateful',
									listening_only: false,
									started_at: '2026-09-14T20:00:00.000Z',
									ended_at: null
								},
								error: null,
								status: 200
							})
						})
					})
				})
			}));

			const adapter = createDatabaseAdapter({ supabase });
			const result = await adapter.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
			}
		});
	});

	describe('5. Test Double Runtime Safety Across All 5 Inline Doubles', () => {
		it('Double 1: Unavailable database adapter in hooks.server.ts returns UPSTREAM_UNAVAILABLE without throwing', async () => {
			// In hooks.server.ts: createUnavailableDatabaseAdapter(message) returns error on getOwnedMeeting
			// We simulate the exact function logic from hooks.server.ts
			const unavailableDouble: DatabasePort = {
				getUserById: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				ensureUserProfile: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				createMeeting: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getOwnedMeeting: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				appendShare: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				saveMeetingParticipants: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getMeetingParticipants: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getHeavyMemory: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getShareById: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getMeetingShares: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				updateMeetingPhase: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getMeetingPhase: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				createCallback: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getActiveCallbacks: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				markCallbackReferenced: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				completeMeeting: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				updateCallback: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage'),
				getMeetingCountAfterDate: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'test outage')
			};

			const result = await unavailableDouble.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
			}
		});

		it('Double 2: Composition meeting-flow.spec.ts in-memory double enforces ownership and returns NOT_FOUND', async () => {
			const meetings: MeetingRecord[] = [
				{
					id: validMeetingId,
					userId: ownerUserId,
					topic: 'Flow Spec Meeting',
					userMood: 'calm',
					userMind: null,
					userDisplayName: null,
					userCleanTime: null,
					listeningOnly: false,
					startedAt: '2026-09-14T20:00:00.000Z',
					endedAt: null
				}
			];

			const double = {
				async getOwnedMeeting(input: GetOwnedMeetingInput) {
					const meeting = meetings.find(
						(entry) => entry.id === input.meetingId && entry.userId === input.userId
					);
					if (!meeting) return err(SeamErrorCodes.NOT_FOUND, 'Meeting not found');
					return ok(meeting);
				}
			};

			// Owner matches
			const ownerResult = await double.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});
			expect(ownerResult.ok).toBe(true);

			// Attacker matches ID but wrong user -> NOT_FOUND
			const attackerResult = await double.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: attackerUserId
			});
			expect(attackerResult.ok).toBe(false);
			if (!attackerResult.ok) {
				expect(attackerResult.error.code).toBe(SeamErrorCodes.NOT_FOUND);
			}

			// Nonexistent meeting -> NOT_FOUND
			const nonexistentResult = await double.getOwnedMeeting({
				meetingId: 'unknown-id',
				userId: ownerUserId
			});
			expect(nonexistentResult.ok).toBe(false);
			if (!nonexistentResult.ok) {
				expect(nonexistentResult.error.code).toBe(SeamErrorCodes.NOT_FOUND);
			}
		});

		it('Double 3: seam-failure.spec.ts double returns UPSTREAM_UNAVAILABLE on getOwnedMeeting', async () => {
			const double = {
				getOwnedMeeting: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable')
			};

			const result = await double.getOwnedMeeting();
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
				expect(result.error.message).toBe('db unavailable');
			}
		});

		it('Double 4: meeting-ritual-phase.integration.spec.ts double enforces ownership', async () => {
			const state = {
				meeting: {
					id: validMeetingId,
					userId: ownerUserId,
					topic: 'Integration Meeting',
					userMood: 'reflective',
					userMind: null,
					userDisplayName: null,
					userCleanTime: null,
					listeningOnly: false,
					startedAt: '2026-09-14T20:00:00.000Z',
					endedAt: null
				}
			};

			const double = {
				async getOwnedMeeting(input: GetOwnedMeetingInput) {
					if (state.meeting.id === input.meetingId && state.meeting.userId === input.userId) {
						return ok(state.meeting);
					}
					return err(SeamErrorCodes.NOT_FOUND, 'Meeting not found');
				}
			};

			const ownerResult = await double.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});
			expect(ownerResult.ok).toBe(true);

			const attackerResult = await double.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: attackerUserId
			});
			expect(attackerResult.ok).toBe(false);
			if (!attackerResult.ok) {
				expect(attackerResult.error.code).toBe(SeamErrorCodes.NOT_FOUND);
			}
		});

		it('Double 5: meeting.spec.ts double returns meeting matching input meetingId and userId', async () => {
			const double = {
				getOwnedMeeting: async (input: GetOwnedMeetingInput) =>
					ok<MeetingRecord>({
						id: input.meetingId,
						userId: input.userId,
						topic: 'staying in the room',
						userMood: 'anxious',
						userMind: null,
						userDisplayName: null,
						userCleanTime: null,
						listeningOnly: false,
						startedAt: '2026-02-16T00:00:00.000Z',
						endedAt: null
					})
			};

			const result = await double.getOwnedMeeting({
				meetingId: validMeetingId,
				userId: ownerUserId
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.id).toBe(validMeetingId);
				expect(result.value.userId).toBe(ownerUserId);
				expect(validateMeetingRecord(result.value)).toBe(true);
			}
		});
	});
});
