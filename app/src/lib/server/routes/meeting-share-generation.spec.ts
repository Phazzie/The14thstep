import { describe, expect, it, vi } from 'vitest';
import { CORE_CHARACTERS } from '$lib/core/characters';
import { _generateValidatedShare } from '../../../routes/meeting/[id]/share/+server';

describe('share route generation fallback behavior', () => {
	it('returns non-fallback result when generation and validator pass', async () => {
		const generateShare = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				value: { shareText: 'Now let me own my side in this.' }
			})
			.mockResolvedValueOnce({
				ok: true,
				value: {
					shareText:
						'{"pass":true,"voiceConsistency":8,"authenticity":8,"therapySpeakDetected":false,"reasons":[]}'
				}
			});

		const result = await _generateValidatedShare({
			meetingId: 'meeting-1',
			character: CORE_CHARACTERS[0],
			prompt: 'prompt',
			contextMessages: [],
			topic: 'staying',
			userName: 'You',
			userMood: 'raw',
			recentShares: [],
			grokAi: { generateShare } as never
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.fallbackUsed).toBe(false);
			expect(result.value.attempts).toBe(1);
			expect(result.value.shareText).toContain('own my side');
		}
	});

	it('returns explicit fallback when all attempts fail validation', async () => {
		const generateShare = vi.fn(async (input: { characterId: string }) => {
			if (input.characterId === 'quality-validator') {
				return {
					ok: true,
					value: {
						shareText:
							'{"pass":true,"voiceConsistency":9,"authenticity":9,"therapySpeakDetected":true,"reasons":["therapy speak"]}'
					}
				};
			}
			return {
				ok: true,
				value: { shareText: 'You can heal and be gentle with yourself.' }
			};
		});

		const result = await _generateValidatedShare({
			meetingId: 'meeting-2',
			character: CORE_CHARACTERS[1],
			prompt: 'prompt',
			contextMessages: [],
			topic: 'staying',
			userName: 'You',
			userMood: 'raw',
			recentShares: [],
			grokAi: { generateShare } as never
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.fallbackUsed).toBe(true);
			expect(result.value.attempts).toBe(3);
			expect(result.value.shareText).toBe(`${CORE_CHARACTERS[1].name} is quiet tonight.`);
		}
		// 3 generation attempts + 3 validator calls
		expect(generateShare).toHaveBeenCalledTimes(6);
	});
});
