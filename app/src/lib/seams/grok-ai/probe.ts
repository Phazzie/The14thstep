import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_CHARACTERS } from '../../core/characters';
import { buildCharacterSharePrompt } from '../../core/prompt-templates';

interface ResponsesOutputContent {
	type?: string;
	text?: string;
}

interface ResponsesOutputItem {
	type?: string;
	content?: ResponsesOutputContent[];
}

interface ResponsesBody {
	id?: string;
	model?: string;
	output?: ResponsesOutputItem[];
	usage?: Record<string, unknown>;
	error?: Record<string, unknown>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, 'fixtures');

function parseEnv(source: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of source.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const idx = trimmed.indexOf('=');
		if (idx <= 0) continue;
		const key = trimmed.slice(0, idx).trim();
		const rawValue = trimmed.slice(idx + 1).trim();
		out[key] = rawValue.replace(/^"|"$/g, '');
	}
	return out;
}

async function loadXaiApiKey(): Promise<string | null> {
	if (process.env.XAI_API_KEY) return process.env.XAI_API_KEY;
	for (const candidate of ['.env.local', '.env']) {
		try {
			const source = await readFile(resolve(process.cwd(), candidate), 'utf8');
			const env = parseEnv(source);
			if (env.XAI_API_KEY) return env.XAI_API_KEY;
		} catch {
			// ignore missing env files
		}
	}
	return null;
}

function extractText(body: ResponsesBody): string {
	const chunks: string[] = [];
	for (const item of body.output ?? []) {
		for (const content of item.content ?? []) {
			if (content.type === 'output_text' && typeof content.text === 'string') {
				chunks.push(content.text);
			}
		}
	}
	return chunks.join('\n').trim();
}

async function callResponsesApi(input: {
	apiKey: string;
	model: string;
	systemPrompt: string;
	userPrompt: string;
}): Promise<{ status: number; body: ResponsesBody }> {
	const response = await fetch('https://api.x.ai/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${input.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: input.model,
			store: false,
			input: [
				{
					role: 'system',
					content: [{ type: 'input_text', text: input.systemPrompt }]
				},
				{
					role: 'user',
					content: [{ type: 'input_text', text: input.userPrompt }]
				}
			]
		})
	});

	const body = (await response.json()) as ResponsesBody;
	return { status: response.status, body };
}

async function main() {
	const apiKey = await loadXaiApiKey();
	if (!apiKey) {
		throw new Error('XAI_API_KEY is required in environment or .env.local/.env');
	}

	await mkdir(FIXTURES_DIR, { recursive: true });
	const marcus = CORE_CHARACTERS.find((character) => character.id === 'marcus');
	if (!marcus) throw new Error('Marcus profile not found');

	const topic = 'Staying clean when everything falls apart';
	const prompt = buildCharacterSharePrompt(marcus, {
		topic,
		userName: 'probe-user',
		userMood: 'overwhelmed',
		recentShares: [
			{ speaker: 'User', content: 'I keep wanting to disappear when life piles up.' },
			{ speaker: 'Heather', content: 'Listen, run if you want, pain still rides shotgun.' }
		]
	});

	const sample = await callResponsesApi({
		apiKey,
		model: 'grok-4-1-fast-reasoning',
		systemPrompt: 'Generate one realistic recovery meeting share with no therapy-speak.',
		userPrompt: prompt
	});

	const sampleFixture = {
		probedAt: new Date().toISOString(),
		environment: 'live',
		topic,
		status: sample.status,
		text: extractText(sample.body),
		usage: sample.body.usage ?? null,
		raw: sample.body
	};

	await writeFile(resolve(FIXTURES_DIR, 'probe.sample.json'), JSON.stringify(sampleFixture, null, 2));

	const fault = await callResponsesApi({
		apiKey,
		model: '',
		systemPrompt: 'invalid request',
		userPrompt: 'trigger a validation error'
	});

	const faultFixture = {
		probedAt: new Date().toISOString(),
		environment: 'live',
		status: fault.status,
		error: fault.body.error ?? null,
		raw: fault.body
	};

	await writeFile(resolve(FIXTURES_DIR, 'probe.fault.json'), JSON.stringify(faultFixture, null, 2));

	console.log('Wrote fixtures:', resolve(FIXTURES_DIR, 'probe.sample.json'));
	console.log('Wrote fixtures:', resolve(FIXTURES_DIR, 'probe.fault.json'));
}

main().catch((error) => {
	console.error('grok-ai probe failed:', error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
