import { createMeeting } from '$lib/core/meeting';
import { SeamErrorCodes } from '$lib/core/seam';
import { createClient } from '@supabase/supabase-js';
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

function resolveAnonKey(env: NodeJS.ProcessEnv): string {
	return (
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
		env.SUPABASE_ANON_KEY?.trim() ??
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
		''
	);
}

function maskEmail(email: string): string {
	const [local, domain] = email.split('@');
	if (!domain) return '[invalid-email]';
	if (local.length <= 2) return `**@${domain}`;
	return `${local.slice(0, 2)}***@${domain}`;
}

function authFailureMessage(rawMessage: string | undefined): string {
	const normalized = rawMessage?.toLowerCase() ?? '';
	if (normalized.includes('invalid login credentials')) {
		return 'Sign in failed. Double-check your email and password.';
	}
	if (normalized.includes('email not confirmed')) {
		return 'Sign in failed. Confirm your email first, then try again.';
	}
	if (normalized.includes('expired')) {
		return 'Sign in failed. Your sign-in link expired. Request a new one.';
	}
	return 'Sign in failed. Check your credentials and try again.';
}

function meetingStartFailureMessage(status: number): string {
	if (status === 400) return 'Name, clean time, mood, and mind are required.';
	if (status === 401) return 'Your session is no longer valid. Sign in again or provide a user ID.';
	if (status === 404) return 'We could not find that account. Sign in again or provide a valid user ID.';
	if (status === 429) return 'Too many requests right now. Please try again in a minute.';
	if (status === 503) return 'Meeting services are temporarily unavailable. Please retry shortly.';
	return 'Unable to start the meeting right now.';
}

export const load: PageServerLoad = async ({ locals }) => {
	return {
		userId: locals.userId
	};
};

export const actions: Actions = {
	signIn: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = asTrimmedString(formData.get('email'));
		const password = asTrimmedString(formData.get('password'));

		if (!email || !password) {
			return fail(400, { authMessage: 'Email and password are required.' });
		}

		const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? '';
		const anonKey = resolveAnonKey(process.env);
		if (!supabaseUrl || !anonKey) {
			return fail(500, { authMessage: 'Auth is not configured on this environment.' });
		}

		const authClient = createClient(supabaseUrl, anonKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const signInResult = await authClient.auth.signInWithPassword({
			email,
			password
		});
		if (signInResult.error || !signInResult.data.session) {
			console.warn(
				`[auth.signIn] failed email=${maskEmail(email)} code=${signInResult.error?.code ?? 'unknown'} status=${signInResult.error?.status ?? 'unknown'} message=${signInResult.error?.message ?? 'missing_session'}`
			);
			return fail(401, { authMessage: authFailureMessage(signInResult.error?.message) });
		}

		const secure = process.env.NODE_ENV === 'production';
		cookies.set('sb-access-token', signInResult.data.session.access_token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure
		});
		if (signInResult.data.session.refresh_token) {
			cookies.set('sb-refresh-token', signInResult.data.session.refresh_token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure
			});
		}

		throw redirect(303, '/');
	},

	signOut: async ({ cookies, locals }) => {
		const accessToken = cookies.get('sb-access-token');
		if (accessToken) {
			await locals.seams.auth.signOut(accessToken);
		}

		cookies.delete('sb-access-token', { path: '/' });
		cookies.delete('sb-refresh-token', { path: '/' });
		throw redirect(303, '/');
	},

	join: async ({ request, locals }) => {
		const formData = await request.formData();

		const userName = asTrimmedString(formData.get('userName'));
		const cleanTime = asTrimmedString(formData.get('cleanTime'));
		const mood = asTrimmedString(formData.get('mood'));
		const mind = asTrimmedString(formData.get('mind'));
		const submittedUserId = asTrimmedString(formData.get('userId'));
		const listeningOnly = formData.get('listeningOnly') === 'on';
		const fallbackUserId = submittedUserId || process.env.PROBE_USER_ID?.trim() || '';
		const userId = locals.userId ?? fallbackUserId;

		const values = {
			userName,
			cleanTime,
			mood,
			mind,
			userId: submittedUserId,
			listeningOnly
		};

		if (!userId) {
			return fail(400, { message: 'A user ID is required to start a meeting.', values });
		}
		if (!userName || !cleanTime || !mind || !mood) {
			return fail(400, { message: 'Name, clean time, mood, and mind are required.', values });
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
