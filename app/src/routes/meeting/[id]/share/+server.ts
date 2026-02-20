import { CORE_CHARACTERS } from '$lib/core/characters';
import { shouldIncludeCallback } from '$lib/core/callback-engine';
import { applyReferenceLifecycle } from '$lib/core/callback-lifecycle';
import { isMeetingInCrisis } from '$lib/core/crisis-engine';
import { buildPromptContext } from '$lib/core/memory-builder';
import { addShare, scoreSignificance, type ShareInteractionType } from '$lib/core/meeting';
import { buildCharacterSharePrompt, buildQualityValidationPrompt } from '$lib/core/prompt-templates';
import { SeamErrorCodes, err, ok, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import type { CallbackScope, CallbackStatus, CallbackType } from '$lib/seams/database/contract';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const encoder = new TextEncoder();

const SHARE_INTERACTION_TYPES: readonly ShareInteractionType[] = [
	'standard',
	'respond_to',
	'disagree',
	'parallel_story',
	'expand',
	'crosstalk',
	'callback'
];

interface ShareStreamRequest {
	topic: string;
	characterId?: string;
	sequenceOrder: number;
	crisisMode?: boolean;
	interactionType?: ShareInteractionType;
	userName?: string;
	userMood?: string;
	recentShares?: Array<{ speaker: string; content: string; isUserShare?: boolean }>;
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

function sseChunk(event: string, data: unknown): Uint8Array {
	return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function chunkByWords(text: string, wordsPerChunk = 8): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const chunks: string[] = [];

	for (let index = 0; index < words.length; index += wordsPerChunk) {
		chunks.push(words.slice(index, index + wordsPerChunk).join(' '));
	}

	return chunks.length > 0 ? chunks : [text];
}

function stripCodeFences(value: string): string {
	const trimmed = value.trim();
	if (!trimmed.startsWith('```')) return trimmed;
	return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function parseQualityValidation(raw: string): { pass: boolean } | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stripCodeFences(raw));
	} catch {
		return null;
	}

	if (!isObject(parsed) || typeof parsed.pass !== 'boolean') {
		return null;
	}

	return { pass: parsed.pass };
}

function formatCallbackLine(callback: {
	callbackType: string;
	scope: string;
	potentialScore: number;
	originalText: string;
}): string {
	return `${callback.callbackType} [${callback.scope}] score ${callback.potentialScore}: ${callback.originalText}`;
}

function estimateMeetingsSinceLastReferenced(lastReferencedAt: string | null): number | undefined {
	if (!lastReferencedAt) return 10;
	const timestamp = Date.parse(lastReferencedAt);
	if (!Number.isFinite(timestamp)) return undefined;
	const elapsedMs = Date.now() - timestamp;
	if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return undefined;

	return Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
}

function isShareInteractionType(value: unknown): value is ShareInteractionType {
	return typeof value === 'string' && SHARE_INTERACTION_TYPES.includes(value as ShareInteractionType);
}

function normalizeRecentShares(
	value: unknown
): SeamResult<Array<{ speaker: string; content: string; isUserShare: boolean }>> {
	if (value === undefined) return ok([]);
	if (!Array.isArray(value)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'recentShares must be an array when provided');
	}

	const shares: Array<{ speaker: string; content: string; isUserShare: boolean }> = [];
	for (const item of value.slice(-8)) {
		if (!isObject(item) || !isNonEmptyString(item.speaker) || !isNonEmptyString(item.content)) {
			return err(SeamErrorCodes.INPUT_INVALID, 'Each recent share must include speaker and content');
		}

		shares.push({
			speaker: item.speaker.trim(),
			content: item.content.trim(),
			isUserShare: item.isUserShare === true
		});
	}

	return ok(shares);
}

async function parseBodyRequest(request: Request): Promise<SeamResult<ShareStreamRequest>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be valid JSON');
	}

	if (!isObject(body)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Request body must be an object');
	}
	if (!isNonEmptyString(body.topic)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'topic is required');
	}
	const rawSequenceOrder = body.sequenceOrder;
	if (typeof rawSequenceOrder !== 'number' || !Number.isInteger(rawSequenceOrder) || rawSequenceOrder < 0) {
		return err(SeamErrorCodes.INPUT_INVALID, 'sequenceOrder must be a non-negative integer');
	}
	const sequenceOrder = rawSequenceOrder;
	if (body.characterId !== undefined && !isNonEmptyString(body.characterId)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'characterId must be a non-empty string when provided');
	}
	if (body.crisisMode !== undefined && typeof body.crisisMode !== 'boolean') {
		return err(SeamErrorCodes.INPUT_INVALID, 'crisisMode must be boolean when provided');
	}
	if (body.interactionType !== undefined && !isShareInteractionType(body.interactionType)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid interactionType');
	}
	if (body.userName !== undefined && !isNonEmptyString(body.userName)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'userName must be a non-empty string when provided');
	}
	if (body.userMood !== undefined && !isNonEmptyString(body.userMood)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'userMood must be a non-empty string when provided');
	}

	const recentSharesResult = normalizeRecentShares(body.recentShares);
	if (!recentSharesResult.ok) return recentSharesResult;

	return ok({
		topic: body.topic.trim(),
		sequenceOrder,
		characterId: body.characterId?.trim(),
		crisisMode: body.crisisMode,
		interactionType: body.interactionType,
		userName: body.userName?.trim(),
		userMood: body.userMood?.trim(),
		recentShares: recentSharesResult.value
	});
}

