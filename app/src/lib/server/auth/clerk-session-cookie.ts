export const CLERK_SESSION_COOKIE_NAME = '__session';

export function isClerkSessionCookieName(name: string): boolean {
	return name === CLERK_SESSION_COOKIE_NAME || isSuffixedClerkSessionCookieName(name);
}

export function isSuffixedClerkSessionCookieName(name: string): boolean {
	return name.startsWith(`${CLERK_SESSION_COOKIE_NAME}_`);
}

export function readClerkSessionTokens(entries: Iterable<[string, string]>): string[] {
	const exactMatches: string[] = [];
	const suffixedMatches: string[] = [];

	for (const [name, value] of entries) {
		if (!isClerkSessionCookieName(name)) continue;
		const trimmedValue = value.trim();
		if (trimmedValue.length === 0) continue;

		if (name === CLERK_SESSION_COOKIE_NAME) {
			exactMatches.push(trimmedValue);
			continue;
		}

		suffixedMatches.push(trimmedValue);
	}

	return [...exactMatches, ...suffixedMatches];
}
