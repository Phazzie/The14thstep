import type { SeamResult } from '$lib/core/seam';

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