function parseQueryRequest(url: URL): SeamResult<ShareStreamRequest> {
	const topic = url.searchParams.get('topic')?.trim() ?? '';
	const sequenceOrderRaw = url.searchParams.get('sequenceOrder') ?? '';
	const sequenceOrder = Number(sequenceOrderRaw);
	const characterId = url.searchParams.get('characterId')?.trim() || undefined;
	const crisisRaw = (url.searchParams.get('crisisMode') ?? '').toLowerCase();
	const crisisMode = crisisRaw === '1' || crisisRaw === 'true';
	const interactionTypeRaw = url.searchParams.get('interactionType')?.trim();
	const userName = url.searchParams.get('userName')?.trim() || undefined;
	const userMood = url.searchParams.get('userMood')?.trim() || undefined;

	if (!topic) {
		return err(SeamErrorCodes.INPUT_INVALID, 'topic is required');
	}
	if (!Number.isInteger(sequenceOrder) || sequenceOrder < 0) {
		return err(SeamErrorCodes.INPUT_INVALID, 'sequenceOrder must be a non-negative integer');
	}
	if (interactionTypeRaw && !isShareInteractionType(interactionTypeRaw)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid interactionType');
	}

	return ok({
		topic,
		sequenceOrder,
		characterId,
		crisisMode,
		interactionType: interactionTypeRaw as ShareInteractionType | undefined,
		userName,
		userMood,
		recentShares: undefined
	});
}

function pickCharacter(characterId: string | undefined, sequenceOrder: number) {
	if (characterId) {
		const matched = CORE_CHARACTERS.find((character) => character.id === characterId);
		if (matched) return matched;
	}

	return CORE_CHARACTERS[sequenceOrder % CORE_CHARACTERS.length];
}

async function generateValidatedShare(input: {
	meetingId: string;
	character: (typeof CORE_CHARACTERS)[number];
	prompt: string;
	contextMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
	topic: string;
	userName: string;
	userMood: string;
	recentShares: Array<{ speaker: string; content: string }>;
	grokAi: App.Locals['seams']['grokAi'];
}): Promise<SeamResult<{ shareText: string; attempts: number }>> {
	for (let attempt = 1; attempt <= 3; attempt += 1) {
		const generation = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: input.character.id,
			prompt: input.prompt,
			contextMessages: input.contextMessages
		});
		if (!generation.ok) {
			return err(generation.error.code, generation.error.message, generation.error.details);
		}

		const candidate = generation.value.shareText.trim();
		if (!candidate) continue;

		const qualityPrompt = buildQualityValidationPrompt(
			input.character,
			candidate,
			{
				topic: input.topic,
				userName: input.userName,
				userMood: input.userMood,
				recentShares: input.recentShares
			},
			[]
		);
		const quality = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: 'quality-validator',
			prompt: qualityPrompt,
			contextMessages: [{ role: 'assistant', content: candidate }]
		});
		if (!quality.ok) {
			return err(quality.error.code, quality.error.message, quality.error.details);
		}

		const parsed = parseQualityValidation(quality.value.shareText);
		if (parsed?.pass) {
			return ok({ shareText: candidate, attempts: attempt });
		}
	}

	return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Generated share failed quality validation after retries');
}

async function resolveRecentShares(
	meetingId: string,
	input: ShareStreamRequest,
	locals: App.Locals
): Promise<SeamResult<Array<{ speaker: string; content: string; isUserShare: boolean }>>> {
	if (input.recentShares && input.recentShares.length > 0) {
		return ok(input.recentShares.map((share) => ({ ...share, isUserShare: share.isUserShare === true })));
	}

	const sharesResult = await locals.seams.database.getMeetingShares(meetingId);
	if (!sharesResult.ok) {
		return err(sharesResult.error.code, sharesResult.error.message, sharesResult.error.details);
	}

	const recent = sharesResult.value.slice(-8).map((share) => {
		const speaker = share.isUserShare
			? input.userName ?? 'User'
			: CORE_CHARACTERS.find((character) => character.id === share.characterId)?.name ?? 'Character';
		return {
			speaker,
			content: share.content,
			isUserShare: share.isUserShare
		};
	});

	return ok(recent);
}

