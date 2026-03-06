import { beforeEach, describe, expect, it } from 'vitest';

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

		await expect(
			GET({
				url: new URL('http://localhost/auth/callback?state=s1'),
				cookies,
				locals: { seams: { auth: {}, database: {} } }
			} as never)
		).rejects.toSatisfy((error: unknown) => {
			expectRedirectLike(error, 303, '/?auth=signed-in');
			return true;
		});
		expect(cookies.get('app-session-kind')).toBe('member');
		expect(cookies.get('sb-access-token')).toBeUndefined();
	});
});
