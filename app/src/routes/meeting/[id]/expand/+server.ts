import { CORE_CHARACTERS } from '$lib/core/characters';
import { buildExpandSharePrompt, buildQualityValidationPrompt } from '$lib/core/prompt-templates';
import { SeamErrorCodes, err, ok, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ExpandRequest {
	shareId: string;
	topic: string;
	recentShares: Array<{ speaker: string; content: string }>;
}

interface QualityValidation {
	pass: boolean;
	reasons?: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
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

function stripCodeFences(value: string): string {
	const trimmed = value.trim();
	if (!trimmed.startsWith('```')) return trimmed;
	return trimmed
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/```$/, '')
		.trim();
}

function parseQualityValidation(value: string): QualityValidation | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stripCodeFences(value));
	} catch {
		return null;
	}
	if (!isObject(parsed) || typeof parsed.pass !== 'boolean') return null;
	return {
		pass: parsed.pass,
		reasons: Array.isArray(parsed.reasons)
			? parsed.reasons.filter((item): item is string => typeof item === 'string')
			: undefined
	};
}

async function parseRequest(request: Request): Promise<SeamResult<ExpandRequest>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be valid JSON');
	}

	if (!isObject(body)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be an object');
	}
	if (!isNonEmptyString(body.shareId)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'shareId is required');
	}
	if (!isNonEmptyString(body.topic)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'topic is required');
	}
	if (body.recentShares !== undefined && !Array.isArray(body.recentShares)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'recentShares must be an array when provided');
	}

	const recentShares: Array<{ speaker: string; content: string }> = [];
	for (const entry of (body.recentShares ?? []).slice(-8)) {
		if (!isObject(entry) || !isNonEmptyString(entry.speaker) || !isNonEmptyString(entry.content)) {
			return err(
				SeamErrorCodes.INPUT_INVALID,
				'Each recent share must include speaker and content'
			);
		}
		recentShares.push({
			speaker: entry.speaker.trim(),
			content: entry.content.trim()
		});
	}

	return ok({
		shareId: body.shareId.trim(),
		topic: body.topic.trim(),
		recentShares
	});
}

async function generateValidatedExpansion(input: {
	meetingId: string;
	topic: string;
	prompt: string;
	characterId: string;
	recentShares: Array<{ speaker: string; content: string }>;
	grokAi: App.Locals['seams']['grokAi'];
}): Promise<SeamResult<{ expandedText: string; attempts: number }>> {
	for (let attempt = 1; attempt <= 2; attempt += 1) {
		const generated = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: input.characterId,
			prompt: input.prompt,
			contextMessages: input.recentShares.map((share) => ({
				role: 'assistant' as const,
				content: `${share.speaker}: ${share.content}`
			}))
		});
		if (!generated.ok) {
			return err(generated.error.code, generated.error.message, generated.error.details);
		}

		const expandedText = generated.value.shareText.trim();
		if (!expandedText) {
			continue;
		}

		const character = CORE_CHARACTERS.find((entry) => entry.id === input.characterId);
		if (!character) {
			return err(SeamErrorCodes.NOT_FOUND, 'Character profile not found for expanded share');
		}

		const qualityPrompt = buildQualityValidationPrompt(
			character,
			expandedText,
			{
				topic: input.topic,
				userName: 'You',
				userMood: 'present',
				recentShares: input.recentShares
			},
			[]
		);
		const qualityCheck = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: 'quality-validator',
			prompt: qualityPrompt,
			contextMessages: [{ role: 'assistant', content: expandedText }]
		});
		if (!qualityCheck.ok) {
			return err(qualityCheck.error.code, qualityCheck.error.message, qualityCheck.error.details);
		}

		const parsed = parseQualityValidation(qualityCheck.value.shareText);
		if (parsed?.pass) {
			return ok({ expandedText, attempts: attempt });
		}
	}

	return err(
		SeamErrorCodes.CONTRACT_VIOLATION,
		'Expanded share failed quality validation after retries'
	);
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
	const shareResult = await locals.seams.database.getShareById(input.shareId);
	if (!shareResult.ok) {
		return json(shareResult, { status: toStatus(shareResult.error.code) });
	}

	const share = shareResult.value;
	if (share.meetingId !== meetingId) {
		return json(err(SeamErrorCodes.NOT_FOUND, 'Share does not belong to this meeting'), {
			status: 404
		});
	}
	if (!share.characterId) {
		return json(err(SeamErrorCodes.INPUT_INVALID, 'Only character shares can be expanded'), {
			status: 400
		});
	}

	const character = CORE_CHARACTERS.find((entry) => entry.id === share.characterId);
	if (!character) {
		return json(err(SeamErrorCodes.NOT_FOUND, 'Character profile not found for expanded share'), {
			status: 404
		});
	}

	const prompt = buildExpandSharePrompt(character, {
		topic: input.topic,
		originalShare: share.content,
		recentShares: input.recentShares
	});

	const expandedResult = await generateValidatedExpansion({
		meetingId,
		topic: input.topic,
		prompt,
		characterId: character.id,
		recentShares: input.recentShares,
		grokAi: locals.seams.grokAi
	});
	if (!expandedResult.ok) {
		return json(expandedResult, { status: toStatus(expandedResult.error.code) });
	}

	return json(
		ok({
			shareId: share.id,
			expandedText: expandedResult.value.expandedText,
			attempts: expandedResult.value.attempts
		}),
		{ status: 200 }
	);
};
