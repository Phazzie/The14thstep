#!/usr/bin/env node

const apiKey = process.env.XAI_API_KEY?.trim();
const model = process.env.XAI_MODEL?.trim() || 'grok-4-1-fast-reasoning';
const runs = Number.parseInt(process.env.GROK_VOICE_PROBE_RUNS || '10', 10);

const bannedPhrases = [
	'i hear you',
	"that's valid",
	'you are brave for sharing',
	'how does that make you feel',
	'healing journey',
	'self-care',
	'safe space',
	'process your emotions',
	'recovery is not linear',
	'one day at a time'
];

const prompt = `
You are Marcus in a gritty recovery meeting.
Write exactly one share, 3-4 sentences, no clinical tone, no therapy speak.
Marcus style constraints:
- measured, grounded, specific
- often opens with "Now" or "See"
- tells truth through a concrete scene
- never uses sanitized validation language
`;

function evaluateShare(text) {
	const trimmed = text.trim();
	const sentenceCount = (() => {
		const normalized = trimmed
			// Avoid counting time abbreviations as sentence breaks (e.g., "2 a.m.").
			.replace(/\b([ap])\.m\./gi, '$1m')
			// Avoid a few common abbreviations inflating counts.
			.replace(/\b(Mr|Mrs|Ms|Dr|St|Sr|Jr)\./g, '$1')
			// Collapse ellipses so they don't count as multiple sentences.
			.replace(/\.{2,}/g, '.');

		const matches = normalized.match(/[.!?]+(?=\s|$)/g);
		return matches?.length ?? 1;
	})();
	const lower = trimmed.toLowerCase();
	const startsLikeMarcus = /^(\s*)(now|see)\b/i.test(trimmed);
	const hasBanned = bannedPhrases.some((phrase) => lower.includes(phrase));
	const validLength = sentenceCount >= 3 && sentenceCount <= 4;
	return {
		passed: startsLikeMarcus && !hasBanned && validLength,
		startsLikeMarcus,
		hasBanned,
		validLength,
		sentenceCount
	};
}

async function getShare() {
	const response = await fetch('https://api.x.ai/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			store: false,
			input: [
				{
					role: 'system',
					content: 'You generate raw recovery-room dialogue with no therapy language.'
				},
				{ role: 'user', content: prompt.trim() }
			]
		})
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`xAI error ${response.status}: ${body.slice(0, 400)}`);
	}

	const payload = await response.json();

	const outputText =
		typeof payload?.output_text === 'string'
			? payload.output_text
			: payload?.output
					?.flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
					?.find((part) => part?.type === 'output_text' && typeof part?.text === 'string')?.text;

	if (typeof outputText !== 'string' || outputText.trim().length === 0) {
		throw new Error('xAI response missing output_text');
	}
	return outputText.trim();
}

async function main() {
	if (!apiKey) {
		throw new Error('XAI_API_KEY is required');
	}
	if (!Number.isFinite(runs) || runs <= 0) {
		throw new Error('GROK_VOICE_PROBE_RUNS must be a positive integer');
	}

	let passes = 0;
	for (let index = 0; index < runs; index += 1) {
		const share = await getShare();
		const result = evaluateShare(share);
		if (result.passed) passes += 1;

		console.log(`\n[grok-voice-probe] sample ${index + 1}/${runs}`);
		console.log(`[grok-voice-probe] pass=${result.passed} sentences=${result.sentenceCount}`);
		console.log(`[grok-voice-probe] text=${share}`);
	}

	const passRate = Math.round((passes / runs) * 100);
	console.log(`\n[grok-voice-probe] pass rate ${passes}/${runs} (${passRate}%)`);

	if (passes < Math.ceil(runs * 0.7)) {
		throw new Error(`Pass rate below threshold: expected >=70%, got ${passRate}%`);
	}

	console.log('[grok-voice-probe] PASS');
}

main().catch((error) => {
	console.error(
		`[grok-voice-probe] FAIL: ${error instanceof Error ? error.message : String(error)}`
	);
	process.exitCode = 1;
});
