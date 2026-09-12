import { describe, expect, it } from 'vitest';
import { CORE_CHARACTERS } from '$lib/core/characters';
import { MeetingPhase } from '$lib/core/types';
import { buildInteractionAwarePrompt, POST } from '../../../routes/meeting/[id]/share/+server';

describe('POST /meeting/[id]/share', () => {
	it('uses dedicated prompt builders for crosstalk, hard questions, and farewells', () => {
		const heather = CORE_CHARACTERS.find((character) => character.id === 'heather')!;
		const recentShares = [
			{ speaker: 'Marcus', content: 'Stay in your chair.' },
			{ speaker: 'You', content: 'I am trying not to run.' }
		];
		const recentTranscript = recentShares.map((share, index) => ({
			...share,
			isUserShare: index === 1
		}));

		const crosstalkPrompt = buildInteractionAwarePrompt(
			heather,
			MeetingPhase.SHARING_ROUND_1,
			'crosstalk',
			'Avery',
			'raw',
			'staying put',
			recentShares,
			recentTranscript
		);
		const hardQuestionPrompt = buildInteractionAwarePrompt(
			heather,
			MeetingPhase.SHARING_ROUND_2,
			'hard_question',
			'Avery',
			'raw',
			'staying put',
			recentShares,
			recentTranscript
		);
		const farewellPrompt = buildInteractionAwarePrompt(
			heather,
			MeetingPhase.POST_MEETING,
			'farewell',
			'Avery',
			'raw',
			'staying put',
			recentShares,
			recentTranscript
		);

		expect(crosstalkPrompt).toContain('one-sentence crosstalk reaction');
		expect(crosstalkPrompt).toContain('Previous share: I am trying not to run.');
		expect(hardQuestionPrompt).toContain('Write one hard but fair question for Avery.');
		expect(hardQuestionPrompt).toContain('I am trying not to run.');
		expect(farewellPrompt).toContain('gives one short goodbye to Avery');
		expect(farewellPrompt).not.toContain('Recent room context');
	});

	it('uses the topic acknowledgment prompt when Marcus answers a chosen topic', () => {
		const marcus = CORE_CHARACTERS.find((character) => character.id === 'marcus')!;
		const recentShares = [{ speaker: 'You', content: 'I need to talk about staying.' }];
		const recentTranscript = recentShares.map((share) => ({
			...share,
			isUserShare: true
		}));

		const topicAckPrompt = buildInteractionAwarePrompt(
			marcus,
			MeetingPhase.TOPIC_SELECTION,
			'respond_to',
			'Avery',
			'raw',
			'Staying clean when everything falls apart',
			recentShares,
			recentTranscript
		);

		expect(topicAckPrompt).toContain('Marcus acknowledges the selected topic.');
		expect(topicAckPrompt).toContain('Topic: Staying clean when everything falls apart');
	});

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
						getMeetingParticipants: async () => ({ ok: true, value: [] }),
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
						getMeetingParticipants: async () => ({ ok: true, value: [] }),
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
										interactionType: 'standard',
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
						getMeetingParticipants: async () => ({ ok: true, value: [] }),
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

	it('returns 409 when persisted ritual phase state is post_meeting', async () => {
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
								currentPhase: 'post_meeting',
								phaseStartedAt: new Date('2026-02-22T00:00:00.000Z'),
								charactersSpokenThisRound: [],
								userHasSharedInRound: false
							}
						}),
						getMeetingParticipants: async () => ({ ok: true, value: [] }),
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
		expect(payload.error.message).toContain('after the meeting closes');
	});

	it('returns 404 when meeting phase pre-check reports NOT_FOUND', async () => {
		const request = new Request('http://localhost/meeting/missing/share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'staying sober today',
				sequenceOrder: 0,
				crisisMode: false
			})
		});

		const response = await POST({
			params: { id: 'missing' },
			request,
			locals: {
				userId: null,
				seams: {
					database: {
						getMeetingPhase: async () => ({
							ok: false,
							error: { code: 'NOT_FOUND', message: 'missing meeting' }
						}),
						getMeetingParticipants: async () => ({ ok: true, value: [] }),
						getMeetingShares: async () => ({ ok: true, value: [] })
					} as never,
					grokAi: {} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(404);
		const payload = await response.json();
		expect(payload.ok).toBe(false);
		expect(payload.error.code).toBe('NOT_FOUND');
	});
});
