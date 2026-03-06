import { createClerkClient, verifyToken } from '@clerk/backend';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
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

interface CreateAuthAdapterOptions {
	env?: NodeJS.ProcessEnv;
}

const PROVIDER = 'clerk-auth';
const GUEST_EMAIL = 'guest@local.invalid';

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
		try {
			cookies.set(name, decodeURIComponent(value));
		} catch {
			cookies.set(name, value);
		}
	}
	return cookies;
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveGuestSessionSecret(env: NodeJS.ProcessEnv): string {
	return (
		env.APP_SESSION_SECRET?.trim() ??
		env.SUPABASE_JWT_SECRET?.trim() ??
		env.CLERK_SECRET_KEY?.trim() ??
		''
	);
}

function encodeGuestAccessToken(userId: string, secret: string): string {
	const signature = createHmac('sha256', secret).update(userId).digest('hex');
	return `${userId}.${signature}`;
}

function decodeGuestAccessToken(token: string, secret: string): string | null {
	const separator = token.indexOf('.');
	if (separator < 0) return null;
	const userId = token.slice(0, separator).trim();
	const providedSignature = token.slice(separator + 1).trim();
	if (!isUuid(userId) || providedSignature.length === 0) return null;
	const expectedSignature = createHmac('sha256', secret).update(userId).digest('hex');
	const providedBuffer = Buffer.from(providedSignature);
	const expectedBuffer = Buffer.from(expectedSignature);
	if (providedBuffer.length !== expectedBuffer.length) return null;
	if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;
	return userId;
}

function toIsoExpiration(exp: number | undefined): string {
	const seconds = typeof exp === 'number' && Number.isFinite(exp) ? exp : Math.floor(Date.now() / 1000) + 3600;
	return new Date(seconds * 1000).toISOString();
}

