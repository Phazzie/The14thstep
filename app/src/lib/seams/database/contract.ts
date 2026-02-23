import type { MeetingPhaseState } from '$lib/core/types';
import { SeamErrorCodes, type SeamErrorCode, type SeamResult } from '$lib/core/seam';

export interface UserProfile {
	id: string;
	displayName: string;
	cleanTime: string | null;
	meetingCount: number;
	firstMeetingAt: string | null;
	lastMeetingAt: string | null;
}

export interface MeetingRecord {
	id: string;
	userId: string;
	topic: string;
	userMood: string;
	listeningOnly: boolean;
	startedAt: string;
	endedAt: string | null;
}

export interface ShareRecord {
	id: string;
	meetingId: string;
	characterId: string | null;
	isUserShare: boolean;
	content: string;
	significanceScore: number;
	sequenceOrder: number;
	createdAt: string;
}

export type CallbackType =
	| 'self_deprecation'
	| 'quirk_habit'
	| 'catchphrase'
	| 'absurd_detail'
	| 'physical_behavioral'
	| 'room_meta';

export type CallbackScope = 'character' | 'room';
export type CallbackStatus = 'active' | 'stale' | 'retired' | 'legend';

export interface CallbackRecord {
	id: string;
	originShareId: string;
	characterId: string;
	originalText: string;
	callbackType: CallbackType;
	scope: CallbackScope;
	potentialScore: number;
	timesReferenced: number;
	lastReferencedAt: string | null;
	status: CallbackStatus;
	parentCallbackId: string | null;
}

export interface CreateCallbackInput {
	originShareId: string;
	characterId: string;
	originalText: string;
	callbackType: CallbackType;
	scope: CallbackScope;
	potentialScore: number;
	parentCallbackId?: string | null;
}

export interface CompleteMeetingInput {
	meetingId: string;
	summary: string;
	notableMoments?: Record<string, string>;
}

export interface UpdateCallbackInput {
	id: string;
	updates: {
		timesReferenced?: number;
		lastReferencedAt?: string;
		status?: CallbackStatus;
		scope?: CallbackScope;
	};
}

export interface GetMeetingCountAfterDateInput {
	userId: string;
	startedAfter: string;
}

export interface DatabasePort {
	getUserById(userId: string): Promise<SeamResult<UserProfile>>;
	createMeeting(
		input: Omit<MeetingRecord, 'id' | 'startedAt' | 'endedAt'>
	): Promise<SeamResult<MeetingRecord>>;
	appendShare(input: Omit<ShareRecord, 'id' | 'createdAt'>): Promise<SeamResult<ShareRecord>>;
	getHeavyMemory(userId: string): Promise<SeamResult<ShareRecord[]>>;
	getShareById(shareId: string): Promise<SeamResult<ShareRecord>>;
	getMeetingShares(meetingId: string): Promise<SeamResult<ShareRecord[]>>;
	updateMeetingPhase(meetingId: string, phaseState: MeetingPhaseState): Promise<SeamResult<void>>;
	getMeetingPhase(meetingId: string): Promise<SeamResult<MeetingPhaseState | null>>;
	createCallback(input: CreateCallbackInput): Promise<SeamResult<CallbackRecord>>;
	getActiveCallbacks(input: {
		characterId: string;
		meetingId: string;
		scopeToMeeting?: boolean;
	}): Promise<SeamResult<CallbackRecord[]>>;
	markCallbackReferenced(callbackId: string): Promise<SeamResult<CallbackRecord>>;
	completeMeeting(input: CompleteMeetingInput): Promise<SeamResult<MeetingRecord>>;
	updateCallback(input: UpdateCallbackInput): Promise<SeamResult<CallbackRecord>>;
	getMeetingCountAfterDate(input: GetMeetingCountAfterDateInput): Promise<SeamResult<number>>;
}

export const DATABASE_ERROR_CODES: readonly SeamErrorCode[] = [
	SeamErrorCodes.INPUT_INVALID,
	SeamErrorCodes.NOT_FOUND,
	SeamErrorCodes.UPSTREAM_UNAVAILABLE,
	SeamErrorCodes.UPSTREAM_ERROR,
	SeamErrorCodes.CONTRACT_VIOLATION,
	SeamErrorCodes.UNEXPECTED
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === 'string';
}

function isCallbackType(value: unknown): value is CallbackType {
	return (
		value === 'self_deprecation' ||
		value === 'quirk_habit' ||
		value === 'catchphrase' ||
		value === 'absurd_detail' ||
		value === 'physical_behavioral' ||
		value === 'room_meta'
	);
}

function isCallbackScope(value: unknown): value is CallbackScope {
	return value === 'character' || value === 'room';
}

function isCallbackStatus(value: unknown): value is CallbackStatus {
	return value === 'active' || value === 'stale' || value === 'retired' || value === 'legend';
}

export function validateUserProfile(value: unknown): value is UserProfile {
	if (!isObject(value)) return false;
	const meetingCount = value.meetingCount;
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.displayName) &&
		isNullableString(value.cleanTime) &&
		Number.isInteger(meetingCount) &&
		typeof meetingCount === 'number' &&
		meetingCount >= 0 &&
		isNullableString(value.firstMeetingAt) &&
		isNullableString(value.lastMeetingAt)
	);
}

