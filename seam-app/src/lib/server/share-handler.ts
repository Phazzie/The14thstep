/**
 * Purpose: answer POST /api/share with one character's line.
 * Why: kept apart from the SvelteKit route so it can be tested with a fake fetch.
 * Info flow: unknown body → ShareRequest → prompt → Grok (once, plus one retry) → structural
 * check → ShareResponse. Any failure falls back to the house tape, labelled as such.
 * Invariants: a valid request always gets 200 with text. Only structural checks live here.
 */
import { ShareRequestSchema, type ShareResponse } from '$lib/contracts/share';
import { getCharacter } from '$lib/core/characters';
import { buildSharePrompt } from '$lib/core/prompts';
import { findTherapySpeak } from '$lib/core/style';
import { tapeLine } from '$lib/core/tape';
import { grokComplete, type GrokDeps } from './grok';

const MAX_SHARE_CHARS = 900;

function clean(raw: string, speakerName: string): string {
	let text = raw.trim();
	const label = new RegExp(`^\\*{0,2}${speakerName}\\*{0,2}\\s*:\\s*`, 'i');
	text = text.replace(label, '').trim();
	if (/^["“].*["”]$/s.test(text)) text = text.slice(1, -1).trim();
	return text;
}

function acceptable(text: string): boolean {
	return text.length >= 8 && text.length <= MAX_SHARE_CHARS && findTherapySpeak(text).length === 0;
}

export async function handleShare(body: unknown, deps: GrokDeps): Promise<{ status: number; body: unknown }> {
	const parsed = ShareRequestSchema.safeParse(body);
	if (!parsed.success) {
		return { status: 400, body: { error: 'That request did not look like a meeting.' } };
	}
	const request = parsed.data;

	let character;
	try {
		character = getCharacter(request.speakerId);
	} catch {
		return { status: 400, body: { error: 'Nobody by that name sits in this room.' } };
	}

	if (deps.apiKey) {
		const { system, user } = buildSharePrompt(character, request);
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const raw = await grokComplete(system, user, deps);
			if (raw === null) break;
			const text = clean(raw, character.name);
			if (acceptable(text)) {
				const response: ShareResponse = { text, source: 'grok' };
				return { status: 200, body: response };
			}
		}
	}

	const response: ShareResponse = {
		text: tapeLine(request.speakerId, request.slot, request.n, {
			name: request.userName,
			topic: request.topic
		}),
		source: 'tape'
	};
	return { status: 200, body: response };
}
