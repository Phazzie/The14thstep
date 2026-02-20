import type { SeamResult } from '$lib/core/seam';
import type { SessionIdentity } from '$lib/session';

export type AuthSession = Extract<SessionIdentity, { kind: 'authenticated' }>;
export type GuestSession = Extract<SessionIdentity, { kind: 'guest' }>;

export interface AuthPort {
	getSession(cookies: string | null): Promise<SeamResult<SessionIdentity | null>>;
	createGuestSession(input: {
		displayName?: string;
		ttlHours?: number;
	}): Promise<SeamResult<GuestSession>>;
	signOut(sessionToken: string): Promise<SeamResult<{ success: true }>>;
}
