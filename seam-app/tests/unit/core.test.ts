import { describe, expect, it } from 'vitest';
import { CHARACTERS, getCharacter } from '$lib/core/characters';
import { findTherapySpeak } from '$lib/core/style';
import { crisisEntries, detectCrisis, PHONE_LIST } from '$lib/core/crisis';
import { planMeeting, TOPICS } from '$lib/core/script';
import { buildSharePrompt } from '$lib/core/prompts';
import { tapeLine } from '$lib/core/tape';
import type { ShareRequest } from '$lib/contracts/share';

describe('characters', () => {
	it('P6: six characters, each with exactly three non-empty voice lines', () => {
		expect(CHARACTERS.map((c) => c.id)).toEqual([
			'marcus',
			'heather',
			'meechie',
			'gemini',
			'gypsy',
			'chrystal'
		]);
		for (const c of CHARACTERS) {
			expect(c.voiceExamples).toHaveLength(3);
			for (const line of c.voiceExamples) expect(line.trim().length).toBeGreaterThan(10);
		}
		expect(getCharacter('marcus').name).toBe('Marcus');
		expect(() => getCharacter('nobody')).toThrow();
	});
});

describe('style', () => {
	it('P7: therapy-speak is caught, an ordinary share is not', () => {
		expect(findTherapySpeak("I hear you. That's valid.").length).toBeGreaterThanOrEqual(2);
		expect(findTherapySpeak('This is my healing journey.')).not.toEqual([]);
		expect(findTherapySpeak('I drove past the dope house twice and kept going.')).toEqual([]);
	});
});

describe('crisis', () => {
	it('P9: plain crisis language is detected, ordinary pain is not', () => {
		expect(detectCrisis('honestly I want to die')).toBe(true);
		expect(detectCrisis("I've been thinking about ending it")).toBe(true);
		expect(detectCrisis('I wish I could just not wake up')).toBe(true);
		expect(detectCrisis('KILL MYSELF')).toBe(true);
		expect(detectCrisis('I had a rough week and I miss my kids')).toBe(false);
	});

	it('P10: the crisis reply names 988 and 911 and is authored, not generated', () => {
		const entries = crisisEntries('Dana', 'c1');
		const all = entries.map((e) => e.text).join(' ');
		expect(all).toContain('988');
		expect(all).toContain('911');
		expect(all).toContain('Dana');
		expect(entries.every((e) => e.source === 'authored')).toBe(true);
		expect(entries.some((e) => e.kind === 'phone_list')).toBe(true);
		expect(PHONE_LIST.map((p) => p.number)).toEqual(expect.arrayContaining(['988', '911']));
		expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
	});
});

describe('script', () => {
	it('P3: opens with the empty chair, then Marcus', () => {
		const beats = planMeeting(7, false);
		expect(beats[0]).toMatchObject({ kind: 'ritual' });
		expect(beats[0].kind === 'ritual' && beats[0].text.toLowerCase()).toContain('empty');
		const firstShare = beats.find((b) => b.kind === 'share');
		expect(firstShare).toMatchObject({ speakerId: 'marcus', slot: 'opening' });
		expect(beats.at(-1)).toEqual({ kind: 'end' });
	});

	it('P4: one intro turn, one topic turn, three share turns, in order', () => {
		const turns = planMeeting(7, false)
			.filter((b) => b.kind === 'user_turn')
			.map((b) => (b.kind === 'user_turn' ? b.turn : ''));
		expect(turns).toEqual(['intro', 'topic', 'share', 'share', 'share']);
		const intros = planMeeting(7, false).filter((b) => b.kind === 'intro');
		expect(intros).toHaveLength(6);
	});

	it('P4b: the hard question only fires if the user shared, and Marcus closes', () => {
		const beats = planMeeting(7, false);
		const hard = beats.filter((b) => b.kind === 'share' && b.slot === 'hard_question');
		expect(hard).toHaveLength(1);
		expect(hard[0]).toMatchObject({ onlyIfUserShared: true });
		const closing = beats.find((b) => b.kind === 'share' && b.slot === 'closing');
		expect(closing).toMatchObject({ speakerId: 'marcus' });
		expect(TOPICS.length).toBe(10);
	});

	it('P5: same seed, same meeting; different seeds change who speaks', () => {
		expect(planMeeting(42, false)).toEqual(planMeeting(42, false));
		const order = (s: number) =>
			planMeeting(s, false)
				.filter((b) => b.kind === 'share' && b.slot === 'round')
				.map((b) => (b.kind === 'share' ? b.speakerId : ''))
				.join(',');
		const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(order));
		expect(orders.size).toBeGreaterThan(1);
	});
});

describe('prompts', () => {
	const request: ShareRequest = {
		speakerId: 'meechie',
		slot: 'round',
		topic: 'Trusting yourself again',
		userName: 'Dana',
		userMood: 'numb',
		n: 3,
		recent: []
	};

	it('P6b: carries voice lines, never archetype or banned instructions, omits empty sections', () => {
		const c = getCharacter('meechie');
		const { system, user } = buildSharePrompt(c, request);
		const all = system + '\n' + user;
		for (const line of c.voiceExamples) expect(all).toContain(line);
		expect(all).not.toContain(c.archetype);
		expect(all.toLowerCase()).not.toMatch(/exactly \d+ sentences/);
		expect(all.toLowerCase()).not.toContain('physical action');
		expect(all).not.toMatch(/:\s*none\b/i);
		expect(all).not.toContain('Recent shares');
		expect(all).toContain('Trusting yourself again');
		const withRecent = buildSharePrompt(c, {
			...request,
			recent: [{ speaker: 'Dana', text: 'I slept in my car again.' }]
		});
		expect(withRecent.user).toContain('I slept in my car again.');
	});
});

describe('tape', () => {
	it('P13: every speaker and slot the script can produce has a real tape line', () => {
		for (const seed of [1, 2, 3, 99, 1234]) {
			for (const beat of planMeeting(seed, false)) {
				if (beat.kind !== 'share') continue;
				for (const n of [0, 1, 2, 7]) {
					const line = tapeLine(beat.speakerId, beat.slot, n);
					expect(line.trim().length).toBeGreaterThan(20);
					expect(findTherapySpeak(line)).toEqual([]);
				}
			}
		}
	});
});
