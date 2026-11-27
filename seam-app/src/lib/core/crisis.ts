/**
 * Purpose: notice crisis language and answer it at once, without the network.
 * Why: the people using this are sometimes at 3am, sometimes in crisis. The answer to "I want to
 * die" must never wait on an API, a key, or a model's mood. So it is written here, by hand.
 * Info flow: user text in; a boolean, or the authored reply plus the phone list, out.
 * Invariants: pure. Every reply names 988 and 911. Over-triggering is accepted; missing is not.
 */
import type { TranscriptEntry } from '$lib/contracts/meeting';

const CRISIS_PATTERNS: readonly RegExp[] = [
	/\bwant(?:s|ed)? to die\b/,
	/\bwanna die\b/,
	/\b(?:kill|killing|killed) my ?self\b/,
	/\bend(?:ing)? it(?: all)?\b/,
	/\bend(?:ing)? my life\b/,
	/\boverdos(?:e|ing) on purpose\b/,
	/\b(?:harm|hurt|hurting|harming|cut|cutting) my ?self\b/,
	/\bcan(?:not|'t|’t)? go on\b/,
	/\bsuicid(?:e|al)\b/,
	/\bbetter off dead\b/,
	/\bbetter off without me\b/,
	/\bnot (?:to )?wake up\b/,
	/\bno reason to (?:live|stay)\b/,
	/\bdon['’]?t want to be here anymore\b/
];

export function detectCrisis(text: string): boolean {
	const normalized = text.toLowerCase().replace(/\s+/g, ' ');
	return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export interface PhoneListEntry {
	label: string;
	number: string;
	how: string;
	href: string;
}

/** The back of every real meeting slip has a phone list. This is ours. All real, all free. */
export const PHONE_LIST: PhoneListEntry[] = [
	{
		label: '988 Suicide & Crisis Lifeline',
		number: '988',
		how: 'Call or text. A real person, any hour.',
		href: 'tel:988'
	},
	{
		label: 'Emergency',
		number: '911',
		how: 'If you are in danger right now.',
		href: 'tel:911'
	},
	{
		label: 'Crisis Text Line',
		number: '741741',
		how: 'Text HOME. For when talking out loud is too much.',
		href: 'sms:741741?body=HOME'
	},
	{
		label: 'SAMHSA National Helpline',
		number: '1-800-662-4357',
		how: 'Free, confidential, 24/7. Treatment and real meetings near you.',
		href: 'tel:18006624357'
	}
];

export const OUTSIDE_US_LINE = 'Outside the US: findahelpline.com lists free lines in your country.';

export function crisisEntries(name: string, idPrefix: string): TranscriptEntry[] {
	return [
		{
			id: `${idPrefix}:hush`,
			kind: 'action',
			speakerId: null,
			text: 'Nobody reaches for the coffee. The room stops.',
			source: 'authored'
		},
		{
			id: `${idPrefix}:marcus`,
			kind: 'crisis',
			speakerId: 'marcus',
			text: `${name}, I'm stopping the meeting for a second. See, what you just said is the only thing on the schedule now. If you're in danger right this minute, call 911. If you can, call or text 988. That's a real person, not one of us, and they pick up at any hour. I'm not going anywhere. You don't have to say another word to keep your chair.`,
			source: 'authored'
		},
		{
			id: `${idPrefix}:phones`,
			kind: 'phone_list',
			speakerId: null,
			text: PHONE_LIST.map((entry) => `${entry.label}: ${entry.number}`).join(' · '),
			source: 'authored'
		}
	];
}
