export type SessionIdentity =
	| {
			kind: 'authenticated';
			userId: string;
			email: string;
			expiresAt: string;
	  }
	| {
			kind: 'guest';
			guestSessionId: string;
			displayName: string;
			expiresAt: string;
	  };

export function isGuestSession(
	session: SessionIdentity
): session is Extract<SessionIdentity, { kind: 'guest' }> {
	return session.kind === 'guest';
}
