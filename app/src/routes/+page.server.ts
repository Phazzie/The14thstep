import { createMeeting } from '$lib/core/meeting';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	clearAllAuthCookies,
	createPublicSupabaseAuthClient,
	normalizeEmailToDisplayName,
	readSessionKindCookie,
	setSessionKindCookie,
	setSupabaseSessionCookies
} from '$lib/server/auth/public-auth';
import { fail, redirect } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
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

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveDisplayNameFromAuthUser(user: User | null, fallbackEmail?: string | null): string {
	const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
	const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
	if (fullName) return fullName;
	const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
	if (name) return name;
	return normalizeEmailToDisplayName(user?.email ?? fallbackEmail ?? null);
}

function maskEmail(email: string): string {
	const [local, domain] = email.split('@');
	if (!domain) return '[invalid-email]';
	if (local.length <= 2) return `**@${domain}`;
	return `${local.slice(0, 2)}***@${domain}`;
}

function authFailureMessage(rawMessage: string | undefined): string {
	const normalized = rawMessage?.toLowerCase() ?? '';
	if (
		normalized.includes('already registered') ||
		normalized.includes('already exists') ||
		normalized.includes('user_already_exists')
	) {
		return 'That email already has an account. Try signing in or request a magic link.';
	}
	if (
		normalized.includes('identity is already linked') ||
		normalized.includes('provider') && normalized.includes('different')
	) {
		return 'That email is linked to a different sign-in method. Try another sign-in option.';
	}
	if (normalized.includes('invalid login credentials')) {
		return 'Sign in failed. Double-check your email and password, or request a magic link.';
	}
	if (normalized.includes('email not confirmed')) {
		return 'Sign in failed. Confirm your email first, then try again.';
	}
	if (normalized.includes('expired')) {
		return 'Sign in failed. Your sign-in link expired. Request a new one.';
	}
	return 'Sign in failed. Check your credentials and try again.';
}

function shouldReturnMagicLinkSoftSuccess(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const record = error as Record<string, unknown>;
	const rawMessage = typeof record.message === 'string' ? record.message.toLowerCase() : '';
	return (
		rawMessage.includes('already registered') ||
		rawMessage.includes('already exists') ||
		rawMessage.includes('user_already_exists') ||
		rawMessage.includes('identity is already linked')
	);
}

function meetingStartFailureMessage(status: number): string {
	if (status === 400) return 'Name, clean time, mood, and mind are required.';
	if (status === 401) return 'Your session is no longer valid. Sign in again or provide a user ID.';
	if (status === 404) return 'We could not find that account. Sign in again or provide a valid user ID.';
	if (status === 429) return 'Too many requests right now. Please try again in a minute.';
	if (status === 503) return 'Meeting services are temporarily unavailable. Please retry shortly.';
	return 'Unable to start the meeting right now.';
}

function noticeFromQuery(url: URL): { authNotice: string | null; authNoticeKind: 'success' | 'error' | null } {
	const code = url.searchParams.get('auth');
	if (code === 'magic-link-sent') {
		return {
			authNotice: 'If that email is registered, we sent a sign-in link.',
			authNoticeKind: 'success'
		};
	}
	if (code === 'signed-in') {
		return { authNotice: 'You are signed in.', authNoticeKind: 'success' };
	}
	if (code === 'auth-failed') {
		return { authNotice: "We couldn't complete sign-in. Try the link again.", authNoticeKind: 'error' };
	}
	if (code === 'magic-link-cancelled') {
		return { authNotice: 'Sign-in was canceled or expired. Request a new link.', authNoticeKind: 'error' };
	}
	return { authNotice: null, authNoticeKind: null };
}

function friendlyAuthConfigError() {
	return fail(500, { authMessage: 'Sign-in is not configured on this environment.' });
}

function isRateLimited(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const record = error as Record<string, unknown>;
	return record.status === 429 || record.code === 'over_request_rate_limit';
}

function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
	return (env.NODE_ENV ?? '').trim() === 'production' || (env.VERCEL_ENV ?? '').trim() === 'production';
}

