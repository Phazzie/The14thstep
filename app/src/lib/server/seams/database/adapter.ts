import { SeamErrorCodes, err, ok, type SeamResult } from '$lib/core/seam';
import { CORE_CHARACTERS } from '$lib/core/characters';
import { MeetingPhase, type MeetingPhaseState } from '$lib/core/types';
import {
	type CallbackRecord,
	type DatabasePort,
	type MeetingRecord,
	type ShareRecord,
	type UserProfile,
	validateCallbackRecord,
	validateCompleteMeetingInput,
	validateCreateCallbackInput,
	validateGetMeetingCountAfterDateInput,
	validateAppendShareInput,
	validateCreateMeetingInput,
	validateMeetingRecord,
	validateShareRecord,
	validateUpdateCallbackInput,
	validateUserProfile
} from '$lib/seams/database/contract';
import {
	createSupabaseServiceRoleClient,
	type ServiceRoleSupabaseClient
} from '$lib/server/supabase';

interface DatabaseAdapterOptions {
	supabase?: ServiceRoleSupabaseClient;
}

interface QueryErrorLike {
	code?: unknown;
	message?: unknown;
	details?: unknown;
	hint?: unknown;
	status?: unknown;
}

interface QueryResponseLike<T = unknown> {
	data: T | null;
	error: QueryErrorLike | null;
	status?: number;
	count?: number | null;
}

const NETWORK_STATUSES = new Set([0, 408, 429, 502, 503, 504, 522, 524]);
const UUID_V4_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CORE_CHARACTER_NAME_BY_ID = new Map(CORE_CHARACTERS.map((character) => [character.id, character.name]));
const CORE_CHARACTER_ID_BY_NAME = new Map(CORE_CHARACTERS.map((character) => [character.name, character.id]));

interface CharacterMaps {
	dbIdByDomainId: Map<string, string>;
	domainIdByDbId: Map<string, string>;
}

