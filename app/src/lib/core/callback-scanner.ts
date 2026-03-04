import { SeamErrorCodes, err, ok, type SeamResult } from './seam';
import type { CallbackType, ShareInteractionType } from './types';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';

const CALLBACK_TYPES: CallbackType[] = [
	'self_deprecation',
	'quirk_habit',
	'catchphrase',
	'absurd_detail',
	'physical_behavioral',
	'room_meta'
];

export interface CompletedShare {
	id: string;
	meetingId: string;
	characterId: string | null;
	content: string;
	interactionType: ShareInteractionType;
}

export interface CallbackCandidate {
	originShareId: string;
	characterId: string;
	originalText: string;
	callbackType: CallbackType;
	scope: 'character' | 'room';
	potentialScore: number;
}

export interface CallbackScannerDatabasePort {
	createCallback(input: CallbackCandidate): Promise<SeamResult<{ id: string }>>;
}

export interface ScanForCallbacksInput {
	meetingId: string;
	shares: CompletedShare[];
	grokAi: GrokAiPort;
	database: CallbackScannerDatabasePort;
}

export interface CallbackScanResult {
	detected: number;
	saved: number;
	skipped: number;
	failed: number;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function buildScannerPrompt(meetingId: string, shares: CompletedShare[]): string {
	const serializedShares = shares
		.map(
			(share) =>
				`- id=${share.id} characterId=${share.characterId ?? 'null'} interaction=${share.interactionType} text=${share.content}`
		)
		.join('\n');

	return [
		'Identify callback-worthy moments from completed meeting shares.',
		`Meeting ID: ${meetingId}`,
		'Return JSON array only. No markdown, no code fences, no prose before/after JSON.',
		'Each item must include exactly these keys:',
		'originShareId, characterId, originalText, callbackType, scope, potentialScore.',
		`Allowed callbackType values: ${CALLBACK_TYPES.join(', ')}`,
		"Allowed scope values: character, room. potentialScore must be integer 1-10.",
		'Only include lines that are concrete, quotable, and likely to be referenced again; skip generic encouragement or summary language.',
		'originShareId must match a provided share id. characterId must match a speaker from provided shares.',
		`Shares:\n${serializedShares}`
	].join('\n\n');
}

function stripCodeFences(text: string): string {
	const trimmed = text.trim();
	if (!trimmed.startsWith('```')) return trimmed;
	return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function parseCandidates(rawText: string): CallbackCandidate[] | null {
	const normalized = stripCodeFences(rawText);
	let parsed: unknown;
	try {
		parsed = JSON.parse(normalized);
	} catch {
		return null;
	}

	if (!Array.isArray(parsed)) return null;
	const candidates: CallbackCandidate[] = [];

	for (const value of parsed) {
		if (typeof value !== 'object' || value === null) continue;
		const record = value as Record<string, unknown>;
		if (!isNonEmptyString(record.originShareId)) continue;
		if (!isNonEmptyString(record.characterId)) continue;
		if (!isNonEmptyString(record.originalText)) continue;
		if (!isNonEmptyString(record.callbackType)) continue;
		if (!CALLBACK_TYPES.includes(record.callbackType as CallbackType)) continue;
		if (record.scope !== 'character' && record.scope !== 'room') continue;
		if (!Number.isInteger(record.potentialScore)) continue;
		if ((record.potentialScore as number) < 1 || (record.potentialScore as number) > 10) continue;

		candidates.push({
			originShareId: record.originShareId,
			characterId: record.characterId,
			originalText: record.originalText,
			callbackType: record.callbackType as CallbackType,
			scope: record.scope,
			potentialScore: record.potentialScore as number
		});
	}

	return candidates;
}

export async function scanForCallbacks(
	input: ScanForCallbacksInput
): Promise<SeamResult<CallbackScanResult>> {
	if (!isNonEmptyString(input.meetingId) || input.shares.length === 0) {
		return err(SeamErrorCodes.INPUT_INVALID, 'scanForCallbacks requires meetingId and shares');
	}

	const response = await input.grokAi.generateShare({
		meetingId: input.meetingId,
		characterId: 'callback-scanner',
		prompt: buildScannerPrompt(input.meetingId, input.shares),
		contextMessages: [
			{
				role: 'system',
				content: 'Extract callback moments as strict JSON.'
			}
		]
	});
	if (!response.ok) {
		return err(response.error.code, response.error.message, response.error.details);
	}

	const parsed = parseCandidates(response.value.shareText);
	if (!parsed) {
		return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Callback scanner response is not valid JSON array');
	}

	let saved = 0;
	let failed = 0;
	for (const candidate of parsed) {
		const result = await input.database.createCallback(candidate);
		if (result.ok) {
			saved += 1;
		} else {
			failed += 1;
		}
	}

	return ok({
		detected: parsed.length,
		saved,
		skipped: parsed.length - saved - failed,
		failed
	});
}
