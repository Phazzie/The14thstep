import { CORE_CHARACTERS, validateCharacterNarrativeFields } from '$lib/core/characters';
import { shouldIncludeCallback } from '$lib/core/callback-engine';
import { applyReferenceLifecycle } from '$lib/core/callback-lifecycle';
import { isMeetingInCrisis } from '$lib/core/crisis-engine';
import { buildPromptContext } from '$lib/core/memory-builder';
import { addShare, scoreSignificance, type ShareInteractionType } from '$lib/core/meeting';
import {
	getMeetingNarrativeContext,
	parseQualityValidation,
	passesQualityValidationThresholds
} from '$lib/core/narrative-context';
import {
	selectPromptForPhase,
	INTRO_ORDER,
	initializeMeetingPhase,
	isRoundComplete,
	recordCharacterSpoke,
	transitionToNextPhase
} from '$lib/core/ritual-orchestration';
import {
	buildCharacterSharePrompt,
	buildQualityValidationPrompt,
	buildRitualOpeningPrompt,
	buildRitualIntroPrompt,
	buildRitualReadingPrompt,
	buildRitualClosingPrompt,
	buildTopicIntroductionPrompt
} from '$lib/core/prompt-templates';
import type { MeetingPhaseState } from '$lib/core/types';
import { MeetingPhase } from '$lib/core/types';
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
	phaseState?: MeetingPhaseState;
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
	return (
		typeof value === 'string' && SHARE_INTERACTION_TYPES.includes(value as ShareInteractionType)
	);
}

function normalizePromptScalar(value: string, maxLength = 160): string {
	const compact = value.replace(/\s+/g, ' ').trim();
	return compact.slice(0, maxLength);
}

function revivePhaseState(value: unknown): MeetingPhaseState | null {
	if (!isObject(value)) return null;
	if (typeof value.currentPhase !== 'string') return null;
	if (!Object.values(MeetingPhase).includes(value.currentPhase as MeetingPhase)) return null;

	const rawPhaseStartedAt = value.phaseStartedAt;
	let phaseStartedAt: Date;
	if (rawPhaseStartedAt instanceof Date) {
		phaseStartedAt = rawPhaseStartedAt;
	} else if (typeof rawPhaseStartedAt === 'string') {
		const parsed = new Date(rawPhaseStartedAt);
		if (!Number.isFinite(parsed.getTime())) return null;
		phaseStartedAt = parsed;
	} else {
		return null;
	}

	if (!Array.isArray(value.charactersSpokenThisRound)) return null;
	const charactersSpokenThisRound = value.charactersSpokenThisRound.filter(
		(entry): entry is string => typeof entry === 'string'
	);
	if (charactersSpokenThisRound.length !== value.charactersSpokenThisRound.length) return null;

	if (typeof value.userHasSharedInRound !== 'boolean') return null;

	let roundNumber: number | undefined;
	if (value.roundNumber !== undefined) {
		if (
			typeof value.roundNumber !== 'number' ||
			!Number.isInteger(value.roundNumber) ||
			value.roundNumber < 0
		) {
			return null;
		}
		roundNumber = value.roundNumber;
	}

	let preCrisisPhase: MeetingPhase | undefined;
	if (value.preCrisisPhase !== undefined && value.preCrisisPhase !== null) {
		if (typeof value.preCrisisPhase !== 'string') return null;
		if (!Object.values(MeetingPhase).includes(value.preCrisisPhase as MeetingPhase)) return null;
		if ((value.preCrisisPhase as MeetingPhase) === MeetingPhase.CRISIS_MODE) return null;
		preCrisisPhase = value.preCrisisPhase as MeetingPhase;
	}

	return {
		currentPhase: value.currentPhase as MeetingPhase,
		phaseStartedAt,
		roundNumber,
		preCrisisPhase,
		charactersSpokenThisRound,
		userHasSharedInRound: value.userHasSharedInRound
	};
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
	if (
		typeof rawSequenceOrder !== 'number' ||
		!Number.isInteger(rawSequenceOrder) ||
		rawSequenceOrder < 0
	) {
		return err(SeamErrorCodes.INPUT_INVALID, 'sequenceOrder must be a non-negative integer');
	}
	const sequenceOrder = rawSequenceOrder;
	if (body.characterId !== undefined && !isNonEmptyString(body.characterId)) {
		return err(
			SeamErrorCodes.INPUT_INVALID,
			'characterId must be a non-empty string when provided'
		);
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
	if (body.phaseState !== undefined && !isObject(body.phaseState)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'phaseState must be an object when provided');
	}
	const revivedPhaseState: MeetingPhaseState | undefined =
		body.phaseState !== undefined
			? (revivePhaseState(body.phaseState as unknown) ?? undefined)
			: undefined;
	if (body.phaseState !== undefined && !revivedPhaseState) {
		return err(SeamErrorCodes.INPUT_INVALID, 'phaseState is invalid');
	}

	return ok({
		topic: normalizePromptScalar(body.topic),
		sequenceOrder,
		characterId: body.characterId?.trim(),
		crisisMode: body.crisisMode,
		interactionType: body.interactionType,
		userName: body.userName ? normalizePromptScalar(body.userName, 80) : undefined,
		userMood: body.userMood ? normalizePromptScalar(body.userMood, 80) : undefined,
		phaseState: revivedPhaseState
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
		topic: normalizePromptScalar(topic),
		sequenceOrder,
		characterId,
		crisisMode,
		interactionType: interactionTypeRaw as ShareInteractionType | undefined,
		userName: userName ? normalizePromptScalar(userName, 80) : undefined,
		userMood: userMood ? normalizePromptScalar(userMood, 80) : undefined,
		phaseState: undefined
	});
}

