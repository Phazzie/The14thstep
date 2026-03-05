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

	it('maps guest sign-in to auth payload', async () => {
		const adapter = createAuthAdapter({
			publicClient: {
				auth: {
					signInAnonymously: vi.fn().mockResolvedValue({
						data: {
							session: {
								access_token: 'access',
								refresh_token: 'refresh',
								user: { id: 'guest-1', email: 'guest@example.com', user_metadata: { role: 'guest' } }
							},
							user: { id: 'guest-1', email: 'guest@example.com', user_metadata: { role: 'guest' } }
						},
						error: null
					}),
					signInWithOtp: vi.fn(),
					signInWithPassword: vi.fn(),
					exchangeCodeForSession: vi.fn(),
					verifyOtp: vi.fn()
				}
			}
		});

		const result = await adapter.signInGuest();
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toMatchObject({
				userId: 'guest-1',
				email: 'guest@example.com',
				accessToken: 'access',
				refreshToken: 'refresh'
			});
		}
	});

	it('maps magic-link throttling to RATE_LIMITED', async () => {
		const adapter = createAuthAdapter({
			publicClient: {
				auth: {
					signInAnonymously: vi.fn(),
					signInWithOtp: vi.fn().mockResolvedValue({
						data: {},
						error: { status: 429, code: 'over_request_rate_limit', message: 'Too many requests' }
					}),
					signInWithPassword: vi.fn(),
					exchangeCodeForSession: vi.fn(),
					verifyOtp: vi.fn()
				}
			}
		});

		const result = await adapter.sendMagicLink({
			email: 'person@example.com',
			emailRedirectTo: 'https://example.com/auth/callback'
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.RATE_LIMITED);
			expect(result.error.details).toMatchObject({ upstreamStatus: 429 });
		}
	});

	it('maps email send rate-limit code to RATE_LIMITED even without numeric status', async () => {
		const adapter = createAuthAdapter({
			publicClient: {
				auth: {
					signInAnonymously: vi.fn(),
					signInWithOtp: vi.fn().mockResolvedValue({
						data: {},
						error: { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }
					}),
					signInWithPassword: vi.fn(),
					exchangeCodeForSession: vi.fn(),
					verifyOtp: vi.fn()
				}
			}
		});

		const result = await adapter.sendMagicLink({
			email: 'person@example.com',
			emailRedirectTo: 'https://example.com/auth/callback'
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.RATE_LIMITED);
			expect(result.error.details).toMatchObject({
				upstreamCode: 'over_email_send_rate_limit',
				upstreamMessage: 'email rate limit exceeded'
			});
		}
	});

	it('maps password sign-in failures to unauthorized with upstream details', async () => {
		const adapter = createAuthAdapter({
			publicClient: {
				auth: {
					signInAnonymously: vi.fn(),
					signInWithOtp: vi.fn(),
					signInWithPassword: vi.fn().mockResolvedValue({
						data: { session: null, user: null },
						error: { status: 401, code: 'invalid_credentials', message: 'Invalid login credentials' }
					}),
					exchangeCodeForSession: vi.fn(),
					verifyOtp: vi.fn()
				}
			}
		});

		const result = await adapter.signInWithPassword({
			email: 'person@example.com',
			password: 'secret'
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
			expect(result.error.details).toMatchObject({
				upstreamCode: 'invalid_credentials',
				upstreamStatus: 401,
				upstreamMessage: 'Invalid login credentials'
			});
		}
	});

	it('maps otp_expired without a status to UNAUTHORIZED', async () => {
		const verifyOtp = vi.fn().mockResolvedValue({
			data: { session: null, user: null },
			error: { code: 'otp_expired', message: 'Token has expired or is invalid' }
		});
		const adapter = createAuthAdapter({
			publicClient: {
				auth: {
					signInAnonymously: vi.fn(),
					signInWithOtp: vi.fn(),
					signInWithPassword: vi.fn(),
					exchangeCodeForSession: vi.fn(),
					verifyOtp
				}
			}
		});

		const result = await adapter.completeAuthCallback({
			code: null,
			tokenHash: 't1',
			otpType: 'magiclink'
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UNAUTHORIZED);
			expect(result.error.details).toMatchObject({ upstreamCode: 'otp_expired' });
		}
	});

	it('falls back to otp verification during callback completion', async () => {
		const exchangeCodeForSession = vi.fn().mockResolvedValue({
			data: { session: null, user: null },
			error: { status: 400, code: 'bad_code', message: 'invalid code' }
		});
		const verifyOtp = vi.fn().mockResolvedValue({
			data: {
				session: {
					access_token: 'access',
					refresh_token: 'refresh',
					user: { id: 'user-1', email: 'user@example.com', user_metadata: { name: 'User' } }
				},
				user: { id: 'user-1', email: 'user@example.com', user_metadata: { name: 'User' } }
			},
			error: null
		});
		const adapter = createAuthAdapter({
			publicClient: {
				auth: {
					signInAnonymously: vi.fn(),
					signInWithOtp: vi.fn(),
					signInWithPassword: vi.fn(),
					exchangeCodeForSession,
					verifyOtp
				}
			}
		});

		const result = await adapter.completeAuthCallback({
			code: 'abc123',
			tokenHash: 't1',
			otpType: 'magiclink'
		});
		expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
		expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 't1', type: 'magiclink' });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.userId).toBe('user-1');
		}
	});
});
