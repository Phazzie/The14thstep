import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';

const { createClientMock, createMeetingMock } = vi.hoisted(() => ({
	createClientMock: vi.fn(),
	createMeetingMock: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
	createClient: createClientMock
}));

vi.mock('$lib/core/meeting', () => ({
	createMeeting: createMeetingMock
}));

import { actions, load } from '../../../routes/+page.server';

type CookieCall = { name: string; value?: string; options?: Record<string, unknown> };

function createCookieJar() {
	const store = new Map<string, string>();
	const calls = { set: [] as CookieCall[], delete: [] as CookieCall[] };
	return {
		cookies: {
			get(name: string) {
				return store.get(name);
			},
			set(name: string, value: string, options?: Record<string, unknown>) {
				store.set(name, value);
				calls.set.push({ name, value, options });
			},
			delete(name: string, options?: Record<string, unknown>) {
				store.delete(name);
				calls.delete.push({ name, options });
			}
		},
		calls,
		store
	};
}

function expectRedirectLike(error: unknown, status: number, location: string) {
	expect(error).toMatchObject({ status, location });
}

function makeRequest(form: Record<string, string>) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(form)) {
		formData.set(key, value);
	}
	return { formData: async () => formData } as Request;
}

function createAuthClientStub() {
	return {
		auth: {
			signInAnonymously: vi.fn(),
			signInWithOtp: vi.fn(),
			signInWithPassword: vi.fn()
		}
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	process.env.SUPABASE_URL = 'https://example.supabase.co';
	process.env.SUPABASE_ANON_KEY = 'anon-key';
	delete process.env.CANONICAL_ORIGIN;
	delete process.env.PUBLIC_APP_ORIGIN;
	delete process.env.PUBLIC_SITE_URL;
	delete process.env.NODE_ENV;
	delete process.env.VERCEL_ENV;
	delete process.env.PROBE_USER_ID;
});

