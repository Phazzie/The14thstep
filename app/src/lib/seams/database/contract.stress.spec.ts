import { describe, expect, it } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	validateMeetingRecord,
	validateCreateMeetingInput,
	validateGetOwnedMeetingInput,
	type MeetingRecord
} from './contract';
import { createDatabaseMock } from './mock';
import createMeetingSample from './fixtures/createMeeting.sample.json';
import { createMeeting as coreCreateMeeting } from '$lib/core/meeting';

describe('Milestone 1 Empirical Stress & Boundary Harness', () => {
	const baseValidMeeting: MeetingRecord = {
		id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
		userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
		topic: 'Staying when I want to leave',
		userMood: 'anxious',
		userMind: 'Staying sober when I want to run',
		userDisplayName: 'trap',
		userCleanTime: '19 days',
		listeningOnly: false,
		startedAt: '2026-02-15T04:00:00.000Z',
		endedAt: null
	};

	describe('validateMeetingRecord — Boundary & Hostile Value Analysis', () => {
		it('accepts valid record with null snapshot fields', () => {
			const record = {
				...baseValidMeeting,
				userMind: null,
				userDisplayName: null,
				userCleanTime: null
			};
			expect(validateMeetingRecord(record)).toBe(true);
		});

		it('accepts valid record with empty strings for snapshot fields', () => {
			const record = {
				...baseValidMeeting,
				userMind: '',
				userDisplayName: '',
				userCleanTime: ''
			};
			expect(validateMeetingRecord(record)).toBe(true);
		});

		it('accepts valid record with whitespace and hostile unicode in snapshot fields', () => {
			const record = {
				...baseValidMeeting,
				userMind: '   \t\n   ',
				userDisplayName: '🔥💀🚀 \u0000 test',
				userCleanTime: 'A'.repeat(10000)
			};
			expect(validateMeetingRecord(record)).toBe(true);
		});

		it('REJECTS record when userMind is undefined (boundary violation)', () => {
			const record = { ...baseValidMeeting, userMind: undefined };
			expect(validateMeetingRecord(record)).toBe(false);
		});

		it('REJECTS record when userDisplayName is undefined (boundary violation)', () => {
			const record = { ...baseValidMeeting, userDisplayName: undefined };
			expect(validateMeetingRecord(record)).toBe(false);
		});

		it('REJECTS record when userCleanTime is undefined (boundary violation)', () => {
			const record = { ...baseValidMeeting, userCleanTime: undefined };
			expect(validateMeetingRecord(record)).toBe(false);
		});

		it('REJECTS record when snapshot fields are omitted entirely from object', () => {
			const { userMind: _m, userDisplayName: _d, userCleanTime: _c, ...omitted } = baseValidMeeting;
			expect(validateMeetingRecord(omitted)).toBe(false);
		});

		const hostileNonStringValues = [
			{ label: 'number zero', val: 0 },
			{ label: 'positive integer', val: 123 },
			{ label: 'NaN', val: Number.NaN },
			{ label: 'Infinity', val: Number.POSITIVE_INFINITY },
			{ label: 'boolean true', val: true },
			{ label: 'boolean false', val: false },
			{ label: 'empty object', val: {} },
			{ label: 'nested object', val: { text: 'hello' } },
			{ label: 'empty array', val: [] },
			{ label: 'array of strings', val: ['hello'] },
			{ label: 'function', val: () => 'hello' },
			{ label: 'symbol', val: Symbol('test') },
			{ label: 'bigint', val: 9007199254740991n }
		];

		for (const { label, val } of hostileNonStringValues) {
			it(`REJECTS record when userMind is ${label}`, () => {
				const record = { ...baseValidMeeting, userMind: val };
				expect(validateMeetingRecord(record)).toBe(false);
			});

			it(`REJECTS record when userDisplayName is ${label}`, () => {
				const record = { ...baseValidMeeting, userDisplayName: val };
				expect(validateMeetingRecord(record)).toBe(false);
			});

			it(`REJECTS record when userCleanTime is ${label}`, () => {
				const record = { ...baseValidMeeting, userCleanTime: val };
				expect(validateMeetingRecord(record)).toBe(false);
			});
		}

		it('REJECTS record with empty or whitespace-only required strings', () => {
			expect(validateMeetingRecord({ ...baseValidMeeting, id: '' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, id: '   ' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, userId: '' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, userId: '   ' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, topic: '' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, topic: '   ' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, userMood: '' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, userMood: '   ' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, startedAt: '' })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, startedAt: '   ' })).toBe(false);
		});

		it('enforces endedAt nullable string semantics', () => {
			expect(validateMeetingRecord({ ...baseValidMeeting, endedAt: null })).toBe(true);
			expect(validateMeetingRecord({ ...baseValidMeeting, endedAt: '2026-02-15T05:00:00.000Z' })).toBe(true);
			expect(validateMeetingRecord({ ...baseValidMeeting, endedAt: undefined })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, endedAt: 12345 })).toBe(false);
		});

		it('enforces listeningOnly boolean semantics', () => {
			expect(validateMeetingRecord({ ...baseValidMeeting, listeningOnly: true })).toBe(true);
			expect(validateMeetingRecord({ ...baseValidMeeting, listeningOnly: false })).toBe(true);
			expect(validateMeetingRecord({ ...baseValidMeeting, listeningOnly: 'false' as unknown as boolean })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, listeningOnly: null as unknown as boolean })).toBe(false);
			expect(validateMeetingRecord({ ...baseValidMeeting, listeningOnly: undefined as unknown as boolean })).toBe(false);
		});
	});

	describe('validateCreateMeetingInput — Boundary Analysis', () => {
		const baseInput = {
			userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Staying when I want to leave',
			userMood: 'anxious',
			userMind: 'Staying sober when I want to run',
			userDisplayName: 'trap',
			userCleanTime: '19 days',
			listeningOnly: false
		};

		it('accepts valid input with strings or nulls', () => {
			expect(validateCreateMeetingInput(baseInput)).toBe(true);
			expect(
				validateCreateMeetingInput({
					...baseInput,
					userMind: null,
					userDisplayName: null,
					userCleanTime: null
				})
			).toBe(true);
		});

		it('REJECTS input when snapshot fields are undefined', () => {
			expect(validateCreateMeetingInput({ ...baseInput, userMind: undefined })).toBe(false);
			expect(validateCreateMeetingInput({ ...baseInput, userDisplayName: undefined })).toBe(false);
			expect(validateCreateMeetingInput({ ...baseInput, userCleanTime: undefined })).toBe(false);
		});

		it('REJECTS input when snapshot fields are omitted (seam boundary check)', () => {
			const { userMind: _m, userDisplayName: _d, userCleanTime: _c, ...omitted } = baseInput;
			expect(validateCreateMeetingInput(omitted)).toBe(false);
		});

		it('REJECTS input with non-string snapshot fields', () => {
			expect(validateCreateMeetingInput({ ...baseInput, userMind: 123 })).toBe(false);
			expect(validateCreateMeetingInput({ ...baseInput, userDisplayName: false })).toBe(false);
			expect(validateCreateMeetingInput({ ...baseInput, userCleanTime: {} })).toBe(false);
		});
	});

	describe('validateGetOwnedMeetingInput — Boundary Analysis', () => {
		it('accepts valid meetingId and userId strings', () => {
			expect(
				validateGetOwnedMeetingInput({
					meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
					userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07'
				})
			).toBe(true);
		});

		it('REJECTS empty or whitespace meetingId', () => {
			expect(validateGetOwnedMeetingInput({ meetingId: '', userId: 'u' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: '   ', userId: 'u' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: '\t\n', userId: 'u' })).toBe(false);
		});

		it('REJECTS empty or whitespace userId', () => {
			expect(validateGetOwnedMeetingInput({ meetingId: 'm', userId: '' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 'm', userId: '   ' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 'm', userId: '\t\n' })).toBe(false);
		});

		it('REJECTS non-object or missing parameters', () => {
			expect(validateGetOwnedMeetingInput(null)).toBe(false);
			expect(validateGetOwnedMeetingInput(undefined)).toBe(false);
			expect(validateGetOwnedMeetingInput('string')).toBe(false);
			expect(validateGetOwnedMeetingInput(123)).toBe(false);
			expect(validateGetOwnedMeetingInput({})).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 'm' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ userId: 'u' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 123, userId: 'u' })).toBe(false);
			expect(validateGetOwnedMeetingInput({ meetingId: 'm', userId: null })).toBe(false);
		});
	});

	describe('Database Mock — Contract Violation Guarding on Undefined Fields', () => {
		it('triggers CONTRACT_VIOLATION when getOwnedMeeting fixture has undefined userMind', async () => {
			const corruptFixture = {
				...createMeetingSample,
				userMind: undefined as unknown as string | null
			};

			const mock = createDatabaseMock({
				fixtures: {
					getOwnedMeeting: corruptFixture as unknown as MeetingRecord
				}
			});

			const result = await mock.getOwnedMeeting({
				meetingId: corruptFixture.id,
				userId: corruptFixture.userId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
				expect(result.error.message).toBe('Fixture violates MeetingRecord');
			}
		});

		it('triggers CONTRACT_VIOLATION when getOwnedMeeting fixture has undefined userDisplayName', async () => {
			const corruptFixture = {
				...createMeetingSample,
				userDisplayName: undefined as unknown as string | null
			};

			const mock = createDatabaseMock({
				fixtures: {
					getOwnedMeeting: corruptFixture as unknown as MeetingRecord
				}
			});

			const result = await mock.getOwnedMeeting({
				meetingId: corruptFixture.id,
				userId: corruptFixture.userId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
				expect(result.error.message).toBe('Fixture violates MeetingRecord');
			}
		});

		it('triggers CONTRACT_VIOLATION when getOwnedMeeting fixture has undefined userCleanTime', async () => {
			const corruptFixture = {
				...createMeetingSample,
				userCleanTime: undefined as unknown as string | null
			};

			const mock = createDatabaseMock({
				fixtures: {
					getOwnedMeeting: corruptFixture as unknown as MeetingRecord
				}
			});

			const result = await mock.getOwnedMeeting({
				meetingId: corruptFixture.id,
				userId: corruptFixture.userId
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
				expect(result.error.message).toBe('Fixture violates MeetingRecord');
			}
		});

		it('isolates caller mutations from internal mock fixture state', async () => {
			const mock = createDatabaseMock();
			const firstCall = await mock.getOwnedMeeting({
				meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
				userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07'
			});

			expect(firstCall.ok).toBe(true);
			if (firstCall.ok) {
				firstCall.value.topic = 'MUTATED_IN_TEST';
				firstCall.value.userMind = 'MUTATED_MIND';
			}

			const secondCall = await mock.getOwnedMeeting({
				meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
				userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07'
			});

			expect(secondCall.ok).toBe(true);
			if (secondCall.ok) {
				expect(secondCall.value.topic).toBe('Staying when I want to leave');
				expect(secondCall.value.userMind).toBe('Staying sober when I want to run');
			}
		});
	});

	describe('Core Domain — Null Coalescing & Boundary Discipline', () => {
		it('coalesces undefined input fields to null without contract violation', async () => {
			let passedToDatabase: unknown = null;
			const mockDb = createDatabaseMock();
			const originalCreate = mockDb.createMeeting;
			mockDb.createMeeting = async (input) => {
				passedToDatabase = input;
				return originalCreate(input);
			};

			const result = await coreCreateMeeting(
				{ database: mockDb, grokAi: null as never },
				{
					userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Honesty',
					userMood: 'hopeful',
					// userMind, userDisplayName, userCleanTime intentionally omitted (undefined)
					listeningOnly: false
				}
			);

			expect(result.ok).toBe(true);
			expect(passedToDatabase).toEqual({
				userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
				topic: 'Honesty',
				userMood: 'hopeful',
				userMind: null,
				userDisplayName: null,
				userCleanTime: null,
				listeningOnly: false
			});
		});

		it('rejects non-string types on snapshot fields at the domain boundary', async () => {
			const mockDb = createDatabaseMock();
			const result = await coreCreateMeeting(
				{ database: mockDb, grokAi: null as never },
				{
					userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
					topic: 'Honesty',
					userMood: 'hopeful',
					userMind: 12345 as unknown as string,
					listeningOnly: false
				}
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
				expect(result.error.message).toBe('Invalid createMeeting input');
			}
		});
	});
});
