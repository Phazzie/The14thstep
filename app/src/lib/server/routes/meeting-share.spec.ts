import { describe, expect, it } from 'vitest';
import { POST } from '../../../routes/meeting/[id]/share/+server';

describe('POST /meeting/[id]/share', () => {
	it('returns 409 when crisisMode is enabled', async () => {
		const request = new Request('http://localhost/meeting/meeting-1/share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'staying sober today',
				sequenceOrder: 0,
				crisisMode: true,
				recentShares: []
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				userId: null,
				seams: {
					database: {} as never,
					grokAi: {} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(409);
		const payload = await response.json();
		expect(payload.ok).toBe(false);
		expect(payload.error.code).toBe('INPUT_INVALID');
		expect(payload.error.message).toContain('paused during crisis mode');
	});
});
