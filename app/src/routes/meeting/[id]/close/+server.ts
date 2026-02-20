import { CORE_CHARACTERS } from '$lib/core/characters';
import { closeMeeting } from '$lib/core/meeting';
import { runCallbackLifecycleWorkflow } from '$lib/core/callback-lifecycle-workflow';
import { scanForCallbacks } from '$lib/core/callback-scanner';
import { SeamErrorCodes, err, ok, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface CloseRequest {
	topic: string;
	lastShares: Array<{ speakerName: string; content: string }>;
}

async function buildCharacterMemorySummaries(input: {
	meetingId: string;
	topic: string;
	lastShares: Array<{ speakerName: string; content: string }>;
	grokAi: App.Locals['seams']['grokAi'];
}): Promise<Record<string, string>> {
	const summaries: Record<string, string> = {};
	const transcript = input.lastShares
		.slice(-10)
		.map((share) => `${share.speakerName}: ${share.content}`)
		.join('\n');

	for (const character of CORE_CHARACTERS.slice(0, 6)) {
		const prompt = [
			`Write a one-paragraph memory note for ${character.name} after this meeting.`,
			`Topic: ${input.topic}`,
			'Keep it concrete and human. No therapy-speak.',
			`Transcript excerpt:\n${transcript}`
		].join('\n\n');

		const result = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: `memory-${character.id}`,
			prompt,
			contextMessages: [{ role: 'assistant', content: transcript }]
		});
		if (result.ok) {
			summaries[character.id] = result.value.shareText.trim();
		}
	}

	return summaries;
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

async function parseRequest(request: Request): Promise<SeamResult<CloseRequest>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be valid JSON');
	}

	if (!isObject(body) || !isNonEmptyString(body.topic)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'topic is required');
	}
	if (body.lastShares !== undefined && !Array.isArray(body.lastShares)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'lastShares must be an array when provided');
	}

	const shares: Array<{ speakerName: string; content: string }> = [];
	for (const item of (body.lastShares ?? []).slice(-12)) {
		if (!isObject(item) || !isNonEmptyString(item.speakerName) || !isNonEmptyString(item.content)) {
			return err(SeamErrorCodes.INPUT_INVALID, 'Each last share must include speakerName and content');
		}

		shares.push({
			speakerName: item.speakerName.trim(),
			content: item.content.trim()
		});
	}

	return ok({
		topic: body.topic.trim(),
		lastShares: shares
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
	const result = await closeMeeting(
		{
			database: locals.seams.database,
			grokAi: locals.seams.grokAi
		},
		{
			meetingId,
			topic: input.topic,
			lastShares: input.lastShares
		}
	);

	if (!result.ok) {
		return json(result, { status: toStatus(result.error.code) });
	}

	const characterMemorySummaries = await buildCharacterMemorySummaries({
		meetingId,
		topic: input.topic,
		lastShares: input.lastShares,
		grokAi: locals.seams.grokAi
	});
	const completeMeetingResult = await locals.seams.database.completeMeeting({
		meetingId,
		summary: result.value.summary,
		notableMoments: characterMemorySummaries
	});
	if (!completeMeetingResult.ok) {
		return json(completeMeetingResult, { status: toStatus(completeMeetingResult.error.code) });
	}

	let callbackScan: { detected: number; saved: number; skipped: number; failed: number } | null = null;
	let callbackScanError: string | null = null;

	const sharesResult = await locals.seams.database.getMeetingShares(meetingId);
	if (sharesResult.ok) {
		const scanResult = await scanForCallbacks({
			meetingId,
			shares: sharesResult.value.map((share) => ({
				id: share.id,
				meetingId: share.meetingId,
				characterId: share.characterId,
				content: share.content,
				interactionType: 'standard'
			})),
			grokAi: locals.seams.grokAi,
			database: {
				createCallback: async (candidate) => {
					const created = await locals.seams.database.createCallback(candidate);
					if (!created.ok) {
						return err(created.error.code, created.error.message, created.error.details);
					}
					return ok({ id: created.value.id });
				}
			}
		});

		if (scanResult.ok) {
			callbackScan = scanResult.value;
			const userId = locals.userId ?? process.env.PROBE_USER_ID?.trim() ?? null;
			if (userId) {
				const presentCharacterIds = Array.from(
					new Set(
						sharesResult.value
							.map((share) => share.characterId)
							.filter((characterId): characterId is string => characterId !== null)
					)
				);
				const lifecycleResult = await runCallbackLifecycleWorkflow({
					meetingId,
					userId,
					presentCharacterIds,
					database: locals.seams.database
				});
				if (!lifecycleResult.ok) {
					callbackScanError = lifecycleResult.error.message;
				}
			}
		} else {
			callbackScanError = scanResult.error.message;
		}
	} else {
		callbackScanError = sharesResult.error.message;
	}

	return json(
		ok({
			...result.value,
			characterMemorySummaries,
			completedMeeting: completeMeetingResult.value,
			callbackScan,
			callbackScanError
		}),
		{ status: 200 }
	);
};
