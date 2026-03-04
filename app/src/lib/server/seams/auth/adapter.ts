import { createClient } from '@supabase/supabase-js';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import type {
	AuthCallbackCompletionInput,
	AuthPort,
	AuthSession,
	AuthSignInPayload,
	MagicLinkInput,
	PasswordSignInInput
} from '$lib/seams/auth/contract';
import {
	validateAuthCallbackCompletionInput,
	validateAuthSession,
	validateAuthSignInPayload,
	validateCookiesInput,
	validateMagicLinkInput,
	validatePasswordSignInInput,
	validateSessionTokenInput
} from '$lib/seams/auth/contract';

interface SupabaseAuthErrorLike {
	code?: string;
	status?: number;
	message?: string;
	name?: string;
}

interface SupabaseAuthUserLike {
	id?: unknown;
	email?: unknown;
	user_metadata?: unknown;
}

interface SupabaseSessionLike {
	access_token?: unknown;
	refresh_token?: unknown;
	user?: SupabaseAuthUserLike | null;
}

interface SupabaseGetUserResponseLike {
	data: {
		user: SupabaseAuthUserLike | null;
	};
	error: SupabaseAuthErrorLike | null;
}

interface SupabaseSignOutResponseLike {
	data: null;
	error: SupabaseAuthErrorLike | null;
}

interface SupabaseSignInResponseLike {
	data: {
		session: SupabaseSessionLike | null;
		user: SupabaseAuthUserLike | null;
	};
	error: SupabaseAuthErrorLike | null;
}

interface SupabaseOtpResponseLike {
	data: unknown;
	error: SupabaseAuthErrorLike | null;
}

interface ServiceAuthClientLike {
	auth: {
		getUser(jwt: string): Promise<SupabaseGetUserResponseLike>;
		admin: {
			signOut(jwt: string): Promise<SupabaseSignOutResponseLike>;
		};
	};
}

interface PublicAuthClientLike {
	auth: {
		signInAnonymously(): Promise<SupabaseSignInResponseLike>;
		signInWithOtp(input: {
			email: string;
			options: { emailRedirectTo: string };
		}): Promise<SupabaseOtpResponseLike>;
		signInWithPassword(input: {
			email: string;
			password: string;
		}): Promise<SupabaseSignInResponseLike>;
		exchangeCodeForSession(code: string): Promise<SupabaseSignInResponseLike>;
		verifyOtp(input: {
			token_hash: string;
			type: string;
		}): Promise<SupabaseSignInResponseLike>;
	};
}

interface CreateAuthAdapterOptions {
	client?: ServiceAuthClientLike;
	serviceClient?: ServiceAuthClientLike;
	publicClient?: PublicAuthClientLike;
	env?: NodeJS.ProcessEnv;
}

const PROVIDER = 'supabase-auth';
const AUTHORIZED_STATUS_CODES = new Set([401, 403]);
const RATE_LIMITED_STATUS_CODES = new Set([429]);
const UNAVAILABLE_STATUS_CODES = new Set([408, 502, 503, 504]);
const INPUT_INVALID_STATUS_CODES = new Set([400, 422]);
const UNAUTHORIZED_UPSTREAM_CODES = new Set([
	'bad_jwt',
	'invalid_credentials',
	'no_authorization',
	'session_expired',
	'session_not_found',
	'user_not_found'
]);
const INPUT_INVALID_UPSTREAM_CODES = new Set(['bad_json', 'validation_failed']);
const RATE_LIMITED_UPSTREAM_CODES = new Set(['over_request_rate_limit']);
const UNAVAILABLE_UPSTREAM_CODES = new Set([
	'hook_timeout',
	'hook_timeout_after_retry',
	'request_timeout'
]);

function resolveAnonKey(env: NodeJS.ProcessEnv): string {
	return (
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
		env.SUPABASE_ANON_KEY?.trim() ??
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
		''
	);
}

