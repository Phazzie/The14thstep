import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	generateVoiceCandidates,
	scoreCandidateVoice,
	filterCandidatesByQuality,
	selectBestCandidate
} from './voice-pipeline';
import { SeamErrorCodes } from './seam';
import type { CharacterProfile, VoiceCandidate } from './types';
import type { GrokAiPort, GenerateShareInput } from '$lib/seams/grok-ai/contract';
import type { MeetingNarrativeContext } from './narrative-context';
import type { MeetingPromptContext } from './prompt-templates';

const mockCharacter: CharacterProfile = {
	id: 'char-1',
	name: 'Marcus',
	tier: 'core',
	status: 'active',
	archetype: 'elder',
	wound: 'abandonment',
	contradiction: 'helps others but struggles with self-worth',
	voice: 'Direct, grounded, no bullshit',
	quirk: 'References old cases when making points',
	color: '#FF6B6B',
	avatar: 'marcus.png',
	cleanTime: '23 years',
	meetingCount: 156,
	lastSeenAt: new Date().toISOString(),
	lie: 'If I stop helping, I stop mattering',
	voiceExamples: [
		'I saw myself in that story.',
		'That kind of thinking got me locked up three times.',
		'The truth usually hurts before it helps.'
	],
	discomfortRegister: 'Silence when people give up on themselves',
	programRelationship: 'Sponsor for five people right now',
	lostThing: 'Custody of my kids for eight years'
};

const mockNarrativeContext: MeetingNarrativeContext = {
	roomFrame: 'The room settles into listening silence.',
	emotionalUndercurrent: 'The room feels grounded, with people trying to stay honest.',
	contextLine:
		'Room frame: The room settles into listening silence. Undercurrent: The room feels grounded.',
	source: 'generated'
};

const mockMeetingContext: MeetingPromptContext = {
	topic: 'What breaks your heart about this program?',
	userName: 'Alex',
	userMood: 'thoughtful',
	recentShares: [
		{ speaker: 'Heather', content: 'I miss the old fellowship.' },
		{ speaker: 'Marcus', content: 'The program saved my life.' }
	],
	heavyMemoryLines: undefined,
	callbackLines: undefined,
	continuityLines: undefined
};

const mockGrokAi: GrokAiPort = {
	generateShare: vi.fn()
};

