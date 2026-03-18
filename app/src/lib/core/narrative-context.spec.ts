import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok, SeamErrorCodes } from './seam';
import {
	clearMeetingNarrativeContextCache,
	getMeetingNarrativeContext,
	parseQualityValidation,
	passesQualityValidationThresholds
} from './narrative-context';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';

function createGrokMock(impl: GrokAiPort['generateShare']): GrokAiPort {
	return {
		generateShare: impl
	};
}

describe('narrative-context quality parsing', () => {
	it('parses validator JSON and enforces score thresholds', () => {
		const parsed = parseQualityValidation(`\`\`\`json
{"pass":true,"voiceConsistency":6,"authenticity":7,"therapySpeakDetected":false}
\`\`\``);

		expect(parsed).not.toBeNull();
		expect(parsed?.moralizingEnding).toBe(false);
		expect(parsed?.overexplainsImage).toBe(false);
		expect(parsed?.genericAcrossCharacters).toBe(false);
		expect(parsed?.emotionLabelingWithoutScene).toBe(false);
		expect(parsed && passesQualityValidationThresholds(parsed)).toBe(true);
	});

	it('fails thresholds when score is below 6 even if validator pass is true', () => {
		const parsed = parseQualityValidation(
			'{"pass":true,"voiceConsistency":5,"authenticity":9,"therapySpeakDetected":false}'
		);

		expect(parsed).not.toBeNull();
		expect(parsed && passesQualityValidationThresholds(parsed)).toBe(false);
	});

	it('fails thresholds when therapy speak is detected even if pass and scores are high', () => {
		const parsed = parseQualityValidation(
			'{"pass":true,"voiceConsistency":9,"authenticity":9,"therapySpeakDetected":true}'
		);

		expect(parsed).not.toBeNull();
		expect(parsed && passesQualityValidationThresholds(parsed)).toBe(false);
	});

	it('fails thresholds when any editorial anti-pattern flag is true', () => {
		const parsed = parseQualityValidation(
			'{"pass":true,"voiceConsistency":9,"authenticity":9,"therapySpeakDetected":false,"moralizingEnding":true}'
		);

		expect(parsed).not.toBeNull();
		expect(parsed && passesQualityValidationThresholds(parsed)).toBe(false);
	});

	it('returns null for malformed validator payloads', () => {
		expect(parseQualityValidation('not-json')).toBeNull();
		expect(parseQualityValidation('{"pass":true}')).toBeNull();
	});
});

describe('getMeetingNarrativeContext', () => {
	beforeEach(() => {
		clearMeetingNarrativeContextCache();
		vi.useRealTimers();
	});

	it('caches generated narrative context for a meeting', async () => {
		let capturedPrompt = '';
		const generateShare = vi.fn(async (input: { prompt: string }) => {
			capturedPrompt = input.prompt;
			return ok({
				shareText: JSON.stringify({
					roomFrame: 'Rain taps the windows while the room settles.',
					emotionalUndercurrent: 'People sound guarded but willing to stay in the discomfort.'
				})
			});
		});
		const grokAi = createGrokMock(generateShare);

		const first = await getMeetingNarrativeContext({
			meetingId: 'meeting-1',
			topic: 'staying when I want to run',
			userName: 'Lane',
			userMood: 'anxious',
			recentShares: [],
			grokAi
		});
		const second = await getMeetingNarrativeContext({
			meetingId: 'meeting-1',
			topic: 'staying when I want to run',
			userName: 'Lane',
			userMood: 'anxious',
			recentShares: [],
			grokAi
		});

		expect(generateShare).toHaveBeenCalledTimes(1);
		expect(capturedPrompt).toContain('STYLE CONSTITUTION');
		expect(capturedPrompt).toContain('EDITORIAL REALITY CHECKS');
		expect(capturedPrompt).toContain('no clinical phrasing');
		expect(first.source).toBe('generated');
		expect(second.contextLine).toBe(first.contextLine);
	});

	it('falls back gracefully when narrative generation fails', async () => {
		const generateShare = vi.fn(async () =>
			err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'network unavailable')
		);
		const grokAi = createGrokMock(generateShare);

		const context = await getMeetingNarrativeContext({
			meetingId: 'meeting-fallback',
			topic: 'honesty',
			userName: 'Lane',
			userMood: 'raw',
			recentShares: [],
			grokAi
		});

		expect(context.source).toBe('fallback');
		expect(context.contextLine.toLowerCase()).toContain('room frame');
		expect(context.contextLine.toLowerCase()).toContain('undercurrent');
		expect(context.roomFrame).toContain('folding chairs');
		expect(context.emotionalUndercurrent).toContain('without pretending to have easy answers');
	});

	it('falls back gracefully when generateShare throws', async () => {
		const generateShare = vi.fn(async () => {
			throw new Error('socket hang up');
		});
		const grokAi = createGrokMock(generateShare);

		const context = await getMeetingNarrativeContext({
			meetingId: 'meeting-throw',
			topic: 'honesty',
			userName: 'Lane',
			userMood: 'raw',
			recentShares: [],
			grokAi
		});

		expect(generateShare).toHaveBeenCalledTimes(1);
		expect(context.source).toBe('fallback');
		expect(context.roomFrame).toContain('folding chairs');
	});

	it('retries fallback context after the fallback cache ttl expires', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-18T12:00:00Z'));

		const generateShare = vi
			.fn<GrokAiPort['generateShare']>()
			.mockResolvedValueOnce(err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'network unavailable'))
			.mockResolvedValueOnce(
				ok({
					shareText: JSON.stringify({
						roomFrame: 'The coffee is burnt and the room finally settles.',
						emotionalUndercurrent: 'People sound less armored now that someone went first.'
					})
				})
			);
		const grokAi = createGrokMock(generateShare);

		const first = await getMeetingNarrativeContext({
			meetingId: 'meeting-cache-retry',
			topic: 'honesty',
			userName: 'Lane',
			userMood: 'raw',
			recentShares: [],
			grokAi
		});
		const second = await getMeetingNarrativeContext({
			meetingId: 'meeting-cache-retry',
			topic: 'honesty',
			userName: 'Lane',
			userMood: 'raw',
			recentShares: [],
			grokAi
		});

		vi.advanceTimersByTime(30_001);

		const third = await getMeetingNarrativeContext({
			meetingId: 'meeting-cache-retry',
			topic: 'honesty',
			userName: 'Lane',
			userMood: 'raw',
			recentShares: [],
			grokAi
		});

		expect(generateShare).toHaveBeenCalledTimes(2);
		expect(first.source).toBe('fallback');
		expect(second.source).toBe('fallback');
		expect(third.source).toBe('generated');
		expect(third.roomFrame).toContain('The coffee is burnt');
	});
});