function toStableUuid(seed: string): string {
	const hash = createHash('sha256').update(seed).digest('hex').slice(0, 32).split('');
	hash[12] = '4';
	const variant = Number.parseInt(hash[16] ?? '0', 16);
	hash[16] = ((variant & 0x3) | 0x8).toString(16);
	const hex = hash.join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function toAuthSignInPayload(input: {
	userId: string;
	email: string | null;
	accessToken: string;
	refreshToken: string;
	userMetadata: Record<string, unknown>;
}): AuthSignInPayload {
	return {
		userId: input.userId,
		email: input.email,
		accessToken: input.accessToken,
		refreshToken: input.refreshToken,
		userMetadata: input.userMetadata
	};
}

function unsupportedHostedFlowError(message: string) {
	return err(SeamErrorCodes.INPUT_INVALID, message, {
		provider: PROVIDER,
		hint: 'Use hosted Clerk sign-in from the landing page.'
	});
}

function resolveSecretKey(env: NodeJS.ProcessEnv): string {
	return env.CLERK_SECRET_KEY?.trim() ?? '';
}

export function createAuthAdapter(options: CreateAuthAdapterOptions = {}): AuthPort {
	const env = options.env ?? process.env;
	const secretKey = resolveSecretKey(env);
	const guestSessionSecret = resolveGuestSessionSecret(env);
	const clerkClient =
		secretKey.length > 0
			? createClerkClient({
				secretKey
			})
			: null;

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

			const parsedCookies = parseCookies(cookies);
			const clerkSessionToken = parsedCookies.get('__session')?.trim() ?? '';
			if (clerkSessionToken.length > 0) {
				if (secretKey.length === 0) {
					return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Clerk auth adapter is not configured', {
						provider: PROVIDER
					});
				}

				try {
					const claims = await verifyToken(clerkSessionToken, {
						secretKey,
						clockSkewInMs: 5000
					});
					const clerkUserId = typeof claims.sub === 'string' ? claims.sub.trim() : '';
					if (!clerkUserId) {
						return err(SeamErrorCodes.UNAUTHORIZED, 'Missing Clerk subject claim', {
							provider: PROVIDER,
							reason: 'subject_claim_missing'
						});
					}

					const session: AuthSession = {
						userId: toStableUuid(`clerk:${clerkUserId}`),
						email:
							typeof claims.email === 'string' && claims.email.includes('@')
								? claims.email
								: 'member@local.invalid',
						expiresAt: toIsoExpiration(claims.exp)
					};
					if (!validateAuthSession(session)) {
						return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Clerk session payload violates AuthSession', {
							provider: PROVIDER
						});
					}
					return ok(session);
				} catch (cause) {
					return err(SeamErrorCodes.UNAUTHORIZED, 'Invalid Clerk session token', {
						provider: PROVIDER,
						reason: cause instanceof Error ? cause.message : String(cause)
					});
				}
			}

			const sessionKind = parsedCookies.get('app-session-kind')?.trim() ?? '';
			const guestToken = parsedCookies.get('sb-access-token')?.trim() ?? '';
			const guestUserId =
				sessionKind === 'guest' && guestSessionSecret.length > 0
					? decodeGuestAccessToken(guestToken, guestSessionSecret)
					: null;
			if (sessionKind === 'guest' && guestUserId) {
				const guestSession: AuthSession = {
					userId: guestUserId,
					email: GUEST_EMAIL,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				};
				if (!validateAuthSession(guestSession)) {
					return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Guest auth payload violates AuthSession', {
						provider: PROVIDER
					});
				}
				return ok(guestSession);
			}

			return err(SeamErrorCodes.UNAUTHORIZED, 'No active auth session', {
				provider: PROVIDER,
				reason: 'session_missing'
			});
		},

		async signInGuest() {
			if (guestSessionSecret.length === 0) {
				return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Guest auth adapter secret is not configured', {
					provider: PROVIDER
				});
			}

			const guestId = randomUUID();
			const payload = toAuthSignInPayload({
				userId: guestId,
				email: null,
				accessToken: encodeGuestAccessToken(guestId, guestSessionSecret),
				refreshToken: randomUUID(),
				userMetadata: {
					sessionKind: 'guest'
				}
			});
			if (!validateAuthSignInPayload(payload)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Guest sign-in violates AuthSignInPayload', {
					provider: PROVIDER
				});
			}
			return ok(payload);
		},

		async sendMagicLink(input: MagicLinkInput) {
			if (!validateMagicLinkInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid magic-link input');
			}
			return unsupportedHostedFlowError('Magic links are handled by Clerk hosted sign-in.');
		},

		async signInWithPassword(input: PasswordSignInInput) {
			if (!validatePasswordSignInInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid password sign-in input');
			}
			return unsupportedHostedFlowError('Password sign-in is handled by Clerk hosted sign-in.');
		},

		async completeAuthCallback(input: AuthCallbackCompletionInput) {
			if (!validateAuthCallbackCompletionInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid callback completion input');
			}
			return unsupportedHostedFlowError('Auth callback completion is handled by Clerk hosted sign-in.');
		},

		async signOut(sessionToken) {
			if (!validateSessionTokenInput(sessionToken)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid session token input');
			}

			const guestUserId =
				guestSessionSecret.length > 0 ? decodeGuestAccessToken(sessionToken, guestSessionSecret) : null;
			if (guestUserId) {
				return ok({ success: true as const });
			}

			if (secretKey.length === 0 || !clerkClient) {
				return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Clerk auth adapter is not configured', {
					provider: PROVIDER
				});
			}

			let claims;
			try {
				claims = await verifyToken(sessionToken, {
					secretKey,
					clockSkewInMs: 5000
				});
			} catch (cause) {
				return err(SeamErrorCodes.UNAUTHORIZED, 'Invalid Clerk session token', {
					provider: PROVIDER,
					reason: cause instanceof Error ? cause.message : String(cause)
				});
			}

			const sessionId = typeof claims.sid === 'string' ? claims.sid.trim() : '';
			if (!sessionId) {
				return err(SeamErrorCodes.UNAUTHORIZED, 'Missing Clerk session id', {
					provider: PROVIDER,
					reason: 'sid_claim_missing'
				});
			}

			try {
				await clerkClient.sessions.revokeSession(sessionId);
			} catch (cause) {
				return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Failed to revoke Clerk session', {
					provider: PROVIDER,
					reason: cause instanceof Error ? cause.message : String(cause)
				});
			}

			return ok({ success: true as const });
		}
	};
}