function createDefaultServiceAuthClient(env: NodeJS.ProcessEnv = process.env): ServiceAuthClientLike | null {
	const supabaseUrl = env.SUPABASE_URL?.trim();
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

	if (!supabaseUrl || !serviceRoleKey) {
		return null;
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	}) as unknown as ServiceAuthClientLike;
}

function createDefaultPublicAuthClient(env: NodeJS.ProcessEnv = process.env): PublicAuthClientLike | null {
	const supabaseUrl = env.SUPABASE_URL?.trim();
	const anonKey = resolveAnonKey(env);

	if (!supabaseUrl || !anonKey) {
		return null;
	}

	return createClient(supabaseUrl, anonKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	}) as unknown as PublicAuthClientLike;
}

function normalizeCookieValue(rawValue: string): string {
	try {
		return decodeURIComponent(rawValue);
	} catch {
		return rawValue;
	}
}

function tryExtractTokenFromCookieValue(cookieValue: string): string | null {
	const normalized = normalizeCookieValue(cookieValue);

	try {
		const parsed = JSON.parse(normalized) as unknown;
		if (Array.isArray(parsed) && typeof parsed[0] === 'string' && validateSessionTokenInput(parsed[0])) {
			return parsed[0];
		}

		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'access_token' in parsed &&
			typeof parsed.access_token === 'string' &&
			validateSessionTokenInput(parsed.access_token)
		) {
			return parsed.access_token;
		}
	} catch {
		// Fall through to raw token parsing.
	}

	if (validateSessionTokenInput(normalized) && normalized.split('.').length === 3) {
		return normalized;
	}

	return null;
}

function parseCookies(cookieHeader: string): Map<string, string> {
	const cookies = new Map<string, string>();
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim();
		if (!trimmed) continue;

		const separatorIndex = trimmed.indexOf('=');
		if (separatorIndex < 0) continue;

		const name = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed.slice(separatorIndex + 1);
		if (!name) continue;
		cookies.set(name, value);
	}
	return cookies;
}

function extractSessionToken(cookieHeader: string): string | null {
	const cookies = parseCookies(cookieHeader);

	const directAccessToken = cookies.get('sb-access-token');
	if (typeof directAccessToken === 'string') {
		const token = tryExtractTokenFromCookieValue(directAccessToken);
		if (token) return token;
	}

	const chunkedAuthCookies = new Map<string, Map<number, string>>();

	for (const [name, value] of cookies) {
		const match = /^(sb-[^=;]+-auth-token)(?:\.(\d+))?$/.exec(name);
		if (!match) continue;

		const baseName = match[1];
		const chunkIndex = match[2] === undefined ? 0 : Number.parseInt(match[2], 10);
		if (!Number.isInteger(chunkIndex) || chunkIndex < 0) continue;

		const chunks = chunkedAuthCookies.get(baseName) ?? new Map<number, string>();
		chunks.set(chunkIndex, value);
		chunkedAuthCookies.set(baseName, chunks);
	}

	for (const chunks of chunkedAuthCookies.values()) {
		const ordered = [...chunks.entries()].sort((left, right) => left[0] - right[0]);
		const joinedValue = ordered.map((chunk) => chunk[1]).join('');
		const token = tryExtractTokenFromCookieValue(joinedValue);
		if (token) return token;
	}

	return null;
}

function parseJwtExpiresAtIso(token: string): string | null {
	const parts = token.split('.');
	if (parts.length < 2) return null;

	const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
	const paddedPayload = payloadPart.padEnd(Math.ceil(payloadPart.length / 4) * 4, '=');

	try {
		const payloadText = Buffer.from(paddedPayload, 'base64').toString('utf8');
		const payload = JSON.parse(payloadText) as unknown;
		if (
			typeof payload === 'object' &&
			payload !== null &&
			'exp' in payload &&
			typeof payload.exp === 'number' &&
			Number.isFinite(payload.exp)
		) {
			return new Date(payload.exp * 1000).toISOString();
		}
	} catch {
		return null;
	}

	return null;
}

