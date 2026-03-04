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
