import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import { createGrokAiAdapter } from './adapter';

const validInput = {
	meetingId: 'meeting-1',
	characterId: 'marcus',
	prompt: 'Generate one grounded share.',
	contextMessages: [{ role: 'system' as const, content: 'You are Marcus.' }],
	stream: false
};

describe('createGrokAiAdapter', () => {
	it('parses successful xAI responses payloads', async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						output: [
							{
								content: [
									{ type: 'output_text', text: 'Stayed clean today by staying in the room.' }
								]
							}
						],
						usage: { input_tokens: 120, output_tokens: 25, total_tokens: 145 }
					}),
					{ status: 200 }
				)
		);

		const adapter = createGrokAiAdapter({
			fetchImpl: fetchMock as unknown as typeof fetch,
			apiKey: 'test-key',
			apiUrl: 'https://example.test/v1/responses',
			model: 'grok-test-model'
		});

		const result = await adapter.generateShare(validInput);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({
				shareText: 'Stayed clean today by staying in the room.',
				tokenUsage: { inputTokens: 120, outputTokens: 25, totalTokens: 145 }
			});
		}

		expect(fetchMock).toHaveBeenCalledOnce();
		const firstCall = fetchMock.mock.calls.at(0) as [string, RequestInit] | undefined;
		expect(firstCall?.[0]).toBe('https://example.test/v1/responses');
	});

	it('maps 429 responses to RATE_LIMITED', async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(JSON.stringify({ error: { message: 'Too many requests.' } }), { status: 429 })
		);
		const adapter = createGrokAiAdapter({
			fetchImpl: fetchMock as unknown as typeof fetch,
			apiKey: 'test-key',
			apiUrl: 'https://example.test/v1/responses',
			model: 'grok-test-model'
		});

		const result = await adapter.generateShare(validInput);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.RATE_LIMITED);
		}
	});

	it('maps network failures to UPSTREAM_UNAVAILABLE', async () => {
		const fetchMock = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});
		const adapter = createGrokAiAdapter({
			fetchImpl: fetchMock as unknown as typeof fetch,
			apiKey: 'test-key',
			apiUrl: 'https://example.test/v1/responses',
			model: 'grok-test-model'
		});

		const result = await adapter.generateShare(validInput);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
		}
	});

	it('maps schema mismatches to CONTRACT_VIOLATION', async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						output: [
							{
								content: [{ type: 'output_text', text: '' }]
							}
						]
					}),
					{ status: 200 }
				)
		);
		const adapter = createGrokAiAdapter({
			fetchImpl: fetchMock as unknown as typeof fetch,
			apiKey: 'test-key',
			apiUrl: 'https://example.test/v1/responses',
			model: 'grok-test-model'
		});

		const result = await adapter.generateShare(validInput);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.CONTRACT_VIOLATION);
		}
	});
});
