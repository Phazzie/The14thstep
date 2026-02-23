import { THERAPY_SPEAK_EXACT_PHRASES } from './therapy-blocklist';
import { STYLE_CONSTITUTION } from './style-constitution';
import type { CallbackRecord, CharacterProfile } from './types';
import type { MeetingNarrativeContext } from './narrative-context';

export interface MeetingPromptContext {
	topic: string;
	userName: string;
	userMood: string;
	recentShares: Array<{ speaker: string; content: string }>;
	heavyMemoryLines?: string[];
	callbackLines?: string[];
	continuityLines?: string[];
}

function renderShares(shares: Array<{ speaker: string; content: string }>): string {
	if (shares.length === 0) return 'None yet.';
	return shares.map((share) => `${share.speaker}: ${share.content}`).join('\n');
}

function renderOptionalSection(title: string, lines: string[] | undefined): string | null {
	if (!lines || lines.length === 0) return null;
	return `${title}:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

function renderCharacterFoundation(character: CharacterProfile): string {
	const lines = [
		`Voice baseline: ${character.voice}`,
		`Core wound: ${character.wound}`,
		`Inner contradiction: ${character.contradiction}`,
		`Core lie under stress: ${character.lie ?? 'Not documented yet.'}`,
		`Discomfort register: ${character.discomfortRegister ?? 'Not documented yet.'}`,
		`Program relationship: ${character.programRelationship ?? 'Not documented yet.'}`,
		`What was lost: ${character.lostThing ?? 'Not documented yet.'}`
	];

	const voiceExampleLines = character.voiceExamples
		? ['Voice examples:', ...character.voiceExamples.map((example) => `  - ${example}`)]
		: [];

	return ['CHARACTER FOUNDATION:', ...lines.map((line) => `- ${line}`), ...voiceExampleLines].join('\n');
}

export function buildCharacterSharePrompt(
	character: CharacterProfile,
	context: MeetingPromptContext
): string {
	return [
		`You are ${character.name}. Speak in first person as a member of this room.`,
		renderCharacterFoundation(character),
		`Quirk cue (optional, never forced): ${character.quirk}`,
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		renderOptionalSection('YOUR HISTORY', context.heavyMemoryLines),
		renderOptionalSection('CONTINUITY NOTES', context.continuityLines),
		renderOptionalSection('CALLBACK OPPORTUNITIES THIS MEETING', context.callbackLines),
		`MEETING CONTEXT:\nCurrent topic: ${context.topic}\nRecent shares:\n${renderShares(context.recentShares)}`,
		'Write a short, spoken share that is concrete, emotionally honest, and room-authentic. No therapy-speak.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
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
		`Marcus gives a direct crisis response to ${userName}.`,
		`User text: ${userText}`,
		'Speak directly to safety right now. No storytelling, no metaphors, no clinical jargon.',
		'Keep tone steady, grounded, and human. Encourage immediate support contact and staying present.'
	].join('\n\n');
}

export function buildHeatherCrisisPrompt(userName: string, userText: string): string {
	return [
		`Heather responds to ${userName} in crisis mode.`,
		`User text: ${userText}`,
		'Heather should be direct, fierce, and deeply human. No slogans.'
	].join('\n\n');
}

export function buildCrisisTriagePrompt(userText: string): string {
	return [
		'Classify whether this user text indicates potential self-harm or suicide risk.',
		`User text: ${userText}`,
		'Return JSON only with keys: crisis (boolean), confidence ("high" | "medium" | "low"), reason (string).',
		'Mark crisis true if there is direct risk, implied intent, hopelessness with self-harm language, or uncertainty.',
		'Be conservative: if unsure, set crisis to true and confidence to low.'
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

export function buildPostMeetingMemoryExtractionPrompt(
	topic: string,
	transcript: string,
	characterIds: string[]
): string {
	return [
		'Extract durable memory artifacts from this completed meeting.',
		`Topic: ${topic}`,
		`Character IDs: ${characterIds.join(', ')}`,
		`Transcript:\n${transcript}`,
		'Return JSON only with keys: userMemory (string), highMoment (string), characterThreads (object).',
		'characterThreads must be an object keyed by character ID with one concrete sentence per character.',
		'No markdown, no code fences, no extra keys.'
	].join('\n\n');
}

export function buildExpandSharePrompt(
	character: CharacterProfile,
	input: { topic: string; originalShare: string; recentShares: Array<{ speaker: string; content: string }> }
): string {
	return [
		`Expand ${character.name}'s share into 8-10 sentences while preserving voice.`,
		`Topic: ${input.topic}`,
		`Original share:\n${input.originalShare}`,
		`Recent room context:\n${renderShares(input.recentShares)}`,
		'Stay grounded and specific. No therapy-speak. Keep it spoken, not essay-like.'
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
		: '- No callbacks referenced.';

	return [
		'Evaluate the candidate share and return JSON only.',
		`Character: ${character.name}`,
		`Voice baseline: ${character.voice}`,
		`Core lie under stress: ${character.lie ?? 'Not documented yet.'}`,
		`Discomfort register: ${character.discomfortRegister ?? 'Not documented yet.'}`,
		`Program relationship: ${character.programRelationship ?? 'Not documented yet.'}`,
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		`Topic: ${context.topic}`,
		`Recent shares:\n${renderShares(context.recentShares)}`,
		`Candidate share:\n${candidateShare}`,
		`Callbacks referenced:\n${callbackText}`,
		`Therapy-speak phrases to reject:\n${THERAPY_SPEAK_EXACT_PHRASES.join(' | ')}`,
		'Return JSON with keys: pass (boolean), reasons (string[]), voiceConsistency (0-10), authenticity (0-10), therapySpeakDetected (boolean).',
		'Fail if therapy-speak appears, if voice drifts, if language is abstract/clinical, or if style constitution rules are violated.'
	].join('\n\n');
}

