export const SeamErrorCodes = {
	INPUT_INVALID: 'INPUT_INVALID',
	NOT_FOUND: 'NOT_FOUND',
	RATE_LIMITED: 'RATE_LIMITED',
	UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
	UPSTREAM_ERROR: 'UPSTREAM_ERROR',
	CONTRACT_VIOLATION: 'CONTRACT_VIOLATION',
	UNAUTHORIZED: 'UNAUTHORIZED',
	UNEXPECTED: 'UNEXPECTED'
} as const;

export type SeamErrorCode = (typeof SeamErrorCodes)[keyof typeof SeamErrorCodes];

export interface SeamError {
	code: SeamErrorCode;
	message: string;
	details?: Record<string, unknown>;
}

export type SeamResult<T> = { ok: true; value: T } | { ok: false; error: SeamError };

export function ok<T>(value: T): SeamResult<T> {
	return { ok: true, value };
}

export function err<T = never>(
	code: SeamErrorCode,
	message: string,
	details?: Record<string, unknown>
): SeamResult<T> {
	return { ok: false, error: { code, message, details } };
}
