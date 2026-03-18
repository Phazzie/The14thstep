import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';

const { verifyTokenMock, revokeSessionMock } = vi.hoisted(() => ({
	verifyTokenMock: vi.fn(),
	revokeSessionMock: vi.fn()
}));

vi.mock('@clerk/backend', () => ({
	verifyToken: verifyTokenMock,
	createClerkClient: () => ({
		sessions: {
			revokeSession: revokeSessionMock
		}
	})
}));

import { createAuthAdapter } from './adapter';

function makeEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
	return {
		...process.env,
		CLERK_SECRET_KEY: 'sk_test_123',
		...overrides
	};
}

describe('auth server adapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns INPUT_INVALID for malformed getSession input', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });
		const result = await adapter.getSession('');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});

	it('returns guest session when guest cookies are present', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });
		const signIn = await adapter.signInGuest();
		expect(signIn.ok).toBe(true);
		if (!signIn.ok) return;

		const result = await adapter.getSession(`app-session-kind=guest; sb-access-token=${signIn.value.accessToken}`);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.userId).toBe(signIn.value.userId);
			expect(result.value.email).toBe('guest@local.invalid');
		}
	});

	it('rejects forged guest session token', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });
		const result = await adapter.getSession(
			'app-session-kind=guest; sb-access-token=fca1e4e8-9a8e-4d67-bd87-cf8405917ca7.fake'
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
		}
	});

	it('verifies clerk session token and maps clerk subject to stable uuid', async () => {
		verifyTokenMock.mockResolvedValue({
			sub: 'user_2abcxyz',
			email: 'member@example.com',
			exp: 1893456000
		});
		const adapter = createAuthAdapter({ env: makeEnv() });

		const result = await adapter.getSession('__session=jwt-token');
		expect(verifyTokenMock).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ secretKey: 'sk_test_123' }));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.email).toBe('member@example.com');
			expect(result.value.userId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
		}
	});

	it('accepts suffixed clerk session cookies', async () => {
		verifyTokenMock.mockResolvedValue({
			sub: 'user_2abcxyz',
			email: 'member@example.com',
			exp: 1893456000
		});
		const adapter = createAuthAdapter({ env: makeEnv() });

		const result = await adapter.getSession('__session_app=jwt-token');
		expect(verifyTokenMock).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ secretKey: 'sk_test_123' }));
		expect(result.ok).toBe(true);
	});

	it('returns unauthorized when clerk token is invalid', async () => {
		verifyTokenMock.mockRejectedValue(new Error('invalid token'));
		const adapter = createAuthAdapter({ env: makeEnv() });

		const result = await adapter.getSession('__session=bad-token');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
		}
	});

	it('creates disposable guest sign-in payload', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });
		const result = await adapter.signInGuest();
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.userId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			);
			expect(result.value.accessToken).toContain('.');
			expect(result.value.userMetadata).toMatchObject({ sessionKind: 'guest' });
		}
	});

	it('returns INPUT_INVALID for hosted-flow sign-in methods', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });

		const magic = await adapter.sendMagicLink({
			email: 'person@example.com',
			emailRedirectTo: 'https://example.com/auth/callback'
		});
		expect(magic.ok).toBe(false);
		if (!magic.ok) {
			expect(magic.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}

		const password = await adapter.signInWithPassword({ email: 'person@example.com', password: 'secret' });
		expect(password.ok).toBe(false);
		if (!password.ok) {
			expect(password.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});

	it('signOut is no-op success for signed guest token', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });
		const signIn = await adapter.signInGuest();
		expect(signIn.ok).toBe(true);
		if (!signIn.ok) return;

		const result = await adapter.signOut(signIn.value.accessToken);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.success).toBe(true);
		}
	});

	it('rejects bare uuid signOut token', async () => {
		const adapter = createAuthAdapter({ env: makeEnv() });
		const result = await adapter.signOut('fca1e4e8-9a8e-4d67-bd87-cf8405917ca7');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
		}
	});

	it('revoke member session for valid clerk token', async () => {
		verifyTokenMock.mockResolvedValue({ sid: 'sess_123' });
		revokeSessionMock.mockResolvedValue({ id: 'sess_123' });
		const adapter = createAuthAdapter({ env: makeEnv() });

		const result = await adapter.signOut('member.jwt.token');
		expect(result.ok).toBe(true);
		expect(revokeSessionMock).toHaveBeenCalledWith('sess_123');
	});
});
