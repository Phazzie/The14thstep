import { describe, expect, it } from 'vitest';
import { buildPromptContext } from './memory-builder';
import { buildCharacterSharePrompt } from './prompt-templates';
import { ok } from './seam';
import { CORE_CHARACTERS } from './characters';

describe('milestone 6 continuity verification', () => {
	it('includes callback and continuity context in second meeting prompt', async () => {
		const contextResult = await buildPromptContext({
			userId: 'user-1',
			characterId: 'marcus',
			meetingId: 'meeting-2',
			database: {
				getHeavyMemory: async () =>
					ok([
						{
							id: 's1',
							meetingId: 'meeting-1',
							characterId: 'marcus',
							isUserShare: false,
							content: 'I stayed and did not run this time.',
							significanceScore: 8,
							sequenceOrder: 1,
							createdAt: '2026-02-10T00:00:00.000Z'
						},
						{
							id: 's2',
							meetingId: 'meeting-2',
							characterId: null,
							isUserShare: true,
							content: 'I came back tonight even though I wanted to hide.',
							significanceScore: 6,
							sequenceOrder: 2,
							createdAt: '2026-02-11T00:00:00.000Z'
						}
					]),
				getActiveCallbacks: async () =>
					ok([
						{
							id: 'c1',
							originShareId: 's1',
							characterId: 'marcus',
							originalText: 'I stayed and did not run this time.',
							callbackType: 'catchphrase',
							scope: 'character',
							potentialScore: 8,
							timesReferenced: 1,
							status: 'active',
							lastReferencedAt: null,
							parentCallbackId: null
						}
					]),
				getUserById: async () =>
					ok({
						id: 'user-1',
						displayName: 'trap',
						cleanTime: '19 days',
						meetingCount: 2,
						firstMeetingAt: '2026-02-10T00:00:00.000Z',
						lastMeetingAt: '2026-02-11T00:00:00.000Z'
					})
			}
		});

		expect(contextResult.ok).toBe(true);
		if (!contextResult.ok) return;

		const marcus = CORE_CHARACTERS.find((character) => character.id === 'marcus');
		expect(marcus).toBeDefined();
		if (!marcus) return;

		const prompt = buildCharacterSharePrompt(marcus, {
			topic: 'Staying when I want to run',
			userName: 'trap',
			userMood: 'anxious',
			recentShares: [{ speaker: 'User', content: 'I came back tonight.' }],
			heavyMemoryLines: contextResult.value.heavyMemoryLines,
			continuityLines: contextResult.value.continuityLines,
			callbackLines: contextResult.value.callbackLines
		});

		expect(prompt).toContain('YOUR HISTORY');
		expect(prompt).toContain('CONTINUITY NOTES');
		expect(prompt).toContain('CALLBACK OPPORTUNITIES THIS MEETING');
		expect(prompt).toContain('I stayed and did not run this time.');
		expect(prompt).toContain('Attendance count: 2 meetings.');
	});
});
