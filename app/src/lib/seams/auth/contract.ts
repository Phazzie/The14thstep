import { SeamErrorCodes, type SeamErrorCode, type SeamResult } from '$lib/core/seam';

export interface AuthSession {
	userId: string;
	email: string;
	expiresAt: string;
}

export interface AuthSignInPayload {
	userId: string;
	email: string | null;
	accessToken: string;
	refreshToken: string;
	userMetadata: Record<string, unknown>;
}

export interface MagicLinkInput {
	email: string;
	emailRedirectTo: string;
}

export interface PasswordSignInInput {
	email: string;
	password: string;
}

export type AuthCallbackOtpType =
	| 'signup'
	| 'invite'
	| 'magiclink'
	| 'recovery'
	| 'email_change'
	| 'email';

export interface AuthCallbackCompletionInput {
	code: string | null;
	tokenHash: string | null;
	otpType: AuthCallbackOtpType | null;
}

export interface AuthPort {
	getSession(cookies: string | null): Promise<SeamResult<AuthSession>>;
	signInGuest(): Promise<SeamResult<AuthSignInPayload>>;
	sendMagicLink(input: MagicLinkInput): Promise<SeamResult<{ success: true }>>;
	signInWithPassword(input: PasswordSignInInput): Promise<SeamResult<AuthSignInPayload>>;
	completeAuthCallback(
		input: AuthCallbackCompletionInput
	): Promise<SeamResult<AuthSignInPayload>>;
	signOut(sessionToken: string): Promise<SeamResult<{ success: true }>>;
}

export const AUTH_ERROR_CODES: readonly SeamErrorCode[] = [
	SeamErrorCodes.INPUT_INVALID,
	SeamErrorCodes.UNAUTHORIZED,
	SeamErrorCodes.RATE_LIMITED,
	SeamErrorCodes.UPSTREAM_UNAVAILABLE,
	SeamErrorCodes.UPSTREAM_ERROR,
	SeamErrorCodes.CONTRACT_VIOLATION,
	SeamErrorCodes.UNEXPECTED
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

const AUTH_CALLBACK_OTP_TYPES: readonly AuthCallbackOtpType[] = [
	'signup',
	'invite',
	'magiclink',
	'recovery',
	'email_change',
	'email'
];

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateAuthSession(value: unknown): value is AuthSession {
	if (!isObject(value)) return false;
	return (
		isNonEmptyString(value.userId) &&
		isNonEmptyString(value.email) &&
		typeof value.email === 'string' &&
		value.email.includes('@') &&
		isNonEmptyString(value.expiresAt)
	);
}

export function validateAuthSignInPayload(value: unknown): value is AuthSignInPayload {
	if (!isObject(value)) return false;
	const rawEmail = value.email;
	const validEmail =
		rawEmail === null || (typeof rawEmail === 'string' && rawEmail.length > 0 && isValidEmail(rawEmail));

	return (
		isNonEmptyString(value.userId) &&
		isNonEmptyString(value.accessToken) &&
		isNonEmptyString(value.refreshToken) &&
		validEmail &&
		isObject(value.userMetadata)
	);
}

export function validateCookiesInput(value: unknown): value is string | null {
	return value === null || isNonEmptyString(value);
}

export function validateSessionTokenInput(value: unknown): value is string {
	return isNonEmptyString(value);
}

export function validateMagicLinkInput(value: unknown): value is MagicLinkInput {
	if (!isObject(value)) return false;
	if (!isNonEmptyString(value.email) || !isValidEmail(value.email)) return false;
	if (!isNonEmptyString(value.emailRedirectTo)) return false;
	try {
		const parsed = new URL(value.emailRedirectTo);
		return Boolean(parsed.origin);
	} catch {
		return false;
	}
}

export function validatePasswordSignInInput(value: unknown): value is PasswordSignInInput {
	if (!isObject(value)) return false;
	return (
		isNonEmptyString(value.email) &&
		isValidEmail(value.email) &&
		isNonEmptyString(value.password)
	);
}

export function validateAuthCallbackCompletionInput(
	value: unknown
): value is AuthCallbackCompletionInput {
	if (!isObject(value)) return false;

	const code = value.code;
	const tokenHash = value.tokenHash;
	const otpType = value.otpType;

	const hasCode = code === null || isNonEmptyString(code);
	const hasTokenHash = tokenHash === null || isNonEmptyString(tokenHash);
	const hasOtpType =
		otpType === null ||
		(typeof otpType === 'string' &&
			(AUTH_CALLBACK_OTP_TYPES as readonly string[]).includes(otpType));

	if (!hasCode || !hasTokenHash || !hasOtpType) return false;

	// Require at least one callback completion path.
	if (code === null && tokenHash === null) return false;
	// tokenHash path requires a valid OTP type.
	if (tokenHash !== null && otpType === null) return false;

	return true;
}
