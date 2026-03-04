import { describe, expect, it } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	AUTH_ERROR_CODES,
	validateAuthCallbackCompletionInput,
	validateAuthSession,
	validateAuthSignInPayload,
	validateCookiesInput,
	validateMagicLinkInput,
	validatePasswordSignInInput,
	validateSessionTokenInput
} from './contract';
import faultFixture from './fixtures/fault.json';
import sessionSample from './fixtures/session.sample.json';
import signOutSample from './fixtures/signOut.sample.json';
import { createAuthMock } from './mock';

describe('auth seam contract', () => {
	it('accepts documented seam error codes', () => {
		expect(AUTH_ERROR_CODES).toContain(SeamErrorCodes.UNAUTHORIZED);
		expect(AUTH_ERROR_CODES).toContain(SeamErrorCodes.CONTRACT_VIOLATION);
		expect(AUTH_ERROR_CODES).toContain(SeamErrorCodes.RATE_LIMITED);
	});

	it('validates fixture and input shapes', () => {
		expect(validateAuthSession(sessionSample)).toBe(true);
		expect(
			validateAuthSignInPayload({
				userId: 'user-1',
				email: 'person@example.com',
				accessToken: 'access',
				refreshToken: 'refresh',
				userMetadata: {}
			})
		).toBe(true);
		expect(validateCookiesInput(null)).toBe(true);
		expect(validateCookiesInput('sb-session=token')).toBe(true);
		expect(validateSessionTokenInput('token-123')).toBe(true);
		expect(
			validateMagicLinkInput({
				email: 'person@example.com',
				emailRedirectTo: 'https://example.com/auth/callback'
			})
		).toBe(true);
		expect(validatePasswordSignInInput({ email: 'person@example.com', password: 'secret' })).toBe(true);
		expect(
			validateAuthCallbackCompletionInput({
				code: 'abc123',
				tokenHash: null,
				otpType: null
			})
		).toBe(true);
	});

	it('mock returns fixture data exactly', async () => {
		const mock = createAuthMock();
		const session = await mock.getSession('sb-session=token');
		expect(session.ok).toBe(true);
		if (session.ok) {
			expect(session.value).toEqual(sessionSample);
		}

		const signOut = await mock.signOut('token-123');
		expect(signOut.ok).toBe(true);
		if (signOut.ok) {
			expect(signOut.value).toEqual(signOutSample);
		}

		const guestSignIn = await mock.signInGuest();
		expect(guestSignIn.ok).toBe(true);

		const magicLink = await mock.sendMagicLink({
			email: 'person@example.com',
			emailRedirectTo: 'https://example.com/auth/callback'
		});
		expect(magicLink.ok).toBe(true);

		const passwordSignIn = await mock.signInWithPassword({
			email: 'person@example.com',
			password: 'secret'
		});
		expect(passwordSignIn.ok).toBe(true);

		const callbackSignIn = await mock.completeAuthCallback({
			code: 'abc123',
			tokenHash: null,
			otpType: null
		});
		expect(callbackSignIn.ok).toBe(true);
	});

	it('mock can return fault scenario', async () => {
		const mock = createAuthMock({ scenarios: { getSession: 'fault' } });
		const session = await mock.getSession('sb-session=token');

		expect(session.ok).toBe(false);
		if (!session.ok) {
			expect(session.error.code).toBe((faultFixture as { code: string }).code);
			expect(session.error.message).toBe((faultFixture as { message: string }).message);
		}
	});

	it('rejects malformed inputs', () => {
		expect(validateCookiesInput('')).toBe(false);
		expect(validateSessionTokenInput('')).toBe(false);
		expect(
			validateMagicLinkInput({
				email: 'bad-email',
				emailRedirectTo: 'https://example.com/auth/callback'
			})
		).toBe(false);
		expect(validatePasswordSignInInput({ email: 'person@example.com', password: '' })).toBe(false);
		expect(
			validateAuthCallbackCompletionInput({
				code: null,
				tokenHash: null,
				otpType: null
			})
		).toBe(false);
	});
});