describe('voice-pipeline', () => {
	const generateShareMock = vi.mocked(mockGrokAi.generateShare);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('generateVoiceCandidates', () => {
		it('generates 7 candidates successfully', async () => {
			const candidateTexts = Array.from({ length: 7 }, (_, i) => `Candidate ${i + 1} response`);

			// Mock candidate generation
			generateShareMock.mockImplementation((input: GenerateShareInput) => {
				if (input.characterId === mockCharacter.id && !input.prompt.includes('Evaluate')) {
					return Promise.resolve({
						ok: true,
						value: { shareText: candidateTexts[Math.floor(Math.random() * 7)] }
					});
				}
				// Mock scoring
				return Promise.resolve({
					ok: true,
					value: {
						shareText: JSON.stringify({
							pass: true,
							voiceConsistency: 8,
							authenticity: 8,
							therapySpeakDetected: false,
							reasons: []
						})
					}
				});
			});

			const result = await generateVoiceCandidates(
				mockCharacter,
				mockMeetingContext.topic,
				mockNarrativeContext,
				mockMeetingContext,
				mockGrokAi,
				7
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.totalCandidatesGenerated).toBe(7);
				expect(result.value.selectedText).toBeTruthy();
				expect(result.value.candidateMetadata).toBeTruthy();
				expect(result.value.candidateMetadata.voiceConsistency).toBe(8);
				expect(result.value.candidateMetadata.authenticity).toBe(8);
			}
		});

		it('returns error when character profile is invalid', async () => {
			const result = await generateVoiceCandidates(
				{ id: '', name: '' } as CharacterProfile,
				mockMeetingContext.topic,
				mockNarrativeContext,
				mockMeetingContext,
				mockGrokAi
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
			}
		});

		it('returns error when no candidates pass quality thresholds', async () => {
			// Mock all candidates failing quality check
			generateShareMock.mockImplementation(() =>
				Promise.resolve({
					ok: true,
					value: {
						shareText: JSON.stringify({
							pass: false,
							voiceConsistency: 3,
							authenticity: 2,
							therapySpeakDetected: true,
							reasons: ['Contains therapy-speak']
						})
					}
				})
			);

			const result = await generateVoiceCandidates(
				mockCharacter,
				mockMeetingContext.topic,
				mockNarrativeContext,
				mockMeetingContext,
				mockGrokAi,
				7
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
				expect(result.error.message).toContain('passed quality thresholds');
			}
		});

		it('returns error when grok-ai fails to generate any candidates', async () => {
			generateShareMock.mockImplementation(() =>
				Promise.resolve({
					ok: false,
					error: {
						code: SeamErrorCodes.UPSTREAM_ERROR,
						message: 'API unavailable'
					}
				})
			);

			const result = await generateVoiceCandidates(
				mockCharacter,
				mockMeetingContext.topic,
				mockNarrativeContext,
				mockMeetingContext,
				mockGrokAi,
				7
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_ERROR);
			}
		});
	});

	describe('scoreCandidateVoice', () => {
		it('scores a candidate with 4 quality axes', async () => {
			generateShareMock.mockResolvedValue({
				ok: true,
				value: {
					shareText: JSON.stringify({
						pass: true,
						voiceConsistency: 8,
						authenticity: 9,
						therapySpeakDetected: false,
						reasons: []
					})
				}
			});

			const result = await scoreCandidateVoice(
				'This is a test candidate',
				mockCharacter,
				mockMeetingContext,
				mockGrokAi
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.voiceConsistency).toBe(8);
				expect(result.value.authenticity).toBe(9);
				expect(result.value.therapySpeakDetected).toBe(false);
				expect(result.value.text).toBe('This is a test candidate');
			}
		});

		it('detects therapy-speak in candidates', async () => {
			generateShareMock.mockResolvedValue({
				ok: true,
				value: {
					shareText: JSON.stringify({
						pass: false,
						voiceConsistency: 4,
						authenticity: 3,
						therapySpeakDetected: true,
						reasons: ['Uses recovery language instead of personal truth']
					})
				}
			});

			const result = await scoreCandidateVoice(
				'I need to process my feelings and engage in self-care.',
				mockCharacter,
				mockMeetingContext,
				mockGrokAi
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.therapySpeakDetected).toBe(true);
			}
		});

		it('returns error when candidate text is empty', async () => {
			const result = await scoreCandidateVoice('', mockCharacter, mockMeetingContext, mockGrokAi);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
			}
		});

		it('handles grok-ai errors gracefully', async () => {
			generateShareMock.mockResolvedValue({
				ok: false,
				error: {
					code: SeamErrorCodes.RATE_LIMITED,
					message: 'Rate limit exceeded'
				}
			});

			const result = await scoreCandidateVoice(
				'Test candidate',
				mockCharacter,
				mockMeetingContext,
				mockGrokAi
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe(SeamErrorCodes.RATE_LIMITED);
			}
		});
	});

	describe('filterCandidatesByQuality', () => {
		it('filters candidates by threshold', () => {
			const candidates: VoiceCandidate[] = [
				{
					text: 'Good candidate',
					voiceConsistency: 8,
					authenticity: 8,
					therapySpeakDetected: false,
					retryAttempt: 0
				},
				{
					text: 'Low voice consistency',
					voiceConsistency: 4,
					authenticity: 8,
					therapySpeakDetected: false,
					retryAttempt: 1
				},
				{
					text: 'Low authenticity',
					voiceConsistency: 8,
					authenticity: 4,
					therapySpeakDetected: false,
					retryAttempt: 2
				},
				{
					text: 'Has therapy-speak',
					voiceConsistency: 8,
					authenticity: 8,
					therapySpeakDetected: true,
					retryAttempt: 3
				},
				{
					text: 'Just passes threshold',
					voiceConsistency: 6,
					authenticity: 6,
					therapySpeakDetected: false,
					retryAttempt: 4
				}
			];

			const filtered = filterCandidatesByQuality(candidates);

			expect(filtered.length).toBe(2);
			expect(filtered[0].text).toBe('Good candidate');
			expect(filtered[1].text).toBe('Just passes threshold');
		});

		it('rejects candidates with therapy-speak detected', () => {
			const candidates: VoiceCandidate[] = [
				{
					text: 'Good candidate',
					voiceConsistency: 9,
					authenticity: 9,
					therapySpeakDetected: false,
					retryAttempt: 0
				},
				{
					text: 'Bad candidate with therapy-speak',
					voiceConsistency: 9,
					authenticity: 9,
					therapySpeakDetected: true,
					retryAttempt: 1
				}
			];

			const filtered = filterCandidatesByQuality(candidates);

			expect(filtered.length).toBe(1);
			expect(filtered[0].text).toBe('Good candidate');
		});

		it('applies custom thresholds', () => {
			const candidates: VoiceCandidate[] = [
				{
					text: 'Medium candidate',
					voiceConsistency: 7,
					authenticity: 7,
					therapySpeakDetected: false,
					retryAttempt: 0
				},
				{
					text: 'Low candidate',
					voiceConsistency: 5,
					authenticity: 5,
					therapySpeakDetected: false,
					retryAttempt: 1
				}
			];

			const filtered = filterCandidatesByQuality(candidates, 8, 8);

			expect(filtered.length).toBe(0);
		});
	});

	describe('selectBestCandidate', () => {
		it('selects highest combined score', () => {
			const candidates: VoiceCandidate[] = [
				{
					text: 'Score 12',
					voiceConsistency: 6,
					authenticity: 6,
					therapySpeakDetected: false,
					retryAttempt: 0
				},
				{
					text: 'Score 16',
					voiceConsistency: 8,
					authenticity: 8,
					therapySpeakDetected: false,
					retryAttempt: 1
				},
				{
					text: 'Score 14',
					voiceConsistency: 7,
					authenticity: 7,
					therapySpeakDetected: false,
					retryAttempt: 2
				}
			];

			const best = selectBestCandidate(candidates);

			expect(best).toBeTruthy();
			expect(best?.text).toBe('Score 16');
		});

		it('returns null for empty array', () => {
			const best = selectBestCandidate([]);

			expect(best).toBeNull();
		});

		it('selects first candidate when scores are tied', () => {
			const candidates: VoiceCandidate[] = [
				{
					text: 'First with score 14',
					voiceConsistency: 7,
					authenticity: 7,
					therapySpeakDetected: false,
					retryAttempt: 0
				},
				{
					text: 'Second with score 14',
					voiceConsistency: 7,
					authenticity: 7,
					therapySpeakDetected: false,
					retryAttempt: 1
				}
			];

			const best = selectBestCandidate(candidates);

			expect(best).toBeTruthy();
			expect(best?.text).toBe('First with score 14');
		});
	});
});
