import { createClient } from '@supabase/supabase-js';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import type { AuthPort, AuthSession } from '$lib/seams/auth/contract';
import {
	validateAuthSession,
	validateCookiesInput,
	validateSessionTokenInput
} from '$lib/seams/auth/contract';

interface SupabaseAuthErrorLike {
	code?: string;
	status?: number;
	message?: string;
	name?: string;
}

interface SupabaseGetUserResponseLike {
	data: {
		user: {
			id?: unknown;
			email?: unknown;
		} | null;
	};
	error: SupabaseAuthErrorLike | null;
}

interface SupabaseSignOutResponseLike {
	data: null;
	error: SupabaseAuthErrorLike | null;
}

interface AuthClientLike {
	auth: {
		getUser(jwt: string): Promise<SupabaseGetUserResponseLike>;
		admin: {
			signOut(jwt: string): Promise<SupabaseSignOutResponseLike>;
		};
	};
}

interface CreateAuthAdapterOptions {
	client?: AuthClientLike;
	env?: NodeJS.ProcessEnv;
}

const PROVIDER = 'supabase-auth';
const AUTHORIZED_STATUS_CODES = new Set([401, 403]);
const UNAVAILABLE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);
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
const UNAVAILABLE_UPSTREAM_CODES = new Set([
	'hook_timeout',
	'hook_timeout_after_retry',
	'over_request_rate_limit',
	'request_timeout'
]);

function createDefaultAuthClient(env: NodeJS.ProcessEnv = process.env): AuthClientLike | null {
	const supabaseUrl = env.SUPABASE_URL?.trim();
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

	if (!supabaseUrl || !serviceRoleKey) {
		return null;
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	}) as unknown as AuthClientLike;
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
		if (
			Array.isArray(parsed) &&
			typeof parsed[0] === 'string' &&
			validateSessionTokenInput(parsed[0])
		) {
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
		upstreamStatus: error.status
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

	if (code && UNAVAILABLE_UPSTREAM_CODES.has(code)) {
		return SeamErrorCodes.UPSTREAM_UNAVAILABLE;
	}

	if (typeof status === 'number') {
		if (AUTHORIZED_STATUS_CODES.has(status)) return SeamErrorCodes.UNAUTHORIZED;
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

export function createAuthAdapter(options: CreateAuthAdapterOptions = {}): AuthPort {
	const authClient = options.client ?? createDefaultAuthClient(options.env);

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

			if (!authClient) {
				return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Supabase auth adapter is not configured', {
					provider: PROVIDER
				});
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
				return err(
					SeamErrorCodes.CONTRACT_VIOLATION,
					'Session token is missing a valid expiration'
				);
			}

			let userResponse: SupabaseGetUserResponseLike;
			try {
				userResponse = await authClient.auth.getUser(sessionToken);
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
				return err(
					SeamErrorCodes.CONTRACT_VIOLATION,
					'Supabase auth response violates AuthSession'
				);
			}

			return ok(session);
		},

		async signOut(sessionToken) {
			if (!validateSessionTokenInput(sessionToken)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid session token input');
			}

			if (!authClient) {
				return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Supabase auth adapter is not configured', {
					provider: PROVIDER
				});
			}

			let signOutResponse: SupabaseSignOutResponseLike;
			try {
				signOutResponse = await authClient.auth.admin.signOut(sessionToken);
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
