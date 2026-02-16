import { SeamErrorCodes, err, ok, type SeamErrorCode } from '$lib/core/seam';
import type { DatabasePort, MeetingRecord, ShareRecord, UserProfile } from './contract';
import {
	validateAppendShareInput,
	validateCreateMeetingInput,
	validateMeetingRecord,
	validateShareRecord,
	validateUserProfile
} from './contract';
import appendShareSample from './fixtures/appendShare.sample.json';
import createMeetingSample from './fixtures/createMeeting.sample.json';
import faultFixture from './fixtures/fault.json';
import getHeavyMemorySample from './fixtures/getHeavyMemory.sample.json';
import getUserByIdSample from './fixtures/getUserById.sample.json';

type DatabaseScenario = 'sample' | 'fault';

type DatabaseMethod = 'getUserById' | 'createMeeting' | 'appendShare' | 'getHeavyMemory';

interface DatabaseMockOptions {
	scenarios?: Partial<Record<DatabaseMethod, DatabaseScenario>>;
	fixtures?: {
		getUserById?: UserProfile;
		createMeeting?: MeetingRecord;
		appendShare?: ShareRecord;
		getHeavyMemory?: ShareRecord[];
	};
}

function toSeamErrorCode(value: unknown): SeamErrorCode {
	if (typeof value !== 'string') return SeamErrorCodes.UNEXPECTED;
	if ((Object.values(SeamErrorCodes) as string[]).includes(value)) {
		return value as SeamErrorCode;
	}
	return SeamErrorCodes.UNEXPECTED;
}

function parseFaultFixture(): { code: SeamErrorCode; message: string; details?: Record<string, unknown> } {
	const fixture = faultFixture as Record<string, unknown>;
	return {
		code: toSeamErrorCode(fixture.code),
		message:
			typeof fixture.message === 'string' && fixture.message.trim().length > 0
				? fixture.message
				: 'Unknown database mock failure',
		details: typeof fixture.details === 'object' && fixture.details !== null
			? (fixture.details as Record<string, unknown>)
			: undefined
	};
}

export function createDatabaseMock(options: DatabaseMockOptions = {}): DatabasePort {
	const scenarios = options.scenarios ?? {};
	const fixtures = {
		getUserById: (options.fixtures?.getUserById ?? getUserByIdSample) as UserProfile,
		createMeeting: (options.fixtures?.createMeeting ?? createMeetingSample) as MeetingRecord,
		appendShare: (options.fixtures?.appendShare ?? appendShareSample) as ShareRecord,
		getHeavyMemory: (options.fixtures?.getHeavyMemory ?? getHeavyMemorySample) as ShareRecord[]
	};
	const fault = parseFaultFixture();

	return {
		async getUserById(userId) {
			if (typeof userId !== 'string' || userId.trim().length === 0) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid userId');
			}
			if (scenarios.getUserById === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateUserProfile(fixtures.getUserById)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates UserProfile');
			}
			return ok(fixtures.getUserById);
		},

		async createMeeting(input) {
			if (!validateCreateMeetingInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid createMeeting input');
			}
			if (scenarios.createMeeting === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateMeetingRecord(fixtures.createMeeting)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates MeetingRecord');
			}
			return ok(fixtures.createMeeting);
		},

		async appendShare(input) {
			if (!validateAppendShareInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid appendShare input');
			}
			if (scenarios.appendShare === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateShareRecord(fixtures.appendShare)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates ShareRecord');
			}
			return ok(fixtures.appendShare);
		},

		async getHeavyMemory(userId) {
			if (typeof userId !== 'string' || userId.trim().length === 0) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid userId');
			}
			if (scenarios.getHeavyMemory === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!fixtures.getHeavyMemory.every((record) => validateShareRecord(record))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates ShareRecord[]');
			}
			return ok(fixtures.getHeavyMemory);
		}
	};
}
