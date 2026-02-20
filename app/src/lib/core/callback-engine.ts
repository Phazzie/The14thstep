import type { CallbackRecord } from './types';

export interface CallbackEngineInput {
	callback: CallbackRecord;
	currentCharacterId: string;
	currentCharacterMeetingCount: number;
	originatedCallbacksCount: number;
	latestUserShareText?: string;
	meetingsSinceLastReferenced?: number;
}

export interface CallbackDecision {
	include: boolean;
	probability: number;
	rule: string;
	roll: number;
}

interface CandidateRule {
	rule: string;
	probability: number;
	specificity: number;
	matches: boolean;
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length >= 4);
}

function hasKeywordOverlap(userText: string, callbackText: string): boolean {
	const userTokens = new Set(tokenize(userText));
	if (userTokens.size === 0) return false;

	for (const token of tokenize(callbackText)) {
		if (userTokens.has(token)) return true;
	}

	return false;
}

function clampProbability(value: number): number {
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

export function resolveCallbackProbability(input: CallbackEngineInput): {
	probability: number;
	rule: string;
} {
	const userOverlap =
		typeof input.latestUserShareText === 'string' &&
		input.latestUserShareText.trim().length > 0 &&
		hasKeywordOverlap(input.latestUserShareText, input.callback.originalText);

	const isKnownCallbackCharacter =
		input.currentCharacterId === 'meechie' || input.originatedCallbacksCount >= 3;
	const isNewCharacter = input.currentCharacterMeetingCount < 3;
	const isOriginCharacterSpeaking = input.callback.characterId === input.currentCharacterId;
	const meetingsSinceLastReferenced = input.meetingsSinceLastReferenced;
	const usedLastMeeting = meetingsSinceLastReferenced === 1;
	const unusedForFivePlus = typeof meetingsSinceLastReferenced === 'number' && meetingsSinceLastReferenced >= 5;

	const rules: CandidateRule[] = [
		{
			rule: 'user_opening_overlap',
			probability: 0.9,
			specificity: 60,
			matches: userOverlap
		},
			{
				rule: 'status_stale',
				probability: 0.05,
				specificity: 50,
				matches: input.callback.status === 'stale'
			},
			{
				rule: 'status_retired',
				probability: 0.02,
				specificity: 50,
				matches: input.callback.status === 'retired'
			},
			{
				rule: 'status_legend',
				probability: 0.3,
			specificity: 50,
			matches: input.callback.status === 'legend'
		},
		{
			rule: 'used_last_meeting',
			probability: 0.15,
			specificity: 50,
			matches: usedLastMeeting
		},
		{
			rule: 'unused_five_or_more',
			probability: 0.65,
			specificity: 40,
			matches: unusedForFivePlus
		},
		{
			rule: 'origin_character',
			probability: 0.55,
			specificity: 30,
			matches: isOriginCharacterSpeaking
		},
		{
			rule: 'known_callback_character',
			probability: 0.55,
			specificity: 30,
			matches: isKnownCallbackCharacter
		},
		{
			rule: 'new_character',
			probability: 0.1,
			specificity: 30,
			matches: isNewCharacter
		},
		{
			rule: 'baseline',
			probability: 0.4,
			specificity: 10,
			matches: true
		}
	];

	const matched = rules.filter((rule) => rule.matches);
	const highestSpecificity = Math.max(...matched.map((rule) => rule.specificity));
	const candidates = matched.filter((rule) => rule.specificity === highestSpecificity);
	const winner = candidates.reduce((best, current) =>
		current.probability > best.probability ? current : best
	);

	return {
		probability: clampProbability(winner.probability),
		rule: winner.rule
	};
}

export function shouldIncludeCallback(
	input: CallbackEngineInput,
	randomValue: number = Math.random()
): CallbackDecision {
	const resolved = resolveCallbackProbability(input);
	const roll = Number.isFinite(randomValue) ? randomValue : 1;

	return {
		include: roll < resolved.probability,
		probability: resolved.probability,
		rule: resolved.rule,
		roll
	};
}
