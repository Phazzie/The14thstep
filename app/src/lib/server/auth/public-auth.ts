import type { Session } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';

export type SessionKind = 'guest' | 'member';

const SESSION_KIND_COOKIE = 'app-session-kind';

function secureCookieFlag(env: NodeJS.ProcessEnv): boolean {
	return (env.NODE_ENV ?? '').trim() === 'production';
}

type CookieConfig = {
	path: string;
	httpOnly: boolean;
	sameSite: 'strict';
	secure: boolean;
};

function authCookieConfig(env: NodeJS.ProcessEnv): CookieConfig {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: secureCookieFlag(env)
	};
}

export function readSessionKindCookie(cookies: Cookies): SessionKind | null {
	const raw = cookies.get(SESSION_KIND_COOKIE);
	return raw === 'guest' || raw === 'member' ? raw : null;
}

export function setSessionKindCookie(
	cookies: Cookies,
	kind: SessionKind,
	env: NodeJS.ProcessEnv = process.env
): void {
	cookies.set(
		SESSION_KIND_COOKIE,
		kind,
		authCookieConfig(env)
	);
}

export function clearSessionKindCookie(cookies: Cookies): void {
	cookies.delete(SESSION_KIND_COOKIE, { path: '/' });
}

export function setSupabaseSessionCookies(
	cookies: Cookies,
	session: Pick<Session, 'access_token' | 'refresh_token'>,
	env: NodeJS.ProcessEnv = process.env
): void {
	const config = authCookieConfig(env);
	cookies.set('sb-access-token', session.access_token, config);
	if (session.refresh_token) {
		cookies.set('sb-refresh-token', session.refresh_token, config);
	}
}

export function clearSupabaseSessionCookies(cookies: Cookies): void {
	cookies.delete('sb-access-token', { path: '/' });
	cookies.delete('sb-refresh-token', { path: '/' });
}

export function clearClerkSessionCookie(cookies: Cookies): void {
	cookies.delete('__session', { path: '/' });
}

export function clearAllAuthCookies(cookies: Cookies): void {
	clearSupabaseSessionCookies(cookies);
	clearClerkSessionCookie(cookies);
	clearSessionKindCookie(cookies);
}

export function normalizeEmailToDisplayName(email: string | null | undefined): string {
	if (typeof email !== 'string') return 'Member';
	const normalized = email.trim();
	if (!normalized) return 'Member';
	const localPart = normalized.split('@')[0]?.trim();
	return localPart && localPart.length > 0 ? localPart : 'Member';
}
