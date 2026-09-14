/**
 * Purpose: Prove the owner-filtered meeting lookup contract before any implementation exists.
 * Why: The shared route gate must depend on one typed lookup with an explicit failure vocabulary.
 * Info flow: Meeting and user ids enter the validator and typed port method; seam results return.
 * Invariants: Both ids are required and nonempty; missing and wrong-owner outcomes share NOT_FOUND.
 */
import { describe, expect, it } from 'vitest';
import { err, SeamErrorCodes } from '$lib/core/seam';
import {
	DATABASE_ERROR_CODES,
	type DatabasePort,
	type GetOwnedMeetingInput,
	validateGetOwnedMeetingInput
} from './contract';

const validInput: GetOwnedMeetingInput = {
	meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
	userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07'
};

describe('owned meeting lookup contract', () => {
	it('requires nonempty meeting and user ids without mutating them', () => {
		const input = structuredClone(validInput);
		const before = structuredClone(input);

		expect(validateGetOwnedMeetingInput(input)).toBe(true);
		expect(input).toEqual(before);
		expect(validateGetOwnedMeetingInput({ ...validInput, meetingId: '' })).toBe(false);
		expect(validateGetOwnedMeetingInput({ ...validInput, meetingId: '   ' })).toBe(false);
		expect(validateGetOwnedMeetingInput({ ...validInput, userId: '' })).toBe(false);
		expect(validateGetOwnedMeetingInput({ ...validInput, userId: '   ' })).toBe(false);
		expect(validateGetOwnedMeetingInput({ meetingId: validInput.meetingId })).toBe(false);
		expect(validateGetOwnedMeetingInput({ userId: validInput.userId })).toBe(false);
		expect(validateGetOwnedMeetingInput(null)).toBe(false);
	});

	it('declares the port method and indistinguishable not-found failure', async () => {
		const getOwnedMeeting: DatabasePort['getOwnedMeeting'] = async (_input) =>
			err(SeamErrorCodes.NOT_FOUND, 'Meeting not found');

		const result = await getOwnedMeeting(validInput);
		expect(result).toEqual(err(SeamErrorCodes.NOT_FOUND, 'Meeting not found'));
	});

	it('keeps the input, not-found, upstream, and malformed-output error taxonomy available', () => {
		expect(DATABASE_ERROR_CODES).toEqual(
			expect.arrayContaining([
				SeamErrorCodes.INPUT_INVALID,
				SeamErrorCodes.NOT_FOUND,
				SeamErrorCodes.UPSTREAM_UNAVAILABLE,
				SeamErrorCodes.UPSTREAM_ERROR,
				SeamErrorCodes.CONTRACT_VIOLATION
			])
		);
	});
});
