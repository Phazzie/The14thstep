import type {
	CharacterRole,
	CharacterStatus,
	CharacterTier,
	MeetingParticipant,
	MeetingPhaseState,
	ShareInteractionType
} from '$lib/core/types';
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
	interactionType: ShareInteractionType;
	significanceScore: number;
	sequenceOrder: number;
	createdAt: string;
}

export interface MeetingParticipantSeed {
	id: string;
	name: string;
	tier: CharacterTier;
	status: CharacterStatus;
	archetype: string;
	wound: string;
	contradiction: string;
	voice: string;
	quirk: string;
	color: string;
	avatar: string;
	cleanTime: string;
	meetingCount: number;
	lastSeenAt: string | null;
	role: CharacterRole;
	isVisitor: boolean;
	seatOrder: number;
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
	notableMoments?: Record<string, unknown>;
}

export interface EnsureUserProfileInput {
	id: string;
	displayName: string;
	cleanTime?: string | null;
	isAnonymous: boolean;
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
	ensureUserProfile(input: EnsureUserProfileInput): Promise<SeamResult<UserProfile>>;
	createMeeting(
		input: Omit<MeetingRecord, 'id' | 'startedAt' | 'endedAt'>
	): Promise<SeamResult<MeetingRecord>>;
	appendShare(input: Omit<ShareRecord, 'id' | 'createdAt'>): Promise<SeamResult<ShareRecord>>;
	saveMeetingParticipants(input: {
		meetingId: string;
		participants: MeetingParticipantSeed[];
	}): Promise<SeamResult<MeetingParticipant[]>>;
	getMeetingParticipants(meetingId: string): Promise<SeamResult<MeetingParticipant[]>>;
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

function isCharacterTier(value: unknown): value is CharacterTier {
	return (
		value === 'core' ||
		value === 'regular' ||
		value === 'pool' ||
		value === 'visitor' ||
		value === 'archived'
	);
}

function isCharacterStatus(value: unknown): value is CharacterStatus {
	return value === 'active' || value === 'relapsed' || value === 'archived';
}

function isCharacterRole(value: unknown): value is CharacterRole {
	return value === 'chair' || value === 'active_sharer' || value === 'quiet_presence';
}

function isShareInteractionType(value: unknown): value is ShareInteractionType {
	return (
		value === 'standard' ||
		value === 'respond_to' ||
		value === 'disagree' ||
		value === 'parallel_story' ||
		value === 'expand' ||
		value === 'crosstalk' ||
		value === 'callback' ||
		value === 'hard_question' ||
		value === 'farewell'
	);
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

export function validateEnsureUserProfileInput(value: unknown): value is EnsureUserProfileInput {
	if (!isObject(value)) return false;
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.displayName) &&
		(value.cleanTime === undefined || isNullableString(value.cleanTime)) &&
		typeof value.isAnonymous === 'boolean'
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
		isShareInteractionType(value.interactionType) &&
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
		isShareInteractionType(value.interactionType) &&
		Number.isInteger(significanceScore) &&
		typeof significanceScore === 'number' &&
		significanceScore >= 0 &&
		significanceScore <= 10 &&
		Number.isInteger(sequenceOrder) &&
		typeof sequenceOrder === 'number' &&
		sequenceOrder >= 0
	);
}

export function validateMeetingParticipantSeed(value: unknown): value is MeetingParticipantSeed {
	if (!isObject(value)) return false;
	const meetingCount = value.meetingCount;
	const seatOrder = value.seatOrder;
	return (
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.name) &&
		isCharacterTier(value.tier) &&
		isCharacterStatus(value.status) &&
		isNonEmptyString(value.archetype) &&
		isNonEmptyString(value.wound) &&
		isNonEmptyString(value.contradiction) &&
		isNonEmptyString(value.voice) &&
		isNonEmptyString(value.quirk) &&
		isNonEmptyString(value.color) &&
		isNonEmptyString(value.avatar) &&
		isNonEmptyString(value.cleanTime) &&
		Number.isInteger(meetingCount) &&
		typeof meetingCount === 'number' &&
		meetingCount >= 0 &&
		isNullableString(value.lastSeenAt) &&
		isCharacterRole(value.role) &&
		typeof value.isVisitor === 'boolean' &&
		Number.isInteger(seatOrder) &&
		typeof seatOrder === 'number' &&
		seatOrder >= 0
	);
}

export function validateMeetingParticipant(value: unknown): value is MeetingParticipant {
	if (!validateMeetingParticipantSeed(value)) return false;
	const participant = value as MeetingParticipant;
	return (
		typeof participant.sharesCount === 'number' &&
		Number.isInteger(participant.sharesCount) &&
		participant.sharesCount >= 0
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
	return isObject(value.notableMoments);
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
