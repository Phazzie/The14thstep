import { redirect } from '@sveltejs/kit';
import { clearSupabaseSessionCookies, setSessionKindCookie } from '$lib/server/auth/public-auth';
import type { RequestHandler } from './$types';

function toRedirect(code: string): never {
	throw redirect(303, `/?auth=${encodeURIComponent(code)}`);
}

export const GET: RequestHandler = async ({ url, cookies, request, locals }) => {
	const providerError = url.searchParams.get('error');
	if (providerError) {
		console.warn('auth callback provider error', {
			error: providerError,
			description: url.searchParams.get('error_description') ?? null
		});
		return toRedirect('auth-failed');
	}

	const cookieHeader = request.headers.get('cookie');
	const sessionResult = await locals.seams.auth.getSession(cookieHeader);
	if (!sessionResult.ok) {
		return toRedirect('auth-failed');
	}

	clearSupabaseSessionCookies(cookies);
	setSessionKindCookie(cookies, 'member');

	return toRedirect('signed-in');
};
