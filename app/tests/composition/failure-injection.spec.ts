import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import { POST } from '../../src/routes/meeting/[id]/share/+server';

function parseSseEvents(raw: string): Array<{ event: string; data: unknown }> {
	return raw
		.split('\n\n')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((block) => {
			const lines = block.split('\n');
			const event =
				lines
					.find((line) => line.startsWith('event:'))
					?.slice(6)
					.trim() ?? 'message';
			const dataLine = lines.find((line) => line.startsWith('data:'));
			const data = dataLine ? JSON.parse(dataLine.slice(5).trim()) : null;
			return { event, data };
		});
}

describe('composition: failure injection', () => {
	it('emits SSE error when appendShare fails with UPSTREAM_UNAVAILABLE', async () => {
		const request = new Request('http://localhost/meeting/meeting-1/share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'topic',
				sequenceOrder: 1,
				characterId: 'marcus',
				userName: 'User',
				userMood: 'okay'
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				userId: 'user-1',
				seams: {
					database: {
						getMeetingShares: async () => ok([]),
						getMeetingPhase: async () => ok(null),
						updateMeetingPhase: async () => ok(undefined),
						getHeavyMemory: async () => ok([]),
						getActiveCallbacks: async () => ok([]),
						appendShare: async () =>
							err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'database unavailable')
					},
					grokAi: {
						generateShare: async (input: { characterId: string }) => {
							// Return quality validation pass if it's the quality validator
							if (input.characterId === 'quality-validator') {
								return ok({
									shareText: JSON.stringify({
										pass: true,
										voice_match: true,
										therapy_speak_found: [],
										authenticity: true
									}),
									tokenUsage: { inputTokens: 10, outputTokens: 10 }
								});
							}
							// Return candidate for character
							return ok({
								shareText: 'Hello world. This is a share.',
								tokenUsage: { inputTokens: 10, outputTokens: 10 }
							});
						}
					},
					auth: {}
				}
			}
		} as never);

		expect(response.status).toBe(200);
		const text = await response.text();
		const events = parseSseEvents(text);

		const errorEvent = events.find((event) => event.event === 'error');
		expect(errorEvent).toBeTruthy();
		// The error object structure is { ok: false, error: { ... } }
		// But parseSseEvents returns { event, data }. data IS the error object.
		const errorData = errorEvent?.data as { ok: boolean; error: { code: string } };
		expect(errorData.ok).toBe(false);
		expect(errorData.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
	});
});
