import { describe, expect, it, vi } from 'vitest';
import { err, ok, SeamErrorCodes } from './seam';
import { scanForCallbacks } from './callback-scanner';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';

function createGrokMock(shareText: string): GrokAiPort {
	return {
		generateShare: async () => ok({ shareText })
	};
}

describe('scanForCallbacks', () => {
	it('parses candidate callbacks and persists them', async () => {
		const createCallback = vi.fn(async () => ok({ id: 'cb1' }));
		let capturedPrompt = '';
		const grokAi: GrokAiPort = {
			generateShare: async (input) => {
				capturedPrompt = input.prompt;
				return ok({
					shareText: JSON.stringify([
						{
							originShareId: 'share-1',
							characterId: 'marcus',
							originalText: 'coffee cup line',
							callbackType: 'quirk_habit',
							scope: 'character',
							potentialScore: 8
						}
					])
				});
			}
		};

		const result = await scanForCallbacks({
			meetingId: 'meeting-1',
			shares: [
				{
					id: 'share-1',
					meetingId: 'meeting-1',
					characterId: 'marcus',
					content: 'coffee cup line',
					interactionType: 'standard'
				}
			],
			grokAi,
			database: { createCallback }
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.detected).toBe(1);
			expect(result.value.saved).toBe(1);
		}
		expect(createCallback).toHaveBeenCalledTimes(1);
		expect(capturedPrompt).toContain('Return JSON array only');
		expect(capturedPrompt).toContain('Only include lines that are concrete, quotable');
	});

	it('returns contract violation for malformed JSON', async () => {
		const result = await scanForCallbacks({
			meetingId: 'meeting-1',
			shares: [
				{
					id: 'share-1',
					meetingId: 'meeting-1',
					characterId: 'marcus',
					content: 'line',
					interactionType: 'standard'
				}
			],
			grokAi: createGrokMock('not-json'),
			database: { createCallback: async () => ok({ id: 'x' }) }
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
		}
	});

	it('propagates grok seam errors', async () => {
		const grokAi: GrokAiPort = {
			generateShare: async () => err(SeamErrorCodes.RATE_LIMITED, 'rate limited')
		};
		const result = await scanForCallbacks({
			meetingId: 'meeting-1',
			shares: [
				{
					id: 'share-1',
					meetingId: 'meeting-1',
					characterId: 'marcus',
					content: 'line',
					interactionType: 'standard'
				}
			],
			grokAi,
			database: { createCallback: async () => ok({ id: 'x' }) }
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.RATE_LIMITED);
		}
	});

	it('returns input invalid for empty share set', async () => {
		const result = await scanForCallbacks({
			meetingId: 'meeting-1',
			shares: [],
			grokAi: createGrokMock('[]'),
			database: { createCallback: async () => ok({ id: 'x' }) }
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});
});
