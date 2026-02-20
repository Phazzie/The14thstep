export const CRISIS_KEYWORDS = [
	'want to die',
	'kill myself',
	'end it',
	'overdose',
	'harm myself',
	'cannot go on',
	'suicide',
	'better off dead'
] as const;

function normalize(text: string): string {
	return text.toLowerCase();
}

function includesAny(text: string, keywords: readonly string[]): boolean {
	const normalized = normalize(text);
	return keywords.some((keyword) => normalized.includes(keyword));
}

export function detectCrisisContent(content: string): boolean {
	return includesAny(content, CRISIS_KEYWORDS);
}

export function isMeetingInCrisis(input: {
	setupText?: string;
	shares: Array<{ content: string; significanceScore: number }>;
}): boolean {
	if (input.setupText && detectCrisisContent(input.setupText)) {
		return true;
	}

	return input.shares.some((share) => share.significanceScore >= 10 || detectCrisisContent(share.content));
}
