import type { GrokAiPort } from '$lib/seams/grok-ai/contract';
import { EDITORIAL_REALITY_CHECKS, STYLE_CONSTITUTION } from './style-constitution';

const MAX_LINE_LENGTH = 220;
const QUALITY_MIN_SCORE = 6;

const meetingNarrativeContextCache = new Map<string, MeetingNarrativeContext>();
const meetingNarrativeContextInFlight = new Map<string, Promise<MeetingNarrativeContext>>();

export interface MeetingNarrativeContextInput {
	meetingId: string;
	topic: string;
	userName: string;
	userMood: string;
	recentShares: Array<{ speaker: string; content: string }>;
	grokAi: GrokAiPort;
}

export interface MeetingNarrativeContext {
	roomFrame: string;
	emotionalUndercurrent: string;
	contextLine: string;
	source: 'generated' | 'fallback';
}

export interface QualityValidationResult {
	pass: boolean;
	voiceConsistency: number;
	authenticity: number;
	therapySpeakDetected: boolean;
	moralizingEnding: boolean;
	overexplainsImage: boolean;
	genericAcrossCharacters: boolean;
	emotionLabelingWithoutScene: boolean;
	reasons: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeLine(value: string): string {
	return value.replace(/\s+/g, ' ').trim().slice(0, MAX_LINE_LENGTH);
}

function stripCodeFences(value: string): string {
	const trimmed = value.trim();
	if (!trimmed.startsWith('```')) return trimmed;
	return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function renderRecentShares(shares: Array<{ speaker: string; content: string }>): string {
	if (shares.length === 0) return 'None yet.';
	return shares
		.slice(-6)
		.map((share) => `${share.speaker}: ${share.content}`)
		.join('\n');
}

function buildNarrativeContextPrompt(input: MeetingNarrativeContextInput): string {
	return [
		'Generate meeting-start narrative context as JSON only.',
		`Topic: ${input.topic}`,
		`User: ${input.userName}`,
		`User mood: ${input.userMood}`,
		`Recent shares:\n${renderRecentShares(input.recentShares)}`,
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		`EDITORIAL REALITY CHECKS:\n${EDITORIAL_REALITY_CHECKS}`,
		'Return JSON with keys: roomFrame, emotionalUndercurrent.',
		'Each value must be exactly one concrete sentence rooted in room details and social pressure.',
		'No therapy-speak, no clinical phrasing, no inspirational slogan language, and no explanatory moral.'
	].join('\n\n');
}

function toContext(roomFrame: string, emotionalUndercurrent: string, source: 'generated' | 'fallback'): MeetingNarrativeContext {
	const normalizedRoomFrame = normalizeLine(roomFrame);
	const normalizedUndercurrent = normalizeLine(emotionalUndercurrent);
	return {
		roomFrame: normalizedRoomFrame,
		emotionalUndercurrent: normalizedUndercurrent,
		contextLine: `Room frame: ${normalizedRoomFrame} Undercurrent: ${normalizedUndercurrent}`,
		source
	};
}

function parseNarrativeContext(raw: string): { roomFrame: string; emotionalUndercurrent: string } | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stripCodeFences(raw));
	} catch {
		return null;
	}

	if (!isObject(parsed) || typeof parsed.roomFrame !== 'string' || typeof parsed.emotionalUndercurrent !== 'string') {
		return null;
	}

	const roomFrame = normalizeLine(parsed.roomFrame);
	const emotionalUndercurrent = normalizeLine(parsed.emotionalUndercurrent);
	if (!roomFrame || !emotionalUndercurrent) return null;

	return { roomFrame, emotionalUndercurrent };
}

function fallbackNarrativeContext(input: MeetingNarrativeContextInput): MeetingNarrativeContext {
	const topic = normalizeLine(input.topic) || 'today';
	const userName = normalizeLine(input.userName) || 'The newcomer';
	const userMood = normalizeLine(input.userMood) || 'steady';

	return toContext(
		`${userName} brings ${topic} into a room of folding chairs, paper cups, and people deciding whether to stay.`,
		`The undercurrent is ${userMood}; people are listening hard without pretending to have easy answers.`,
		'fallback'
	);
}

function parseScore(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
		return null;
	}
	return value;
}

export function parseQualityValidation(raw: string): QualityValidationResult | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stripCodeFences(raw));
	} catch {
		return null;
	}

	if (!isObject(parsed) || typeof parsed.pass !== 'boolean') {
		return null;
	}

	const voiceConsistency = parseScore(parsed.voiceConsistency);
	const authenticity = parseScore(parsed.authenticity);
	if (voiceConsistency === null || authenticity === null) {
		return null;
	}

	const reasons = Array.isArray(parsed.reasons)
		? parsed.reasons.filter((reason): reason is string => typeof reason === 'string').map(normalizeLine)
		: [];

	return {
		pass: parsed.pass,
		voiceConsistency,
		authenticity,
		therapySpeakDetected: parsed.therapySpeakDetected === true,
		moralizingEnding: parsed.moralizingEnding === true,
		overexplainsImage: parsed.overexplainsImage === true,
		genericAcrossCharacters: parsed.genericAcrossCharacters === true,
		emotionLabelingWithoutScene: parsed.emotionLabelingWithoutScene === true,
		reasons
	};
}

export function passesQualityValidationThresholds(input: QualityValidationResult): boolean {
	return (
		input.pass &&
		!input.therapySpeakDetected &&
		!input.moralizingEnding &&
		!input.overexplainsImage &&
		!input.genericAcrossCharacters &&
		!input.emotionLabelingWithoutScene &&
		input.voiceConsistency >= QUALITY_MIN_SCORE &&
		input.authenticity >= QUALITY_MIN_SCORE
	);
}

export async function getMeetingNarrativeContext(
	input: MeetingNarrativeContextInput
): Promise<MeetingNarrativeContext> {
	const cached = meetingNarrativeContextCache.get(input.meetingId);
	if (cached) return cached;

	const inFlight = meetingNarrativeContextInFlight.get(input.meetingId);
	if (inFlight) return inFlight;

	const pending = (async () => {
		const generated = await input.grokAi.generateShare({
			meetingId: input.meetingId,
			characterId: 'meeting-narrative-context',
			prompt: buildNarrativeContextPrompt(input),
			contextMessages: []
		});

		if (!generated.ok) {
			return fallbackNarrativeContext(input);
		}

		const parsed = parseNarrativeContext(generated.value.shareText);
		if (!parsed) {
			return fallbackNarrativeContext(input);
		}

		return toContext(parsed.roomFrame, parsed.emotionalUndercurrent, 'generated');
	})();

	meetingNarrativeContextInFlight.set(input.meetingId, pending);

	try {
		const resolved = await pending;
		meetingNarrativeContextCache.set(input.meetingId, resolved);
		return resolved;
	} finally {
		meetingNarrativeContextInFlight.delete(input.meetingId);
	}
}

export function clearMeetingNarrativeContextCache(): void {
	meetingNarrativeContextCache.clear();
	meetingNarrativeContextInFlight.clear();
}
