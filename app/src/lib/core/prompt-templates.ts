import { THERAPY_SPEAK_EXACT_PHRASES } from './therapy-blocklist';
import type { CallbackRecord, CharacterProfile } from './types';

export interface MeetingPromptContext {
	topic: string;
	userName: string;
	userMood: string;
	recentShares: Array<{ speaker: string; content: string }>;
	heavyMemoryLines?: string[];
	callbackLines?: string[];
}

function renderShares(shares: Array<{ speaker: string; content: string }>): string {
	if (shares.length === 0) return 'None yet.';
	return shares.map((share) => `${share.speaker}: ${share.content}`).join('\n');
}

function renderOptionalSection(title: string, lines: string[] | undefined): string {
	if (!lines || lines.length === 0) return `${title}: none`;
	return `${title}:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

export function buildCharacterSharePrompt(
	character: CharacterProfile,
	context: MeetingPromptContext
): string {
	return [
		`You are ${character.name}, ${character.archetype}.`,
		`Voice: ${character.voice}`,
		`Wound: ${character.wound}`,
		`Contradiction: ${character.contradiction}`,
		`Quirk: ${character.quirk}`,
		`Current topic: ${context.topic}`,
		renderOptionalSection('Heavy memory', context.heavyMemoryLines),
		renderOptionalSection('Callback opportunities', context.callbackLines),
		`Recent shares:\n${renderShares(context.recentShares)}`,
		'Write exactly 3-4 sentences. Concrete language only. No therapy-speak. Include one physical action if natural.'
	].join('\n\n');
}

export function buildCharacterIntroductionPrompt(character: CharacterProfile, userName: string): string {
	return [
		`Generate a 1-2 sentence introduction for ${character.name}.`,
		`Voice: ${character.voice}`,
		`Clean time: ${character.cleanTime}`,
		`Address newcomer: ${userName}`,
		'No cliches, no therapy language.'
	].join('\n\n');
}

export function buildCrosstalkReactionPrompt(
	character: CharacterProfile,
	previousShare: string,
	topic: string
): string {
	return [
		`${character.name} gives a one-sentence crosstalk reaction.`,
		`Topic: ${topic}`,
		`Previous share: ${previousShare}`,
		'Keep it brief, real, and room-authentic.'
	].join('\n\n');
}

export function buildHardQuestionPrompt(userName: string, userShareHistory: string[]): string {
	return [
		`Write one hard but fair question for ${userName}.`,
		`Recent user shares:\n${userShareHistory.join('\n')}`,
		'No cruelty. Direct accountability only.'
	].join('\n\n');
}

export function buildMarcusCrisisPrompt(userName: string, userText: string): string {
	return [
		`Marcus responds to ${userName} in crisis mode.`,
		`User text: ${userText}`,
		'Marcus should be steady, specific, protective, and never clinical.'
	].join('\n\n');
}

export function buildHeatherCrisisPrompt(userName: string, userText: string): string {
	return [
		`Heather responds to ${userName} in crisis mode.`,
		`User text: ${userText}`,
		'Heather should be direct, fierce, and deeply human. No slogans.'
	].join('\n\n');
}

export function buildMeetingOpeningPrompt(userName: string, userMood: string): string {
	return [
		`Marcus opens the meeting for ${userName}.`,
		`User mood: ${userMood}`,
		'Include empty-chair respect and a grounded welcome in 2-3 sentences.'
	].join('\n\n');
}

export function buildMeetingReadingPrompt(topic: string): string {
	return [
		'Generate a short original meeting reading.',
		`Topic anchor: ${topic}`,
		'Tone: hard-won street wisdom, no polished inspiration language.'
	].join('\n\n');
}

export function buildTopicAcknowledgmentPrompt(topic: string): string {
	return [
		'Marcus acknowledges the selected topic.',
		`Topic: ${topic}`,
		'1-2 sentences, grounded and direct.'
	].join('\n\n');
}

export function buildMeetingClosingPrompt(userName: string, recentThemes: string[]): string {
	return [
		`Marcus closes the meeting and thanks ${userName}.`,
		`Themes: ${recentThemes.join(', ')}`,
		'Include confidentiality reminder in plain language.'
	].join('\n\n');
}

export function buildGoodbyePrompt(character: CharacterProfile, userName: string): string {
	return [
		`${character.name} gives one short goodbye to ${userName}.`,
		'Keep it personal and specific to the room.'
	].join('\n\n');
}

export function buildSummaryGenerationPrompt(topic: string, transcript: string): string {
	return [
		'Summarize the completed meeting.',
		`Topic: ${topic}`,
		`Transcript:\n${transcript}`,
		'Output 4 concise sentences and one reflective question.'
	].join('\n\n');
}

export function buildQualityValidationPrompt(
	character: CharacterProfile,
	candidateShare: string,
	context: MeetingPromptContext,
	callbacksUsed: CallbackRecord[] = []
): string {
	const callbackText = callbacksUsed.length
		? callbacksUsed.map((callback) => `- ${callback.originalText} (${callback.callbackType})`).join('\n')
		: 'None';

	return [
		'Evaluate the candidate share and return JSON only.',
		`Character: ${character.name}`,
		`Voice baseline: ${character.voice}`,
		`Topic: ${context.topic}`,
		`Candidate share:\n${candidateShare}`,
		`Callbacks referenced:\n${callbackText}`,
		`Therapy-speak phrases to reject:\n${THERAPY_SPEAK_EXACT_PHRASES.join(' | ')}`,
		'Return JSON with keys: pass (boolean), reasons (string[]), voiceConsistency (0-10), authenticity (0-10), therapySpeakDetected (boolean).',
		'Fail if therapy-speak appears, if voice drifts, or if language is abstract/clinical.'
	].join('\n\n');
}
