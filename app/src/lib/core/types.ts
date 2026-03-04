export type CharacterTier = 'core' | 'regular' | 'pool' | 'visitor' | 'archived';
export type CharacterStatus = 'active' | 'relapsed' | 'archived';

export type ShareInteractionType =
	| 'standard'
	| 'respond_to'
	| 'disagree'
	| 'parallel_story'
	| 'expand'
	| 'crosstalk'
	| 'callback';

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

export interface MeetingPhaseState {
	currentPhase: MeetingPhase;
	phaseStartedAt: Date;
	roundNumber?: number;
	preCrisisPhase?: MeetingPhase;
	charactersSpokenThisRound: string[]; // UUIDs
	userHasSharedInRound: boolean;
}
