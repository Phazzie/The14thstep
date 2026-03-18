import { createMeeting } from '$lib/core/meeting';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	clearAllAuthCookies,
	readClerkSessionCookie,
	readSessionKindCookie,
	setSessionKindCookie,
	setSupabaseSessionCookies
} from '$lib/server/auth/public-auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function asTrimmedString(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

function statusFromSeamCode(code: string): number {
	if (code === SeamErrorCodes.INPUT_INVALID) return 400;
	if (code === SeamErrorCodes.UNAUTHORIZED) return 401;
	if (code === SeamErrorCodes.NOT_FOUND) return 404;
	if (code === SeamErrorCodes.RATE_LIMITED) return 429;
	if (code === SeamErrorCodes.UPSTREAM_UNAVAILABLE) return 503;
	return 500;
}

function meetingStartFailureMessage(status: number): string {
	if (status === 400) return 'Name, clean time, mood, and mind are required.';
	if (status === 401) return 'Your session is no longer valid. Sign in again or continue as guest.';
	if (status === 404) return 'We could not find that account. Sign in again or continue as guest.';
	if (status === 429) return 'Too many requests right now. Please try again in a minute.';
	if (status === 503) return 'Meeting services are temporarily unavailable. Please retry shortly.';
	return 'Unable to start the meeting right now.';
}

function noticeFromQuery(url: URL): { authNotice: string | null; authNoticeKind: 'success' | 'error' | null } {
	const code = url.searchParams.get('auth');
	if (code === 'signed-in') {
		return { authNotice: 'You are signed in.', authNoticeKind: 'success' };
	}
	if (code === 'signed-out') {
		return { authNotice: 'You are signed out.', authNoticeKind: 'success' };
	}
	if (code === 'auth-failed') {
		return { authNotice: "We couldn't complete sign-in. Try again.", authNoticeKind: 'error' };
	}
	return { authNotice: null, authNoticeKind: null };
}

function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
	return (env.NODE_ENV ?? '').trim() === 'production' || (env.VERCEL_ENV ?? '').trim() === 'production';
}

async function ensureProfileBootstrap(
	locals: App.Locals,
	input: { id: string; displayName: string; cleanTime?: string | null; isAnonymous: boolean }
): Promise<{ ok: true } | { ok: false; status: number; authMessage: string }> {
	const result = await locals.seams.database.ensureUserProfile({
		id: input.id,
		displayName: input.displayName,
		cleanTime: input.cleanTime ?? null,
		isAnonymous: input.isAnonymous
	});

	if (result.ok) return { ok: true };

	const status = statusFromSeamCode(result.error.code);
	const authMessage =
		status >= 500 ? "Couldn't finish account setup right now. Try again." : 'Unable to sign in right now.';
	return { ok: false, status, authMessage };
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const { authNotice, authNoticeKind } = noticeFromQuery(url);
	const sessionKindCookie = readSessionKindCookie(cookies);
	const sessionKind = locals.userId
		? sessionKindCookie === 'guest'
			? 'guest'
			: 'member'
		: sessionKindCookie;

	return {
		userId: locals.userId,
		sessionKind,
		authNotice,
		authNoticeKind,
		clerkPublishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '',
		clerkPublishableKeyConfigured: Boolean(process.env.PUBLIC_CLERK_PUBLISHABLE_KEY?.trim())
	};
};

export const actions: Actions = {
	continueGuest: async ({ cookies, locals }) => {
		const signInResult = await locals.seams.auth.signInGuest();
		if (!signInResult.ok) {
			const status = statusFromSeamCode(signInResult.error.code);
			return fail(status, {
				authMessage: "Couldn't start a guest session right now. Try again."
			});
		}

		setSupabaseSessionCookies(cookies, {
			access_token: signInResult.value.accessToken,
			refresh_token: signInResult.value.refreshToken
		});
		setSessionKindCookie(cookies, 'guest');

		const bootstrap = await ensureProfileBootstrap(locals, {
			id: signInResult.value.userId,
			displayName: 'Guest',
			cleanTime: null,
			isAnonymous: true
		});
		if (!bootstrap.ok) {
			clearAllAuthCookies(cookies);
			return fail(bootstrap.status, { authMessage: bootstrap.authMessage });
		}

		throw redirect(303, '/');
	},

	signOut: async ({ cookies, locals }) => {
		const memberToken = readClerkSessionCookie(cookies);
		const guestToken = cookies.get('sb-access-token')?.trim() ?? '';
		const sessionToken = memberToken || guestToken;
		if (sessionToken) {
			await locals.seams.auth.signOut(sessionToken);
		}

		clearAllAuthCookies(cookies);
		throw redirect(303, '/?auth=signed-out');
	},

	join: async ({ request, locals, cookies }) => {
		const formData = await request.formData();

		const userName = asTrimmedString(formData.get('userName'));
		const cleanTime = asTrimmedString(formData.get('cleanTime'));
		const mood = asTrimmedString(formData.get('mood'));
		const mind = asTrimmedString(formData.get('mind'));
		const submittedUserId = asTrimmedString(formData.get('userId'));
		const listeningOnly = formData.get('listeningOnly') === 'on';
		const probeUserId = isProductionRuntime() ? '' : process.env.PROBE_USER_ID?.trim() || '';
		const userId = locals.userId ?? probeUserId;

		const values = {
			userName,
			cleanTime,
			mood,
			mind,
			userId: submittedUserId,
			listeningOnly
		};

		if (!userId) {
			return fail(400, { message: 'Continue as guest or sign in before starting a meeting.', values });
		}
		if (!userName || !cleanTime || !mind || !mood) {
			return fail(400, { message: 'Name, clean time, mood, and mind are required.', values });
		}

		const profileLookup = await locals.seams.database.getUserById(userId);
		if (!profileLookup.ok) {
			if (profileLookup.error.code === SeamErrorCodes.NOT_FOUND) {
				const sessionKind = readSessionKindCookie(cookies);
				const bootstrap = await locals.seams.database.ensureUserProfile({
					id: userId,
					displayName: sessionKind === 'guest' ? 'Guest' : 'Member',
					cleanTime: null,
					isAnonymous: sessionKind === 'guest'
				});
				if (!bootstrap.ok) {
					return fail(statusFromSeamCode(bootstrap.error.code), {
						message: 'Unable to start the meeting right now.',
						values
					});
				}
			} else {
				return fail(statusFromSeamCode(profileLookup.error.code), {
					message: 'Unable to start the meeting right now.',
					values
				});
			}
		}

		const result = await createMeeting(
			{
				database: locals.seams.database,
				grokAi: locals.seams.grokAi
			},
			{
				userId,
				topic: mind,
				userMood: mood,
				listeningOnly
			}
		);

		if (!result.ok) {
			const status = statusFromSeamCode(result.error.code);
			console.warn(
				`[meeting.join] createMeeting failed code=${result.error.code} status=${status} message=${result.error.message}`
			);
			const message = meetingStartFailureMessage(status);
			return fail(status, { message, values });
		}

		const query = new URLSearchParams({
			name: userName,
			cleanTime,
			mood,
			mind,
			listen: listeningOnly ? '1' : '0'
		});
		throw redirect(303, `/meeting/${result.value.id}?${query.toString()}`);
	}
};