export function buildVoiceCandidatePrompt(
	character: CharacterProfile,
	topic: string,
	narrativeContext: MeetingNarrativeContext,
	candidateIndex: number
): string {
	const lines = [
		`You are ${character.name}. Speak in first person as a member of this room.`,
		renderCharacterFoundation(character),
		`Quirk cue (optional, never forced): ${character.quirk}`,
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		`MEETING CONTEXT:\nTopic: ${topic}`,
		`Room frame: ${narrativeContext.roomFrame}`,
		`Emotional undercurrent: ${narrativeContext.emotionalUndercurrent}`,
		`Candidate strategy: Generate a unique perspective on this topic. This is candidate #${candidateIndex} of 7 - avoid repeating common angles or generic recovery language.`,
		'Write a short, spoken share that is concrete, emotionally honest, and room-authentic. No therapy-speak.'
	];

	return lines.filter((section): section is string => Boolean(section)).join('\n\n');
}

/**
 * Build prompt for meeting ritual opening.
 * Marcus or Heather opens the meeting.
 */
export function buildRitualOpeningPrompt(userName: string, character: CharacterProfile): string {
	return [
		`You are ${character.name}. You are opening this meeting for ${userName}.`,
		`Your voice: ${character.voice}`,
		'Acknowledge the empty chair with respect. Welcome everyone present. 2-3 sentences max.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'Grounded, direct, no clichés or slogans.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

/**
 * Build prompt for character introductions in ritual.
 * Each core character introduces themselves briefly, acknowledging new member.
 */
export function buildRitualIntroPrompt(character: CharacterProfile, isFirstTimer: boolean): string {
	const firstTimerNote = isFirstTimer
		? 'This is a first-timer night - acknowledge the newcomer explicitly.'
		: 'Standard introduction to the room.';

	return [
		`You are ${character.name}. Your turn to introduce.`,
		`Your voice: ${character.voice}`,
		`Clean time: ${character.cleanTime}`,
		firstTimerNote,
		'1-2 sentences. Authentic and brief. No therapy-speak.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

/**
 * Build prompt for empty chair reading.
 * Marcus or selected character reads a short piece to honor absent members.
 */
export function buildRitualReadingPrompt(character: CharacterProfile): string {
	return [
		`You are ${character.name}. You are reading this evening.`,
		`Your voice: ${character.voice}`,
		'Generate one short original reading about showing up, staying present, or holding space.',
		'2-3 sentences. Street-level wisdom. No polished inspiration language.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'No names, no therapy-speak, no clichés.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

/**
 * Build prompt for meeting ritual closing.
 * Marcus or Heather closes, thanks the user, reminds about confidentiality.
 */
export function buildRitualClosingPrompt(
	character: CharacterProfile,
	userName: string,
	meetingSummary: string
): string {
	return [
		`You are ${character.name}. You are closing this meeting.`,
		`Your voice: ${character.voice}`,
		`Thank ${userName} for being present and honest tonight.`,
		`Meeting summary themes: ${meetingSummary}`,
		'Include a plain-language reminder about confidentiality: what is said here stays here.',
		'2-3 sentences. Direct and grounded.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'No therapy-speak, no slogans.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

/**
 * Build prompt for empty chair moment.
 * A moment of silence/reflection honoring members not physically present.
 */
export function buildEmptyChairPrompt(): string {
	return [
		'Create a brief narrative moment about the empty chair.',
		'The empty chair represents those in recovery not physically present.',
		'2-3 sentences. Grounded and human.',
		'No names, no therapy-speak, no slogans.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}
