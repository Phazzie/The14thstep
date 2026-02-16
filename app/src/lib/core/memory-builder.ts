import { SeamErrorCodes, err, ok, type SeamResult } from './seam';
import type { ShareRecord, UserProfile } from '$lib/seams/database/contract';
import type { CallbackRecord } from './types';

export interface MemoryBuilderDatabasePort {
	getHeavyMemory(userId: string): Promise<SeamResult<ShareRecord[]>>;
	getActiveCallbacks?(input: { characterId: string; meetingId: string }): Promise<SeamResult<CallbackRecord[]>>;
	getUserById?(userId: string): Promise<SeamResult<UserProfile>>;
}

export interface BuildPromptContextInput {
	userId: string;
	characterId: string;
	meetingId: string;
	database: MemoryBuilderDatabasePort;
}

export interface PromptMemoryContext {
	heavyMemory: ShareRecord[];
	callbacks: CallbackRecord[];
	heavyMemoryLines: string[];
	callbackLines: string[];
	continuityLines: string[];
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function toIso(value: string): number {
	return Date.parse(value) || 0;
}

function formatMemoryLine(share: ShareRecord): string {
	const speaker = share.isUserShare ? 'User' : share.characterId ?? 'Character';
	return `${speaker} (score ${share.significanceScore}): ${share.content}`;
}

function formatCallbackLine(callback: CallbackRecord): string {
	return `${callback.callbackType} [${callback.scope}] score ${callback.potentialScore}: ${callback.originalText}`;
}

function pickRecentMeetingIds(shares: ShareRecord[], maxMeetings: number): Set<string> {
	const byMeeting = new Map<string, number>();
	for (const share of shares) {
		const timestamp = toIso(share.createdAt);
		const current = byMeeting.get(share.meetingId) ?? 0;
		if (timestamp > current) byMeeting.set(share.meetingId, timestamp);
	}

	const ids = [...byMeeting.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxMeetings)
		.map(([id]) => id);
	return new Set(ids);
}

function buildContinuityLines(input: {
	profile: UserProfile | null;
	heavyMemory: ShareRecord[];
	recentMeetingIds: Set<string>;
}): string[] {
	const lines: string[] = [];
	if (input.profile) {
		lines.push(`Attendance count: ${input.profile.meetingCount} meetings.`);
		if (input.profile.firstMeetingAt) lines.push(`First meeting on record: ${input.profile.firstMeetingAt}.`);
		if (input.profile.lastMeetingAt) lines.push(`Most recent meeting on record: ${input.profile.lastMeetingAt}.`);
	}

	const latestUserShares = [...input.heavyMemory]
		.filter((share) => share.isUserShare)
		.slice(-3)
		.map((share) => share.content);
	if (latestUserShares.length > 0) {
		lines.push(`Recent user continuity: ${latestUserShares.join(' | ')}`);
	}

	lines.push(`Recent meeting context spans ${input.recentMeetingIds.size} meetings.`);
	return lines;
}

export async function buildPromptContext(
	input: BuildPromptContextInput
): Promise<SeamResult<PromptMemoryContext>> {
	if (!isNonEmptyString(input.userId) || !isNonEmptyString(input.characterId) || !isNonEmptyString(input.meetingId)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid memory builder input');
	}

	const heavyMemoryResult = await input.database.getHeavyMemory(input.userId);
	if (!heavyMemoryResult.ok) {
		return err(heavyMemoryResult.error.code, heavyMemoryResult.error.message, heavyMemoryResult.error.details);
	}

	const allShares = heavyMemoryResult.value;
	const recentMeetingIds = pickRecentMeetingIds(allShares, 3);
	const heavyMemory = allShares
		.filter(
			(share) =>
				share.significanceScore >= 7 ||
				(share.significanceScore >= 6 && share.isUserShare) ||
				recentMeetingIds.has(share.meetingId)
		)
		.sort((a, b) => toIso(a.createdAt) - toIso(b.createdAt) || a.sequenceOrder - b.sequenceOrder)
		.slice(-40);

	const profileResult = input.database.getUserById ? await input.database.getUserById(input.userId) : null;
	const profile = profileResult && profileResult.ok ? profileResult.value : null;

	const callbacksResult = input.database.getActiveCallbacks
		? await input.database.getActiveCallbacks({ characterId: input.characterId, meetingId: input.meetingId })
		: ok<CallbackRecord[]>([]);
	if (!callbacksResult.ok) {
		return err(callbacksResult.error.code, callbacksResult.error.message, callbacksResult.error.details);
	}

	const callbacks = callbacksResult.value
		.filter((callback) => callback.status === 'active' || callback.status === 'legend')
		.filter((callback) => callback.scope === 'room' || callback.characterId === input.characterId)
		.slice(0, 12);

	return ok({
		heavyMemory,
		callbacks,
		heavyMemoryLines: heavyMemory.map(formatMemoryLine),
		callbackLines: callbacks.map(formatCallbackLine),
		continuityLines: buildContinuityLines({ profile, heavyMemory, recentMeetingIds })
	});
}
