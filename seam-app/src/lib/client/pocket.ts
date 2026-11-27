/**
 * Purpose: hold the meeting in memory as well as in storage.
 * Why: in a private window localStorage can throw; the meeting must still open.
 */
import type { MeetingState } from '$lib/contracts/meeting';
import { loadMeeting, saveMeeting } from './storage';

let current: MeetingState | null = null;

function storage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

export function putInPocket(state: MeetingState): void {
	current = state;
	const store = storage();
	if (store) saveMeeting(store, state);
}

export function takeFromPocket(): MeetingState | null {
	const store = storage();
	return (store ? loadMeeting(store) : null) ?? current;
}

export function emptyPocket(): void {
	current = null;
	try {
		storage()?.removeItem('the14thstep:meeting:v1');
	} catch {
		// nothing stored
	}
}
