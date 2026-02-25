import { SeamErrorCodes, type SeamErrorCode, type SeamResult } from '$lib/core/seam';

export interface GrokMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface GenerateShareInput {
	meetingId: string;
	characterId: string;
	prompt: string;
	contextMessages: GrokMessage[];
	stream?: boolean;
}

export interface GenerateShareOutput {
	shareText: string;
	tokenUsage?: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
}

export interface GrokAiPort {
	generateShare(input: GenerateShareInput): Promise<SeamResult<GenerateShareOutput>>;
}

export const GROK_AI_ERROR_CODES: readonly SeamErrorCode[] = [
	SeamErrorCodes.INPUT_INVALID,
	SeamErrorCodes.RATE_LIMITED,
	SeamErrorCodes.UPSTREAM_UNAVAILABLE,
	SeamErrorCodes.UPSTREAM_ERROR,
	SeamErrorCodes.CONTRACT_VIOLATION,
	SeamErrorCodes.UNEXPECTED
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function isGrokMessage(value: unknown): value is GrokMessage {
	if (!isObject(value)) return false;
	if (!['system', 'user', 'assistant'].includes(String(value.role))) return false;
	return isNonEmptyString(value.content);
}

export function validateGenerateShareInput(value: unknown): value is GenerateShareInput {
	if (!isObject(value)) return false;
	if (!isNonEmptyString(value.meetingId)) return false;
	if (!isNonEmptyString(value.characterId)) return false;
	if (!isNonEmptyString(value.prompt)) return false;
	if (!Array.isArray(value.contextMessages) || !value.contextMessages.every(isGrokMessage))
		return false;
	if (value.stream !== undefined && typeof value.stream !== 'boolean') return false;
	return true;
}

function isTokenUsage(value: unknown): value is NonNullable<GenerateShareOutput['tokenUsage']> {
	if (!isObject(value)) return false;
	for (const key of ['inputTokens', 'outputTokens', 'totalTokens'] as const) {
		const tokenValue = value[key];
		if (
			tokenValue !== undefined &&
			(typeof tokenValue !== 'number' || !Number.isInteger(tokenValue) || tokenValue < 0)
		) {
			return false;
		}
	}
	return true;
}

export function validateGenerateShareOutput(value: unknown): value is GenerateShareOutput {
	if (!isObject(value)) return false;
	if (!isNonEmptyString(value.shareText)) return false;
	if (value.tokenUsage !== undefined && !isTokenUsage(value.tokenUsage)) return false;
	return true;
}
