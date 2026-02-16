import { SeamErrorCodes, err, ok, type SeamResult } from './seam';
import type { ShareRecord } from '$lib/seams/database/contract';
import type { CallbackRecord } from './types';

export interface MemoryBuilderDatabasePort {
	getHeavyMemory(userId: string): Promise<SeamResult<ShareRecord[]>>;
	getActiveCallbacks?(input: { characterId: string; meetingId: string }): Promise<SeamResult<CallbackRecord[]>>;
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

	const heavyMemory = heavyMemoryResult.value
		.filter((share) => share.significanceScore >= 7 || (share.significanceScore >= 6 && share.isUserShare))
		.sort((a, b) => toIso(a.createdAt) - toIso(b.createdAt) || a.sequenceOrder - b.sequenceOrder)
		.slice(-20);

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
		callbackLines: callbacks.map(formatCallbackLine)
	});
}
