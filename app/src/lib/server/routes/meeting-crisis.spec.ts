import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../../routes/meeting/[id]/crisis/+server';

describe('POST /meeting/[id]/crisis', () => {
	it('enforces pause and returns a single designated crisis response with hotline resources', async () => {
		vi.useFakeTimers();
		const generateShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: { shareText: 'Marcus support response.' }
		});
		const appendShare = vi.fn().mockResolvedValueOnce({
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
		});
		const updateMeetingPhase = vi.fn().mockResolvedValue({ ok: true, value: undefined });

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
					database: {
						appendShare,
						getMeetingPhase: async () => ({ ok: true, value: null }),
						updateMeetingPhase
					} as never,
					auth: {} as never
				}
			}
		} as never);

		await vi.advanceTimersByTimeAsync(1999);
		expect(generateShare).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		const response = await responsePromise;
		expect(response.status).toBe(200);
		expect(generateShare).toHaveBeenCalledTimes(1);
		expect(generateShare.mock.calls[0][0].characterId).toBe('marcus');

		const payload = await response.json();
		expect(payload.ok).toBe(true);
		expect(payload.value.shares).toHaveLength(1);
		expect(payload.value.phaseState.currentPhase).toBe('crisis_mode');
		expect(updateMeetingPhase).toHaveBeenCalledTimes(1);
		expect(payload.value.resources.sticky).toBe(true);
		expect(payload.value.resources.lines).toContain('Call or text 988 - Suicide & Crisis Lifeline');
		expect(payload.value.resources.lines).toContain('Text HOME to 741741 - Crisis Text Line');

		vi.useRealTimers();
	});

	it('can interrupt from closing by persisting crisis_mode', async () => {
		vi.useFakeTimers();
		const generateShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: { shareText: 'Marcus support response during closing.' }
		});
		const appendShare = vi.fn().mockResolvedValueOnce({
			ok: true,
			value: {
				id: 'share-2',
				meetingId: 'meeting-1',
				characterId: 'marcus',
				isUserShare: false,
				content: 'Marcus support response during closing.',
				significanceScore: 10,
				sequenceOrder: 9,
				createdAt: '2026-02-19T00:00:01.000Z'
			}
		});
		const updateMeetingPhase = vi.fn().mockResolvedValue({ ok: true, value: undefined });

		const request = new Request('http://localhost/meeting/meeting-1/crisis', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				userText: 'I am spinning out right at the end',
				userName: 'You',
				sequenceOrder: 9
			})
		});

		const responsePromise = POST({
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
								currentPhase: 'closing',
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

		await vi.advanceTimersByTimeAsync(2000);
		const response = await responsePromise;

		expect(response.status).toBe(200);
		expect(updateMeetingPhase).toHaveBeenCalledTimes(1);
		expect(updateMeetingPhase.mock.calls[0][1].currentPhase).toBe('crisis_mode');
		const payload = await response.json();
		expect(payload.ok).toBe(true);
		expect(payload.value.phaseState.currentPhase).toBe('crisis_mode');

		vi.useRealTimers();
	});
});
