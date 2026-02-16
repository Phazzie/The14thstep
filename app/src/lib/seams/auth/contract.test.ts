import { describe, expect, it } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	AUTH_ERROR_CODES,
	validateAuthSession,
	validateCookiesInput,
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
	});

	it('validates fixture and input shapes', () => {
		expect(validateAuthSession(sessionSample)).toBe(true);
		expect(validateCookiesInput(null)).toBe(true);
		expect(validateCookiesInput('sb-session=token')).toBe(true);
		expect(validateSessionTokenInput('token-123')).toBe(true);
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
	});
});