export function validateMeetingRecord(value: unknown): value is MeetingRecord {
	if (!isObject(value)) return false;
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.userId) &&
		isNonEmptyString(value.topic) &&
		isNonEmptyString(value.userMood) &&
		typeof value.listeningOnly === 'boolean' &&
		isNonEmptyString(value.startedAt) &&
		isNullableString(value.endedAt)
	);
}

export function validateCreateMeetingInput(
	value: unknown
): value is Omit<MeetingRecord, 'id' | 'startedAt' | 'endedAt'> {
	if (!isObject(value)) return false;
	return (
		isNonEmptyString(value.userId) &&
		isNonEmptyString(value.topic) &&
		isNonEmptyString(value.userMood) &&
		typeof value.listeningOnly === 'boolean'
	);
}

export function validateShareRecord(value: unknown): value is ShareRecord {
	if (!isObject(value)) return false;
	const significanceScore = value.significanceScore;
	const sequenceOrder = value.sequenceOrder;
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.meetingId) &&
		(value.characterId === null || isNonEmptyString(value.characterId)) &&
		typeof value.isUserShare === 'boolean' &&
		isNonEmptyString(value.content) &&
		Number.isInteger(significanceScore) &&
		typeof significanceScore === 'number' &&
		significanceScore >= 0 &&
		significanceScore <= 10 &&
		Number.isInteger(sequenceOrder) &&
		typeof sequenceOrder === 'number' &&
		sequenceOrder >= 0 &&
		isNonEmptyString(value.createdAt)
	);
}

export function validateAppendShareInput(
	value: unknown
): value is Omit<ShareRecord, 'id' | 'createdAt'> {
	if (!isObject(value)) return false;
	const significanceScore = value.significanceScore;
	const sequenceOrder = value.sequenceOrder;
	return (
		isNonEmptyString(value.meetingId) &&
		(value.characterId === null || isNonEmptyString(value.characterId)) &&
		typeof value.isUserShare === 'boolean' &&
		isNonEmptyString(value.content) &&
		Number.isInteger(significanceScore) &&
		typeof significanceScore === 'number' &&
		significanceScore >= 0 &&
		significanceScore <= 10 &&
		Number.isInteger(sequenceOrder) &&
		typeof sequenceOrder === 'number' &&
		sequenceOrder >= 0
	);
}

export function validateCallbackRecord(value: unknown): value is CallbackRecord {
	if (!isObject(value)) return false;
	const potentialScore = value.potentialScore;
	const timesReferenced = value.timesReferenced;
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.originShareId) &&
		isNonEmptyString(value.characterId) &&
		isNonEmptyString(value.originalText) &&
		isCallbackType(value.callbackType) &&
		isCallbackScope(value.scope) &&
		Number.isInteger(potentialScore) &&
		typeof potentialScore === 'number' &&
		potentialScore >= 1 &&
		potentialScore <= 10 &&
		Number.isInteger(timesReferenced) &&
		typeof timesReferenced === 'number' &&
		timesReferenced >= 0 &&
		isNullableString(value.lastReferencedAt) &&
		isCallbackStatus(value.status) &&
		isNullableString(value.parentCallbackId)
	);
}

export function validateCreateCallbackInput(value: unknown): value is CreateCallbackInput {
	if (!isObject(value)) return false;
	const potentialScore = value.potentialScore;
	return (
		isNonEmptyString(value.originShareId) &&
		isNonEmptyString(value.characterId) &&
		isNonEmptyString(value.originalText) &&
		isCallbackType(value.callbackType) &&
		isCallbackScope(value.scope) &&
		Number.isInteger(potentialScore) &&
		typeof potentialScore === 'number' &&
		potentialScore >= 1 &&
		potentialScore <= 10 &&
		(value.parentCallbackId === undefined || isNullableString(value.parentCallbackId))
	);
}

export function validateCompleteMeetingInput(value: unknown): value is CompleteMeetingInput {
	if (!isObject(value)) return false;
	if (!isNonEmptyString(value.meetingId) || !isNonEmptyString(value.summary)) return false;
	if (value.notableMoments === undefined) return true;
	if (!isObject(value.notableMoments)) return false;
	return Object.values(value.notableMoments).every((item) => typeof item === 'string');
}

export function validateUpdateCallbackInput(value: unknown): value is UpdateCallbackInput {
	if (!isObject(value) || !isNonEmptyString(value.id) || !isObject(value.updates)) return false;
	const updates = value.updates;
	if (updates.timesReferenced !== undefined) {
		if (
			typeof updates.timesReferenced !== 'number' ||
			!Number.isInteger(updates.timesReferenced) ||
			updates.timesReferenced < 0
		) {
			return false;
		}
	}
	if (updates.lastReferencedAt !== undefined && !isNonEmptyString(updates.lastReferencedAt)) {
		return false;
	}
	if (updates.status !== undefined && !isCallbackStatus(updates.status)) {
		return false;
	}
	if (updates.scope !== undefined && !isCallbackScope(updates.scope)) {
		return false;
	}

	return Object.keys(updates).length > 0;
}

export function validateGetMeetingCountAfterDateInput(value: unknown): value is GetMeetingCountAfterDateInput {
	return isObject(value) && isNonEmptyString(value.userId) && isNonEmptyString(value.startedAfter);
}
