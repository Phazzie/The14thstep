import { SeamErrorCodes, err, ok, type SeamResult } from '$lib/core/seam';
import {
	type CallbackRecord,
	type DatabasePort,
	type MeetingRecord,
	type ShareRecord,
	type UserProfile,
	validateCallbackRecord,
	validateCompleteMeetingInput,
	validateCreateCallbackInput,
	validateAppendShareInput,
	validateCreateMeetingInput,
	validateMeetingRecord,
	validateShareRecord,
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
}

const NETWORK_STATUSES = new Set([0, 408, 429, 502, 503, 504, 522, 524]);

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

			const response = (await supabase
				.from('shares')
				.insert({
					meeting_id: input.meetingId,
					character_id: input.characterId,
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
			if (!shares.every((share) => validateShareRecord(share))) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getMeetingShares response violates ShareRecord[]');
			}

			return ok(shares);
		},

		async createCallback(input) {
			if (!validateCreateCallbackInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid createCallback input');
			}

			const response = (await supabase
				.from('callbacks')
				.insert({
					origin_share_id: input.originShareId,
					character_id: input.characterId,
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
			if (!validateCallbackRecord(callback)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'createCallback response violates CallbackRecord');
			}

			return ok(callback);
		},

		async getActiveCallbacks(input) {
			if (!isNonEmptyString(input.characterId) || !isNonEmptyString(input.meetingId)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid getActiveCallbacks input');
			}

			const response = (await supabase
				.from('callbacks')
				.select(
					'id, origin_share_id, character_id, original_text, callback_type, scope, potential_score, times_referenced, last_referenced_at, status, parent_callback_id'
				)
				.in('status', ['active', 'legend'])
				.or(`character_id.eq.${input.characterId},scope.eq.room`)
				.order('potential_score', { ascending: false })
				.order('times_referenced', { ascending: false })
				.limit(30)) as QueryResponseLike<unknown[]>;

			if (response.error) return mapUpstreamError('getActiveCallbacks', response);
			if (!Array.isArray(response.data)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'getActiveCallbacks response is not CallbackRecord[]');
			}

			const callbacks = response.data.map((row) => mapCallbackRecordRow(row));
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
		}
	};
}
