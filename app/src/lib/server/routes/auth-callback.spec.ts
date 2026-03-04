import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok, SeamErrorCodes } from '$lib/core/seam';

import { GET } from '../../../routes/auth/callback/+server';

function createCookieJar() {
	const store = new Map<string, string>();
	const calls = { set: [] as string[], delete: [] as string[] };
	return {
		cookies: {
			get(name: string) {
				return store.get(name);
			},
			set(name: string, value: string) {
				store.set(name, value);
				calls.set.push(name);
			},
			delete(name: string) {
				store.delete(name);
				calls.delete.push(name);
			}
		},
		calls
	};
}

function expectRedirectLike(error: unknown, status: number, location: string) {
	expect(error).toMatchObject({ status, location });
}

function createAuthSeamStub() {
	return {
		getSession: vi.fn(),
		signInGuest: vi.fn(),
		sendMagicLink: vi.fn(),
		signInWithPassword: vi.fn(),
		completeAuthCallback: vi.fn(),
		signOut: vi.fn()
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('auth callback route', () => {
	it('redirects canceled/error callbacks to friendly notice', async () => {
		const { cookies } = createCookieJar();
		const auth = createAuthSeamStub();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?error=access_denied'),
				cookies,
				locals: { seams: { auth, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=magic-link-cancelled');
			return true;
		});

		expect(auth.completeAuthCallback).not.toHaveBeenCalled();
	});

	it('completes callback, bootstraps profile, and redirects signed-in', async () => {
		const auth = createAuthSeamStub();
		auth.completeAuthCallback.mockResolvedValue(
			ok({
				userId: 'user-1',
				email: 'john@example.com',
				accessToken: 'access',
				refreshToken: 'refresh',
				userMetadata: { name: 'john' }
			})
		);

		const { cookies, calls } = createCookieJar();
		const ensureUserProfile = vi.fn(async () =>
			ok({
				id: 'user-1',
				displayName: 'john',
				cleanTime: null,
				meetingCount: 0,
				firstMeetingAt: null,
				lastMeetingAt: null
			})
		);

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?code=abc123&token_hash=t1&type=magiclink'),
				cookies,
				locals: { seams: { auth, database: { ensureUserProfile } } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=signed-in');
			return true;
		});

		expect(auth.completeAuthCallback).toHaveBeenCalledWith({
			code: 'abc123',
			tokenHash: 't1',
			otpType: 'magiclink'
		});
		expect(ensureUserProfile).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1', isAnonymous: false })
		);
		expect(calls.set).toEqual(expect.arrayContaining(['sb-access-token', 'sb-refresh-token', 'app-session-kind']));
	});

	it('clears cookies and redirects on profile bootstrap failure after callback auth', async () => {
		const auth = createAuthSeamStub();
		auth.completeAuthCallback.mockResolvedValue(
			ok({
				userId: 'user-1',
				email: 'john@example.com',
				accessToken: 'access',
				refreshToken: 'refresh',
				userMetadata: {}
			})
		);

		const { cookies, calls } = createCookieJar();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?code=abc123'),
				cookies,
				locals: {
					seams: {
						auth,
						database: {
							ensureUserProfile: vi.fn(async () =>
								err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'down')
							)
						}
					}
				}
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=auth-failed');
			return true;
		});

		expect(calls.delete).toEqual(expect.arrayContaining(['sb-access-token', 'sb-refresh-token', 'app-session-kind']));
	});

	it('redirects magic-link-cancelled when seam callback completion is unauthorized', async () => {
		const auth = createAuthSeamStub();
		auth.completeAuthCallback.mockResolvedValue(
			err(SeamErrorCodes.UNAUTHORIZED, 'bad callback', { upstreamMessage: 'bad code' })
		);

		const { cookies } = createCookieJar();
		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?code=abc123'),
				cookies,
				locals: { seams: { auth, database: { ensureUserProfile: vi.fn() } } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=magic-link-cancelled');
			return true;
		});
	});

	it('redirects magic-link-cancelled when completion params are missing', async () => {
		const auth = createAuthSeamStub();
		auth.completeAuthCallback.mockResolvedValue(
			err(SeamErrorCodes.INPUT_INVALID, 'missing callback params')
		);
		const { cookies } = createCookieJar();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback'),
				cookies,
				locals: { seams: { auth, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=magic-link-cancelled');
			return true;
		});
	});

	it('redirects auth-failed when callback completion hits upstream failures', async () => {
		const auth = createAuthSeamStub();
		auth.completeAuthCallback.mockResolvedValue(
			err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'provider unavailable')
		);
		const { cookies } = createCookieJar();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?code=abc123'),
				cookies,
				locals: { seams: { auth, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=auth-failed');
			return true;
		});
	});
});
