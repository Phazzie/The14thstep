import { describe, expect, it } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	DATABASE_ERROR_CODES,
	validateAppendShareInput,
	validateMeetingRecord,
	validateShareRecord,
	validateUserProfile
} from './contract';
import { createDatabaseMock } from './mock';
import appendShareSample from './fixtures/appendShare.sample.json';
import createMeetingSample from './fixtures/createMeeting.sample.json';
import faultFixture from './fixtures/fault.json';
import getHeavyMemorySample from './fixtures/getHeavyMemory.sample.json';
import getUserByIdSample from './fixtures/getUserById.sample.json';

describe('database seam contract', () => {
	it('accepts documented seam error codes', () => {
		expect(DATABASE_ERROR_CODES).toContain(SeamErrorCodes.NOT_FOUND);
		expect(DATABASE_ERROR_CODES).toContain(SeamErrorCodes.CONTRACT_VIOLATION);
	});

	it('validates fixture shapes', () => {
		expect(validateUserProfile(getUserByIdSample)).toBe(true);
		expect(validateMeetingRecord(createMeetingSample)).toBe(true);
		expect(validateShareRecord(appendShareSample)).toBe(true);
		expect(
			(getHeavyMemorySample as unknown[]).every((record) => validateShareRecord(record))
		).toBe(true);
	});

	it('mock returns fixture values exactly', async () => {
		const mock = createDatabaseMock();

		const user = await mock.getUserById('fab8bc65-1f5e-4ef1-8606-ab51921f9a07');
		expect(user.ok).toBe(true);
		if (user.ok) {
			expect(user.value).toEqual(getUserByIdSample);
		}

		const createdMeeting = await mock.createMeeting({
			userId: 'fab8bc65-1f5e-4ef1-8606-ab51921f9a07',
			topic: 'Staying when I want to leave',
			userMood: 'anxious',
			listeningOnly: false
		});
		expect(createdMeeting.ok).toBe(true);
		if (createdMeeting.ok) {
			expect(createdMeeting.value).toEqual(createMeetingSample);
		}

		const appendedShare = await mock.appendShare({
			meetingId: '2f5dcf63-cf80-4e09-8e3e-13f93da72cf3',
			characterId: 'marcus',
			isUserShare: false,
			content: 'Now I have learned to sit in a hard minute.',
			significanceScore: 7,
			sequenceOrder: 4
		});
		expect(appendedShare.ok).toBe(true);
		if (appendedShare.ok) {
			expect(appendedShare.value).toEqual(appendShareSample);
		}

		const heavyMemory = await mock.getHeavyMemory('fab8bc65-1f5e-4ef1-8606-ab51921f9a07');
		expect(heavyMemory.ok).toBe(true);
		if (heavyMemory.ok) {
			expect(heavyMemory.value).toEqual(getHeavyMemorySample);
		}
	});

	it('mock can surface fault scenario per method', async () => {
		const mock = createDatabaseMock({
			scenarios: {
				getHeavyMemory: 'fault'
			}
		});

		const result = await mock.getHeavyMemory('fab8bc65-1f5e-4ef1-8606-ab51921f9a07');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe((faultFixture as { code: string }).code);
			expect(result.error.message).toBe((faultFixture as { message: string }).message);
		}
	});

	it('rejects invalid appendShare payloads', () => {
		expect(validateAppendShareInput({})).toBe(false);
		expect(
			validateAppendShareInput({
				meetingId: 'meeting-1',
				characterId: 'marcus',
				isUserShare: false,
				content: 'x',
				significanceScore: 11,
				sequenceOrder: 1
			})
		).toBe(false);
	});
});
