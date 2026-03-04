import { SeamErrorCodes, err, ok, type SeamResult } from './seam';
import type { DatabasePort, MeetingRecord, ShareRecord } from '$lib/seams/database/contract';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';
import { detectCrisisContent as detectCrisisContentFromEngine } from './crisis-engine';

export type ShareInteractionType =
	| 'standard'
	| 'respond_to'
	| 'disagree'
	| 'parallel_story'
	| 'expand'
	| 'crosstalk'
	| 'callback';

export interface CreateMeetingInput {
	userId: string;
	topic: string;
	userMood: string;
	listeningOnly: boolean;
}

export interface AddShareInput {
	meetingId: string;
	characterId: string | null;
	isUserShare: boolean;
	content: string;
	sequenceOrder: number;
	interactionType: ShareInteractionType;
	isFirstUserShare?: boolean;
	significanceScore?: number;
}

export interface CloseMeetingInput {
	meetingId: string;
	topic: string;
	lastShares: Array<{ speakerName: string; content: string }>;
}

export interface MeetingWorkflowDeps {
	database: DatabasePort;
	grokAi: GrokAiPort;
}

const HEAVY_DISCLOSURE_KEYWORDS = [
	'custody',
	'prison',
	'jail',
	'trafficking',
	'sleeping in my car',
	'relapse',
	'assault'
] as const;

const CONNECTION_BREAKTHROUGH_KEYWORDS = [
	'i told the truth',
	'i asked for help',
	'i called my sponsor',
	'i stayed',
	'i came back'
] as const;

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function normalize(text: string): string {
	return text.toLowerCase();
}

function includesAny(text: string, phrases: readonly string[]): boolean {
	return phrases.some((phrase) => text.includes(phrase));
}

export function detectCrisisContent(content: string): boolean {
	return detectCrisisContentFromEngine(content);
}

export function detectHeavyDisclosureContent(content: string): boolean {
	return includesAny(normalize(content), HEAVY_DISCLOSURE_KEYWORDS);
}

export function detectConnectionBreakthroughContent(content: string): boolean {
	return includesAny(normalize(content), CONNECTION_BREAKTHROUGH_KEYWORDS);
}

export function scoreSignificance(input: {
	content: string;
	interactionType: ShareInteractionType;
	isUserShare: boolean;
	isFirstUserShare?: boolean;
}): number {
	const wordCount = normalize(input.content).split(/\s+/).filter(Boolean).length;

	if (detectCrisisContent(input.content)) return 10;
	if (detectHeavyDisclosureContent(input.content)) return 8;
	if (detectConnectionBreakthroughContent(input.content)) return 7;
	if (input.interactionType === 'respond_to' || input.interactionType === 'disagree') return 6;
	if (input.isUserShare && input.isFirstUserShare) return 5;
	if (input.interactionType === 'crosstalk' && wordCount <= 8) return 1;
	return 3;
}

export async function createMeeting(
	deps: MeetingWorkflowDeps,
	input: CreateMeetingInput
): Promise<SeamResult<MeetingRecord>> {
	if (!isNonEmptyString(input.userId) || !isNonEmptyString(input.topic) || !isNonEmptyString(input.userMood)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid createMeeting input');
	}

	return deps.database.createMeeting({
		userId: input.userId,
		topic: input.topic,
		userMood: input.userMood,
		listeningOnly: input.listeningOnly
	});
}

export async function addShare(
	deps: MeetingWorkflowDeps,
	input: AddShareInput
): Promise<SeamResult<ShareRecord>> {
	if (!isNonEmptyString(input.meetingId) || !isNonEmptyString(input.content)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid addShare input');
	}
	if (!Number.isInteger(input.sequenceOrder) || input.sequenceOrder < 0) {
		return err(SeamErrorCodes.INPUT_INVALID, 'sequenceOrder must be a non-negative integer');
	}

	const significanceScore =
		input.significanceScore ??
		scoreSignificance({
			content: input.content,
			interactionType: input.interactionType,
			isUserShare: input.isUserShare,
			isFirstUserShare: input.isFirstUserShare
		});

	return deps.database.appendShare({
		meetingId: input.meetingId,
		characterId: input.characterId,
		isUserShare: input.isUserShare,
		content: input.content,
		significanceScore,
		sequenceOrder: input.sequenceOrder
	});
}

function buildCloseSummaryPrompt(topic: string, lastShares: Array<{ speakerName: string; content: string }>): string {
	const transcript = lastShares
		.slice(-6)
		.map((share) => `${share.speakerName}: ${share.content}`)
		.join('\n');

	return [
		'Write a closeout summary in plain, room-authentic language.',
		`Topic: ${topic}`,
		'Target one paragraph (4-6 spoken-style sentences).',
		'Capture concrete moments, pressure points, and what remained unresolved.',
		'No therapy-speak, no inspirational slogans, and no moralized lesson ending.',
		`Recent shares:\n${transcript}`
	].join('\n\n');
}

export async function closeMeeting(
	deps: MeetingWorkflowDeps,
	input: CloseMeetingInput
): Promise<SeamResult<{ meetingId: string; summary: string }>> {
	if (!isNonEmptyString(input.meetingId) || !isNonEmptyString(input.topic)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid closeMeeting input');
	}

	const summaryResult = await deps.grokAi.generateShare({
		meetingId: input.meetingId,
		characterId: 'summary-narrator',
		prompt: buildCloseSummaryPrompt(input.topic, input.lastShares),
		contextMessages: input.lastShares.slice(-6).map((share) => ({
			role: 'assistant' as const,
			content: `${share.speakerName}: ${share.content}`
		}))
	});

	if (!summaryResult.ok) {
		return err(summaryResult.error.code, summaryResult.error.message, summaryResult.error.details);
	}

	return ok({
		meetingId: input.meetingId,
		summary: summaryResult.value.shareText
	});
}
