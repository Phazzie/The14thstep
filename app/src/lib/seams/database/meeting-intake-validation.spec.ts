/**
 * Purpose: Prove the staged meeting-intake contract without using captured I/O fixtures.
 * Why: Returned records and create inputs intentionally have different compatibility rules.
 * Info flow: Literal objects enter the validators; boolean results and object identity are observed.
 * Invariants: Output snapshots are present and nullable; create snapshots are optional and never mutated.
 */
import { describe, expect, it } from 'vitest';
import {
	type CreateMeetingInput,
	validateCreateMeetingInput,
	validateMeetingRecord
} from './contract';

const legacyCreateInput: CreateMeetingInput = {
	userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
	topic: 'Staying when I want to leave',
	userMood: 'anxious',
	listeningOnly: false
};

const createInputWithSnapshots: CreateMeetingInput = {
	...legacyCreateInput,
	userMind: 'I nearly left before the meeting started.',
	userDisplayName: 'River',
	userCleanTime: null
};

const completeMeetingRecord = {
	id: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
	...createInputWithSnapshots,
	userCleanTime: 'ninety days',
	startedAt: '2026-09-14T18:00:00.000Z',
	endedAt: null
};

const snapshotFields = ['userMind', 'userDisplayName', 'userCleanTime'] as const;
const malformedSnapshotValues = [42, true, {}, []] as const;

describe('meeting intake database validation', () => {
	it('requires each nullable intake snapshot on returned meeting records', () => {
		expect(validateMeetingRecord(completeMeetingRecord)).toBe(true);
		expect(
			validateMeetingRecord({
				...completeMeetingRecord,
				userMind: null,
				userDisplayName: null,
				userCleanTime: null
			})
		).toBe(true);

		for (const field of snapshotFields) {
			const missing = { ...completeMeetingRecord };
			delete (missing as Partial<typeof completeMeetingRecord>)[field];
			expect(validateMeetingRecord(missing), `${field} missing`).toBe(false);
			expect(
				validateMeetingRecord({ ...completeMeetingRecord, [field]: undefined }),
				`${field} undefined`
			).toBe(false);

			for (const malformed of malformedSnapshotValues) {
				expect(
					validateMeetingRecord({ ...completeMeetingRecord, [field]: malformed }),
					`${field} rejects ${typeof malformed}`
				).toBe(false);
			}
		}
	});

	it('keeps intake snapshots optional and nullable on staged create inputs', () => {
		expect(validateCreateMeetingInput(legacyCreateInput)).toBe(true);
		expect(validateCreateMeetingInput(createInputWithSnapshots)).toBe(true);
		expect(
			validateCreateMeetingInput({
				...legacyCreateInput,
				userMind: '',
				userDisplayName: '',
				userCleanTime: ''
			})
		).toBe(true);

		for (const field of snapshotFields) {
			expect(validateCreateMeetingInput({ ...createInputWithSnapshots, [field]: undefined })).toBe(
				true
			);

			for (const malformed of malformedSnapshotValues) {
				expect(
					validateCreateMeetingInput({ ...createInputWithSnapshots, [field]: malformed }),
					`${field} rejects ${typeof malformed}`
				).toBe(false);
			}
		}
	});

	it('retains baseline required-field validation with otherwise valid snapshots', () => {
		expect(validateCreateMeetingInput({ ...createInputWithSnapshots, userMood: '' })).toBe(false);
		expect(validateMeetingRecord({ ...completeMeetingRecord, listeningOnly: 'false' })).toBe(false);
	});

	it('does not fill, trim, or otherwise mutate supplied objects', () => {
		const record = structuredClone(completeMeetingRecord);
		const createInput = structuredClone(createInputWithSnapshots);
		const recordBefore = structuredClone(record);
		const createBefore = structuredClone(createInput);

		expect(validateMeetingRecord(record)).toBe(true);
		expect(validateCreateMeetingInput(createInput)).toBe(true);
		expect(record).toEqual(recordBefore);
		expect(createInput).toEqual(createBefore);
	});
});
