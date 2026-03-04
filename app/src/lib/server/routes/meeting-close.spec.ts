import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../../routes/meeting/[id]/close/+server';

describe('POST /meeting/[id]/close', () => {
	it('persists closing and post-meeting phase states and returns post-meeting phase', async () => {
		const updateMeetingPhase = vi.fn().mockResolvedValue({ ok: true, value: undefined });
		const completeMeeting = vi.fn().mockResolvedValue({
			ok: true,
			value: {
				id: 'meeting-1',
				userId: 'user-1',
				topic: 'staying',
				userMood: 'anxious',
				listeningOnly: false,
				startedAt: '2026-02-22T00:00:00.000Z',
				endedAt: '2026-02-22T00:10:00.000Z'
			}
		});
		const generateShare = vi.fn(async (input: { characterId: string }) => {
			if (input.characterId === 'summary-narrator') {
				return { ok: true, value: { shareText: 'Closing summary.' } };
			}
			if (input.characterId === 'memory-extractor') {
				return {
					ok: true,
					value: {
						shareText: JSON.stringify({
							userMemory: 'Stayed in the room.',
							highMoment: 'Asked for help.',
							characterThreads: {
								marcus: 'Marcus noted the honesty.',
								heather: 'Heather stayed direct.',
								meechie: 'Meechie cut through the noise.',
								gemini: 'Gemini found the contradiction.',
								gypsy: 'Gypsy kept it human.',
								chrystal: 'Chrystal held the line.'
							}
						})
					}
				};
			}
			if (input.characterId === 'callback-scanner') {
				return { ok: true, value: { shareText: '[]' } };
			}
			return { ok: true, value: { shareText: '' } };
		});

		const request = new Request('http://localhost/meeting/meeting-1/close', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ topic: 'staying' })
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				userId: null,
				seams: {
					auth: {} as never,
					grokAi: { generateShare } as never,
					database: {
						getMeetingPhase: async () => ({ ok: true, value: null }),
						updateMeetingPhase,
						getMeetingShares: async () => ({
							ok: true,
							value: [
								{
									id: 'share-1',
									meetingId: 'meeting-1',
									characterId: null,
									isUserShare: true,
									content: 'I am staying tonight.',
									significanceScore: 6,
									sequenceOrder: 0,
									createdAt: '2026-02-22T00:01:00.000Z'
								}
							]
						}),
						completeMeeting,
						createCallback: vi.fn().mockResolvedValue({ ok: true, value: { id: 'cb-1' } })
					} as never
				}
			}
		} as never);

		expect(response.status).toBe(200);
		expect(updateMeetingPhase).toHaveBeenCalledTimes(2);
		expect(updateMeetingPhase.mock.calls[0][1].currentPhase).toBe('closing');
		expect(updateMeetingPhase.mock.calls[1][1].currentPhase).toBe('post_meeting');
		expect(completeMeeting).toHaveBeenCalledTimes(1);
		expect(completeMeeting.mock.calls[0][0].notableMoments.characterThreads).toEqual(
			expect.objectContaining({
				marcus: expect.any(String)
			})
		);

		const payload = await response.json();
		expect(payload.ok).toBe(true);
		expect(payload.value.summary).toBe('Closing summary.');
		expect(payload.value.phaseState.currentPhase).toBe('post_meeting');
	});

	it('returns 404 when meeting phase lookup reports NOT_FOUND', async () => {
		const request = new Request('http://localhost/meeting/missing/close', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ topic: 'staying' })
		});

		const response = await POST({
			params: { id: 'missing' },
			request,
			locals: {
				userId: null,
				seams: {
					auth: {} as never,
					grokAi: { generateShare: vi.fn() } as never,
					database: {
						getMeetingPhase: async () => ({
							ok: false,
							error: { code: 'NOT_FOUND', message: 'missing meeting' }
						}),
						updateMeetingPhase: vi.fn(),
						getMeetingShares: vi.fn().mockResolvedValue({ ok: true, value: [] }),
						completeMeeting: vi.fn(),
						createCallback: vi.fn()
					} as never
				}
			}
		} as never);

		expect(response.status).toBe(404);
		const payload = await response.json();
		expect(payload.ok).toBe(false);
		expect(payload.error.code).toBe('NOT_FOUND');
	});
});
