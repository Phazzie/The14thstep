import { SeamErrorCodes, err, ok, type SeamErrorCode } from '$lib/core/seam';
import type { AuthPort, AuthSession } from './contract';
import { validateAuthSession, validateCookiesInput, validateSessionTokenInput } from './contract';
import faultFixture from './fixtures/fault.json';
import sessionSample from './fixtures/session.sample.json';
import signOutSample from './fixtures/signOut.sample.json';

type AuthScenario = 'sample' | 'fault';

interface AuthMockOptions {
	scenarios?: {
		getSession?: AuthScenario;
		signOut?: AuthScenario;
	};
	session?: AuthSession;
}

function toSeamErrorCode(value: unknown): SeamErrorCode {
	if (typeof value !== 'string') return SeamErrorCodes.UNEXPECTED;
	if ((Object.values(SeamErrorCodes) as string[]).includes(value)) {
		return value as SeamErrorCode;
	}
	return SeamErrorCodes.UNEXPECTED;
}

function parseFaultFixture(): { code: SeamErrorCode; message: string; details?: Record<string, unknown> } {
	const fixture = faultFixture as Record<string, unknown>;
	return {
		code: toSeamErrorCode(fixture.code),
		message:
			typeof fixture.message === 'string' && fixture.message.trim().length > 0
				? fixture.message
				: 'Unknown auth mock failure',
		details: typeof fixture.details === 'object' && fixture.details !== null
			? (fixture.details as Record<string, unknown>)
			: undefined
	};
}

export function createAuthMock(options: AuthMockOptions = {}): AuthPort {
	const scenarios = options.scenarios ?? {};
	const session = (options.session ?? sessionSample) as AuthSession;
	const fault = parseFaultFixture();

	return {
		async getSession(cookies) {
			if (!validateCookiesInput(cookies)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid cookies input');
			}
			if (scenarios.getSession === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			if (!validateAuthSession(session)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Fixture violates AuthSession');
			}
			return ok(session);
		},

		async signOut(sessionToken) {
			if (!validateSessionTokenInput(sessionToken)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid session token input');
			}
			if (scenarios.signOut === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}
			return ok(signOutSample as { success: true });
		}
	};
}
