/**
 * Purpose: the whole meeting as an ordered list of beats, decided before anyone speaks.
 * Why: the old app kept the script inside a 1,300-line Svelte component, so a refresh replayed
 * it and duplicated the transcript (#77). A pure list plus a cursor cannot duplicate anything.
 * Info flow: seed in; Beat[] out. The runner walks it; the user only acts at user_turn beats.
 * Invariants: pure and deterministic for a given seed. Marcus chairs, opens, names the topic, closes.
 */
import type { Beat } from '$lib/contracts/meeting';

export const CHAIR_ID = 'marcus';
export const INTRO_ORDER = ['marcus', 'heather', 'meechie', 'gemini', 'gypsy', 'chrystal'] as const;
const NON_CHAIRS = INTRO_ORDER.filter((id) => id !== CHAIR_ID);

export const TOPICS: string[] = [
	'Staying clean when everything falls apart',
	"People who don't understand what we've been through",
	'Trusting yourself again',
	'The difference between being alone and being lonely',
	"When the people closest to you don't believe you've changed",
	'Dealing with the things you did',
	'Finding reasons to stay',
	'Coming back after relapse',
	'The people we lost',
	'When staying clean feels harder than using'
];

/** Nonverbal lines from the old room, kept so silence has texture. */
const ACTION_LINES: Record<string, string[]> = {
	marcus: ['Marcus turns the chipped cup a quarter turn.', 'Marcus lets the pause sit.'],
	heather: ['Heather leans forward, then thinks better of it.', 'Heather nods once, hard.'],
	meechie: ['Meechie leans back and lets it hang.', 'Meechie says nothing, which is loud.'],
	gemini: ['Gemini starts to say something, stops, starts again, stops.', 'Gemini folds her arms tighter.'],
	gypsy: ['Gypsy taps one finger against their cup.', 'Gypsy looks at the door, then stays.'],
	chrystal: ['Chrystal glances at her phone and turns it face down.', 'Chrystal writes something on the folded paper.']
};

/** mulberry32: small, seedable, good enough to shuffle six chairs. */
export function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function pick<T>(items: readonly T[], random: () => number): T {
	return items[Math.floor(random() * items.length)] ?? items[0];
}

export function planMeeting(seed: number, listeningOnly: boolean): Beat[] {
	const random = seededRandom(seed);
	const order = shuffle(NON_CHAIRS, random);
	const [a, b, c, d, e] = order;
	const asker = random() > 0.5 ? 'meechie' : CHAIR_ID;
	const farewell = pick(order.slice(0, 3), random);
	const action = (id: string): Beat => ({ kind: 'action', text: pick(ACTION_LINES[id] ?? [], random) });
	const turnPrompt = listeningOnly ? 'You said you would listen tonight.' : '';

	return [
		{ kind: 'ritual', text: "This chair stays empty for everyone who couldn't make it tonight." },
		{ kind: 'share', speakerId: CHAIR_ID, slot: 'opening' },
		{ kind: 'ritual', text: 'Moment of silence.' },
		{ kind: 'action', text: 'Chrystal unfolds a sheet of paper that has clearly been unfolded before.' },
		{ kind: 'share', speakerId: 'chrystal', slot: 'reading' },
		{ kind: 'ritual', text: 'Introductions.' },
		...INTRO_ORDER.map((id): Beat => ({ kind: 'intro', speakerId: id })),
		{ kind: 'action', text: 'The room settles. Six people look at the one chair nobody has heard from.' },
		{ kind: 'user_turn', turn: 'intro', prompt: turnPrompt || 'Your turn. Your name, and anything else you want on the record.' },
		{ kind: 'user_turn', turn: 'topic', prompt: turnPrompt || 'Marcus slides the topic list across the table. Pick one, or he will.' },
		{ kind: 'share', speakerId: CHAIR_ID, slot: 'topic' },

		{ kind: 'share', speakerId: a, slot: 'round' },
		action(c),
		{ kind: 'share', speakerId: b, slot: 'round' },
		{ kind: 'user_turn', turn: 'share', prompt: turnPrompt || 'Marcus looks your way. What comes up for you?' },

		{ kind: 'share', speakerId: c, slot: 'round' },
		action(e),
		{ kind: 'share', speakerId: d, slot: 'round' },
		{ kind: 'share', speakerId: asker, slot: 'hard_question', onlyIfUserShared: true },
		{ kind: 'user_turn', turn: 'share', prompt: turnPrompt || 'The floor is open. How does this land?' },

		{ kind: 'share', speakerId: e, slot: 'round' },
		action(a),
		{ kind: 'share', speakerId: CHAIR_ID, slot: 'round' },
		{ kind: 'user_turn', turn: 'share', prompt: turnPrompt || 'Anything else before we close?' },

		{ kind: 'share', speakerId: CHAIR_ID, slot: 'closing' },
		{ kind: 'ritual', text: 'Keep coming back.' },
		{ kind: 'share', speakerId: farewell, slot: 'farewell' },
		{ kind: 'end' }
	];
}
