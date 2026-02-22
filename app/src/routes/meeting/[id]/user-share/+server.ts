import {
	addShare,
	detectCrisisContent,
	detectHeavyDisclosureContent,
	scoreSignificance,
	type ShareInteractionType
} from '$lib/core/meeting';
import { buildCrisisTriagePrompt } from '$lib/core/prompt-templates';
import { SeamErrorCodes, err, ok, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SHARE_INTERACTION_TYPES: readonly ShareInteractionType[] = [
	'standard',
	'respond_to',
	'disagree',
	'parallel_story',
	'expand',
	'crosstalk',
	'callback'
];

interface UserShareRequest {
	content: string;
	sequenceOrder: number;
	interactionType?: ShareInteractionType;
	isFirstUserShare?: boolean;
}

interface CrisisTriageParse {
	crisis: boolean;
	confidence: 'high' | 'medium' | 'low';
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isShareInteractionType(value: unknown): value is ShareInteractionType {
	return typeof value === 'string' && SHARE_INTERACTION_TYPES.includes(value as ShareInteractionType);
}

function stripCodeFences(value: string): string {
	const trimmed = value.trim();
	if (!trimmed.startsWith('```')) return trimmed;
	return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function parseCrisisTriage(raw: string): CrisisTriageParse | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stripCodeFences(raw));
	} catch {
		return null;
	}

	if (typeof parsed !== 'object' || parsed === null) return null;
	const value = parsed as Record<string, unknown>;
	if (typeof value.crisis !== 'boolean') return null;
	if (value.confidence !== 'high' && value.confidence !== 'medium' && value.confidence !== 'low') {
		return null;
	}

	return {
		crisis: value.crisis,
		confidence: value.confidence
	};
}

async function detectCrisisWithAi(input: {
	meetingId: string;
	content: string;
	grokAi: App.Locals['seams']['grokAi'];
}): Promise<boolean> {
	const result = await input.grokAi.generateShare({
		meetingId: input.meetingId,
		characterId: 'crisis-triage',
		prompt: buildCrisisTriagePrompt(input.content),
		contextMessages: [{ role: 'user', content: input.content }]
	});
	if (!result.ok) {
		return detectCrisisContent(input.content);
	}

	const parsed = parseCrisisTriage(result.value.shareText);
	if (!parsed) {
		return true;
	}
	if (!parsed.crisis && parsed.confidence === 'low') {
		return true;
	}

	return parsed.crisis;
}

function toStatus(code: SeamErrorCode): number {
	switch (code) {
		case SeamErrorCodes.INPUT_INVALID:
			return 400;
		case SeamErrorCodes.UNAUTHORIZED:
			return 401;
		case SeamErrorCodes.NOT_FOUND:
			return 404;
		case SeamErrorCodes.RATE_LIMITED:
			return 429;
		case SeamErrorCodes.UPSTREAM_UNAVAILABLE:
			return 503;
		case SeamErrorCodes.UPSTREAM_ERROR:
		case SeamErrorCodes.CONTRACT_VIOLATION:
			return 502;
		case SeamErrorCodes.UNEXPECTED:
		default:
			return 500;
	}
}

async function parseRequest(request: Request): Promise<SeamResult<UserShareRequest>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be valid JSON');
	}

	if (!isObject(body)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be an object');
	}
	if (!isNonEmptyString(body.content)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'content is required');
	}
	const rawSequenceOrder = body.sequenceOrder;
	if (typeof rawSequenceOrder !== 'number' || !Number.isInteger(rawSequenceOrder) || rawSequenceOrder < 0) {
		return err(SeamErrorCodes.INPUT_INVALID, 'sequenceOrder must be a non-negative integer');
	}
	const sequenceOrder = rawSequenceOrder;
	if (body.interactionType !== undefined && !isShareInteractionType(body.interactionType)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid interactionType');
	}
	if (body.isFirstUserShare !== undefined && typeof body.isFirstUserShare !== 'boolean') {
		return err(SeamErrorCodes.INPUT_INVALID, 'isFirstUserShare must be boolean when provided');
	}

	return ok({
		content: body.content.trim(),
		sequenceOrder,
		interactionType: body.interactionType,
		isFirstUserShare: body.isFirstUserShare
	});
}

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const meetingId = params.id?.trim();
	if (!meetingId) {
		return json(err(SeamErrorCodes.INPUT_INVALID, 'Meeting id is required'), { status: 400 });
	}

	const inputResult = await parseRequest(request);
	if (!inputResult.ok) {
		return json(inputResult, { status: toStatus(inputResult.error.code) });
	}

	const input = inputResult.value;
	const interactionType = input.interactionType ?? 'standard';
	const crisis = await detectCrisisWithAi({
		meetingId,
		content: input.content,
		grokAi: locals.seams.grokAi
	});
	const heavy = detectHeavyDisclosureContent(input.content);
	const significanceScore = crisis
		? 10
		: scoreSignificance({
			content: input.content,
			interactionType,
			isUserShare: true,
			isFirstUserShare: input.isFirstUserShare
		});

	const result = await addShare(
		{
			database: locals.seams.database,
			grokAi: locals.seams.grokAi
		},
		{
			meetingId,
			characterId: null,
			isUserShare: true,
			content: input.content,
			sequenceOrder: input.sequenceOrder,
			interactionType,
			isFirstUserShare: input.isFirstUserShare,
			significanceScore
		}
	);

	if (!result.ok) {
		return json(result, { status: toStatus(result.error.code) });
	}

	return json(
		ok({
			share: result.value,
			crisis,
			heavy
		}),
		{ status: 200 }
	);
};