function resolveCanonicalOrigin(url: URL, env: NodeJS.ProcessEnv = process.env): string | null {
	const configured =
		env.CANONICAL_ORIGIN?.trim() ??
		env.PUBLIC_APP_ORIGIN?.trim() ??
		env.PUBLIC_SITE_URL?.trim() ??
		'';
	if (configured) {
		try {
			return new URL(configured).origin;
		} catch {
			console.warn('invalid canonical origin config', { configured });
			return null;
		}
	}

	if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
		return url.origin;
	}

	if (!isProductionRuntime(env)) {
		return url.origin;
	}

	console.warn('missing canonical origin in production for magic link redirect', {
		origin: url.origin
	});
	return null;
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
	return {
		userId: locals.userId,
		sessionKind: readSessionKindCookie(cookies),
		authNotice,
		authNoticeKind
	};
};

export const actions: Actions = {
	continueGuest: async ({ cookies, locals }) => {
		const authClient = createPublicSupabaseAuthClient();
		if (!authClient) return friendlyAuthConfigError();

		const signInResult = await authClient.auth.signInAnonymously();
		const session = signInResult.data.session;
		const user = signInResult.data.user ?? session?.user ?? null;
		if (signInResult.error || !session || !user?.id) {
			return fail(503, { authMessage: "Couldn't start a guest session right now. Try again." });
		}

		setSupabaseSessionCookies(cookies, session);
		setSessionKindCookie(cookies, 'guest');

		const bootstrap = await ensureProfileBootstrap(locals, {
			id: user.id,
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

	sendMagicLink: async ({ request, url }) => {
		const formData = await request.formData();
		const email = asTrimmedString(formData.get('magicEmail'));

		if (!email || !isValidEmail(email)) {
			return fail(400, { authMessage: 'Enter a valid email address.', authEmail: email });
		}

		const authClient = createPublicSupabaseAuthClient();
		if (!authClient) {
			return fail(500, {
				authMessage: 'Sign-in is not configured on this environment.',
				authEmail: email
			});
		}

		const redirectOrigin = resolveCanonicalOrigin(url);
		if (!redirectOrigin) {
			return fail(500, {
				authMessage: "Couldn't send a sign-in link right now. Try again.",
				authEmail: email
			});
		}

		const sendResult = await authClient.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${redirectOrigin}/auth/callback`
			}
		});

		if (sendResult.error) {
			if (isRateLimited(sendResult.error)) {
				return fail(429, {
					authMessage: 'Please wait a minute before requesting another sign-in link.',
					authEmail: email
				});
			}
			if (shouldReturnMagicLinkSoftSuccess(sendResult.error)) {
				return {
					authSuccess: 'If that email is registered, we sent a sign-in link.',
					authEmail: email
				};
			}
			return fail(503, {
				authMessage: "Couldn't send a sign-in link right now. Try again.",
				authEmail: email
			});
		}

		return {
			authSuccess: 'If that email is registered, we sent a sign-in link.',
			authEmail: email
		};
	},

	signIn: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const email = asTrimmedString(formData.get('email'));
		const password = asTrimmedString(formData.get('password'));

		if (!email || !password) {
			return fail(400, { authMessage: 'Email and password are required.' });
		}

		const authClient = createPublicSupabaseAuthClient();
		if (!authClient) {
			return friendlyAuthConfigError();
		}

		const signInResult = await authClient.auth.signInWithPassword({
			email,
			password
		});
		const session = signInResult.data.session;
		const user = signInResult.data.user ?? session?.user ?? null;
		if (signInResult.error || !session || !user?.id) {
			console.warn(
				`[auth.signIn] failed email=${maskEmail(email)} code=${signInResult.error?.code ?? 'unknown'} status=${signInResult.error?.status ?? 'unknown'} message=${signInResult.error?.message ?? 'missing_session'}`
			);
			return fail(401, { authMessage: authFailureMessage(signInResult.error?.message) });
		}

		setSupabaseSessionCookies(cookies, session);
		setSessionKindCookie(cookies, 'member');

		const bootstrap = await ensureProfileBootstrap(locals, {
			id: user.id,
			displayName: resolveDisplayNameFromAuthUser(user, email),
			cleanTime: null,
			isAnonymous: false
		});
		if (!bootstrap.ok) {
			clearAllAuthCookies(cookies);
			return fail(bootstrap.status, { authMessage: bootstrap.authMessage });
		}

		throw redirect(303, '/');
	},

	signOut: async ({ cookies, locals }) => {
		const accessToken = cookies.get('sb-access-token');
		if (accessToken) {
			await locals.seams.auth.signOut(accessToken);
		}

		clearAllAuthCookies(cookies);
		throw redirect(303, '/');
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
