import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';

const { createMeetingMock } = vi.hoisted(() => ({
	createMeetingMock: vi.fn()
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
			getAll() {
				return Array.from(store.entries()).map(([name, value]) => ({ name, value }));
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
	delete process.env.NODE_ENV;
	delete process.env.VERCEL_ENV;
	delete process.env.PROBE_USER_ID;
	delete process.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
});

describe('landing auth route actions', () => {
	it('load returns member session kind when user is present', async () => {
		const { cookies } = createCookieJar();
		cookies.set('app-session-kind', 'guest');
		process.env.PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';

		const result = await load({
			locals: { userId: 'user-1' },
			cookies,
			url: new URL('http://localhost/?auth=signed-in')
		} as never);

		expect((result as { sessionKind: string | null }).sessionKind).toBe('guest');
		expect((result as { authNotice: string | null }).authNotice).toBe('You are signed in.');
		expect((result as { clerkPublishableKeyConfigured: boolean }).clerkPublishableKeyConfigured).toBe(true);
	});

	it('continueGuest creates disposable guest session and redirects', async () => {
		const { cookies, calls } = createCookieJar();
		const auth = createAuthSeamStub();
		auth.signInGuest.mockResolvedValue(
			ok({
				userId: 'fca1e4e8-9a8e-4d67-bd87-cf8405917ca7',
				email: null,
				accessToken: 'unused',
				refreshToken: '',
				userMetadata: { sessionKind: 'guest' }
			})
		);

		const ensureUserProfile = vi.fn(async () =>
			ok({
				id: 'fca1e4e8-9a8e-4d67-bd87-cf8405917ca7',
				displayName: 'Guest',
				cleanTime: null,
				meetingCount: 0,
				firstMeetingAt: null,
				lastMeetingAt: null
			})
		);

		await expect(
			actions.continueGuest?.({
				cookies,
				locals: { seams: { auth, database: { ensureUserProfile } } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/');
			return true;
		});

		expect(ensureUserProfile).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'fca1e4e8-9a8e-4d67-bd87-cf8405917ca7',
				displayName: 'Guest',
				isAnonymous: true
			})
		);
		expect(calls.set.map((call) => call.name)).toEqual(
			expect.arrayContaining(['sb-access-token', 'app-session-kind'])
		);
	});

	it('signOut revokes member token when present and clears cookies', async () => {
		const { cookies, calls, store } = createCookieJar();
		store.set('__session', 'member-token');
		const auth = createAuthSeamStub();
		auth.signOut.mockResolvedValue(ok({ success: true }));

		await expect(
			actions.signOut?.({ cookies, locals: { seams: { auth } } } as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=signed-out');
			return true;
		});

		expect(auth.signOut).toHaveBeenCalledWith('member-token');
		expect(calls.delete.map((call) => call.name)).toEqual(
			expect.arrayContaining(['sb-access-token', 'sb-refresh-token', '__session', 'app-session-kind'])
		);
	});

	it('signOut uses suffixed clerk session cookies when bare session cookie is absent', async () => {
		const { cookies, calls, store } = createCookieJar();
		store.set('__session_app', 'member-token');
		const auth = createAuthSeamStub();
		auth.signOut.mockResolvedValue(ok({ success: true }));

		await expect(
			actions.signOut?.({ cookies, locals: { seams: { auth } } } as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=signed-out');
			return true;
		});

		expect(auth.signOut).toHaveBeenCalledWith('member-token');
		expect(calls.delete.map((call) => call.name)).toEqual(
			expect.arrayContaining(['sb-access-token', 'sb-refresh-token', '__session', '__session_app', 'app-session-kind'])
		);
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
