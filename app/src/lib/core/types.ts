/**
 * Purpose: Define the pure domain values shared by meeting code.
 * Why: The meeting engine needs one runtime-validated vocabulary before it can select beats.
 * Info flow: Persisted meeting state and server-selected inputs enter core through these types.
 * Invariants: This module performs no I/O, clock reads, random selection, or server imports.
 */

export type CharacterTier = 'core' | 'regular' | 'pool' | 'visitor' | 'archived';
export type CharacterStatus = 'active' | 'relapsed' | 'archived';
export type CharacterRole = 'chair' | 'active_sharer' | 'quiet_presence';

export type ShareInteractionType =
	| 'standard'
	| 'respond_to'
	| 'disagree'
	| 'parallel_story'
	| 'expand'
	| 'crosstalk'
	| 'callback'
	| 'hard_question'
	| 'farewell';

/**
 * Interaction values accepted by a character-generation beat.
 * Room-owned beats stay separate until the database seam supports their persistence.
 */
export type CharacterShareInteractionType = Exclude<ShareInteractionType, 'room_cue' | 'empty_chair'>;

export type CallbackType =
	| 'self_deprecation'
	| 'quirk_habit'
	| 'catchphrase'
	| 'absurd_detail'
	| 'physical_behavioral'
	| 'room_meta';

export type CallbackScope = 'character' | 'room';
export type CallbackStatus = 'active' | 'stale' | 'retired' | 'legend';

export interface CharacterNarrativeProfile {
	lie: string;
	voiceExamples: [string, string, string];
	discomfortRegister: string;
	programRelationship: string;
	lostThing: string;
	cleanTimeStart: Date;
}

interface CharacterProfileBase {
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
}

export interface CharacterProfile extends CharacterProfileBase, Partial<CharacterNarrativeProfile> {}

export type CoreCharacterProfile = CharacterProfile & CharacterNarrativeProfile & { tier: 'core' };

export interface MeetingParticipant extends CharacterProfile {
	role: CharacterRole;
	isVisitor: boolean;
	seatOrder: number;
	sharesCount: number;
}

export interface MemoryShare {
	id: string;
	meetingId: string;
	characterId: string | null;
	isUserShare: boolean;
	content: string;
	significanceScore: number;
	sequenceOrder: number;
	createdAt: string;
}

export interface CallbackRecord {
	id: string;
	originShareId: string;
	characterId: string;
	originalText: string;
	callbackType: CallbackType;
	scope: CallbackScope;
	potentialScore: number;
	timesReferenced: number;
	status: CallbackStatus;
	lastReferencedAt: string | null;
	parentCallbackId: string | null;
}

// M13: Voice Pipeline Schema
export interface VoiceCandidate {
	text: string;
	voiceConsistency: number; // 0-10
	authenticity: number; // 0-10
	therapySpeakDetected: boolean;
	retryAttempt: number;
}

export interface GenerateShareWithCandidates {
	selectedText: string;
	candidateMetadata: VoiceCandidate;
	totalCandidatesGenerated: number;
}

// M18: Meeting Ritual Structure
export enum MeetingPhase {
	SETUP = 'setup',
	OPENING = 'opening',
	EMPTY_CHAIR = 'empty_chair',
	INTRODUCTIONS = 'introductions',
	TOPIC_SELECTION = 'topic_selection',
	SHARING_ROUND_1 = 'sharing_round_1',
	SHARING_ROUND_2 = 'sharing_round_2',
	SHARING_ROUND_3 = 'sharing_round_3',
	CRISIS_MODE = 'crisis_mode',
	CLOSING = 'closing',
	POST_MEETING = 'post_meeting'
}

/**
 * Controlled room text keys currently present in the shipped room ritual.
 * Later selection work may add a key only alongside its renderer mapping and tests.
 */
export const ROOM_CUES = ['moment_of_silence'] as const;
export type RoomCue = (typeof ROOM_CUES)[number];

/**
 * Canonical provenance for a crisis-support beat.
 * The user-share form names a stored share; intake carries no browser-provided prose.
 */
export type CrisisTrigger = { source: 'user_share'; shareId: string } | { source: 'meeting_intake' };

/**
 * Controlled crisis resource copy. It is static product content, not generated or browser supplied.
 */
export interface CrisisResourcesPayload {
	readonly sticky: true;
	readonly title: string;
	readonly lines: readonly string[];
}

export const CRISIS_RESOURCES: CrisisResourcesPayload = Object.freeze({
	sticky: true,
	title: "If you're in crisis",
	lines: Object.freeze([
		'Call or text 988 - Suicide & Crisis Lifeline',
		'Text HOME to 741741 - Crisis Text Line',
		'If you are in immediate danger, call 911.',
		'You can stay here with us.'
	])
});

export interface BeatBase {
	id: string;
	ordinal: number;
	phase: MeetingPhase;
	pauseAfterMs: number;
}

/**
 * The non-crisis portion of the renderer instruction contract.
 * C02 adds the crisis-support branch once its canonical trigger is defined.
 */