function toUpstreamErrorDetails(error: SupabaseAuthErrorLike): Record<string, unknown> {
	return {
		provider: PROVIDER,
		upstreamCode: error.code,
		upstreamStatus: error.status,
		upstreamMessage: error.message
	};
}

function classifyUpstreamError(error: SupabaseAuthErrorLike) {
	const status = error.status;
	const code = typeof error.code === 'string' ? error.code : undefined;

	if (code && UNAUTHORIZED_UPSTREAM_CODES.has(code)) {
		return SeamErrorCodes.UNAUTHORIZED;
	}

	if (code && INPUT_INVALID_UPSTREAM_CODES.has(code)) {
		return SeamErrorCodes.INPUT_INVALID;
	}

	if (code && RATE_LIMITED_UPSTREAM_CODES.has(code)) {
		return SeamErrorCodes.RATE_LIMITED;
	}

	if (code && UNAVAILABLE_UPSTREAM_CODES.has(code)) {
		return SeamErrorCodes.UPSTREAM_UNAVAILABLE;
	}

	if (typeof status === 'number') {
		if (AUTHORIZED_STATUS_CODES.has(status)) return SeamErrorCodes.UNAUTHORIZED;
		if (RATE_LIMITED_STATUS_CODES.has(status)) return SeamErrorCodes.RATE_LIMITED;
		if (UNAVAILABLE_STATUS_CODES.has(status) || status >= 500) {
			return SeamErrorCodes.UPSTREAM_UNAVAILABLE;
		}
		if (INPUT_INVALID_STATUS_CODES.has(status)) return SeamErrorCodes.INPUT_INVALID;
		return SeamErrorCodes.UPSTREAM_ERROR;
	}

	return SeamErrorCodes.UPSTREAM_UNAVAILABLE;
}

function toMessage(rawMessage: unknown, fallback: string): string {
	if (typeof rawMessage !== 'string') return fallback;
	const normalized = rawMessage.trim();
	return normalized.length > 0 ? normalized : fallback;
}

function toErrorLike(value: unknown): SupabaseAuthErrorLike {
	if (typeof value !== 'object' || value === null) {
		return { message: undefined };
	}

	const errorRecord = value as Record<string, unknown>;
	return {
		code: typeof errorRecord.code === 'string' ? errorRecord.code : undefined,
		status: typeof errorRecord.status === 'number' ? errorRecord.status : undefined,
		message: typeof errorRecord.message === 'string' ? errorRecord.message : undefined,
		name: typeof errorRecord.name === 'string' ? errorRecord.name : undefined
	};
}

function mapThrownError(fallbackMessage: string, thrown: unknown) {
	const upstream = toErrorLike(thrown);
	return err(
		classifyUpstreamError(upstream),
		toMessage(upstream.message, fallbackMessage),
		toUpstreamErrorDetails(upstream)
	);
}

function toAuthSignInPayload(
	session: SupabaseSessionLike | null | undefined,
	user: SupabaseAuthUserLike | null | undefined
): AuthSignInPayload | null {
	if (!session) return null;

	const resolvedUser = user ?? session.user ?? null;
	const payload: AuthSignInPayload = {
		userId: typeof resolvedUser?.id === 'string' ? resolvedUser.id : '',
		email: typeof resolvedUser?.email === 'string' ? resolvedUser.email : null,
		accessToken: typeof session.access_token === 'string' ? session.access_token : '',
		refreshToken: typeof session.refresh_token === 'string' ? session.refresh_token : '',
		userMetadata:
			typeof resolvedUser?.user_metadata === 'object' && resolvedUser.user_metadata !== null
				? (resolvedUser.user_metadata as Record<string, unknown>)
				: {}
	};

	return validateAuthSignInPayload(payload) ? payload : null;
}

function configurationError() {
	return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Supabase auth adapter is not configured', {
		provider: PROVIDER
	});
}

