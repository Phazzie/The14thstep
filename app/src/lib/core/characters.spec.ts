import { describe, expect, it } from 'vitest';
import { CORE_CHARACTERS, validateCharacterNarrativeFields } from './characters';
import type { CharacterProfile } from './types';

describe('character narrative field validation', () => {
	it('validates all core characters as narrative-complete', () => {
		for (const character of CORE_CHARACTERS) {
			const result = validateCharacterNarrativeFields(character);
			expect(result.ok).toBe(true);
			expect(result.missingFields).toEqual([]);
		}
	});

	it('reports missing narrative fields for sparse profiles', () => {
		const sparse: CharacterProfile = {
			id: 'visitor-1',
			name: 'Visitor',
			tier: 'visitor',
			status: 'active',
			archetype: 'The Newcomer',
			wound: 'recent loss',
			contradiction: 'wants help but hides',
			voice: 'raw',
			quirk: 'looks at floor',
			color: '#fff',
			avatar: 'V',
			cleanTime: '2 days',
			meetingCount: 0,
			lastSeenAt: null
		};

		const result = validateCharacterNarrativeFields(sparse);
		expect(result.ok).toBe(false);
		expect(result.missingFields).toContain('voiceExamples');
		expect(result.missingFields).toContain('lie');
		expect(result.missingFields).toContain('cleanTimeStart');
	});
});
