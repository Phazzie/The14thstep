import { describe, expect, it } from 'vitest';
import { isGuestSession, type SessionIdentity } from './session';

describe('session identity model', () => {
	it('detects guest sessions', () => {
		const guest: SessionIdentity = {
			kind: 'guest',
			guestSessionId: '123',
			displayName: 'Guest',
			expiresAt: new Date().toISOString()
		};

		expect(isGuestSession(guest)).toBe(true);
	});

	it('does not mark authenticated sessions as guest', () => {
		const authenticated: SessionIdentity = {
			kind: 'authenticated',
			userId: 'abc',
			email: 'user@example.com',
			expiresAt: new Date().toISOString()
		};

		expect(isGuestSession(authenticated)).toBe(false);
	});
});
