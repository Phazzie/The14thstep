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

export interface CharacterProfile {
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
