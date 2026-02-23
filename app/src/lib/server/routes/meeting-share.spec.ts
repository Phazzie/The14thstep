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
					database: {
						getMeetingPhase: async () => ({ ok: true, value: null }),
						getMeetingShares: async () =>
							({
								ok: true,
								value: []
							}) as never
					} as never,
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

	it('returns 409 when persisted meeting state is in crisis', async () => {
		const request = new Request('http://localhost/meeting/meeting-1/share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'staying sober today',
				sequenceOrder: 0,
				crisisMode: false,
				recentShares: []
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				userId: null,
				seams: {
					database: {
						getMeetingPhase: async () => ({ ok: true, value: null }),
						getMeetingShares: async () =>
							({
								ok: true,
								value: [
									{
										id: 'share-1',
										meetingId: 'meeting-1',
										characterId: null,
										isUserShare: true,
										content: 'I want to die tonight',
										significanceScore: 10,
										sequenceOrder: 1,
										createdAt: '2026-02-19T00:00:00.000Z'
									}
								]
							}) as never
					} as never,
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

	it('returns 409 when persisted ritual phase state is already crisis_mode', async () => {
		const request = new Request('http://localhost/meeting/meeting-1/share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'staying sober today',
				sequenceOrder: 0,
				crisisMode: false
			})
		});

		const response = await POST({
			params: { id: 'meeting-1' },
			request,
			locals: {
				userId: null,
				seams: {
					database: {
						getMeetingPhase: async () => ({
							ok: true,
							value: {
								currentPhase: 'crisis_mode',
								phaseStartedAt: new Date('2026-02-22T00:00:00.000Z'),
								charactersSpokenThisRound: [],
								userHasSharedInRound: false
							}
						}),
						getMeetingShares: async () => ({ ok: true, value: [] })
					} as never,
					grokAi: {} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(409);
		const payload = await response.json();
		expect(payload.ok).toBe(false);
		expect(payload.error.message).toContain('paused during crisis mode');
	});
});