function toOtpType(value: string | null): string | null {
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

export function createAuthAdapter(options: CreateAuthAdapterOptions = {}): AuthPort {
	const serviceAuthClient =
		options.client ?? options.serviceClient ?? createDefaultServiceAuthClient(options.env);
	const publicAuthClient = options.publicClient ?? createDefaultPublicAuthClient(options.env);

	return {
		async getSession(cookies) {
			if (!validateCookiesInput(cookies)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid cookies input');
			}

			if (cookies === null) {
				return err(SeamErrorCodes.UNAUTHORIZED, 'Missing auth cookies', {
					provider: PROVIDER,
					reason: 'missing_cookie_header'
				});
			}

			if (!serviceAuthClient) {
				return configurationError();
			}

			const sessionToken = extractSessionToken(cookies);
			if (!sessionToken) {
				return err(SeamErrorCodes.UNAUTHORIZED, 'Session token is missing from auth cookies', {
					provider: PROVIDER,
					reason: 'session_token_missing'
				});
			}

			const expiresAt = parseJwtExpiresAtIso(sessionToken);
			if (!expiresAt) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Session token is missing a valid expiration');
			}

			let userResponse: SupabaseGetUserResponseLike;
			try {
				userResponse = await serviceAuthClient.auth.getUser(sessionToken);
			} catch (error) {
				return mapThrownError('Failed to resolve auth session', error);
			}

			if (userResponse.error) {
				return err(
					classifyUpstreamError(userResponse.error),
					toMessage(userResponse.error.message, 'Failed to resolve auth session'),
					toUpstreamErrorDetails(userResponse.error)
				);
			}

			const rawUser = userResponse.data?.user;
			const session: AuthSession = {
				userId: typeof rawUser?.id === 'string' ? rawUser.id : '',
				email: typeof rawUser?.email === 'string' ? rawUser.email : '',
				expiresAt
			};

			if (!validateAuthSession(session)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Supabase auth response violates AuthSession');
			}

			return ok(session);
		},

		async signInGuest() {
			if (!publicAuthClient) {
				return configurationError();
			}

			let signInResponse: SupabaseSignInResponseLike;
			try {
				signInResponse = await publicAuthClient.auth.signInAnonymously();
			} catch (error) {
				return mapThrownError('Failed to start guest session', error);
			}

			if (signInResponse.error) {
				return err(
					classifyUpstreamError(signInResponse.error),
					toMessage(signInResponse.error.message, 'Failed to start guest session'),
					toUpstreamErrorDetails(signInResponse.error)
				);
			}

			const payload = toAuthSignInPayload(signInResponse.data?.session, signInResponse.data?.user);
			if (!payload) {
				return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Guest session did not return tokens', {
					provider: PROVIDER,
					reason: 'missing_session'
				});
			}

			return ok(payload);
		},

		async sendMagicLink(input: MagicLinkInput) {
			if (!validateMagicLinkInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid magic link input');
			}

			if (!publicAuthClient) {
				return configurationError();
			}

			let sendResponse: SupabaseOtpResponseLike;
			try {
				sendResponse = await publicAuthClient.auth.signInWithOtp({
					email: input.email,
					options: {
						emailRedirectTo: input.emailRedirectTo
					}
				});
			} catch (error) {
				return mapThrownError('Failed to send sign-in link', error);
			}

			if (sendResponse.error) {
				return err(
					classifyUpstreamError(sendResponse.error),
					toMessage(sendResponse.error.message, 'Failed to send sign-in link'),
					toUpstreamErrorDetails(sendResponse.error)
				);
			}

			return ok({ success: true as const });
		},

		async signInWithPassword(input: PasswordSignInInput) {
			if (!validatePasswordSignInInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid sign-in input');
			}

			if (!publicAuthClient) {
				return configurationError();
			}

			let signInResponse: SupabaseSignInResponseLike;
			try {
				signInResponse = await publicAuthClient.auth.signInWithPassword({
					email: input.email,
					password: input.password
				});
			} catch (error) {
				return mapThrownError('Failed to sign in', error);
			}

			if (signInResponse.error) {
				return err(
					classifyUpstreamError(signInResponse.error),
					toMessage(signInResponse.error.message, 'Failed to sign in'),
					toUpstreamErrorDetails(signInResponse.error)
				);
			}

			const payload = toAuthSignInPayload(signInResponse.data?.session, signInResponse.data?.user);
			if (!payload) {
				return err(SeamErrorCodes.UNAUTHORIZED, 'Sign in did not return a session', {
					provider: PROVIDER,
					reason: 'missing_session'
				});
			}

			return ok(payload);
		},

		async completeAuthCallback(input: AuthCallbackCompletionInput) {
			if (!validateAuthCallbackCompletionInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid callback completion input');
			}

			if (!publicAuthClient) {
				return configurationError();
			}

			const code = input.code;
			const tokenHash = input.tokenHash;
			const otpType = toOtpType(input.otpType);

			let codeExchangeError: SupabaseAuthErrorLike | null = null;
			if (code) {
				let exchangeResponse: SupabaseSignInResponseLike;
				try {
					exchangeResponse = await publicAuthClient.auth.exchangeCodeForSession(code);
				} catch (error) {
					return mapThrownError('Failed to complete sign-in callback', error);
				}

				if (!exchangeResponse.error) {
					const payload = toAuthSignInPayload(exchangeResponse.data?.session, exchangeResponse.data?.user);
					if (payload) {
						return ok(payload);
					}
					codeExchangeError = {
						message: 'Code exchange succeeded but did not return a session'
					};
				} else {
					codeExchangeError = exchangeResponse.error;
				}
			}

			if (tokenHash) {
				if (!otpType) {
					return err(SeamErrorCodes.INPUT_INVALID, 'Invalid callback otp type', {
						provider: PROVIDER,
						type: input.otpType
					});
				}

				let verifyResponse: SupabaseSignInResponseLike;
				try {
					verifyResponse = await publicAuthClient.auth.verifyOtp({
						token_hash: tokenHash,
						type: otpType
					});
				} catch (error) {
					return mapThrownError('Failed to verify sign-in callback', error);
				}

				if (verifyResponse.error) {
					return err(
						classifyUpstreamError(verifyResponse.error),
						toMessage(verifyResponse.error.message, 'Failed to verify sign-in callback'),
						toUpstreamErrorDetails(verifyResponse.error)
					);
				}

				const payload = toAuthSignInPayload(verifyResponse.data?.session, verifyResponse.data?.user);
				if (!payload) {
					return err(SeamErrorCodes.UPSTREAM_ERROR, 'Callback verification did not return a session', {
						provider: PROVIDER,
						reason: 'missing_session'
					});
				}

				return ok(payload);
			}

			if (codeExchangeError) {
				return err(
					classifyUpstreamError(codeExchangeError),
					toMessage(codeExchangeError.message, 'Failed to complete sign-in callback'),
					toUpstreamErrorDetails(codeExchangeError)
				);
			}

			return err(SeamErrorCodes.INPUT_INVALID, 'Missing callback completion params', {
				provider: PROVIDER
			});
		},

		async signOut(sessionToken) {
			if (!validateSessionTokenInput(sessionToken)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid session token input');
			}

			if (!serviceAuthClient) {
				return configurationError();
			}

			let signOutResponse: SupabaseSignOutResponseLike;
			try {
				signOutResponse = await serviceAuthClient.auth.admin.signOut(sessionToken);
			} catch (error) {
				return mapThrownError('Failed to sign out session', error);
			}

			if (signOutResponse.error) {
				return err(
					classifyUpstreamError(signOutResponse.error),
					toMessage(signOutResponse.error.message, 'Failed to sign out session'),
					toUpstreamErrorDetails(signOutResponse.error)
				);
			}

			return ok({ success: true as const });
		}
	};
}
