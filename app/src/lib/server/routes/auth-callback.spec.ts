import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok, SeamErrorCodes } from '$lib/core/seam';

const { createClientMock } = vi.hoisted(() => ({
	createClientMock: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
	createClient: createClientMock
}));

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

function createAuthClientStub() {
	return {
		auth: {
			exchangeCodeForSession: vi.fn(),
			verifyOtp: vi.fn()
		}
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	process.env.SUPABASE_URL = 'https://example.supabase.co';
	process.env.SUPABASE_ANON_KEY = 'anon-key';
});

describe('auth callback route', () => {
	it('redirects canceled/error callbacks to friendly notice', async () => {
		const { cookies } = createCookieJar();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?error=access_denied'),
				cookies,
				locals: { seams: { database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=magic-link-cancelled');
			return true;
		});
	});

	it('completes code-exchange callback, bootstraps profile, and redirects signed-in', async () => {
		const authClient = createAuthClientStub();
		authClient.auth.exchangeCodeForSession.mockResolvedValue({
			data: {
				session: {
					access_token: 'access',
					refresh_token: 'refresh',
					user: { id: 'user-1', email: 'john@example.com', user_metadata: {} }
				},
				user: { id: 'user-1', email: 'john@example.com', user_metadata: {} }
			},
			error: null
		});
		createClientMock.mockReturnValue(authClient as never);

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
				url: new URL('http://localhost/auth/callback?code=abc123'),
				cookies,
				locals: { seams: { database: { ensureUserProfile } } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=signed-in');
			return true;
		});

		expect(ensureUserProfile).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1', isAnonymous: false })
		);
		expect(calls.set).toEqual(expect.arrayContaining(['sb-access-token', 'sb-refresh-token', 'app-session-kind']));
	});

	it('clears cookies and redirects on profile bootstrap failure after callback auth', async () => {
		const authClient = createAuthClientStub();
		authClient.auth.exchangeCodeForSession.mockResolvedValue({
			data: {
				session: {
					access_token: 'access',
					refresh_token: 'refresh',
					user: { id: 'user-1', email: 'john@example.com', user_metadata: {} }
				},
				user: { id: 'user-1', email: 'john@example.com', user_metadata: {} }
			},
			error: null
		});
		createClientMock.mockReturnValue(authClient as never);

		const { cookies, calls } = createCookieJar();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?code=abc123'),
				cookies,
				locals: {
					seams: {
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
});

