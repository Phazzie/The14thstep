import {
	clearAllAuthCookies,
	normalizeEmailToDisplayName,
	setSessionKindCookie,
	setSupabaseSessionCookies
} from '$lib/server/auth/public-auth';
import { SeamErrorCodes } from '$lib/core/seam';
import type { AuthCallbackOtpType, AuthSignInPayload } from '$lib/seams/auth/contract';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function toRedirect(code: string): never {
	throw redirect(303, `/?auth=${encodeURIComponent(code)}`);
}

function resolveDisplayNameFromAuthPayload(payload: AuthSignInPayload): string {
	const metadata = payload.userMetadata;
	const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
	if (fullName) return fullName;
	const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
	if (name) return name;
	return normalizeEmailToDisplayName(payload.email ?? null);
}

function toEmailOtpType(value: string | null): AuthCallbackOtpType | null {
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

function upstreamMessageFromSeamError(error: { message: string; details?: Record<string, unknown> }): string {
	const upstream = error.details?.upstreamMessage;
	if (typeof upstream === 'string' && upstream.trim().length > 0) {
		return upstream;
	}
	return error.message;
}

function noticeCodeFromCallbackError(code: string): string {
	if (code === SeamErrorCodes.INPUT_INVALID || code === SeamErrorCodes.UNAUTHORIZED) {
		return 'magic-link-cancelled';
	}
	return 'auth-failed';
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

	const completionResult = await locals.seams.auth.completeAuthCallback({
		code: url.searchParams.get('code'),
		tokenHash: url.searchParams.get('token_hash'),
		otpType: toEmailOtpType(url.searchParams.get('type'))
	});

	if (!completionResult.ok) {
		console.warn('auth callback completion failed', {
			code: completionResult.error.code,
			message: upstreamMessageFromSeamError(completionResult.error)
		});
		return toRedirect(noticeCodeFromCallbackError(completionResult.error.code));
	}

	setSupabaseSessionCookies(cookies, {
		access_token: completionResult.value.accessToken,
		refresh_token: completionResult.value.refreshToken
	});
	setSessionKindCookie(cookies, 'member');

	let profileResult;
	try {
		profileResult = await locals.seams.database.ensureUserProfile({
			id: completionResult.value.userId,
			displayName: resolveDisplayNameFromAuthPayload(completionResult.value),
			cleanTime: null,
			isAnonymous: false
		});
	} catch (error) {
		console.warn('auth callback profile bootstrap threw', {
			error: error instanceof Error ? error.message : String(error)
		});
		clearAllAuthCookies(cookies);
		return toRedirect('auth-failed');
	}

	if (!profileResult.ok) {
		console.warn('auth callback profile bootstrap failed', { code: profileResult.error.code });
		clearAllAuthCookies(cookies);
		return toRedirect('auth-failed');
	}

	return toRedirect('signed-in');
};
