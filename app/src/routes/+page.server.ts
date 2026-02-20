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
			return fail(401, { authMessage: 'Sign in failed. Check your email and password.' });
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
			const message =
				status === 400
					? 'Name, clean time, mood, and mind are required.'
					: 'Unable to start the meeting right now.';
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