function findCharacterById(characterId: string | undefined) {
	if (!characterId) return null;
	return CORE_CHARACTERS.find((character) => character.id === characterId) ?? null;
}

const ROUND_SPEAKER_ORDER: Record<number, string[]> = {
	1: ['heather', 'meechie'],
	2: ['gemini', 'gypsy'],
	3: ['chrystal', 'marcus']
};

function pickCharacterForPhase(
	_characterId: string | undefined,
	phaseState: MeetingPhaseState,
	sequenceOrder: number
) {
	// Speaker ownership lives on the server now; ignore stale client hints.
	switch (phaseState.currentPhase) {
		case MeetingPhase.SETUP:
		case MeetingPhase.OPENING:
		case MeetingPhase.EMPTY_CHAIR:
		case MeetingPhase.TOPIC_SELECTION:
		case MeetingPhase.CLOSING:
		case MeetingPhase.CRISIS_MODE:
			return findCharacterById('marcus') ?? CORE_CHARACTERS[0];

		case MeetingPhase.INTRODUCTIONS: {
			const introCharacterId =
				INTRO_ORDER[phaseState.charactersSpokenThisRound.length] ?? INTRO_ORDER[0];
			return findCharacterById(introCharacterId) ?? CORE_CHARACTERS[0];
		}

		case MeetingPhase.SHARING_ROUND_1:
		case MeetingPhase.SHARING_ROUND_2:
		case MeetingPhase.SHARING_ROUND_3: {
			const roundOrder =
				ROUND_SPEAKER_ORDER[phaseState.roundNumber ?? 1] ??
				CORE_CHARACTERS.map((character) => character.id);
			const nextRoundSpeaker = roundOrder.find(
				(candidateId) => !phaseState.charactersSpokenThisRound.includes(candidateId)
			);
			if (nextRoundSpeaker) {
				return findCharacterById(nextRoundSpeaker) ?? CORE_CHARACTERS[0];
			}

			const fallbackCharacter = CORE_CHARACTERS.find(
				(character) => !phaseState.charactersSpokenThisRound.includes(character.id)
			);
			return fallbackCharacter ?? CORE_CHARACTERS[sequenceOrder % CORE_CHARACTERS.length];
		}

		case MeetingPhase.POST_MEETING:
		default:
			return CORE_CHARACTERS[sequenceOrder % CORE_CHARACTERS.length];
	}
}

