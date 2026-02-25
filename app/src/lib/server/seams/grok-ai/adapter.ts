import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import type { GenerateShareOutput, GrokAiPort, GrokMessage } from '$lib/seams/grok-ai/contract';
import {
	validateGenerateShareInput,
	validateGenerateShareOutput
} from '$lib/seams/grok-ai/contract';

interface XaiContentItem {
	type?: string;
	text?: string;
}

interface XaiOutputItem {
	content?: XaiContentItem[];
}

interface XaiUsage {
	input_tokens?: unknown;
	output_tokens?: unknown;
	total_tokens?: unknown;
	inputTokens?: unknown;
	outputTokens?: unknown;
	totalTokens?: unknown;
}

interface XaiErrorBody {
	message?: unknown;
}

interface XaiResponsesBody {
	output?: XaiOutputItem[];
	usage?: XaiUsage;
	error?: XaiErrorBody;
}

export interface GrokAiAdapterDeps {
	fetchImpl?: typeof fetch;
	apiKey?: string;
	apiUrl?: string;
	model?: string;
	timeoutMs?: number;
}

const DEFAULT_API_URL = 'https://api.x.ai/v1/responses';
const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const DEFAULT_TIMEOUT_MS = 15_000;

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function toInputMessage(message: GrokMessage): {
	role: GrokMessage['role'];
	content: Array<{ type: 'input_text'; text: string }>;
} {
	return {
		role: message.role,
		content: [{ type: 'input_text', text: message.content }]
	};
}

function asNonNegativeInteger(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		return undefined;
	}
	return value;
}

function extractTokenUsage(body: XaiResponsesBody): GenerateShareOutput['tokenUsage'] | undefined {
	const usage = body.usage;
	if (!usage || typeof usage !== 'object') return undefined;

	const inputTokens = asNonNegativeInteger(usage.input_tokens ?? usage.inputTokens);
	const outputTokens = asNonNegativeInteger(usage.output_tokens ?? usage.outputTokens);
	const totalTokens = asNonNegativeInteger(usage.total_tokens ?? usage.totalTokens);

	if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
		return undefined;
	}

	return { inputTokens, outputTokens, totalTokens };
}

function extractShareText(body: XaiResponsesBody): string {
	const chunks: string[] = [];
	for (const outputItem of body.output ?? []) {
		for (const content of outputItem.content ?? []) {
			if (content.type === 'output_text' && isNonEmptyString(content.text)) {
				chunks.push(content.text.trim());
			}
		}
	}
	return chunks.join('\n').trim();
}

function extractErrorMessage(body: unknown): string | undefined {
	if (!body || typeof body !== 'object') return undefined;
	const maybeBody = body as XaiResponsesBody;
	return isNonEmptyString(maybeBody.error?.message) ? maybeBody.error.message.trim() : undefined;
}

function isTimeoutOrNetworkError(cause: unknown): boolean {
	if (cause instanceof TypeError) {
		return true;
	}

	if (!(cause instanceof Error)) {
		return false;
	}

	const message = `${cause.name} ${cause.message}`.toLowerCase();
	return (
		message.includes('abort') ||
		message.includes('timed out') ||
		message.includes('timeout') ||
		message.includes('network') ||
		message.includes('fetch failed') ||
		message.includes('econnreset') ||
		message.includes('enotfound') ||
		message.includes('eai_again')
	);
}

export function createGrokAiAdapter(deps: GrokAiAdapterDeps = {}): GrokAiPort {
	const fetchImpl = deps.fetchImpl ?? fetch;
	const apiKey = deps.apiKey ?? process.env.XAI_API_KEY;
	const apiUrl = deps.apiUrl ?? process.env.XAI_API_URL ?? DEFAULT_API_URL;
	const model = deps.model ?? process.env.XAI_MODEL ?? DEFAULT_MODEL;
	const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	return {
		async generateShare(input) {
			if (!validateGenerateShareInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid generateShare input');
			}

			if (!isNonEmptyString(apiKey) || !isNonEmptyString(apiUrl) || !isNonEmptyString(model)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid grok-ai adapter configuration');
			}

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);

			try {
				const response = await fetchImpl(apiUrl, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model,
						store: false,
						stream: input.stream ?? false,
						input: [
							...input.contextMessages.map(toInputMessage),
							{ role: 'user', content: [{ type: 'input_text', text: input.prompt }] }
						]
					}),
					signal: controller.signal
				});

				clearTimeout(timeout);

				let body: unknown;
				try {
					body = await response.json();
				} catch {
					if (response.ok) {
						return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Grok AI returned non-JSON response');
					}
					body = undefined;
				}

				if (response.status === 429) {
					return err(
						SeamErrorCodes.RATE_LIMITED,
						extractErrorMessage(body) ?? 'Grok AI rate limit exceeded',
						{ status: response.status }
					);
				}

				if (!response.ok) {
					return err(
						SeamErrorCodes.UPSTREAM_ERROR,
						extractErrorMessage(body) ?? `Grok AI request failed with status ${response.status}`,
						{ status: response.status }
					);
				}

				if (!body || typeof body !== 'object') {
					return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Grok AI response body is not an object');
				}

				const parsedBody = body as XaiResponsesBody;
				const output: GenerateShareOutput = {
					shareText: extractShareText(parsedBody),
					tokenUsage: extractTokenUsage(parsedBody)
				};

				if (!validateGenerateShareOutput(output)) {
					return err(
						SeamErrorCodes.CONTRACT_VIOLATION,
						'Grok AI response violates GenerateShareOutput contract'
					);
				}

				return ok(output);
			} catch (cause) {
				clearTimeout(timeout);
				if (isTimeoutOrNetworkError(cause)) {
					return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'Grok AI request unavailable', {
						cause: cause instanceof Error ? cause.message : String(cause)
					});
				}
				return err(SeamErrorCodes.UNEXPECTED, 'Unexpected Grok AI adapter failure', {
					cause: cause instanceof Error ? cause.message : String(cause)
				});
			}
		}
	};
}