async function detectPersistedCrisisMode(
	meetingId: string,
	locals: App.Locals
): Promise<SeamResult<boolean>> {
	const sharesResult = await locals.seams.database.getMeetingShares(meetingId);
	if (!sharesResult.ok) {
		return err(sharesResult.error.code, sharesResult.error.message, sharesResult.error.details);
	}

	return ok(
		isMeetingInCrisis({
			shares: sharesResult.value.map((share) => ({
				content: share.content,
				significanceScore: share.significanceScore
			}))
		})
	);
}

function createShareStream(
	meetingId: string,
	input: ShareStreamRequest,
	recentShares: Array<{ speaker: string; content: string; isUserShare: boolean }>,
	locals: App.Locals
): Response {
	const selectedCharacter = pickCharacter(input.characterId, input.sequenceOrder);
	const userName = input.userName ?? 'You';
	const userMood = input.userMood ?? 'present';
	const interactionType = input.interactionType ?? 'standard';

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			void (async () => {
				const memoryUserId = locals.userId ?? process.env.PROBE_USER_ID?.trim() ?? null;
				let heavyMemoryLines: string[] | undefined;
				let continuityLines: string[] | undefined;
				let selectedCallbacks: Array<{
					id: string;
					originShareId: string;
					characterId: string;
					callbackType: CallbackType;
					scope: CallbackScope;
					potentialScore: number;
					originalText: string;
					timesReferenced: number;
					lastReferencedAt: string | null;
					status: CallbackStatus;
					parentCallbackId: string | null;
				}> = [];

				if (memoryUserId) {
					const memoryResult = await buildPromptContext({
						userId: memoryUserId,
						characterId: selectedCharacter.id,
						meetingId,
						database: locals.seams.database
					});
					if (memoryResult.ok) {
						heavyMemoryLines = memoryResult.value.heavyMemoryLines.slice(0, 6);
						continuityLines = memoryResult.value.continuityLines.slice(0, 4);
						const latestUserShare = [...recentShares].reverse().find((share) => share.isUserShare)?.content;
						const originatedCallbacksCount = memoryResult.value.callbacks.filter(
							(callback) => callback.characterId === selectedCharacter.id
						).length;

						selectedCallbacks = memoryResult.value.callbacks
							.filter((callback) => {
								const decision = shouldIncludeCallback({
									callback,
									currentCharacterId: selectedCharacter.id,
									currentCharacterMeetingCount: selectedCharacter.meetingCount,
									originatedCallbacksCount,
									latestUserShareText: latestUserShare,
									meetingsSinceLastReferenced: estimateMeetingsSinceLastReferenced(callback.lastReferencedAt)
								});
								return decision.include;
							})
							.slice(0, 3)
							.map((callback) => ({
								id: callback.id,
								originShareId: callback.originShareId,
								characterId: callback.characterId,
								callbackType: callback.callbackType,
								scope: callback.scope,
								potentialScore: callback.potentialScore,
								originalText: callback.originalText,
								timesReferenced: callback.timesReferenced,
								lastReferencedAt: callback.lastReferencedAt,
								status: callback.status,
								parentCallbackId: callback.parentCallbackId
							}));
					}
				}

				const prompt = buildCharacterSharePrompt(selectedCharacter, {
					topic: input.topic,
					userName,
					userMood,
					recentShares: recentShares.slice(-6).map((share) => ({
						speaker: share.speaker,
						content: share.content
					})),
					heavyMemoryLines,
					continuityLines,
					callbackLines: selectedCallbacks.map(formatCallbackLine)
				});

				controller.enqueue(
					sseChunk('meta', {
						ok: true,
						value: {
							meetingId,
							character: {
								id: selectedCharacter.id,
								name: selectedCharacter.name,
								avatar: selectedCharacter.avatar
							},
							sequenceOrder: input.sequenceOrder
						}
					})
				);

				const generated = await generateValidatedShare({
					meetingId,
					character: selectedCharacter,
					prompt,
					contextMessages: recentShares.slice(-6).map((share) => ({
						role: share.isUserShare ? ('user' as const) : ('assistant' as const),
						content: `${share.speaker}: ${share.content}`
					})),
					topic: input.topic,
					userName,
					userMood,
					recentShares: recentShares.slice(-6).map((share) => ({
						speaker: share.speaker,
						content: share.content
					})),
					grokAi: locals.seams.grokAi
				});

				if (!generated.ok) {
					controller.enqueue(sseChunk('error', generated));
					controller.close();
					return;
				}

				const fullText = generated.value.shareText.trim();
				const chunks = chunkByWords(fullText);
				for (let index = 0; index < chunks.length; index += 1) {
					controller.enqueue(
						sseChunk('chunk', {
							ok: true,
							value: {
								index: index + 1,
								totalChunks: chunks.length,
								chunk: chunks[index]
							}
						})
					);
					await wait(65);
				}

				const significanceScore = scoreSignificance({
					content: fullText,
					interactionType,
					isUserShare: false
				});

				const saved = await addShare(
					{
						database: locals.seams.database,
						grokAi: locals.seams.grokAi
					},
					{
						meetingId,
						characterId: selectedCharacter.id,
						isUserShare: false,
						content: fullText,
						sequenceOrder: input.sequenceOrder,
						interactionType,
						significanceScore
					}
				);

				if (!saved.ok) {
					controller.enqueue(sseChunk('error', saved));
					controller.close();
					return;
				}

				const callbackLifecycleWarnings: string[] = [];
				for (const callback of selectedCallbacks) {
					const lifecycle = applyReferenceLifecycle({
						callback,
						referencingCharacterId: selectedCharacter.id,
						generatedShareText: fullText,
						significanceScore
					});

					const updateResult = await locals.seams.database.updateCallback({
						id: callback.id,
						updates: {
							timesReferenced: lifecycle.timesReferenced,
							lastReferencedAt: lifecycle.lastReferencedAt,
							status: lifecycle.status,
							scope: lifecycle.scope
						}
					});
					if (!updateResult.ok) {
						callbackLifecycleWarnings.push(
							`updateCallback(${callback.id}) failed: ${updateResult.error.message}`
						);
						continue;
					}

					if (lifecycle.evolutionCandidate) {
						const createResult = await locals.seams.database.createCallback({
							originShareId: saved.value.id,
							characterId: lifecycle.evolutionCandidate.characterId,
							originalText: lifecycle.evolutionCandidate.originalText,
							callbackType: lifecycle.evolutionCandidate.callbackType,
							scope: lifecycle.evolutionCandidate.scope,
							potentialScore: lifecycle.evolutionCandidate.potentialScore,
							parentCallbackId: lifecycle.evolutionCandidate.parentCallbackId
						});
						if (!createResult.ok) {
							callbackLifecycleWarnings.push(
								`createCallback(child of ${callback.id}) failed: ${createResult.error.message}`
							);
						}
					}
				}

				controller.enqueue(
					sseChunk('persisted', {
						ok: true,
						value: {
							share: saved.value,
							callbacksUsed: selectedCallbacks,
								character: {
									id: selectedCharacter.id,
									name: selectedCharacter.name,
									color: selectedCharacter.color
								},
								callbackLifecycleWarnings
							}
						})
				);
				controller.enqueue(
					sseChunk('done', {
						ok: true,
						value: {
							meetingId,
							characterId: selectedCharacter.id
						}
					})
				);
				controller.close();
			})().catch((cause) => {
				controller.enqueue(
					sseChunk(
						'error',
						err(SeamErrorCodes.UNEXPECTED, 'Unexpected share stream failure', {
							cause: cause instanceof Error ? cause.message : String(cause)
						})
					)
				);
				controller.close();
			});
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive'
		}
	});
}

