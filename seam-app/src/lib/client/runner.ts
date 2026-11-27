/**
 * Purpose: walk the meeting one beat at a time.
 * Why: every append and its cursor bump happen in one returned state, so a saved state can be
 * replayed without duplicating anything (#77), and the UI only renders what the runner returns.
 * Info flow: MeetingState + a share fetcher in; the next MeetingState out.
 * Invariants: never mutates its input. Crisis text is answered immediately, from authored lines.
 */
import type { Intake } from '$lib/contracts/intake';
import type { Beat, MeetingState, TranscriptEntry } from '$lib/contracts/meeting';
import type { ShareRequest, ShareResponse } from '$lib/contracts/share';
import { getCharacter } from '$lib/core/characters';
import { crisisEntries, detectCrisis } from '$lib/core/crisis';
import { planMeeting, TOPICS } from '$lib/core/script';
import { INTRODUCTIONS } from '$lib/core/tape';

export type FetchShare = (request: ShareRequest) => Promise<ShareResponse>;

export const PASS_TEXT = "I'll pass tonight. I'm just going to listen.";

function slipNumberFor(seed: number): number {
	return 10_000 + (seed % 89_999);
}

export function newMeeting(intake: Intake, seed: number, now: Date): MeetingState {
	const state: MeetingState = {
		version: 1,
		slipNumber: slipNumberFor(seed),
		startedAt: now.toISOString(),
		seed,
		intake,
		topic: null,
		cursor: 0,
		transcript: [],
		crisis: false,
		finished: false
	};
	if (detectCrisis(intake.mind)) {
		return { ...state, crisis: true, transcript: crisisEntries(intake.name, 'intake') };
	}
	return state;
}

export function currentBeat(state: MeetingState): Beat | null {
	return planMeeting(state.seed, state.intake.listeningOnly)[state.cursor] ?? null;
}

function userHasShared(state: MeetingState): boolean {
	return state.transcript.some(
		(entry) => entry.kind === 'user' && entry.id.includes(':share') && entry.text !== PASS_TEXT
	);
}

function speakerName(entry: TranscriptEntry, state: MeetingState): string {
	if (entry.kind === 'user') return state.intake.name;
	return entry.speakerId ? getCharacter(entry.speakerId).name : 'The room';
}

function step(state: MeetingState, entries: TranscriptEntry[], extra: Partial<MeetingState> = {}): MeetingState {
	return { ...state, ...extra, cursor: state.cursor + 1, transcript: [...state.transcript, ...entries] };
}

export async function advance(state: MeetingState, fetchShare: FetchShare): Promise<MeetingState> {
	if (state.finished) return state;
	const beat = currentBeat(state);
	const id = `b${state.cursor}`;
	if (!beat) return { ...state, finished: true };

	switch (beat.kind) {
		case 'ritual':
			return step(state, [{ id, kind: 'ritual', speakerId: null, text: beat.text, source: 'authored' }]);
		case 'action':
			return step(state, [{ id, kind: 'action', speakerId: null, text: beat.text, source: 'authored' }]);
		case 'intro':
			return step(state, [
				{ id, kind: 'share', speakerId: beat.speakerId, text: INTRODUCTIONS[beat.speakerId], source: 'authored' }
			]);
		case 'end':
			return step(state, [], { finished: true });
		case 'user_turn':
			if (!state.intake.listeningOnly) return state;
			if (beat.turn === 'intro') return submitUserTurn(state, `I'm ${state.intake.name}. I'm just here to listen.`);
			if (beat.turn === 'topic') return submitUserTurn(state, null, TOPICS[state.seed % TOPICS.length]);
			return submitUserTurn(state, null);
		case 'share': {
			if (beat.onlyIfUserShared && !userHasShared(state)) return step(state, []);
			const recent = state.transcript
				.filter((entry) => entry.kind === 'share' || entry.kind === 'user')
				.slice(-8)
				.map((entry) => ({ speaker: speakerName(entry, state), text: entry.text.slice(0, 1200) }));
			const response = await fetchShare({
				speakerId: beat.speakerId,
				slot: beat.slot,
				topic: state.topic,
				userName: state.intake.name,
				userMood: state.intake.mood,
				n: state.cursor + state.seed,
				recent
			});
			return step(state, [
				{ id, kind: 'share', speakerId: beat.speakerId, text: response.text, source: response.source }
			]);
		}
	}
}

export function submitUserTurn(state: MeetingState, text: string | null, topic?: string): MeetingState {
	const beat = currentBeat(state);
	if (!beat || beat.kind !== 'user_turn') return state;
	const id = `b${state.cursor}:${beat.turn}`;

	if (beat.turn === 'topic') {
		const chosen = topic && topic.trim() ? topic.trim().slice(0, 120) : TOPICS[state.seed % TOPICS.length];
		return step(state, [{ id, kind: 'ritual', speakerId: null, text: `Tonight's topic: ${chosen}`, source: 'authored' }], {
			topic: chosen
		});
	}

	const trimmed = text?.trim().slice(0, 1200) ?? '';
	let spoken = trimmed;
	if (!spoken) {
		spoken =
			beat.turn === 'intro'
				? `I'm ${state.intake.name}. ${state.intake.cleanTime}.`
				: PASS_TEXT;
	}
	const entries: TranscriptEntry[] = [{ id, kind: 'user', speakerId: null, text: spoken }];
	if (trimmed && detectCrisis(trimmed)) {
		return step(state, [...entries, ...crisisEntries(state.intake.name, id)], { crisis: true });
	}
	return step(state, entries);
}
