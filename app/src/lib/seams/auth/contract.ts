import type { SeamResult } from '$lib/core/seam';

export interface AuthSession {
	userId: string;
	email: string;
	expiresAt: string;
}

export interface AuthPort {
	getSession(cookies: string | null): Promise<SeamResult<AuthSession>>;
	signOut(sessionToken: string): Promise<SeamResult<{ success: true }>>;
}
