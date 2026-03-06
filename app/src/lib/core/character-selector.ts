import {
	CORE_CHARACTERS,
	VISITOR_ARCHETYPES,
	VISITOR_CLEAN_TIMES,
	VISITOR_COLORS,
	VISITOR_CONTRADICTIONS,
	VISITOR_NAME_POOL,
	VISITOR_WOUNDS
} from './characters';
import type { CharacterProfile } from './types';
import { bestEffortRandom } from './random-utils';

export type CharacterRole = 'chair' | 'active_sharer' | 'quiet_presence';

export interface SelectedCharacter extends CharacterProfile {
	role: CharacterRole;
	isVisitor: boolean;
}

export interface SelectCharactersInput {
	availableCharacters?: CharacterProfile[];
	recentMeetingCharacterIds?: string[];
	targetSize?: number;
	random?: () => number;
	nowIso?: string;
}

function clampTargetSize(value: number | undefined): number {
	if (value === undefined) return 8;
	return Math.max(8, Math.min(10, value));
}

function pickOne<T>(items: readonly T[], random: () => number): T {
	const idx = Math.floor(random() * items.length) % items.length;
	return items[idx];
}

function shuffle<T>(items: T[], random: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random() * (i + 1));
		const tmp = copy[i];
		copy[i] = copy[j];
		copy[j] = tmp;
	}
	return copy;
}

function visitorId(nowIso: string, index: number): string {
	return `visitor-${nowIso.replace(/[^0-9]/g, '').slice(0, 14)}-${index}`;
}

function generateVisitors(random: () => number, nowIso: string): SelectedCharacter[] {
	return [0, 1].map((index) => {
		const name = pickOne(VISITOR_NAME_POOL, random);
		return {
			id: visitorId(nowIso, index),
			name,
			tier: 'visitor' as const,
			status: 'active' as const,
			archetype: pickOne(VISITOR_ARCHETYPES, random),
			wound: pickOne(VISITOR_WOUNDS, random),
			contradiction: pickOne(VISITOR_CONTRADICTIONS, random),
			voice: 'Concrete, specific, emotionally raw.',
			quirk: 'Looks down before saying hard truths.',
			color: pickOne(VISITOR_COLORS, random),
			avatar: name.slice(0, 2),
			cleanTime: pickOne(VISITOR_CLEAN_TIMES, random),
			meetingCount: 0,
			lastSeenAt: null,
			role: 'quiet_presence' as const,
			isVisitor: true
		};
	});
}

function toSelectedCharacter(character: CharacterProfile): SelectedCharacter {
	const isMarcus = character.id === 'marcus' || character.name.toLowerCase() === 'marcus';
	return {
		...character,
		role: isMarcus ? 'chair' : 'active_sharer',
		isVisitor: character.tier === 'visitor'
	};
}

export function selectCharacters(input: SelectCharactersInput = {}): SelectedCharacter[] {
	const random = input.random ?? bestEffortRandom;
	const nowIso = input.nowIso ?? new Date().toISOString();
	const targetSize = clampTargetSize(input.targetSize);
	const recent = new Set(input.recentMeetingCharacterIds ?? []);

	const available = (input.availableCharacters ?? CORE_CHARACTERS).filter((c) => c.status === 'active');

	const coreCharacters = available.filter((c) => c.tier === 'core');
	if (coreCharacters.length < 6) {
		throw new Error('selectCharacters requires at least 6 active core characters');
	}

	const coreByPriority = ['marcus', 'heather', 'meechie', 'gemini', 'gypsy', 'chrystal']
		.map((id) => coreCharacters.find((character) => character.id === id))
		.filter((character): character is CharacterProfile => Boolean(character));

	const selectedCore = coreByPriority.slice(0, 6);
	const nonCore = available.filter((c) => c.tier === 'regular' || c.tier === 'pool');

	const preferred = shuffle(nonCore.filter((c) => !recent.has(c.id)), random);
	const fallback = shuffle(nonCore.filter((c) => recent.has(c.id)), random);
	const neededFromRegular = Math.max(0, targetSize - selectedCore.length - 2);
	const selectedRegular = [...preferred, ...fallback].slice(0, neededFromRegular);

	const visitors = generateVisitors(random, nowIso);

	return [...selectedCore.map(toSelectedCharacter), ...selectedRegular.map(toSelectedCharacter), ...visitors];
}
