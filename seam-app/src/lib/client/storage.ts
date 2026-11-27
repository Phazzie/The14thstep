/**
 * Purpose: keep one meeting on the user's own device.
 * Why: the old app stored every share in a database that leaked (#78) and then vanished (#71).
 * Nothing the user says is stored anywhere else now.
 * Invariants: one key. Anything unreadable loads as null, never as a half-meeting.
 */
import { MeetingStateSchema, type MeetingState } from '$lib/contracts/meeting';

export const STORAGE_KEY = 'the14thstep:meeting:v1';

export interface KeyValueStore {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export function saveMeeting(store: KeyValueStore, state: MeetingState): void {
	try {
		store.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Private mode or a full disk: the meeting still runs, it just won't survive a refresh.
	}
}

export function loadMeeting(store: KeyValueStore): MeetingState | null {
	try {
		const raw = store.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = MeetingStateSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function clearMeeting(store: KeyValueStore): void {
	try {
		store.removeItem(STORAGE_KEY);
	} catch {
		// Nothing to clear if storage is unavailable.
	}
}
