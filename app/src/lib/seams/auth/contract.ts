import type { SeamResult } from '$lib/core/seam';

export interface AccountSession {
	kind: 'account';
	userId: string;
	email: string;
	expiresAt: string;
}

export interface GuestSession {
	kind: 'guest';
	guestId: string;
	displayName: string;
	expiresAt: string;
}

export type AppSession = AccountSession | GuestSession;

export interface AuthPort {
	getSession(cookies: string | null): Promise<SeamResult<AppSession>>;
	createGuestSession(displayName: string): Promise<SeamResult<GuestSession>>;
	signOut(sessionToken: string): Promise<SeamResult<{ success: true }>>;
}