const MEETING_PHASE_VALUES = new Set<MeetingPhase>(Object.values(MeetingPhase));

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
	if (value === null) return null;
	return asString(value);
}

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function asStatus(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isUuidLike(value: string): boolean {
	return UUID_V4_PATTERN.test(value);
}

function upstreamDetails(
	method: keyof DatabasePort,
	response: { error: QueryErrorLike | null; status?: number }
): Record<string, unknown> {
	return {
		method,
		provider: 'supabase',
		code: asString(response.error?.code),
		status: asStatus(response.status) ?? asStatus(response.error?.status)
	};
}

function isNotFoundResponse(response: { error: QueryErrorLike | null; status?: number }): boolean {
	const status = asStatus(response.status) ?? asStatus(response.error?.status);
	if (status === 404) return true;

	const code = asString(response.error?.code);
	if (code === 'PGRST116') return true;

	const message = `${asString(response.error?.message) ?? ''} ${asString(response.error?.details) ?? ''}`
		.trim()
		.toLowerCase();
	return message.includes('no rows');
}

function isNetworkLikeResponse(response: { error: QueryErrorLike | null; status?: number }): boolean {
	const status = asStatus(response.status) ?? asStatus(response.error?.status);
	if (status !== undefined && NETWORK_STATUSES.has(status)) return true;

	const message = `${asString(response.error?.message) ?? ''} ${asString(response.error?.details) ?? ''} ${
		asString(response.error?.hint) ?? ''
	}`
		.trim()
		.toLowerCase();

	return /(network|timeout|timed out|fetch failed|failed to fetch|econn|enotfound|eai_again|socket|aborted)/.test(
		message
	);
}

function mapUpstreamError<T>(
	method: keyof DatabasePort,
	response: { error: QueryErrorLike | null; status?: number }
): SeamResult<T> {
	if (isNotFoundResponse(response)) {
		return err(SeamErrorCodes.NOT_FOUND, `${method} record not found`, upstreamDetails(method, response));
	}
	if (isNetworkLikeResponse(response)) {
		return err(
			SeamErrorCodes.UPSTREAM_UNAVAILABLE,
			`${method} failed due to temporary upstream availability`,
			upstreamDetails(method, response)
		);
	}
	return err(
		SeamErrorCodes.UPSTREAM_ERROR,
		`${method} failed due to upstream error`,
		upstreamDetails(method, response)
	);
}

function mapUserProfileRow(row: unknown): UserProfile {
	const record = isObject(row) ? row : {};
	return {
		id: asString(record.id) ?? '',
		displayName: asString(record.display_name) ?? '',
		cleanTime: asNullableString(record.clean_time) ?? null,
		meetingCount: asNumber(record.meeting_count) ?? Number.NaN,
		firstMeetingAt: asNullableString(record.first_meeting_at) ?? null,
		lastMeetingAt: asNullableString(record.last_meeting_at) ?? null
	};
}

function mapMeetingRecordRow(row: unknown): MeetingRecord {
	const record = isObject(row) ? row : {};
	return {
		id: asString(record.id) ?? '',
		userId: asString(record.user_id) ?? '',
		topic: asString(record.topic) ?? '',
		userMood: asString(record.user_mood) ?? '',
		listeningOnly: asBoolean(record.listening_only) ?? false,
		startedAt: asString(record.started_at) ?? '',
		endedAt: asNullableString(record.ended_at) ?? null
	};
}

function isMeetingPhase(value: unknown): value is MeetingPhase {
	return typeof value === 'string' && MEETING_PHASE_VALUES.has(value as MeetingPhase);
}

function mapMeetingPhaseStateValue(value: unknown): MeetingPhaseState | null {
	if (!isObject(value)) return null;
	if (!isMeetingPhase(value.currentPhase)) return null;

	let phaseStartedAt: Date;
	if (value.phaseStartedAt instanceof Date) {
		if (!Number.isFinite(value.phaseStartedAt.getTime())) return null;
		phaseStartedAt = value.phaseStartedAt;
	} else if (typeof value.phaseStartedAt === 'string') {
		const timestamp = Date.parse(value.phaseStartedAt);
		if (!Number.isFinite(timestamp)) return null;
		phaseStartedAt = new Date(timestamp);
	} else if (value.phaseStartedAt === null || value.phaseStartedAt === undefined) {
		phaseStartedAt = new Date();
	} else {
		return null;
	}

	if (!Array.isArray(value.charactersSpokenThisRound)) return null;
	if (!value.charactersSpokenThisRound.every((characterId) => isNonEmptyString(characterId))) return null;

	const userHasSharedInRound = asBoolean(value.userHasSharedInRound);
	if (userHasSharedInRound === undefined) return null;

	let roundNumber: number | undefined;
	if (value.roundNumber !== undefined && value.roundNumber !== null) {
		const parsedRoundNumber = asNumber(value.roundNumber);
		if (
			parsedRoundNumber === undefined ||
			!Number.isInteger(parsedRoundNumber) ||
			parsedRoundNumber < 1
		) {
			return null;
		}
		roundNumber = parsedRoundNumber;
	}

	return {
		currentPhase: value.currentPhase,
		phaseStartedAt,
		roundNumber,
		charactersSpokenThisRound: [...value.charactersSpokenThisRound],
		userHasSharedInRound
	};
}

function serializeMeetingPhaseState(
	phaseState: MeetingPhaseState
): SeamResult<{
	currentPhase: MeetingPhase;
	phaseStartedAt: string;
	roundNumber?: number;
	charactersSpokenThisRound: string[];
	userHasSharedInRound: boolean;
}> {
	const parsed = mapMeetingPhaseStateValue(phaseState);
	if (!parsed) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid MeetingPhaseState payload');
	}

	return ok({
		currentPhase: parsed.currentPhase,
		phaseStartedAt: parsed.phaseStartedAt.toISOString(),
		...(parsed.roundNumber !== undefined ? { roundNumber: parsed.roundNumber } : {}),
		charactersSpokenThisRound: parsed.charactersSpokenThisRound,
		userHasSharedInRound: parsed.userHasSharedInRound
	});
}

function mapShareRecordRow(row: unknown): ShareRecord {
	const record = isObject(row) ? row : {};
	return {
		id: asString(record.id) ?? '',
		meetingId: asString(record.meeting_id) ?? '',
		characterId: asNullableString(record.character_id) ?? null,
		isUserShare: asBoolean(record.is_user_share) ?? false,
		content: asString(record.content) ?? '',
		significanceScore: asNumber(record.significance_score) ?? Number.NaN,
		sequenceOrder: asNumber(record.sequence_order) ?? Number.NaN,
		createdAt: asString(record.created_at) ?? ''
	};
}

