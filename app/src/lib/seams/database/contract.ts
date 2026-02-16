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

export interface DatabasePort {
	getUserById(userId: string): Promise<SeamResult<UserProfile>>;
	createMeeting(
		input: Omit<MeetingRecord, 'id' | 'startedAt' | 'endedAt'>
	): Promise<SeamResult<MeetingRecord>>;
	appendShare(input: Omit<ShareRecord, 'id' | 'createdAt'>): Promise<SeamResult<ShareRecord>>;
	getHeavyMemory(userId: string): Promise<SeamResult<ShareRecord[]>>;
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
