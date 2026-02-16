import { SeamErrorCodes, type SeamErrorCode, type SeamResult } from '$lib/core/seam';

export interface AuthSession {
	userId: string;
	email: string;
	expiresAt: string;
}

export interface AuthPort {
	getSession(cookies: string | null): Promise<SeamResult<AuthSession>>;
	signOut(sessionToken: string): Promise<SeamResult<{ success: true }>>;
}

export const AUTH_ERROR_CODES: readonly SeamErrorCode[] = [
	SeamErrorCodes.INPUT_INVALID,
	SeamErrorCodes.UNAUTHORIZED,
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

export function validateCookiesInput(value: unknown): value is string | null {
	return value === null || isNonEmptyString(value);
}

export function validateSessionTokenInput(value: unknown): value is string {
	return isNonEmptyString(value);
}
