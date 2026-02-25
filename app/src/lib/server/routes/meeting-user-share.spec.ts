import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../../routes/meeting/[id]/user-share/+server';

describe('POST /meeting/[id]/user-share', () => {
	it('uses AI triage and persists crisis shares at significance 10', async () => {
		const generateShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: {
				shareText: '{"crisis":true,"confidence":"high","reason":"direct self-harm intent"}'
			}
		});
		const appendShare = vi
			.fn()
			.mockImplementation(async (input: { significanceScore: number }) => ({
				ok: true,
				value: {
					id: 'share-1',
					meetingId: 'meeting-1',
					characterId: null,
					isUserShare: true,
					content: 'I want to die tonight.',
					significanceScore: input.significanceScore,
					sequenceOrder: 0,
					createdAt: '2026-02-19T00:00:00.000Z'
				}
			}));
		const updateMeetingPhase = vi.fn().mockResolvedValue({ ok: true, value: undefined });

		const request = new Request('http://localhost/meeting/meeting-1/user-share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				content: 'I want to die tonight.',
				sequenceOrder: 0
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				seams: {
					grokAi: { generateShare } as never,
					database: {
						appendShare,
						getMeetingPhase: async () => ({ ok: true, value: null }),
						updateMeetingPhase
					} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(200);
		expect(generateShare.mock.calls[0][0].characterId).toBe('crisis-triage');
		expect(appendShare.mock.calls[0][0].significanceScore).toBe(10);
		expect(updateMeetingPhase).toHaveBeenCalledTimes(1);

		const payload = await response.json();
		expect(payload.ok).toBe(true);
		expect(payload.value.crisis).toBe(true);
		expect(payload.value.phaseState.currentPhase).toBe('opening');
	});

	it('falls back to crisis=true on ambiguous AI JSON parse', async () => {
		const generateShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: { shareText: 'not valid json' }
		});
		const appendShare = vi
			.fn()
			.mockImplementation(async (input: { significanceScore: number }) => ({
				ok: true,
				value: {
					id: 'share-2',
					meetingId: 'meeting-1',
					characterId: null,
					isUserShare: true,
					content: 'I do not know what to do.',
					significanceScore: input.significanceScore,
					sequenceOrder: 1,
					createdAt: '2026-02-19T00:00:01.000Z'
				}
			}));
		const updateMeetingPhase = vi.fn().mockResolvedValue({ ok: true, value: undefined });

		const request = new Request('http://localhost/meeting/meeting-1/user-share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				content: 'I do not know what to do.',
				sequenceOrder: 1
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				seams: {
					grokAi: { generateShare } as never,
					database: {
						appendShare,
						getMeetingPhase: async () => ({ ok: true, value: null }),
						updateMeetingPhase
					} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(200);
		expect(appendShare.mock.calls[0][0].significanceScore).toBe(10);
		expect(updateMeetingPhase).toHaveBeenCalledTimes(1);

		const payload = await response.json();
		expect(payload.ok).toBe(true);
		expect(payload.value.crisis).toBe(true);
		expect(payload.value.phaseState.currentPhase).toBe('opening');
	});

	it('skips phase persistence when phase load fails to avoid overwriting in-flight state', async () => {
		const generateShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: { shareText: '{"crisis":false,"confidence":"high"}' }
		});
		const appendShare = vi.fn().mockResolvedValue({
			ok: true,
			value: {
				id: 'share-3',
				meetingId: 'meeting-1',
				characterId: null,
				isUserShare: true,
				content: 'I am staying with it.',
				significanceScore: 4,
				sequenceOrder: 2,
				createdAt: '2026-02-19T00:00:02.000Z'
			}
		});
		const updateMeetingPhase = vi.fn().mockResolvedValue({ ok: true, value: undefined });

		const request = new Request('http://localhost/meeting/meeting-1/user-share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				content: 'I am staying with it.',
				sequenceOrder: 2
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				seams: {
					grokAi: { generateShare } as never,
					database: {
						appendShare,
						getMeetingPhase: async () => ({
							ok: false,
							error: { code: 'UPSTREAM_UNAVAILABLE', message: 'db unavailable' }
						}),
						updateMeetingPhase
					} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(200);
		expect(updateMeetingPhase).not.toHaveBeenCalled();
		const payload = await response.json();
		expect(payload.ok).toBe(true);
	});

	it('returns 409 when persisted ritual phase state is post_meeting', async () => {
		const generateShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: { shareText: '{"crisis":false,"confidence":"high"}' }
		});
		const appendShare = vi.fn();
		const updateMeetingPhase = vi.fn();

		const request = new Request('http://localhost/meeting/meeting-1/user-share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				content: 'too late share',
				sequenceOrder: 3
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				seams: {
					grokAi: { generateShare } as never,
					database: {
						appendShare,
						getMeetingPhase: async () => ({
							ok: true,
							value: {
								currentPhase: 'post_meeting',
								phaseStartedAt: new Date('2026-02-22T00:00:00.000Z'),
								charactersSpokenThisRound: [],
								userHasSharedInRound: false
							}
						}),
						updateMeetingPhase
					} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(409);
		expect(appendShare).not.toHaveBeenCalled();
		expect(updateMeetingPhase).not.toHaveBeenCalled();
		const payload = await response.json();
		expect(payload.ok).toBe(false);
		expect(payload.error.message).toContain('after the meeting closes');
	});
});
