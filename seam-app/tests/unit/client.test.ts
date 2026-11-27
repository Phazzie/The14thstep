import { describe, expect, it, vi } from 'vitest';
import { clearMeeting, loadMeeting, saveMeeting, STORAGE_KEY, type KeyValueStore } from '$lib/client/storage';
import { advance, currentBeat, newMeeting, submitUserTurn, type FetchShare } from '$lib/client/runner';
import type { Intake } from '$lib/contracts/intake';
import type { MeetingState } from '$lib/contracts/meeting';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k) => data.get(k) ?? null,
		setItem: (k, v) => void data.set(k, v),
		removeItem: (k) => void data.delete(k)
	};
}

const intake: Intake = {
	name: 'Dana',
	cleanTime: '19 days',
	mood: 'restless',
	mind: 'My brother said he would call and did not.',
	listeningOnly: false
};

const fakeShare: FetchShare = async (req) => ({
	text: `${req.speakerId} says something real about ${req.topic ?? 'tonight'}.`,
	source: 'tape'
});

async function runToTurn(state: MeetingState, fetchShare = fakeShare): Promise<MeetingState> {
	let s = state;
	for (let i = 0; i < 200; i += 1) {
		const beat = currentBeat(s);
		if (!beat || beat.kind === 'user_turn' || s.finished) return s;
		s = await advance(s, fetchShare);
	}
	throw new Error('runaway');
}

describe('storage', () => {
	it('P11a/P12: round trip under one key; garbage loads as null', () => {
		const store = memoryStore();
		const state = newMeeting(intake, 5, new Date('2026-11-27T08:00:00Z'));
		saveMeeting(store, state);
		expect([...store.data.keys()]).toEqual([STORAGE_KEY]);
		expect(loadMeeting(store)).toEqual(state);
		store.setItem(STORAGE_KEY, '{"version":9}');
		expect(loadMeeting(store)).toBeNull();
		store.setItem(STORAGE_KEY, 'not json');
		expect(loadMeeting(store)).toBeNull();
		clearMeeting(store);
		expect(store.data.size).toBe(0);
	});
});

describe('runner', () => {
	it('runs the opening on its own and stops at the intro turn', async () => {
		const s = await runToTurn(newMeeting(intake, 5, new Date()));
		expect(currentBeat(s)).toMatchObject({ kind: 'user_turn', turn: 'intro' });
		expect(s.transcript.filter((e) => e.kind === 'share').length).toBeGreaterThanOrEqual(8);
		expect(s.transcript[0].kind).toBe('ritual');
	});

	it('P11: advancing a saved state twice never duplicates a beat', async () => {
		const s = newMeeting(intake, 5, new Date());
		const fetchSpy = vi.fn(fakeShare);
		const once = await advance(s, fetchSpy);
		const again = await advance(s, fetchSpy);
		expect(again.transcript.map((e) => e.id)).toEqual(once.transcript.map((e) => e.id));
		const ids = (await runToTurn(once)).transcript.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('P4/P14: intro, topic, three shares, then a signed, finished meeting', async () => {
		let s = await runToTurn(newMeeting(intake, 11, new Date()));
		s = submitUserTurn(s, null);
		expect(s.transcript.at(-1)).toMatchObject({ kind: 'user', text: expect.stringContaining('Dana') });
		s = await runToTurn(s);
		expect(currentBeat(s)).toMatchObject({ turn: 'topic' });
		s = submitUserTurn(s, null, 'Trusting yourself again');
		expect(s.topic).toBe('Trusting yourself again');
		s = await runToTurn(s);
		s = submitUserTurn(s, 'I keep checking my phone for him.');
		s = await runToTurn(s);
		expect(s.transcript.some((e) => e.kind === 'share' && e.text.includes('Trusting yourself again'))).toBe(true);
		s = submitUserTurn(s, null);
		s = await runToTurn(s);
		s = submitUserTurn(s, null);
		s = await runToTurn(s);
		expect(s.finished).toBe(true);
	});

	it('P10: a crisis share stops nothing, adds the authored reply and phone list at once', async () => {
		let s = await runToTurn(newMeeting(intake, 3, new Date()));
		s = submitUserTurn(s, null);
		s = await runToTurn(s);
		s = submitUserTurn(s, null, 'Finding reasons to stay');
		s = await runToTurn(s);
		s = submitUserTurn(s, 'I keep thinking about ending it.');
		expect(s.crisis).toBe(true);
		expect(s.transcript.some((e) => e.kind === 'phone_list')).toBe(true);
	});

	it('P10: crisis in the intake is answered before the room starts', () => {
		const s = newMeeting({ ...intake, mind: 'i want to die tonight' }, 3, new Date());
		expect(s.crisis).toBe(true);
		expect(s.transcript.some((e) => e.kind === 'crisis')).toBe(true);
	});

	it('listening only: the meeting runs to the end with no input', async () => {
		let s = newMeeting({ ...intake, listeningOnly: true }, 8, new Date());
		for (let i = 0; i < 100 && !s.finished; i += 1) s = await advance(s, fakeShare);
		expect(s.finished).toBe(true);
		expect(s.topic).not.toBeNull();
	});

	it('hard question is skipped when the user only passed', async () => {
		let s = await runToTurn(newMeeting(intake, 4, new Date()));
		s = submitUserTurn(s, null);
		s = await runToTurn(s);
		s = submitUserTurn(s, null, 'The people we lost');
		const asked: string[] = [];
		const spy: FetchShare = async (r) => {
			asked.push(r.slot);
			return fakeShare(r);
		};
		for (let i = 0; i < 3; i += 1) {
			s = await runToTurn(s, spy);
			s = submitUserTurn(s, null);
		}
		await runToTurn(s, spy);
		expect(asked).not.toContain('hard_question');
	});
});