function mapCallbackRecordRow(row: unknown): CallbackRecord {
	const record = isObject(row) ? row : {};
	return {
		id: asString(record.id) ?? '',
		originShareId: asString(record.origin_share_id) ?? '',
		characterId: asString(record.character_id) ?? '',
		originalText: asString(record.original_text) ?? '',
		callbackType: asString(record.callback_type) as CallbackRecord['callbackType'],
		scope: asString(record.scope) as CallbackRecord['scope'],
		potentialScore: asNumber(record.potential_score) ?? Number.NaN,
		timesReferenced: asNumber(record.times_referenced) ?? Number.NaN,
		lastReferencedAt: asNullableString(record.last_referenced_at) ?? null,
		status: asString(record.status) as CallbackRecord['status'],
		parentCallbackId: asNullableString(record.parent_callback_id) ?? null
	};
}

export function createDatabaseAdapter(options: DatabaseAdapterOptions = {}): DatabasePort {
	const supabase = options.supabase ?? createSupabaseServiceRoleClient();
	let characterMapsPromise: Promise<SeamResult<CharacterMaps>> | null = null;

	function mapCharacterIdToDomainId(maps: CharacterMaps, characterId: string | null): string | null {
		if (characterId === null) return null;
		return maps.domainIdByDbId.get(characterId) ?? characterId;
	}

	async function loadCharacterMaps(method: keyof DatabasePort): Promise<SeamResult<CharacterMaps>> {
		const coreNames = CORE_CHARACTERS.map((character) => character.name);
		const existingResponse = (await supabase
			.from('characters')
			.select('id, name')
			.in('name', coreNames)) as QueryResponseLike<unknown[]>;
		if (existingResponse.error) return mapUpstreamError(method, existingResponse);
		if (!Array.isArray(existingResponse.data)) {
			return err(SeamErrorCodes.CONTRACT_VIOLATION, 'characters lookup response is not an array', {
				method,
				provider: 'supabase'
			});
		}

		const existingNames = new Set(
			existingResponse.data
				.map((row) => (isObject(row) ? asString(row.name) : undefined))
				.filter((name): name is string => isNonEmptyString(name))
		);
		const missingProfiles = CORE_CHARACTERS.filter((character) => !existingNames.has(character.name));
		if (missingProfiles.length > 0) {
			const today = new Date().toISOString().slice(0, 10);
			const insertResponse = (await supabase
				.from('characters')
				.insert(
					missingProfiles.map((character) => ({
						name: character.name,
						tier: character.tier,
						archetype: character.archetype,
						clean_time_start: today,
						voice: character.voice,
						wound: character.wound,
						contradiction: character.contradiction,
						quirk: character.quirk,
						color: character.color,
						avatar: character.avatar,
						intro_style: character.id
					}))
				)
				.select('id, name')) as QueryResponseLike<unknown[]>;
			if (insertResponse.error) return mapUpstreamError(method, insertResponse);
		}

		const finalResponse = (await supabase
			.from('characters')
			.select('id, name')
			.in('name', coreNames)) as QueryResponseLike<unknown[]>;
		if (finalResponse.error) return mapUpstreamError(method, finalResponse);
		if (!Array.isArray(finalResponse.data)) {
			return err(SeamErrorCodes.CONTRACT_VIOLATION, 'characters final lookup response is not an array', {
				method,
				provider: 'supabase'
			});
		}

		const dbIdByDomainId = new Map<string, string>();
		const domainIdByDbId = new Map<string, string>();

		for (const row of finalResponse.data) {
			if (!isObject(row)) continue;
			const dbId = asString(row.id);
			const name = asString(row.name);
			if (!isNonEmptyString(dbId) || !isNonEmptyString(name)) continue;
			const domainId = CORE_CHARACTER_ID_BY_NAME.get(name);
			if (!domainId) continue;
			dbIdByDomainId.set(domainId, dbId);
			domainIdByDbId.set(dbId, domainId);
		}

		return ok({ dbIdByDomainId, domainIdByDbId });
	}

	async function getCharacterMaps(method: keyof DatabasePort): Promise<SeamResult<CharacterMaps>> {
		if (characterMapsPromise === null) {
			characterMapsPromise = loadCharacterMaps(method);
		}

		const mapsResult = await characterMapsPromise;
		if (!mapsResult.ok) {
			characterMapsPromise = null;
		}
		return mapsResult;
	}

	async function resolveDbCharacterId(
		method: keyof DatabasePort,
		characterId: string
	): Promise<SeamResult<string>> {
		if (isUuidLike(characterId)) return ok(characterId);

		const mapsResult = await getCharacterMaps(method);
		if (!mapsResult.ok) return mapsResult;

		let mapped = mapsResult.value.dbIdByDomainId.get(characterId);
		if (!mapped && CORE_CHARACTER_NAME_BY_ID.has(characterId)) {
			// Character rows can be seeded or repaired after process start. Refresh once before failing.
			characterMapsPromise = null;
			const refreshedMapsResult = await getCharacterMaps(method);
			if (!refreshedMapsResult.ok) return refreshedMapsResult;
			mapped = refreshedMapsResult.value.dbIdByDomainId.get(characterId);
		}
		if (mapped) return ok(mapped);

		const coreName = CORE_CHARACTER_NAME_BY_ID.get(characterId);
		return err(SeamErrorCodes.INPUT_INVALID, `Unknown characterId: ${characterId}`, {
			method,
			provider: 'supabase',
			expectedCoreName: coreName ?? null
		});
	}

	return {
		async getUserById(userId) {
			if (!isNonEmptyString(userId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid userId');
			}

			const response = (await supabase
				.from('users')
				.select('id, display_name, clean_time, meeting_count, first_meeting_at, last_meeting_at')
				.eq('id', userId)
				.maybeSingle()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('getUserById', response);
			if (response.data === null) {
				return err(SeamErrorCodes.NOT_FOUND, 'getUserById record not found', {
					method: 'getUserById',
					provider: 'supabase'
				});
			}

			const profile = mapUserProfileRow(response.data);
			if (!validateUserProfile(profile)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getUserById response violates UserProfile');
			}

			return ok(profile);
		},

		async createMeeting(input) {
			if (!validateCreateMeetingInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid createMeeting input');
			}

			const response = (await supabase
				.from('meetings')
				.insert({
					user_id: input.userId,
					topic: input.topic,
					user_mood: input.userMood,
					listening_only: input.listeningOnly
				})
				.select('id, user_id, topic, user_mood, listening_only, started_at, ended_at')
				.single()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('createMeeting', response);

			const meeting = mapMeetingRecordRow(response.data);
			if (!validateMeetingRecord(meeting)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'createMeeting response violates MeetingRecord');
			}

			return ok(meeting);
		},

		async appendShare(input) {
			if (!validateAppendShareInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid appendShare input');
			}

			let dbCharacterId = input.characterId;
			if (isNonEmptyString(dbCharacterId)) {
				const resolved = await resolveDbCharacterId('appendShare', dbCharacterId);
				if (!resolved.ok) return resolved;
				dbCharacterId = resolved.value;
			}

			const response = (await supabase
				.from('shares')
				.insert({
					meeting_id: input.meetingId,
					character_id: dbCharacterId,
					is_user_share: input.isUserShare,
					content: input.content,
					significance_score: input.significanceScore,
					sequence_order: input.sequenceOrder,
					interaction_type: 'standard'
				})
				.select(
					'id, meeting_id, character_id, is_user_share, content, significance_score, sequence_order, created_at'
				)
				.single()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('appendShare', response);

			const share = mapShareRecordRow(response.data);
			if (share.characterId !== null) {
				const mapsResult = await getCharacterMaps('appendShare');
				if (!mapsResult.ok) return mapsResult;
				share.characterId = mapCharacterIdToDomainId(mapsResult.value, share.characterId);
			}
			if (!validateShareRecord(share)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'appendShare response violates ShareRecord');
			}

			return ok(share);
		},

		async getHeavyMemory(userId) {
			if (!isNonEmptyString(userId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid userId');
			}

			const response = (await supabase
				.from('shares')
				.select(
					'id, meeting_id, character_id, is_user_share, content, significance_score, sequence_order, created_at, meetings!inner(user_id)'
				)
				.eq('meetings.user_id', userId)
				.order('created_at', { ascending: false })
				.limit(500)) as QueryResponseLike<unknown[]>;

			if (response.error) return mapUpstreamError('getHeavyMemory', response);
			if (!Array.isArray(response.data)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getHeavyMemory response is not ShareRecord[]');
			}

			const shares = response.data.map((row) => mapShareRecordRow(row));
			const mapsResult = await getCharacterMaps('getHeavyMemory');
			if (!mapsResult.ok) return mapsResult;
			for (const share of shares) {
				share.characterId = mapCharacterIdToDomainId(mapsResult.value, share.characterId);
			}
			if (!shares.every((share) => validateShareRecord(share))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getHeavyMemory response violates ShareRecord[]');
			}

			return ok(shares);
		},

		async getShareById(shareId) {
			if (!isNonEmptyString(shareId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid shareId');
			}

			const response = (await supabase
				.from('shares')
				.select(
					'id, meeting_id, character_id, is_user_share, content, significance_score, sequence_order, created_at'
				)
				.eq('id', shareId)
				.maybeSingle()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('getShareById', response);
			if (response.data === null) {
				return err(SeamErrorCodes.NOT_FOUND, 'getShareById record not found', {
					method: 'getShareById',
					provider: 'supabase'
				});
			}

			const share = mapShareRecordRow(response.data);
			if (share.characterId !== null) {
				const mapsResult = await getCharacterMaps('getShareById');
				if (!mapsResult.ok) return mapsResult;
				share.characterId = mapCharacterIdToDomainId(mapsResult.value, share.characterId);
			}
			if (!validateShareRecord(share)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getShareById response violates ShareRecord');
			}

			return ok(share);
		},

		async getMeetingShares(meetingId) {
			if (!isNonEmptyString(meetingId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid meetingId');
			}

			const response = (await supabase
				.from('shares')
				.select(
					'id, meeting_id, character_id, is_user_share, content, significance_score, sequence_order, created_at'
				)
				.eq('meeting_id', meetingId)
				.order('sequence_order', { ascending: true })
				.order('created_at', { ascending: true })) as QueryResponseLike<unknown[]>;

			if (response.error) return mapUpstreamError('getMeetingShares', response);
			if (!Array.isArray(response.data)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getMeetingShares response is not ShareRecord[]');
			}

			const shares = response.data.map((row) => mapShareRecordRow(row));
			const mapsResult = await getCharacterMaps('getMeetingShares');
			if (!mapsResult.ok) return mapsResult;
			for (const share of shares) {
				share.characterId = mapCharacterIdToDomainId(mapsResult.value, share.characterId);
			}
			if (!shares.every((share) => validateShareRecord(share))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getMeetingShares response violates ShareRecord[]');
			}

			return ok(shares);
		},

		async updateMeetingPhase(meetingId, phaseState) {
			if (!isNonEmptyString(meetingId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid meetingId');
			}

			const serializedPhaseState = serializeMeetingPhaseState(phaseState);
			if (!serializedPhaseState.ok) return serializedPhaseState;

			const response = (await supabase
				.from('meetings')
				.update({
					phase_state: serializedPhaseState.value
				})
				.eq('id', meetingId)
				.select('id')
				.maybeSingle()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('updateMeetingPhase', response);
			if (response.data === null) {
				return err(SeamErrorCodes.NOT_FOUND, 'updateMeetingPhase record not found', {
					method: 'updateMeetingPhase',
					provider: 'supabase'
				});
			}

			return ok(undefined);
		},

		async getMeetingPhase(meetingId) {
			if (!isNonEmptyString(meetingId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid meetingId');
			}

			const response = (await supabase
				.from('meetings')
				.select('phase_state')
				.eq('id', meetingId)
				.maybeSingle()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('getMeetingPhase', response);
			if (response.data === null) {
				return err(SeamErrorCodes.NOT_FOUND, 'getMeetingPhase record not found', {
					method: 'getMeetingPhase',
					provider: 'supabase'
				});
			}
			if (!isObject(response.data)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getMeetingPhase response is not an object');
			}

			const rawPhaseState = response.data.phase_state;
			if (rawPhaseState === null || rawPhaseState === undefined) {
				return ok(null);
			}

			const phaseStateResult = mapMeetingPhaseStateValue(rawPhaseState);
			if (!phaseStateResult) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getMeetingPhase response violates MeetingPhaseState');
			}

			return ok(phaseStateResult);
		},

		async createCallback(input) {
			if (!validateCreateCallbackInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid createCallback input');
			}

			const resolvedCharacterId = await resolveDbCharacterId('createCallback', input.characterId);
			if (!resolvedCharacterId.ok) return resolvedCharacterId;

			const response = (await supabase
				.from('callbacks')
				.insert({
					origin_share_id: input.originShareId,
					character_id: resolvedCharacterId.value,
					original_text: input.originalText,
					callback_type: input.callbackType,
					scope: input.scope,
					potential_score: input.potentialScore,
					parent_callback_id: input.parentCallbackId ?? null
				})
				.select(
					'id, origin_share_id, character_id, original_text, callback_type, scope, potential_score, times_referenced, last_referenced_at, status, parent_callback_id'
				)
				.single()) as QueryResponseLike;

			if (response.error) return mapUpstreamError('createCallback', response);

			const callback = mapCallbackRecordRow(response.data);
			const mapsResult = await getCharacterMaps('createCallback');
			if (!mapsResult.ok) return mapsResult;
			callback.characterId = mapCharacterIdToDomainId(mapsResult.value, callback.characterId) ?? '';
			if (!validateCallbackRecord(callback)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'createCallback response violates CallbackRecord');
			}

			return ok(callback);
		},

		async getActiveCallbacks(input) {
			if (!isNonEmptyString(input.characterId) || !isNonEmptyString(input.meetingId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid getActiveCallbacks input');
			}

			const resolvedCharacterId = await resolveDbCharacterId('getActiveCallbacks', input.characterId);
			if (!resolvedCharacterId.ok) return resolvedCharacterId;

			const callbacksQuery = supabase
				.from('callbacks')
				.select(
					'id, origin_share_id, character_id, original_text, callback_type, scope, potential_score, times_referenced, last_referenced_at, status, parent_callback_id, shares!inner(meeting_id)'
				)
				.in('status', ['active', 'stale', 'retired', 'legend'])
				.or(`character_id.eq.${resolvedCharacterId.value},scope.eq.room`);
			const callbacksScopedQuery =
				input.scopeToMeeting === false ? callbacksQuery : callbacksQuery.eq('shares.meeting_id', input.meetingId);
			const response = (await callbacksScopedQuery
				.order('potential_score', { ascending: false })
				.order('times_referenced', { ascending: false })
				.limit(30)) as QueryResponseLike<unknown[]>;

			if (response.error) return mapUpstreamError('getActiveCallbacks', response);
			if (!Array.isArray(response.data)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getActiveCallbacks response is not CallbackRecord[]');
			}

			const callbacks = response.data.map((row) => mapCallbackRecordRow(row));
			const mapsResult = await getCharacterMaps('getActiveCallbacks');
			if (!mapsResult.ok) return mapsResult;
			for (const callback of callbacks) {
				callback.characterId = mapCharacterIdToDomainId(mapsResult.value, callback.characterId) ?? '';
			}
			if (!callbacks.every((callback) => validateCallbackRecord(callback))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getActiveCallbacks response violates CallbackRecord[]');
			}

			return ok(callbacks);
		},

		async markCallbackReferenced(callbackId) {
			if (!isNonEmptyString(callbackId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid callbackId');
			}

			const currentResponse = (await supabase
				.from('callbacks')
				.select(
					'id, origin_share_id, character_id, original_text, callback_type, scope, potential_score, times_referenced, last_referenced_at, status, parent_callback_id'
				)
				.eq('id', callbackId)
				.maybeSingle()) as QueryResponseLike;
			if (currentResponse.error) return mapUpstreamError('markCallbackReferenced', currentResponse);
			if (currentResponse.data === null) {
				return err(SeamErrorCodes.NOT_FOUND, 'markCallbackReferenced record not found', {
					method: 'markCallbackReferenced',
					provider: 'supabase'
				});
			}

			const current = mapCallbackRecordRow(currentResponse.data);
			if (!validateCallbackRecord(current)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'markCallbackReferenced source violates CallbackRecord');
			}

			const nextTimesReferenced = current.timesReferenced + 1;
			const updateResponse = (await supabase
				.from('callbacks')
				.update({
					times_referenced: nextTimesReferenced,
					last_referenced_at: new Date().toISOString()
				})
				.eq('id', callbackId)
				.select(
					'id, origin_share_id, character_id, original_text, callback_type, scope, potential_score, times_referenced, last_referenced_at, status, parent_callback_id'
				)
				.single()) as QueryResponseLike;
			if (updateResponse.error) return mapUpstreamError('markCallbackReferenced', updateResponse);

			const callback = mapCallbackRecordRow(updateResponse.data);
			const mapsResult = await getCharacterMaps('markCallbackReferenced');
			if (!mapsResult.ok) return mapsResult;
			callback.characterId = mapCharacterIdToDomainId(mapsResult.value, callback.characterId) ?? '';
			if (!validateCallbackRecord(callback)) {
				return err(
					SeamErrorCodes.CONTRACT_VIOLATION,
					'markCallbackReferenced response violates CallbackRecord'
				);
			}

			return ok(callback);
		},

		async completeMeeting(input) {
			if (!validateCompleteMeetingInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid completeMeeting input');
			}

			const response = (await supabase
				.from('meetings')
				.update({
					ended_at: new Date().toISOString(),
					summary: input.summary,
					notable_moments: input.notableMoments ?? null
				})
				.eq('id', input.meetingId)
				.select('id, user_id, topic, user_mood, listening_only, started_at, ended_at')
				.single()) as QueryResponseLike;
			if (response.error) return mapUpstreamError('completeMeeting', response);

			const meeting = mapMeetingRecordRow(response.data);
			if (!validateMeetingRecord(meeting)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'completeMeeting response violates MeetingRecord');
			}

			return ok(meeting);
		},

		async updateCallback(input) {
			if (!validateUpdateCallbackInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid updateCallback input');
			}

			const payload: Record<string, unknown> = {};
			if (input.updates.timesReferenced !== undefined) {
				payload.times_referenced = input.updates.timesReferenced;
			}
			if (input.updates.lastReferencedAt !== undefined) {
				payload.last_referenced_at = input.updates.lastReferencedAt;
			}
			if (input.updates.status !== undefined) {
				payload.status = input.updates.status;
			}
			if (input.updates.scope !== undefined) {
				payload.scope = input.updates.scope;
			}

			const response = (await supabase
				.from('callbacks')
				.update(payload)
				.eq('id', input.id)
				.select(
					'id, origin_share_id, character_id, original_text, callback_type, scope, potential_score, times_referenced, last_referenced_at, status, parent_callback_id'
				)
				.single()) as QueryResponseLike;
			if (response.error) return mapUpstreamError('updateCallback', response);

			const callback = mapCallbackRecordRow(response.data);
			const mapsResult = await getCharacterMaps('updateCallback');
			if (!mapsResult.ok) return mapsResult;
			callback.characterId = mapCharacterIdToDomainId(mapsResult.value, callback.characterId) ?? '';
			if (!validateCallbackRecord(callback)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'updateCallback response violates CallbackRecord');
			}

			return ok(callback);
		},

		async getMeetingCountAfterDate(input) {
			if (!validateGetMeetingCountAfterDateInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid getMeetingCountAfterDate input');
			}

			const response = (await supabase
				.from('meetings')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', input.userId)
				.gt('started_at', input.startedAfter)) as QueryResponseLike;
			if (response.error) return mapUpstreamError('getMeetingCountAfterDate', response);
			if (typeof response.count !== 'number' || !Number.isInteger(response.count) || response.count < 0) {
				return err(
					SeamErrorCodes.CONTRACT_VIOLATION,
					'getMeetingCountAfterDate response did not include a valid count'
				);
			}

			return ok(response.count);
		}
	};
}