export async function _generateValidatedShare(input: {
	meetingId: string;
	character: (typeof CORE_CHARACTERS)[number];
	prompt: string;
	contextMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
	topic: string;
	userName: string;
	userMood: string;
	recentShares: Array<{ speaker: string; content: string }>;
	grokAi: App.Locals['seams']['grokAi'];
}): Promise<SeamResult<{ shareText: string; attempts: number; fallbackUsed: boolean }>> {
	const attemptScores: Array<{
		attempt: number;
		validatorPass: boolean | null;
		voiceConsistency: number | null;
		authenticity: number | null;
		note: string;
	}> = [];
	let lastUpstreamError: {
		code: SeamErrorCode;
		message: string;
		details?: Record<string, unknown>;
	} | null = null;
	let hadGeneratedCandidate = false;

	for (let attempt = 1; attempt <= 3; attempt += 1) {
		const generation = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: input.character.id,
			prompt: input.prompt,
			contextMessages: input.contextMessages
		});
		if (!generation.ok) {
			lastUpstreamError = generation.error;
			attemptScores.push({
				attempt,
				validatorPass: null,
				voiceConsistency: null,
				authenticity: null,
				note: `generation_error:${generation.error.code}`
			});
			continue;
		}

		const candidate = generation.value.shareText.trim();
		if (!candidate) {
			attemptScores.push({
				attempt,
				validatorPass: null,
				voiceConsistency: null,
				authenticity: null,
				note: 'empty_candidate'
			});
			continue;
		}
		hadGeneratedCandidate = true;

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
			lastUpstreamError = quality.error;
			attemptScores.push({
				attempt,
				validatorPass: null,
				voiceConsistency: null,
				authenticity: null,
				note: `validator_error:${quality.error.code}`
			});
			continue;
		}

		const parsed = parseQualityValidation(quality.value.shareText);
		if (!parsed) {
			attemptScores.push({
				attempt,
				validatorPass: null,
				voiceConsistency: null,
				authenticity: null,
				note: 'validator_parse_failed'
			});
			continue;
		}

		attemptScores.push({
			attempt,
			validatorPass: parsed.pass,
			voiceConsistency: parsed.voiceConsistency,
			authenticity: parsed.authenticity,
			note: parsed.therapySpeakDetected ? 'therapy_speak_detected' : 'scored'
		});

		if (passesQualityValidationThresholds(parsed)) {
			return ok({ shareText: candidate, attempts: attempt, fallbackUsed: false });
		}
	}

	console.warn(
		`[share] quality gate skipped hollow output for meeting=${input.meetingId} character=${input.character.id}`,
		attemptScores
	);

	if (!hadGeneratedCandidate && lastUpstreamError) {
		return err(lastUpstreamError.code, lastUpstreamError.message, lastUpstreamError.details);
	}

	return ok({
		shareText: `${input.character.name} is quiet tonight.`,
		attempts: 3,
		fallbackUsed: true
	});
}

function mapRecentSharesFromMeeting(
	shares: Array<{
		characterId: string | null;
		isUserShare: boolean;
		content: string;
	}>,
	userName: string
): Array<{ speaker: string; content: string; isUserShare: boolean }> {
	return shares.slice(-8).map((share) => {
		const speaker = share.isUserShare
			? userName
			: (CORE_CHARACTERS.find((character) => character.id === share.characterId)?.name ??
				'Character');
		return {
			speaker,
			content: share.content,
			isUserShare: share.isUserShare
		};
	});
}

function buildPhaseAwarePrompt(
	character: (typeof CORE_CHARACTERS)[number],
	currentPhase: MeetingPhase,
	userName: string,
	userMood: string,
	topic: string,
	recentShares: Array<{ speaker: string; content: string }>,
	heavyMemoryLines?: string[],
	callbackLines?: string[],
	continuityLines?: string[]
): string {
	// Select prompt type based on phase
	const promptType = selectPromptForPhase(currentPhase, character);

	switch (promptType) {
		case 'opening':
			return buildRitualOpeningPrompt(character);

		case 'intro': {
			const isFirstTimer = recentShares.length === 0;
			return buildRitualIntroPrompt(character, isFirstTimer);
		}

		case 'reading':
			return buildRitualReadingPrompt(character);

		case 'topic_intro':
			return buildTopicIntroductionPrompt(character, topic);

		case 'closing':
			return buildRitualClosingPrompt(character);

		case 'share':
		default:
			return buildCharacterSharePrompt(character, {
				topic,
				userName,
				userMood,
				recentShares,
				heavyMemoryLines,
				callbackLines,
				continuityLines
			});
	}
}

