import { SeamErrorCodes, err, ok, type SeamResult } from './seam';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';
import type { CharacterProfile, GenerateShareWithCandidates, VoiceCandidate } from './types';
import type { MeetingNarrativeContext } from './narrative-context';
import { parseQualityValidation } from './narrative-context';
import { buildVoiceCandidatePrompt, buildQualityValidationPrompt } from './prompt-templates';
import type { MeetingPromptContext } from './prompt-templates';

/**
 * Generate multiple voice candidates and select the best one
 * Returns the top-scoring candidate that passes quality thresholds
 */
export async function generateVoiceCandidates(
	character: CharacterProfile,
	topic: string,
	narrativeContext: MeetingNarrativeContext,
	context: MeetingPromptContext,
	grokAi: GrokAiPort,
	candidateCount: number = 7
): Promise<SeamResult<GenerateShareWithCandidates>> {
	if (!character || !character.id || !character.name) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid character profile');
	}

	if (!isNonEmptyString(topic)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Topic must be a non-empty string');
	}

	if (!grokAi) {
		return err(SeamErrorCodes.INPUT_INVALID, 'GrokAi seam is required');
	}

	// Generate 7 independent candidates in parallel
	const candidatePromises: Promise<string | null>[] = [];

	for (let i = 0; i < candidateCount; i++) {
		const prompt = buildVoiceCandidatePrompt(character, topic, narrativeContext, i + 1);
		const promise = (async () => {
			const result = await grokAi.generateShare({
				meetingId: `voice-candidate-${character.id}`,
				characterId: character.id,
				prompt,
				contextMessages: []
			});

			if (!result.ok) {
				console.warn(`Failed to generate candidate ${i + 1} for ${character.name}:`, result.error);
				return null;
			}

			return result.value.shareText;
		})();

		candidatePromises.push(promise);
	}

	const candidateTexts = await Promise.all(candidatePromises);
	const validCandidates = candidateTexts.filter((text): text is string => text !== null);

	if (validCandidates.length === 0) {
		return err(SeamErrorCodes.UPSTREAM_ERROR, `Failed to generate any valid candidates for ${character.name}`);
	}

	// Score each candidate
	const scoredCandidates: VoiceCandidate[] = [];

	for (let i = 0; i < validCandidates.length; i++) {
		const scoreResult = await scoreCandidateVoice(validCandidates[i], character, context, grokAi);

		if (scoreResult.ok) {
			scoredCandidates.push({
				...scoreResult.value,
				retryAttempt: i
			});
		}
	}

	if (scoredCandidates.length === 0) {
		return err(SeamErrorCodes.CONTRACT_VIOLATION, `Failed to score any candidates for ${character.name}`);
	}

	// Filter by quality thresholds
	const filtered = filterCandidatesByQuality(scoredCandidates);

	if (filtered.length === 0) {
		return err(
			SeamErrorCodes.CONTRACT_VIOLATION,
			`No candidates passed quality thresholds for ${character.name} (min voiceConsistency: 6, min authenticity: 6)`
		);
	}

	// Select best candidate
	const best = selectBestCandidate(filtered);

	if (!best) {
		return err(SeamErrorCodes.UNEXPECTED, `Failed to select best candidate for ${character.name}`);
	}

	return ok({
		selectedText: best.text,
		candidateMetadata: best,
		totalCandidatesGenerated: candidateCount
	});
}

/**
 * Score a single candidate on 4 quality axes
 */
export async function scoreCandidateVoice(
	candidateText: string,
	character: CharacterProfile,
	context: MeetingPromptContext,
	grokAi: GrokAiPort
): Promise<SeamResult<VoiceCandidate>> {
	if (!isNonEmptyString(candidateText)) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Candidate text must be a non-empty string');
	}

	if (!character || !character.id) {
		return err(SeamErrorCodes.INPUT_INVALID, 'Invalid character profile');
	}

	if (!grokAi) {
		return err(SeamErrorCodes.INPUT_INVALID, 'GrokAi seam is required');
	}

	const prompt = buildQualityValidationPrompt(character, candidateText, context);

	const result = await grokAi.generateShare({
		meetingId: `voice-validation-${character.id}`,
		characterId: character.id,
		prompt,
		contextMessages: []
	});

	if (!result.ok) {
		return err(result.error.code, `Failed to score candidate: ${result.error.message}`);
	}

	const parsed = parseQualityValidation(result.value.shareText);

	if (!parsed) {
		return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Failed to parse quality validation response');
	}

	return ok({
		text: candidateText,
		voiceConsistency: parsed.voiceConsistency,
		authenticity: parsed.authenticity,
		therapySpeakDetected: parsed.therapySpeakDetected,
		retryAttempt: 0
	});
}

/**
 * Filter candidates by quality thresholds
 * Threshold: voiceConsistency >= 6 AND authenticity >= 6
 */
export function filterCandidatesByQuality(
	candidates: VoiceCandidate[],
	minVoiceConsistency: number = 6,
	minAuthenticity: number = 6
): VoiceCandidate[] {
	return candidates.filter((candidate) => {
		const meetsThresholds = candidate.voiceConsistency >= minVoiceConsistency && candidate.authenticity >= minAuthenticity;
		const noTherapySpeak = !candidate.therapySpeakDetected;

		return meetsThresholds && noTherapySpeak;
	});
}

/**
 * Select the best candidate from filtered list
 * Strategy: Highest combined score (voiceConsistency + authenticity)
 */
export function selectBestCandidate(candidates: VoiceCandidate[]): VoiceCandidate | null {
	if (candidates.length === 0) {
		return null;
	}

	return candidates.reduce((best, current) => {
		const bestScore = best.voiceConsistency + best.authenticity;
		const currentScore = current.voiceConsistency + current.authenticity;

		if (currentScore > bestScore) {
			return current;
		}

		return best;
	});
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}
