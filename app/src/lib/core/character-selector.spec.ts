import { describe, expect, it } from 'vitest';
import { CORE_CHARACTERS } from './characters';
import { selectCharacters } from './character-selector';
import type { CharacterProfile } from './types';

const regulars: CharacterProfile[] = [
	{
		id: 'regular-1',
		name: 'Keon',
		tier: 'regular',
		status: 'active',
		archetype: 'The Quiet One',
		wound: 'lost everything',
		contradiction: 'avoids help',
		voice: 'blunt',
		quirk: 'taps knee',
		color: '#FFFFFF',
		avatar: 'K',
		cleanTime: '9 months',
		meetingCount: 5,
		lastSeenAt: null
	},
	{
		id: 'regular-2',
		name: 'Nia',
		tier: 'pool',
		status: 'active',
		archetype: 'The Angry One',
		wound: 'fresh loss',
		contradiction: 'pushes people away',
		voice: 'short and direct',
		quirk: 'crosses arms',
		color: '#000000',
		avatar: 'N',
		cleanTime: '2 months',
		meetingCount: 2,
		lastSeenAt: null
	}
];

describe('selectCharacters', () => {
	it('returns 8 participants by default with exactly two visitors', () => {
		const selected = selectCharacters({
			availableCharacters: [...CORE_CHARACTERS, ...regulars],
			random: () => 0.1,
			nowIso: '2026-02-16T00:00:00.000Z'
		});

		expect(selected).toHaveLength(8);
		expect(selected.filter((c) => c.tier === 'core')).toHaveLength(6);
		expect(selected.filter((c) => c.isVisitor)).toHaveLength(2);
	});

	it('assigns Marcus as chair', () => {
		const selected = selectCharacters({ availableCharacters: [...CORE_CHARACTERS, ...regulars] });
		const marcus = selected.find((character) => character.id === 'marcus');
		expect(marcus?.role).toBe('chair');
	});

	it('fills additional seats from regular/pool when target size is larger', () => {
		const selected = selectCharacters({
			availableCharacters: [...CORE_CHARACTERS, ...regulars],
			targetSize: 10,
			recentMeetingCharacterIds: ['regular-1'],
			random: () => 0.2
		});

		expect(selected).toHaveLength(10);
		expect(
			selected.filter((character) => character.tier === 'regular' || character.tier === 'pool')
		).toHaveLength(2);
		const firstRegular = selected.find(
			(character) => character.tier === 'regular' || character.tier === 'pool'
		);
		expect(firstRegular?.id).toBe('regular-2');
	});

	it('throws when fewer than six core characters are available', () => {
		expect(() => selectCharacters({ availableCharacters: CORE_CHARACTERS.slice(0, 5) })).toThrow(
			'at least 6 active core characters'
		);
	});
});
