import type { CallbackRecord, CallbackScope, CallbackStatus, CreateCallbackInput } from '$lib/seams/database/contract';

export const CALLBACK_STALE_THRESHOLD = 12;
export const CALLBACK_RETIRE_MEETING_GAP = 15;

interface CallbackTokenStats {
	overlapCount: number;
	novelCount: number;
}

export interface ApplyReferenceLifecycleInput {
	callback: CallbackRecord;
	referencingCharacterId: string;
	generatedShareText: string;
	significanceScore: number;
	nowIso?: string;
}

export interface ReferenceLifecycleUpdate {
	timesReferenced: number;
	lastReferencedAt: string;
	status: CallbackStatus;
	scope: CallbackScope;
	evolutionCandidate: Omit<CreateCallbackInput, 'originShareId'> | null;
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length >= 4);
}

function analyzeTokenNovelty(source: string, candidate: string): CallbackTokenStats {
	const sourceTokens = new Set(tokenize(source));
	const candidateTokens = new Set(tokenize(candidate));

	let overlapCount = 0;
	let novelCount = 0;
	for (const token of candidateTokens) {
		if (sourceTokens.has(token)) overlapCount += 1;
		else novelCount += 1;
	}

	return { overlapCount, novelCount };
}

function normalizeSpace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function detectMeaningfulEvolution(originalText: string, generatedShareText: string): boolean {
	const original = normalizeSpace(originalText).toLowerCase();
	const generated = normalizeSpace(generatedShareText).toLowerCase();
	if (!generated || generated === original) return false;

	const tokenStats = analyzeTokenNovelty(original, generated);
	return tokenStats.overlapCount >= 2 && tokenStats.novelCount >= 4;
}

function nextScopeForReference(callback: CallbackRecord, referencingCharacterId: string): CallbackScope {
	if (callback.scope === 'room') return 'room';
	if (callback.characterId === referencingCharacterId) return callback.scope;
	return 'room';
}

function nextStatusAfterReference(input: {
	callback: CallbackRecord;
	timesReferenced: number;
	evolved: boolean;
	significanceScore: number;
}): CallbackStatus {
	if (input.callback.status === 'retired' && input.significanceScore >= 8) {
		return 'legend';
	}
	if (!input.evolved && input.timesReferenced >= CALLBACK_STALE_THRESHOLD) {
		return 'stale';
	}
	if (input.evolved && input.callback.status === 'stale') {
		return 'active';
	}
	return input.callback.status;
}

function buildEvolutionCandidate(input: {
	callback: CallbackRecord;
	referencingCharacterId: string;
	generatedShareText: string;
	significanceScore: number;
	nextScope: CallbackScope;
}): Omit<CreateCallbackInput, 'originShareId'> | null {
	if (!detectMeaningfulEvolution(input.callback.originalText, input.generatedShareText)) {
		return null;
	}

	return {
		characterId: input.referencingCharacterId,
		originalText: normalizeSpace(input.generatedShareText).slice(0, 400),
		callbackType: input.callback.callbackType,
		scope: input.nextScope,
		potentialScore: Math.min(10, Math.max(input.callback.potentialScore, input.significanceScore)),
		parentCallbackId: input.callback.id
	};
}

export function applyReferenceLifecycle(input: ApplyReferenceLifecycleInput): ReferenceLifecycleUpdate {
	const nowIso = input.nowIso ?? new Date().toISOString();
	const timesReferenced = input.callback.timesReferenced + 1;
	const nextScope = nextScopeForReference(input.callback, input.referencingCharacterId);
	const evolutionCandidate = buildEvolutionCandidate({
		callback: input.callback,
		referencingCharacterId: input.referencingCharacterId,
		generatedShareText: input.generatedShareText,
		significanceScore: input.significanceScore,
		nextScope
	});
	const nextStatus = nextStatusAfterReference({
		callback: input.callback,
		timesReferenced,
		evolved: evolutionCandidate !== null,
		significanceScore: input.significanceScore
	});

	return {
		timesReferenced,
		lastReferencedAt: nowIso,
		status: nextStatus,
		scope: nextScope,
		evolutionCandidate
	};
}

export function shouldRetireForInactivity(input: {
	callback: CallbackRecord;
	meetingsSinceLastReferenced: number | undefined;
}): boolean {
	if (input.callback.status !== 'active' && input.callback.status !== 'stale') return false;
	return (
		typeof input.meetingsSinceLastReferenced === 'number' &&
		input.meetingsSinceLastReferenced >= CALLBACK_RETIRE_MEETING_GAP
	);
}
