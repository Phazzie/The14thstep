import { CORE_CHARACTERS } from '$lib/core/characters';
import { addShare } from '$lib/core/meeting';
import { buildMarcusCrisisPrompt } from '$lib/core/prompt-templates';
import { SeamErrorCodes, err, ok, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface CrisisRequest {
	userText: string;
	userName: string;
	sequenceOrder: number;
}

interface CrisisResourcesPayload {
	sticky: true;
	title: string;
	lines: string[];
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

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
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
	const designatedCharacter = CORE_CHARACTERS.find((character) => character.id === 'marcus') ?? CORE_CHARACTERS[0];
	if (!designatedCharacter) {
		return json(err(SeamErrorCodes.NOT_FOUND, 'Crisis responder is unavailable'), { status: 404 });
	}

	await wait(2000);

	const generation = await locals.seams.grokAi.generateShare({
		meetingId,
		characterId: designatedCharacter.id,
		prompt: buildMarcusCrisisPrompt(input.userName, input.userText),
		contextMessages: [{ role: 'user', content: input.userText }]
	});
	if (!generation.ok) {
		return json(generation, { status: toStatus(generation.error.code) });
	}

	const crisisShare = await addShare(
		{ database: locals.seams.database, grokAi: locals.seams.grokAi },
		{
			meetingId,
			characterId: designatedCharacter.id,
			isUserShare: false,
			content: generation.value.shareText.trim(),
			sequenceOrder: input.sequenceOrder,
			interactionType: 'respond_to',
			significanceScore: 10
		}
	);
	if (!crisisShare.ok) {
		return json(crisisShare, { status: toStatus(crisisShare.error.code) });
	}

	return json(
		ok({
			shares: [crisisShare.value],
			resources: {
				sticky: true,
				title: "If you're in crisis",
				lines: [
					'Call or text 988 - Suicide & Crisis Lifeline',
					'Text HOME to 741741 - Crisis Text Line',
					'If you are in immediate danger, call 911.',
					'You can stay here with us.'
				]
			} satisfies CrisisResourcesPayload
		}),
		{ status: 200 }
	);
};
