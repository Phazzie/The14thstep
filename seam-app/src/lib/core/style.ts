/**
 * Purpose: the writing rules every generated share must follow, ported from app/src/lib/core.
 * Why: "Cut the last sentence. If the share hits harder, it was filler." The room lives or dies on this.
 * Invariants: pure; no I/O.
 */
/**
 * Baseline guardrails that keep writing in-room and anti-clinical.
 * These are necessary but not sufficient for final narrative quality.
 */
export const BASE_STYLE_GUARDRAILS = [
	'- Sound like a real person in a recovery room, never like a clinician.',
	'- Use concrete lived details over abstract advice.',
	'- Keep emotional honesty high and motivational slogans low.',
	'- Speak in natural conversational rhythm, not polished essay prose.',
	'- Hold accountability and compassion together without preaching.'
].join('\n');

/**
 * Editorial reality checks extracted from project writing philosophy docs.
 * These prevent polished, generic, over-explained "brochure" outputs.
 */
export const EDITORIAL_REALITY_CHECKS = [
	'- Run the cut-the-last-sentence test. Remove any ending that only explains, moralizes, or wraps the moment in a lesson.',
	'- Trust subtext. If the scene already shows fear, grief, or stakes, do not name and explain it again.',
	'- Do not explain the metaphor after it lands. Keep the image concrete and unresolved.',
	'- Favor micro-intimacy over generalized wisdom: specific objects, habits, and room details over abstract recovery talk.',
	'- Character specificity is mandatory. If another character could say the line unchanged, rewrite it.'
].join('\n');

/**
 * Prompt-facing composite for backwards compatibility with existing prompt builders.
 * New builders should reference BASE_STYLE_GUARDRAILS + EDITORIAL_REALITY_CHECKS intentionally.
 */
export const STYLE_CONSTITUTION = [BASE_STYLE_GUARDRAILS, 'EDITORIAL REALITY CHECKS:', EDITORIAL_REALITY_CHECKS].join(
	'\n\n'
);

export const THERAPY_SPEAK_EXACT_PHRASES = [
	'I hear you.',
	"That's valid.",
	"You're brave for sharing.",
	'How does that make you feel?',
	'Hold space.',
	'Set boundaries.',
	'Your truth.',
	'Healing journey.',
	'Self-care.',
	'Triggered.',
	'Safe space.',
	'Emotional labor.',
	'Sit with that.',
	'Do the work.',
	'Lean into.',
	'Unpack that.',
	'Honor your feelings.',
	"You're enough.",
	'Toxic.',
	'Gaslighting.',
	'Boundaries.',
	'Process your emotions.',
	'Growth mindset.',
	'Inner child.',
	'Trauma response.',
	'Coping mechanism.',
	'Accountability partner.',
	'Recovery is not linear.',
	'One day at a time.',
	'Let go and let God.',
	'It works if you work it.',
	'Surrender.',
	'Higher power.'
] as const;

export const THERAPY_SPEAK_PATTERNS = [
	/^I want to acknowledge/i,
	/^I appreciate you sharing/i,
	/^Thank you for being vulnerable/i,
	/^It takes courage to/i,
	/\bjourney\b/i,
	/\bboundaries\b/i,
	/\btriggers\b/i
] as const;

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EXACT_MATCHERS = THERAPY_SPEAK_EXACT_PHRASES.map((phrase) => {
	const core = phrase.replace(/[.?!]+$/, '').replace(/[’']/g, "['’]");
	const body = core
		.split("['’]")
		.map((part) => escapeRegExp(part))
		.join("['’]");
	return { phrase, regex: new RegExp(`(^|[^a-z])${body}($|[^a-z])`, 'i') };
});

/** Returns every blocklisted phrase or pattern found in the text; an empty list means clean. */
export function findTherapySpeak(text: string): string[] {
	const found: string[] = [];
	for (const matcher of EXACT_MATCHERS) {
		if (matcher.regex.test(text)) found.push(matcher.phrase);
	}
	for (const sentence of text.split(/(?<=[.!?])\s+/)) {
		for (const pattern of THERAPY_SPEAK_PATTERNS) {
			if (pattern.test(sentence.trim()) && !found.includes(pattern.source)) found.push(pattern.source);
		}
	}
	return found;
}
