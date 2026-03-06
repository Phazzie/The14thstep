import { beforeEach, describe, expect, it } from 'vitest';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';

import { GET } from '../../../routes/auth/callback/+server';

function createCookieJar() {
	const store = new Map<string, string>();
	return {
		cookies: {
			get(name: string) {
				return store.get(name);
			},
			set(name: string, value: string) {
				store.set(name, value);
			},
			delete(name: string) {
				store.delete(name);
			}
		}
	};
}

function expectRedirectLike(error: unknown, status: number, location: string) {
	expect(error).toMatchObject({ status, location });
}

beforeEach(() => {
	// no-op placeholder for future callback state tests
});

describe('auth callback route', () => {
	it('redirects provider errors to auth-failed notice', async () => {
		const { cookies } = createCookieJar();

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?error=access_denied'),
				cookies,
				locals: { seams: { auth: {}, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=auth-failed');
			return true;
		});
	});

	it('redirects successful callbacks to signed-in notice', async () => {
		const { cookies } = createCookieJar();
		cookies.set('app-session-kind', 'guest');
		cookies.set('sb-access-token', 'legacy-token');
		const auth = {
			getSession: async () =>
				ok({
					userId: '9fce0f33-9200-4e7b-b5f3-9b01f674264f',
					email: 'member@local.invalid',
					expiresAt: new Date(Date.now() + 60_000).toISOString()
				})
		};

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?state=s1'),
				cookies,
				request: new Request('http://localhost/auth/callback?state=s1', {
					headers: { cookie: 'app-session-kind=guest; sb-access-token=legacy-token' }
				}),
				locals: { seams: { auth, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=signed-in');
			return true;
		});
		expect(cookies.get('app-session-kind')).toBe('member');
		expect(cookies.get('sb-access-token')).toBeUndefined();
	});

	it('redirects to auth-failed when callback has no valid session', async () => {
		const { cookies } = createCookieJar();
		const auth = {
			getSession: async () => err(SeamErrorCodes.UNAUTHORIZED, 'No active auth session')
		};

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?state=s1'),
				cookies,
				request: new Request('http://localhost/auth/callback?state=s1'),
				locals: { seams: { auth, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=auth-failed');
			return true;
		});
	});
});