function createShareStream(
	meetingId: string,
	input: ShareStreamRequest,
	recentShares: Array<{ speaker: string; content: string; isUserShare: boolean }>,
	locals: App.Locals
): Response {
	const userName = input.userName ?? 'You';
	const userMood = input.userMood ?? 'present';
	const interactionType = input.interactionType ?? 'standard';

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			void (async () => {
				let currentPhaseState = input.phaseState ?? initializeMeetingPhase();
				let phaseLoaded = !!input.phaseState;
				if (!input.phaseState) {
					const persistedPhaseStateResult = await locals.seams.database.getMeetingPhase(meetingId);
					if (persistedPhaseStateResult.ok && persistedPhaseStateResult.value) {
						currentPhaseState = persistedPhaseStateResult.value;
						phaseLoaded = true;
					} else if (persistedPhaseStateResult.ok) {
						phaseLoaded = true;
					} else if (!persistedPhaseStateResult.ok) {
						if (persistedPhaseStateResult.error.code === SeamErrorCodes.NOT_FOUND) {
							controller.enqueue(
								sseChunk('error', err(SeamErrorCodes.NOT_FOUND, 'Meeting not found'))
							);
							controller.close();
							return;
						}
						console.warn(
							`[share] getMeetingPhase failed for meeting=${meetingId}: ${persistedPhaseStateResult.error.message}`
						);
					}
				}
				if (currentPhaseState.currentPhase === MeetingPhase.SETUP) {
					const meetingStartTransition = transitionToNextPhase(currentPhaseState, 'meeting_start');
					if (meetingStartTransition.ok) {
						currentPhaseState = meetingStartTransition.value;
					} else {
						console.warn(
							`[share] meeting_start transition failed for meeting=${meetingId}: ${meetingStartTransition.error.message}`
						);
					}
				}

				const currentPhase = currentPhaseState.currentPhase;
				const selectedCharacter = pickCharacterForPhase(
					input.characterId,
					currentPhaseState,
					input.sequenceOrder
				);

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
						const latestUserShare = [...recentShares]
							.reverse()
							.find((share) => share.isUserShare)?.content;
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
									meetingsSinceLastReferenced: estimateMeetingsSinceLastReferenced(
										callback.lastReferencedAt
									)
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

				const recentPromptShares = recentShares.slice(-6).map((share) => ({
					speaker: share.speaker,
					content: share.content
				}));
				const narrativeContext = await getMeetingNarrativeContext({
					meetingId,
					topic: input.topic,
					userName,
					userMood,
					recentShares: recentPromptShares,
					grokAi: locals.seams.grokAi
				});
				const mergedContinuityLines = [
					narrativeContext.contextLine,
					...(continuityLines ?? [])
				].slice(0, 5);
				const narrativeFieldValidation = validateCharacterNarrativeFields(selectedCharacter);
				if (!narrativeFieldValidation.ok) {
					console.warn(
						`[share] Character ${selectedCharacter.id} missing narrative fields: ${narrativeFieldValidation.missingFields.join(', ')}`
					);
				}

				// Build phase-aware prompt
				if (currentPhase === MeetingPhase.INTRODUCTIONS) {
					const introIndex = currentPhaseState.charactersSpokenThisRound.length;
					const expectedCharacterId = INTRO_ORDER[introIndex];
					if (expectedCharacterId && selectedCharacter.id !== expectedCharacterId) {
						console.warn(
							`[share] Intro order violation in meeting=${meetingId}: expected ${expectedCharacterId}, got ${selectedCharacter.id}`
						);
					}
				}
				const prompt = buildPhaseAwarePrompt(
					selectedCharacter,
					currentPhase,
					userName,
					userMood,
					input.topic,
					recentPromptShares,
					heavyMemoryLines,
					selectedCallbacks.map(formatCallbackLine),
					mergedContinuityLines
				);

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

				const generated = await _generateValidatedShare({
					meetingId,
					character: selectedCharacter,
					prompt,
					contextMessages: [
						{
							role: 'system',
							content: `Meeting narrative context: ${narrativeContext.contextLine}`
						},
						...recentShares.slice(-6).map((share) => ({
							role: share.isUserShare ? ('user' as const) : ('assistant' as const),
							content: `${share.speaker}: ${share.content}`
						}))
					],
					topic: input.topic,
					userName,
					userMood,
					recentShares: recentPromptShares,
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

				let phaseStateAfterShare = currentPhaseState;
				const recordCharacterResult = recordCharacterSpoke(currentPhaseState, selectedCharacter.id);
				if (recordCharacterResult.ok) {
					phaseStateAfterShare = recordCharacterResult.value;
				} else {
					console.warn(
						`[share] recordCharacterSpoke failed for meeting=${meetingId}: ${recordCharacterResult.error.message}`
					);
				}

				const speakerCount =
					phaseStateAfterShare.charactersSpokenThisRound.length +
					(phaseStateAfterShare.userHasSharedInRound ? 1 : 0);
				let transitionTrigger:
					| 'share_complete'
					| 'round_complete'
					| 'user_input'
					| 'meeting_start'
					| null = null;

				if (
					currentPhase === MeetingPhase.OPENING ||
					currentPhase === MeetingPhase.EMPTY_CHAIR ||
					currentPhase === MeetingPhase.TOPIC_SELECTION ||
					currentPhase === MeetingPhase.CLOSING ||
					currentPhase === MeetingPhase.CRISIS_MODE
				) {
					transitionTrigger = 'share_complete';
				} else if (currentPhase === MeetingPhase.INTRODUCTIONS && speakerCount >= 2) {
					transitionTrigger = 'round_complete';
				} else if (
					(currentPhase === MeetingPhase.SHARING_ROUND_1 ||
						currentPhase === MeetingPhase.SHARING_ROUND_2 ||
						currentPhase === MeetingPhase.SHARING_ROUND_3) &&
					isRoundComplete(phaseStateAfterShare)
				) {
					transitionTrigger = 'round_complete';
				}

				let phaseStateToPersist = phaseStateAfterShare;
				if (transitionTrigger) {
					const transitionResult = transitionToNextPhase(phaseStateAfterShare, transitionTrigger);
					if (transitionResult.ok) {
						phaseStateToPersist = transitionResult.value;
					} else {
						console.warn(
							`[share] transitionToNextPhase failed for meeting=${meetingId}: ${transitionResult.error.message}`
						);
					}
				}

				if (phaseLoaded) {
					let updateMeetingPhaseResult = await locals.seams.database.updateMeetingPhase(
						meetingId,
						phaseStateToPersist
					);
					if (!updateMeetingPhaseResult.ok) {
						await wait(100);
						updateMeetingPhaseResult = await locals.seams.database.updateMeetingPhase(
							meetingId,
							phaseStateToPersist
						);
					}
					if (!updateMeetingPhaseResult.ok) {
						console.error(
							`[share] Failed to persist phase state for meeting=${meetingId}: ${updateMeetingPhaseResult.error.message}`
						);
					}
				} else {
					console.warn(
						`[share] Skipping phase persistence because phase state could not be loaded for meeting=${meetingId}`
					);
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
							phaseState: phaseStateToPersist,
							generation: {
								attempts: generated.value.attempts,
								fallbackUsed: generated.value.fallbackUsed
							},
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
							characterId: selectedCharacter.id,
							phaseState: phaseStateToPersist
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
	const meetingSharesResult = await locals.seams.database.getMeetingShares(meetingId);
	if (!meetingSharesResult.ok) {
		return json(meetingSharesResult, { status: toStatus(meetingSharesResult.error.code) });
	}
	const persistedPhaseStateResult = await locals.seams.database.getMeetingPhase(meetingId);
	if (persistedPhaseStateResult.ok && persistedPhaseStateResult.value) {
		if (persistedPhaseStateResult.value.currentPhase === MeetingPhase.CRISIS_MODE) {
			return json(
				err(SeamErrorCodes.INPUT_INVALID, 'Character shares are paused during crisis mode'),
				{
					status: 409
				}
			);
		}
		if (persistedPhaseStateResult.value.currentPhase === MeetingPhase.POST_MEETING) {
			return json(
				err(
					SeamErrorCodes.INPUT_INVALID,
					'Character shares are unavailable after the meeting closes'
				),
				{
					status: 409
				}
			);
		}
	}
	if (!persistedPhaseStateResult.ok) {
		if (persistedPhaseStateResult.error.code === SeamErrorCodes.NOT_FOUND) {
			return json(err(SeamErrorCodes.NOT_FOUND, 'Meeting not found'), { status: 404 });
		}
		console.warn(
			`[share] getMeetingPhase pre-check failed for meeting=${meetingId}: ${persistedPhaseStateResult.error.message}`
		);
	}

	const persistedCrisisMode = isMeetingInCrisis({
		shares: meetingSharesResult.value.map((share) => ({
			content: share.content,
			significanceScore: share.significanceScore
		}))
	});
	if (persistedCrisisMode || input.crisisMode) {
		const currentPhase =
			persistedPhaseStateResult.ok && persistedPhaseStateResult.value
				? persistedPhaseStateResult.value.currentPhase
				: input.phaseState?.currentPhase;

		if (currentPhase !== MeetingPhase.CLOSING) {
			return json(
				err(SeamErrorCodes.INPUT_INVALID, 'Character shares are paused during crisis mode'),
				{
					status: 409
				}
			);
		}
	}

	const recentShares = mapRecentSharesFromMeeting(
		meetingSharesResult.value,
		input.userName ?? 'User'
	);
	return createShareStream(
		meetingId,
		{ ...input, crisisMode: persistedCrisisMode || input.crisisMode },
		recentShares,
		locals
	);
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
