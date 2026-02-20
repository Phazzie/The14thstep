import type { SeamResult } from '$lib/core/seam';

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
	userId: string | null;
	guestSessionId: string | null;
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
	getHeavyMemoryByUser(userId: string): Promise<SeamResult<ShareRecord[]>>;
	getRecentGuestMemory(guestSessionId: string): Promise<SeamResult<ShareRecord[]>>;
}
