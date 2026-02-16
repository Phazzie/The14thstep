import { SeamErrorCodes, err, ok, type SeamErrorCode } from '$lib/core/seam';
import type {
	CallbackRecord,
	CompleteMeetingInput,
	CreateCallbackInput,
	DatabasePort,
	MeetingRecord,
	ShareRecord,
	UserProfile
} from './contract';
import {
	validateCallbackRecord,
	validateCompleteMeetingInput,
	validateCreateCallbackInput,
	validateAppendShareInput,
	validateCreateMeetingInput,
	validateMeetingRecord,
	validateShareRecord,
	validateUserProfile
} from './contract';
import appendShareSample from './fixtures/appendShare.sample.json';
import createCallbackSample from './fixtures/createCallback.sample.json';
import createMeetingSample from './fixtures/createMeeting.sample.json';
import faultFixture from './fixtures/fault.json';
import getActiveCallbacksSample from './fixtures/getActiveCallbacks.sample.json';
import getHeavyMemorySample from './fixtures/getHeavyMemory.sample.json';
import getShareByIdSample from './fixtures/getShareById.sample.json';
import getUserByIdSample from './fixtures/getUserById.sample.json';

type DatabaseScenario = 'sample' | 'fault';

type DatabaseMethod =
	| 'getUserById'
	| 'createMeeting'
	| 'appendShare'
	| 'getHeavyMemory'
	| 'getShareById'
	| 'getMeetingShares'
	| 'createCallback'
	| 'getActiveCallbacks'
	| 'markCallbackReferenced'
	| 'completeMeeting';

interface DatabaseMockOptions {
	scenarios?: Partial<Record<DatabaseMethod, DatabaseScenario>>;
	fixtures?: {
		getUserById?: UserProfile;
		createMeeting?: MeetingRecord;
		appendShare?: ShareRecord;
		getHeavyMemory?: ShareRecord[];
		getShareById?: ShareRecord;
		getMeetingShares?: ShareRecord[];
		createCallback?: CallbackRecord;
		getActiveCallbacks?: CallbackRecord[];
		markCallbackReferenced?: CallbackRecord;
		completeMeeting?: MeetingRecord;
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
		getHeavyMemory: (options.fixtures?.getHeavyMemory ?? getHeavyMemorySample) as ShareRecord[],
		getShareById: (options.fixtures?.getShareById ?? getShareByIdSample) as ShareRecord,
		getMeetingShares: (options.fixtures?.getMeetingShares ?? getHeavyMemorySample) as ShareRecord[],
		createCallback: (options.fixtures?.createCallback ?? createCallbackSample) as CallbackRecord,
		getActiveCallbacks: (options.fixtures?.getActiveCallbacks ?? getActiveCallbacksSample) as CallbackRecord[],
		markCallbackReferenced:
			(options.fixtures?.markCallbackReferenced ?? createCallbackSample) as CallbackRecord,
		completeMeeting: (options.fixtures?.completeMeeting ?? createMeetingSample) as MeetingRecord
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
		},

		async getShareById(shareId) {
			if (typeof shareId !== 'string' || shareId.trim().length === 0) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid shareId');
			}
			if (scenarios.getShareById === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateShareRecord(fixtures.getShareById)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates ShareRecord');
			}
			return ok(fixtures.getShareById);
		},

		async getMeetingShares(meetingId) {
			if (typeof meetingId !== 'string' || meetingId.trim().length === 0) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid meetingId');
			}
			if (scenarios.getMeetingShares === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!fixtures.getMeetingShares.every((record) => validateShareRecord(record))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates ShareRecord[]');
			}
			return ok(fixtures.getMeetingShares);
		},

		async createCallback(input: CreateCallbackInput) {
			if (!validateCreateCallbackInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid createCallback input');
			}
			if (scenarios.createCallback === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateCallbackRecord(fixtures.createCallback)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates CallbackRecord');
			}
			return ok(fixtures.createCallback);
		},

		async getActiveCallbacks(input: { characterId: string; meetingId: string }) {
			if (
				typeof input.characterId !== 'string' ||
				input.characterId.trim().length === 0 ||
				typeof input.meetingId !== 'string' ||
				input.meetingId.trim().length === 0
			) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid getActiveCallbacks input');
			}
			if (scenarios.getActiveCallbacks === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!fixtures.getActiveCallbacks.every((record) => validateCallbackRecord(record))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates CallbackRecord[]');
			}
			return ok(fixtures.getActiveCallbacks);
		},

		async markCallbackReferenced(callbackId: string) {
			if (typeof callbackId !== 'string' || callbackId.trim().length === 0) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid callbackId');
			}
			if (scenarios.markCallbackReferenced === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateCallbackRecord(fixtures.markCallbackReferenced)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates CallbackRecord');
			}
			return ok(fixtures.markCallbackReferenced);
		},

		async completeMeeting(input: CompleteMeetingInput) {
			if (!validateCompleteMeetingInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid completeMeeting input');
			}
			if (scenarios.completeMeeting === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateMeetingRecord(fixtures.completeMeeting)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates MeetingRecord');
			}
			return ok(fixtures.completeMeeting);
		}
	};
}
