import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_CHARACTERS } from '../../core/characters';
import {
	buildCharacterSharePrompt,
	buildQualityValidationPrompt,
	type MeetingPromptContext
} from '../../core/prompt-templates';

interface ResponsesOutputContent {
	type?: string;
	text?: string;
}

interface ResponsesOutputItem {
	content?: ResponsesOutputContent[];
}

interface ResponsesBody {
	output?: ResponsesOutputItem[];
	usage?: Record<string, unknown>;
	error?: Record<string, unknown>;
}

interface ValidationResult {
	pass: boolean;
	reasons: string[];
	voiceConsistency: number;
	authenticity: number;
	therapySpeakDetected: boolean;
}

interface CharacterPassRate {
	characterId: string;
	characterName: string;
	attempts: number;
	passes: number;
	passRate: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const REPORT_PATH = resolve(FIXTURES_DIR, 'voice-quality-report.json');

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
			// ignore
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
	systemPrompt: string;
	userPrompt: string;
}): Promise<{ status: number; body: ResponsesBody; text: string }> {
	const response = await fetch('https://api.x.ai/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${input.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'grok-4-1-fast-reasoning',
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
	return { status: response.status, body, text: extractText(body) };
}

function stripCodeFences(value: string): string {
	const trimmed = value.trim();
	if (!trimmed.startsWith('```')) return trimmed;
	return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function parseValidation(value: string): ValidationResult | null {
	try {
		const parsed = JSON.parse(stripCodeFences(value)) as Record<string, unknown>;
		if (typeof parsed.pass !== 'boolean') return null;
		return {
			pass: parsed.pass,
			reasons: Array.isArray(parsed.reasons)
				? parsed.reasons.map((item) => String(item))
				: ['No reasons returned'],
			voiceConsistency: Number(parsed.voiceConsistency ?? 0),
			authenticity: Number(parsed.authenticity ?? 0),
			therapySpeakDetected: Boolean(parsed.therapySpeakDetected ?? false)
		};
	} catch {
		return null;
	}
}

function shortDelay(ms: number): Promise<void> {
	return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function main() {
	const apiKey = await loadXaiApiKey();
	if (!apiKey) {
		throw new Error('XAI_API_KEY is required in environment or .env.local/.env');
	}

	await mkdir(FIXTURES_DIR, { recursive: true });

	const topic = 'Staying clean when everything falls apart';
	const attemptsPerCharacter = 5;
	const passRates: CharacterPassRate[] = [];
	const samples: Array<Record<string, unknown>> = [];

	for (const character of CORE_CHARACTERS) {
		let passes = 0;
		for (let i = 0; i < attemptsPerCharacter; i += 1) {
			const context: MeetingPromptContext = {
				topic,
				userName: 'trap',
				userMood: 'anxious',
				recentShares: [
					{ speaker: 'User', content: 'I almost ran today.' },
					{ speaker: 'Marcus', content: 'Now you stayed and that counts.' }
				],
				heavyMemoryLines: ['User called sponsor before using last week.'],
				callbackLines: ['Coffee cup callback surfaced in meeting 2.']
			};

			const sharePrompt = buildCharacterSharePrompt(character, context);
			const generated = await callResponsesApi({
				apiKey,
				systemPrompt: 'Write a realistic recovery meeting share.',
				userPrompt: sharePrompt
			});

			if (generated.status < 200 || generated.status >= 300) {
				samples.push({
					characterId: character.id,
					attempt: i + 1,
					status: generated.status,
					error: generated.body.error ?? null
				});
				continue;
			}

			const validationPrompt = buildQualityValidationPrompt(character, generated.text, context);
			const validated = await callResponsesApi({
				apiKey,
				systemPrompt: 'Evaluate and return strict JSON only.',
				userPrompt: validationPrompt
			});

			const parsedValidation = parseValidation(validated.text);
			const pass = parsedValidation?.pass ?? false;
			if (pass) passes += 1;

			samples.push({
				characterId: character.id,
				attempt: i + 1,
				share: generated.text,
				validationRaw: validated.text,
				validation: parsedValidation,
				pass
			});

			await shortDelay(250);
		}

		passRates.push({
			characterId: character.id,
			characterName: character.name,
			attempts: attemptsPerCharacter,
			passes,
			passRate: Number((passes / attemptsPerCharacter).toFixed(2))
		});
	}

	const report = {
		probedAt: new Date().toISOString(),
		environment: 'live',
		topic,
		attemptsPerCharacter,
		targetPassRate: 0.7,
		passRates,
		samples
	};

	await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
	console.log('Wrote quality report:', REPORT_PATH);
	for (const entry of passRates) {
		console.log(`${entry.characterName}: ${entry.passes}/${entry.attempts} (${entry.passRate})`);
	}
}

main().catch((error) => {
	console.error('quality cycle failed:', error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