async function handleShareRequest(
	meetingId: string,
	inputResult: SeamResult<ShareStreamRequest>,
	locals: App.Locals
): Promise<Response> {
	if (!inputResult.ok) {
		return json(inputResult, { status: toStatus(inputResult.error.code) });
	}

	const input = inputResult.value;
	const persistedCrisisResult = await detectPersistedCrisisMode(meetingId, locals);
	if (!persistedCrisisResult.ok) {
		return json(persistedCrisisResult, { status: toStatus(persistedCrisisResult.error.code) });
	}

	if (persistedCrisisResult.value || input.crisisMode) {
		return json(err(SeamErrorCodes.INPUT_INVALID, 'Character shares are paused during crisis mode'), {
			status: 409
		});
	}

	const recentSharesResult = await resolveRecentShares(meetingId, input, locals);
	if (!recentSharesResult.ok) {
		return json(recentSharesResult, { status: toStatus(recentSharesResult.error.code) });
	}

	return createShareStream(meetingId, input, recentSharesResult.value, locals);
}

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const meetingId = params.id?.trim();
	if (!meetingId) {
		return json(err(SeamErrorCodes.INPUT_INVALID, 'Meeting id is required'), { status: 400 });
	}

	const inputResult = await parseBodyRequest(request);
	return handleShareRequest(meetingId, inputResult, locals);
};

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const meetingId = params.id?.trim();
	if (!meetingId) {
		return json(err(SeamErrorCodes.INPUT_INVALID, 'Meeting id is required'), { status: 400 });
	}

	const inputResult = parseQueryRequest(url);
	return handleShareRequest(meetingId, inputResult, locals);
};
