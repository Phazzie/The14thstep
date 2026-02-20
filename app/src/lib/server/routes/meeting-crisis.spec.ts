import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../../routes/meeting/[id]/crisis/+server';

describe('POST /meeting/[id]/crisis', () => {
	it('enforces pause and returns Marcus then Heather responses', async () => {
		vi.useFakeTimers();
		const generateShare = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, value: { shareText: 'Marcus support response.' } })
			.mockResolvedValueOnce({ ok: true, value: { shareText: 'Heather support response.' } });
		const appendShare = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				value: {
					id: 'share-1',
					meetingId: 'meeting-1',
					characterId: 'marcus',
					isUserShare: false,
					content: 'Marcus support response.',
					significanceScore: 10,
					sequenceOrder: 1,
					createdAt: '2026-02-19T00:00:00.000Z'
				}
			})
			.mockResolvedValueOnce({
				ok: true,
				value: {
					id: 'share-2',
					meetingId: 'meeting-1',
					characterId: 'heather',
					isUserShare: false,
					content: 'Heather support response.',
					significanceScore: 10,
					sequenceOrder: 2,
					createdAt: '2026-02-19T00:00:02.000Z'
				}
			});

		const request = new Request('http://localhost/meeting/meeting-1/crisis', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				userText: 'I want to die tonight',
				userName: 'You',
				sequenceOrder: 1
			})
		});

		const responsePromise = POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				seams: {
					grokAi: { generateShare } as never,
					database: { appendShare } as never,
					auth: {} as never
				}
			}
		} as never);

		await vi.advanceTimersByTimeAsync(1999);
		expect(generateShare).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		const response = await responsePromise;
		expect(response.status).toBe(200);
		expect(generateShare).toHaveBeenCalledTimes(2);
		expect(generateShare.mock.calls[0][0].characterId).toBe('marcus');
		expect(generateShare.mock.calls[1][0].characterId).toBe('heather');

		const payload = await response.json();
		expect(payload.ok).toBe(true);
		expect(payload.value.shares).toHaveLength(2);
		expect(payload.value.resources.sticky).toBe(true);

		vi.useRealTimers();
	});
});