export type NormalMeetingBeat =
	| (BeatBase & {
			kind: 'character_share';
			characterId: string;
			interactionType: CharacterShareInteractionType;
		})
	| (BeatBase & { kind: 'room_cue'; cue: RoomCue })
	| (BeatBase & { kind: 'generated_room_moment'; moment: 'empty_chair' })
	| (BeatBase & { kind: 'user_gate'; gate: 'introduction' | 'topic' | 'share' })
	| (BeatBase & { kind: 'close_meeting' })
	| (BeatBase & { kind: 'finished' });

export type CrisisSupportBeat = BeatBase & {
	kind: 'crisis_support';
	trigger: CrisisTrigger;
	responderCharacterId: string;
};

export type MeetingBeat = NormalMeetingBeat | CrisisSupportBeat;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
	return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function hasValidBeatBase(value: Record<string, unknown>): value is Record<keyof BeatBase, unknown> {
	return (
		isNonEmptyString(value.id) &&
		typeof value.ordinal === 'number' &&
		Number.isInteger(value.ordinal) &&
		value.ordinal >= 0 &&
		typeof value.pauseAfterMs === 'number' &&
		Number.isFinite(value.pauseAfterMs) &&
		value.pauseAfterMs >= 0 &&
		Object.values(MeetingPhase).includes(value.phase as MeetingPhase)
	);
}

/**
 * Narrow untrusted data to the two canonical crisis sources without accepting text from a caller.
 */
export function isCrisisTrigger(value: unknown): value is CrisisTrigger {
	if (!isRecord(value) || typeof value.source !== 'string') return false;
	if (value.source === 'meeting_intake') return hasOnlyKeys(value, ['source']);
	return (
		value.source === 'user_share' &&
		hasOnlyKeys(value, ['source', 'shareId']) &&
		isNonEmptyString(value.shareId)
	);
}

/**
 * The single exported resource payload is safe to render only when its structural invariants hold.
 */
export function isCrisisResourcesPayload(value: unknown): value is CrisisResourcesPayload {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ['sticky', 'title', 'lines']) &&
		value.sticky === true &&
		isNonEmptyString(value.title) &&
		Array.isArray(value.lines) &&
		value.lines.length > 0 &&
		value.lines.every(isNonEmptyString)
	);
}

/**
 * Accept only normal beat records with the discriminator-specific payload the renderer may use.
 * Unknown, room-owned character interactions, malformed base values, and surplus payloads fail closed.
 */
export function isNormalMeetingBeat(value: unknown): value is NormalMeetingBeat {
	if (!isRecord(value) || !hasValidBeatBase(value) || typeof value.kind !== 'string') return false;

	const baseKeys = ['id', 'ordinal', 'phase', 'pauseAfterMs', 'kind'] as const;

	switch (value.kind) {
		case 'character_share':
			return (
				hasOnlyKeys(value, [...baseKeys, 'characterId', 'interactionType']) &&
				isNonEmptyString(value.characterId) &&
				typeof value.interactionType === 'string' &&
				value.interactionType !== 'room_cue' &&
				value.interactionType !== 'empty_chair' &&
				([
					'standard',
					'respond_to',
					'disagree',
					'parallel_story',
					'expand',
					'crosstalk',
					'callback',
					'hard_question',
					'farewell'
				] as const).includes(value.interactionType as CharacterShareInteractionType)
			);
		case 'room_cue':
			return hasOnlyKeys(value, [...baseKeys, 'cue']) && ROOM_CUES.includes(value.cue as RoomCue);
		case 'generated_room_moment':
			return (
				hasOnlyKeys(value, [...baseKeys, 'moment']) && value.moment === 'empty_chair'
			);
		case 'user_gate':
			return (
				hasOnlyKeys(value, [...baseKeys, 'gate']) &&
				(value.gate === 'introduction' || value.gate === 'topic' || value.gate === 'share')
			);
		case 'close_meeting':
		case 'finished':
			return hasOnlyKeys(value, baseKeys);
		default:
			return false;
	}
}

/**
 * Accept a full meeting beat, including only a typed crisis-support payload.
 */
export function isMeetingBeat(value: unknown): value is MeetingBeat {
	if (isNormalMeetingBeat(value)) return true;
	if (!isRecord(value) || !hasValidBeatBase(value) || value.kind !== 'crisis_support') return false;
	return (
		hasOnlyKeys(value, [
			'id',
			'ordinal',
			'phase',
			'pauseAfterMs',
			'kind',
			'trigger',
			'responderCharacterId'
		]) &&
		isCrisisTrigger(value.trigger) &&
		isNonEmptyString(value.responderCharacterId)
	);
}

export interface MeetingPhaseState {
	currentPhase: MeetingPhase;
	phaseStartedAt: Date;
	roundNumber?: number;
	preCrisisPhase?: MeetingPhase;
	charactersSpokenThisRound: string[]; // UUIDs
	userHasSharedInRound: boolean;
	/** Optional until a protocol-version-1 meeting explicitly initializes the beat contract. */
	beatCursor?: number;
	activeBeat?: MeetingBeat | null;
	crisisTrigger?: CrisisTrigger | null;
	intakeCrisisHandled?: boolean;
}