describe('landing auth route actions', () => {
	it('load returns session kind and auth notice from query string', async () => {
		const { cookies } = createCookieJar();
		cookies.set('app-session-kind', 'guest');

		const result = await load({
			locals: { userId: 'user-1' },
			cookies,
			url: new URL('http://localhost/?auth=signed-in')
		} as never);

		expect((result as { sessionKind: string | null }).sessionKind).toBe('guest');
		expect((result as { authNotice: string | null }).authNotice).toBe('You are signed in.');
	});

	it('continueGuest creates anonymous session, bootstraps profile, and redirects', async () => {
		const { cookies, calls } = createCookieJar();
		const authClient = createAuthClientStub();
		authClient.auth.signInAnonymously.mockResolvedValue({
			data: {
				session: { access_token: 'access', refresh_token: 'refresh', user: { id: 'guest-1' } },
				user: { id: 'guest-1' }
			},
			error: null
		});
		createClientMock.mockReturnValue(authClient as never);

		const ensureUserProfile = vi.fn(async () => ok({
			id: 'guest-1',
			displayName: 'Guest',
			cleanTime: null,
			meetingCount: 0,
			firstMeetingAt: null,
			lastMeetingAt: null
		}));

		await expect(
			actions.continueGuest?.({
				cookies,
				locals: { seams: { database: { ensureUserProfile } } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/');
			return true;
		});

		expect(ensureUserProfile).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'guest-1', displayName: 'Guest', isAnonymous: true })
		);
		expect(calls.set.map((call) => call.name)).toEqual(
			expect.arrayContaining(['sb-access-token', 'sb-refresh-token', 'app-session-kind'])
		);
	});

	it('sendMagicLink returns success state and preserves email', async () => {
		const authClient = createAuthClientStub();
		authClient.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
		createClientMock.mockReturnValue(authClient as never);

		const result = await actions.sendMagicLink?.({
			request: makeRequest({ magicEmail: 'person@example.com' }),
			url: new URL('http://localhost/')
		} as never);

		expect(result).toMatchObject({
			authSuccess: 'If that email is registered, we sent a sign-in link.',
			authEmail: 'person@example.com'
		});
		expect(authClient.auth.signInWithOtp).toHaveBeenCalled();
	});

	it('sendMagicLink returns anti-enumeration success message for already-registered collisions', async () => {
		const authClient = createAuthClientStub();
		authClient.auth.signInWithOtp.mockResolvedValue({
			data: {},
			error: {
				status: 400,
				message: 'User already registered'
			}
		});
		createClientMock.mockReturnValue(authClient as never);

		const result = await actions.sendMagicLink?.({
			request: makeRequest({ magicEmail: 'person@example.com' }),
			url: new URL('http://localhost/')
		} as never);

		expect(result).toMatchObject({
			authSuccess: 'If that email is registered, we sent a sign-in link.',
			authEmail: 'person@example.com'
		});
	});

	it('sendMagicLink prefers canonical origin for callback redirect when configured', async () => {
		process.env.CANONICAL_ORIGIN = 'https://14thstep.com';
		const authClient = createAuthClientStub();
		authClient.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
		createClientMock.mockReturnValue(authClient as never);

		await actions.sendMagicLink?.({
			request: makeRequest({ magicEmail: 'person@example.com' }),
			url: new URL('https://weird-proxy.example/')
		} as never);

		expect(authClient.auth.signInWithOtp).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					emailRedirectTo: 'https://14thstep.com/auth/callback'
				})
			})
		);
	});

	it('signIn clears cookies and fails when profile bootstrap fails', async () => {
		const { cookies, calls } = createCookieJar();
		const authClient = createAuthClientStub();
		authClient.auth.signInWithPassword.mockResolvedValue({
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

		const result = await actions.signIn?.({
			request: makeRequest({ email: 'john@example.com', password: 'secret' }),
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
		} as never);

		expect(result).toMatchObject({
			status: 503,
			data: { authMessage: "Couldn't finish account setup right now. Try again." }
		});
		expect(calls.delete.map((call) => call.name)).toEqual(
			expect.arrayContaining(['sb-access-token', 'sb-refresh-token', 'app-session-kind'])
		);
	});

	it('signIn returns existing-account guidance for already-registered collisions', async () => {
		const authClient = createAuthClientStub();
		authClient.auth.signInWithPassword.mockResolvedValue({
			data: { session: null, user: null },
			error: { status: 400, message: 'User already registered' }
		});
		createClientMock.mockReturnValue(authClient as never);

		const result = await actions.signIn?.({
			request: makeRequest({ email: 'john@example.com', password: 'secret' }),
			cookies: createCookieJar().cookies,
			locals: { seams: { database: {} } }
		} as never);

		expect(result).toMatchObject({
			status: 401,
			data: {
				authMessage: 'That email already has an account. Try signing in or request a magic link.'
			}
		});
	});

	it('signIn returns method-collision guidance when provider reports linked identity', async () => {
		const authClient = createAuthClientStub();
		authClient.auth.signInWithPassword.mockResolvedValue({
			data: { session: null, user: null },
			error: { status: 400, message: 'Identity is already linked to a different provider' }
		});
		createClientMock.mockReturnValue(authClient as never);

		const result = await actions.signIn?.({
			request: makeRequest({ email: 'john@example.com', password: 'secret' }),
			cookies: createCookieJar().cookies,
			locals: { seams: { database: {} } }
		} as never);

		expect(result).toMatchObject({
			status: 401,
			data: {
				authMessage: 'That email is linked to a different sign-in method. Try another sign-in option.'
			}
		});
	});

	it('join bootstraps profile only when getUserById returns NOT_FOUND', async () => {
		const { cookies } = createCookieJar();
		cookies.set('app-session-kind', 'guest');

		const getUserById = vi.fn(async () => err(SeamErrorCodes.NOT_FOUND, 'missing'));
		const ensureUserProfile = vi.fn(async () =>
			ok({
				id: 'user-1',
				displayName: 'Guest',
				cleanTime: null,
				meetingCount: 0,
				firstMeetingAt: null,
				lastMeetingAt: null
			})
		);
		createMeetingMock.mockResolvedValue({ ok: true, value: { id: 'meeting-1' } });

		await expect(
			actions.join?.({
				request: makeRequest({
					userName: 'Sarah',
					cleanTime: '19 days',
					mood: 'anxious',
					mind: 'Trying not to run',
					listeningOnly: ''
				}),
				cookies,
				locals: {
					userId: 'user-1',
					seams: {
						database: { getUserById, ensureUserProfile },
						grokAi: {}
					}
				}
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, expect.stringContaining('/meeting/meeting-1?'));
			return true;
		});

		expect(getUserById).toHaveBeenCalledWith('user-1');
		expect(ensureUserProfile).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1', isAnonymous: true, displayName: 'Guest' })
		);
	});

	it('join ignores PROBE_USER_ID in production', async () => {
		process.env.PROBE_USER_ID = 'probe-user';
		process.env.NODE_ENV = 'production';

		const result = await actions.join?.({
			request: makeRequest({
				userName: 'Sarah',
				cleanTime: '19 days',
				mood: 'anxious',
				mind: 'Trying not to run',
				listeningOnly: ''
			}),
			cookies: createCookieJar().cookies,
			locals: { seams: { database: {}, grokAi: {} } }
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: { message: 'Continue as guest or sign in before starting a meeting.' }
		});
	});
});
