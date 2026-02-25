import {
	clearAllAuthCookies,
	createPublicSupabaseAuthClient,
	normalizeEmailToDisplayName,
	setSessionKindCookie,
	setSupabaseSessionCookies
} from '$lib/server/auth/public-auth';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function toRedirect(code: string): never {
	throw redirect(303, `/?auth=${encodeURIComponent(code)}`);
}

function resolveDisplayNameFromAuthUser(user: User | null): string {
	const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
	const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
	if (fullName) return fullName;
	const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
	if (name) return name;
	return normalizeEmailToDisplayName(user?.email ?? null);
}

function toEmailOtpType(value: string | null): EmailOtpType | null {
	if (
		value === 'signup' ||
		value === 'invite' ||
		value === 'magiclink' ||
		value === 'recovery' ||
		value === 'email_change' ||
		value === 'email'
	) {
		return value;
	}
	return null;
}

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const providerError = url.searchParams.get('error');
	if (providerError) {
		console.warn('auth callback provider error', {
			error: providerError,
			description: url.searchParams.get('error_description') ?? null
		});
		return toRedirect('magic-link-cancelled');
	}

	const authClient = createPublicSupabaseAuthClient();
	if (!authClient) {
		console.warn('auth callback missing public auth config');
		return toRedirect('auth-failed');
	}

	const code = url.searchParams.get('code');
	const tokenHash = url.searchParams.get('token_hash');
	const rawType = url.searchParams.get('type');
	let session: { access_token: string; refresh_token: string } | null = null;
	let user: User | null = null;

	if (code) {
		const exchange = await authClient.auth.exchangeCodeForSession(code);
		if (exchange.error) {
			console.warn('auth callback code exchange failed', {
				status: exchange.error.status ?? null,
				code: exchange.error.code ?? null
			});
			return toRedirect('auth-failed');
		}
		session = exchange.data.session;
		user = exchange.data.user ?? exchange.data.session?.user ?? null;
	} else if (tokenHash) {
		const otpType = toEmailOtpType(rawType);
		if (!otpType) {
			console.warn('auth callback token_hash missing/invalid type', { type: rawType ?? null });
			return toRedirect('auth-failed');
		}

		const verify = await authClient.auth.verifyOtp({
			token_hash: tokenHash,
			type: otpType
		});
		if (verify.error) {
			console.warn('auth callback otp verify failed', {
				status: verify.error.status ?? null,
				code: verify.error.code ?? null
			});
			return toRedirect('auth-failed');
		}
		session = verify.data.session;
		user = verify.data.user ?? verify.data.session?.user ?? null;
	} else {
		console.warn('auth callback missing completion params');
		return toRedirect('auth-failed');
	}

	if (!session || !user?.id) {
		console.warn('auth callback missing session or user after completion');
		return toRedirect('auth-failed');
	}

	setSupabaseSessionCookies(cookies, session);
	setSessionKindCookie(cookies, 'member');

	const profileResult = await locals.seams.database.ensureUserProfile({
		id: user.id,
		displayName: resolveDisplayNameFromAuthUser(user),
		cleanTime: null,
		isAnonymous: false
	});

	if (!profileResult.ok) {
		console.warn('auth callback profile bootstrap failed', { code: profileResult.error.code });
		clearAllAuthCookies(cookies);
		return toRedirect('auth-failed');
	}

	return toRedirect('signed-in');
};
