import { CORE_CHARACTERS } from '$lib/core/characters';
import { addShare } from '$lib/core/meeting';
import { buildHeatherCrisisPrompt, buildMarcusCrisisPrompt } from '$lib/core/prompt-templates';
import { SeamErrorCodes, err, ok, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface CrisisRequest {
	userText: string;
	userName: string;
	sequenceOrder: number;
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

async function parseRequest(request: Request): Promise<SeamResult<CrisisRequest>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be valid JSON');
	}

	if (!isObject(body)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be an object');
	}
	if (!isNonEmptyString(body.userText)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'userText is required');
	}
	if (body.userName !== undefined && !isNonEmptyString(body.userName)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'userName must be non-empty when provided');
	}
	if (typeof body.sequenceOrder !== 'number' || !Number.isInteger(body.sequenceOrder) || body.sequenceOrder < 0) {
		return err(SeamErrorCodes.INPUT_INVALID, 'sequenceOrder must be a non-negative integer');
	}

	return ok({
		userText: body.userText.trim(),
		userName: typeof body.userName === 'string' ? body.userName.trim() : 'You',
		sequenceOrder: body.sequenceOrder
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
	// TODO(M8): enforce timed crisis sequence policy (quiet pause + deterministic ordering) via persisted meeting state.
	const marcus = CORE_CHARACTERS.find((character) => character.id === 'marcus');
	const heather = CORE_CHARACTERS.find((character) => character.id === 'heather');
	if (!marcus || !heather) {
		return json(err(SeamErrorCodes.NOT_FOUND, 'Required crisis characters are unavailable'), { status: 404 });
	}

	const marcusGeneration = await locals.seams.grokAi.generateShare({
		meetingId,
		characterId: marcus.id,
		prompt: buildMarcusCrisisPrompt(input.userName, input.userText),
		contextMessages: [{ role: 'user', content: input.userText }]
	});
	if (!marcusGeneration.ok) {
		return json(marcusGeneration, { status: toStatus(marcusGeneration.error.code) });
	}

	const marcusShare = await addShare(
		{ database: locals.seams.database, grokAi: locals.seams.grokAi },
		{
			meetingId,
			characterId: marcus.id,
			isUserShare: false,
			content: marcusGeneration.value.shareText.trim(),
			sequenceOrder: input.sequenceOrder,
			interactionType: 'respond_to',
			significanceScore: 10
		}
	);
	if (!marcusShare.ok) {
		return json(marcusShare, { status: toStatus(marcusShare.error.code) });
	}

	const heatherGeneration = await locals.seams.grokAi.generateShare({
		meetingId,
		characterId: heather.id,
		prompt: buildHeatherCrisisPrompt(input.userName, input.userText),
		contextMessages: [
			{ role: 'user', content: input.userText },
			{ role: 'assistant', content: marcusShare.value.content }
		]
	});
	if (!heatherGeneration.ok) {
		return json(heatherGeneration, { status: toStatus(heatherGeneration.error.code) });
	}

	const heatherShare = await addShare(
		{ database: locals.seams.database, grokAi: locals.seams.grokAi },
		{
			meetingId,
			characterId: heather.id,
			isUserShare: false,
			content: heatherGeneration.value.shareText.trim(),
			sequenceOrder: input.sequenceOrder + 1,
			interactionType: 'respond_to',
			significanceScore: 10
		}
	);
	if (!heatherShare.ok) {
		return json(heatherShare, { status: toStatus(heatherShare.error.code) });
	}

	return json(
		ok({
			shares: [marcusShare.value, heatherShare.value],
			// TODO(M8): move resource rendering to a sticky/persistent panel contract instead of raw string array payload.
			resources: [
				'988 - Suicide & Crisis Lifeline',
				'1-800-662-4357 - SAMHSA National Helpline',
				'You can stay here with us.'
			]
		}),
		{ status: 200 }
	);
};
