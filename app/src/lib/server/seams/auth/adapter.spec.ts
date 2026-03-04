import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import { createAuthAdapter } from './adapter';

function toJwtWithExp(exp: number): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString(
		'base64url'
	);
	const payload = Buffer.from(JSON.stringify({ exp }), 'utf8').toString('base64url');
	return `${header}.${payload}.signature`;
}

describe('auth server adapter', () => {
	it('returns a validated auth session for a valid cookie token', async () => {
		const token = toJwtWithExp(1893456000);
		const getUser = vi.fn().mockResolvedValue({
			data: { user: { id: 'user-123', email: 'member@example.com' } },
			error: null
		});
		const adapter = createAuthAdapter({
			client: {
				auth: {
					getUser,
					admin: {
						signOut: vi.fn().mockResolvedValue({ data: null, error: null })
					}
				}
			}
		});

		const result = await adapter.getSession(`foo=bar; sb-access-token=${token}`);

		expect(result.ok).toBe(true);
		expect(getUser).toHaveBeenCalledWith(token);
		if (result.ok) {
			expect(result.value).toEqual({
				userId: 'user-123',
				email: 'member@example.com',
				expiresAt: '2030-01-01T00:00:00.000Z'
			});
		}
	});

	it('maps upstream auth failures to unauthorized', async () => {
		const token = toJwtWithExp(1893456000);
		const adapter = createAuthAdapter({
			client: {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: null },
						error: { status: 401, code: 'bad_jwt', message: 'Invalid JWT' }
					}),
					admin: {
						signOut: vi.fn().mockResolvedValue({ data: null, error: null })
					}
				}
			}
		});

		const result = await adapter.getSession(`sb-access-token=${token}`);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
		}
	});

	it('rejects malformed inputs with INPUT_INVALID', async () => {
		const adapter = createAuthAdapter({
			client: {
				auth: {
					getUser: vi.fn(),
					admin: {
						signOut: vi.fn()
					}
				}
			}
		});

		const sessionResult = await adapter.getSession('');
		expect(sessionResult.ok).toBe(false);
		if (!sessionResult.ok) {
			expect(sessionResult.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}

		const signOutResult = await adapter.signOut('   ');
		expect(signOutResult.ok).toBe(false);
		if (!signOutResult.ok) {
			expect(signOutResult.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});

	it('returns unauthorized when chunked auth cookies are incomplete', async () => {
		const token = toJwtWithExp(1893456000);
		const getUser = vi.fn();
		const adapter = createAuthAdapter({
			client: {
				auth: {
					getUser,
					admin: {
						signOut: vi.fn().mockResolvedValue({ data: null, error: null })
					}
				}
			}
		});

		const result = await adapter.getSession(`sb-project-auth-token.0=${token.slice(0, 12)}`);

		expect(result.ok).toBe(false);
		expect(getUser).not.toHaveBeenCalled();
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
			expect(result.error.details).toMatchObject({ reason: 'session_token_missing' });
		}
	});

	it('reassembles chunked auth cookies and resolves session', async () => {
		const token = toJwtWithExp(1893456000);
		const getUser = vi.fn().mockResolvedValue({
			data: { user: { id: 'user-456', email: 'chunked@example.com' } },
			error: null
		});
		const adapter = createAuthAdapter({
			client: {
				auth: {
					getUser,
					admin: {
						signOut: vi.fn().mockResolvedValue({ data: null, error: null })
					}
				}
			}
		});
		const split = Math.floor(token.length / 2);
		const cookieHeader = `sb-project-auth-token.0=${token.slice(0, split)}; sb-project-auth-token.1=${token.slice(split)}`;

		const result = await adapter.getSession(cookieHeader);

		expect(result.ok).toBe(true);
		expect(getUser).toHaveBeenCalledWith(token);
		if (result.ok) {
			expect(result.value.userId).toBe('user-456');
			expect(result.value.email).toBe('chunked@example.com');
		}
	});
});
