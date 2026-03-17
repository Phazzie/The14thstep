import { THERAPY_SPEAK_EXACT_PHRASES } from './therapy-blocklist';
import { EDITORIAL_REALITY_CHECKS, STYLE_CONSTITUTION } from './style-constitution';
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
		`EDITORIAL REALITY CHECKS:\n${EDITORIAL_REALITY_CHECKS}`,
		renderOptionalSection('YOUR HISTORY', context.heavyMemoryLines),
		renderOptionalSection('CONTINUITY NOTES', context.continuityLines),
		renderOptionalSection('CALLBACK OPPORTUNITIES THIS MEETING', context.callbackLines),
		`MEETING CONTEXT:\nCurrent topic: ${context.topic}\nRecent shares:\n${renderShares(context.recentShares)}`,
		'Write a short, spoken share that is concrete, emotionally honest, and room-authentic.',
		'No therapy-speak. No lesson-ending. Do not explain the metaphor after it lands.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

export function buildCharacterIntroductionPrompt(character: CharacterProfile): string {
	return [
		`Generate a 1-2 sentence introduction for ${character.name}.`,
		`Voice: ${character.voice}`,
		`Clean time: ${character.cleanTime}`,
		'Introduce to the room, not to any individual. No names. No direct address.',
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
		'Prioritize immediate safety in plain language.',
		'Marcus voice: steady, practical, compassionate without speeches.',
		'Use short spoken sentences. No storytelling detours, no metaphors, no clinical jargon.',
		'No slogans or inspirational boilerplate. No moralizing close.',
		'Include immediate support direction: call/text 988, and call 911 if in immediate danger.'
	].join('\n\n');
}

export function buildHeatherCrisisPrompt(userName: string, userText: string): string {
	return [
		`Heather responds to ${userName} in crisis mode.`,
		`User text: ${userText}`,
		'Prioritize immediate safety in plain language.',
		'Heather voice: direct, fierce, deeply human, never performative.',
		'Use short spoken sentences. No metaphors, no clinical labels, no motivational quote language.',
		'No slogans or moralized ending.',
		'Include immediate support direction: call/text 988, and call 911 if in immediate danger.'
	].join('\n\n');
}

export function buildCrisisTriagePrompt(userText: string): string {
	return [
		'Classify whether this user text indicates potential self-harm or suicide risk.',
		`User text: ${userText}`,
		'Return one JSON object only (no markdown, no code fences, no prose).',
		'JSON keys required: crisis (boolean), confidence ("high" | "medium" | "low"), reason (string).',
		'Confidence semantics:',
		'- high: explicit self-harm intent/plan/imminent danger language',
		'- medium: concerning self-harm language but not explicit plan',
		'- low: ambiguous language or limited evidence',
		'Conservative policy: if uncertain, set crisis=true and confidence=low.',
		'reason must be a brief evidence statement (8-20 words), quoting or paraphrasing text cues without diagnosis.'
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
		'userMemory and highMoment must be concrete, specific, and room-grounded. No generic recovery wisdom.',
		'characterThreads must be an object keyed by character ID with one concrete sentence per listed character ID.',
		'Each sentence should capture a durable detail or unresolved thread, not a polished lesson.',
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
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		`EDITORIAL REALITY CHECKS:\n${EDITORIAL_REALITY_CHECKS}`,
		'Stay grounded and specific. Keep it spoken, not essay-like.',
		'No therapy-speak, no moralized takeaway, and no sentence that explains an image that already works.'
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
		`EDITORIAL REALITY CHECKS:\n${EDITORIAL_REALITY_CHECKS}`,
		`Topic: ${context.topic}`,
		`Recent shares:\n${renderShares(context.recentShares)}`,
		`Candidate share:\n${candidateShare}`,
		`Callbacks referenced:\n${callbackText}`,
		`Therapy-speak phrases to reject:\n${THERAPY_SPEAK_EXACT_PHRASES.join(' | ')}`,
		'Return JSON with keys: pass (boolean), reasons (string[]), voiceConsistency (0-10), authenticity (0-10), therapySpeakDetected (boolean), moralizingEnding (boolean), overexplainsImage (boolean), genericAcrossCharacters (boolean), emotionLabelingWithoutScene (boolean).',
		'Set pass=false if any editorial flag is true or if therapy-speak appears.',
		'Fail if voice drifts, language is abstract/clinical, endings moralize, or images get explained after they land.'
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
		`EDITORIAL REALITY CHECKS:\n${EDITORIAL_REALITY_CHECKS}`,
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
export function buildRitualOpeningPrompt(character: CharacterProfile): string {
	return [
		`You are ${character.name}. You are opening this meeting.`,
		`Your voice: ${character.voice}`,
		'Acknowledge the empty chair with respect. Welcome everyone present. 2-3 sentences max.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'Grounded, direct, no clichés or slogans. No names. The meeting opens for the room, not for any one person.'
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
		'Target 1-3 spoken sentences. Keep it brief, but not robotic.',
		'No therapy-speak. Avoid tidy mini-lessons.',
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
		'Target 2-4 spoken sentences. Street-level wisdom, not polished inspiration copy.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'No names, no therapy-speak, no clichés, and no explained metaphor ending.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

/**
 * Build prompt for a room-led topic introduction.
 * A character names the topic without handing control to the user.
 */
export function buildTopicIntroductionPrompt(character: CharacterProfile, topic: string): string {
	return [
		`You are ${character.name}. You are introducing the topic for tonight's meeting.`,
		`Your voice: ${character.voice}`,
		`Tonight's topic: ${topic}`,
		'Introduce this topic the way you would at a real meeting - briefly, plainly, without ceremony.',
		'1-2 sentences. Do not explain the topic or turn it into a lesson. Just name it and maybe say one plain thing about why it matters.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'No therapy-speak. No inspirational framing. No questions directed at the room. Just set the topic and let the room take it.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}

/**
 * Build prompt for meeting ritual closing.
 * Marcus or Heather closes the meeting as a ritual — same every time, regardless of who attended.
 */
export function buildRitualClosingPrompt(character: CharacterProfile): string {
	return [
		`You are ${character.name}. You are closing this meeting.`,
		`Your voice: ${character.voice}`,
		'Close this meeting the way it always closes. The ritual is the same regardless of who was here tonight.',
		'Remind the room: what is said here stays here.',
		'2-3 sentences. Grounded and direct.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'No names. No personalization. No therapy-speak. The meeting closes as itself.'
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
		'Target 2-4 spoken sentences. Grounded and human.',
		`STYLE CONSTITUTION:\n${STYLE_CONSTITUTION}`,
		'No names, no therapy-speak, no slogans, and no explained moral.'
	]
		.filter((section): section is string => Boolean(section))
		.join('\n\n');
}
