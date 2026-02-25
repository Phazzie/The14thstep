import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';

export type SessionKind = 'guest' | 'member';

const SESSION_KIND_COOKIE = 'app-session-kind';

function resolveAnonKey(env: NodeJS.ProcessEnv): string {
	return (
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
		env.SUPABASE_ANON_KEY?.trim() ??
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
		''
	);
}

function secureCookieFlag(env: NodeJS.ProcessEnv): boolean {
	return (env.NODE_ENV ?? '').trim() === 'production';
}

type CookieConfig = {
	path: string;
	httpOnly: boolean;
	sameSite: 'lax';
	secure: boolean;
};

function authCookieConfig(env: NodeJS.ProcessEnv): CookieConfig {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
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

export function clearAllAuthCookies(cookies: Cookies): void {
	clearSupabaseSessionCookies(cookies);
	clearSessionKindCookie(cookies);
}

export function createPublicSupabaseAuthClient(
	env: NodeJS.ProcessEnv = process.env
): SupabaseClient | null {
	const supabaseUrl = env.SUPABASE_URL?.trim() ?? '';
	const anonKey = resolveAnonKey(env);
	if (!supabaseUrl || !anonKey) {
		console.warn('public supabase auth client unavailable', {
			missingSupabaseUrl: !supabaseUrl,
			missingAnonKey: !anonKey
		});
		return null;
	}

	return createClient(supabaseUrl, anonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export function normalizeEmailToDisplayName(email: string | null | undefined): string {
	if (typeof email !== 'string') return 'Member';
	const normalized = email.trim();
	if (!normalized) return 'Member';
	const localPart = normalized.split('@')[0]?.trim();
	return localPart && localPart.length > 0 ? localPart : 'Member';
}
