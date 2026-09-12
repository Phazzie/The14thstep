import { describe, expect, it } from 'vitest';
import { load } from '../../../routes/meeting/[id]/+page.server';

function createDatabaseStub(overrides: Record<string, unknown> = {}) {
	const persistedParticipants = [
		{
			id: 'marcus',
			name: 'Marcus',
			tier: 'core' as const,
			status: 'active' as const,
			archetype: 'chair',
			wound: 'grief',
			contradiction: 'soft voice, hard edge',
			voice: 'measured',
			quirk: 'leans back before he speaks',
			color: '#c58a31',
			avatar: 'M',
			cleanTime: '12 years',
			meetingCount: 0,
			lastSeenAt: null,
			role: 'chair' as const,
			isVisitor: false,
			seatOrder: 0,
			sharesCount: 0
		}
	];

	return {
		getMeetingShares: async () => ({ ok: true, value: [] }),
		getMeetingPhase: async () => ({ ok: true, value: null }),
		getMeetingParticipants: async () => ({ ok: true, value: [] }),
		saveMeetingParticipants: async (_input: unknown) => ({ ok: true, value: persistedParticipants }),
		...overrides
	};
}

describe('meeting page server load', () => {
	it('flags initial crisis mode when setup mind text has crisis keywords', async () => {
		const result = await load({
			params: { id: 'meeting-1' },
			locals: {
				userId: 'user-1',
				seams: {
					database: createDatabaseStub()
				}
			},
			url: new URL('http://localhost/meeting/meeting-1?mind=I%20want%20to%20die')
		} as never);

		expect((result as { initialCrisisMode: boolean }).initialCrisisMode).toBe(true);
		expect((result as { shouldTriggerInitialCrisisSupport: boolean }).shouldTriggerInitialCrisisSupport).toBe(
			true
		);
	});

	it('keeps initial crisis mode false for non-crisis setup text', async () => {
		const result = await load({
			params: { id: 'meeting-1' },
			locals: {
				userId: 'user-1',
				seams: {
					database: createDatabaseStub()
				}
			},
			url: new URL('http://localhost/meeting/meeting-1?mind=Staying%20for%20the%20next%2024%20hours')
		} as never);

		expect((result as { initialCrisisMode: boolean }).initialCrisisMode).toBe(false);
	});

	it('loads crisis mode from persisted meeting shares on refresh', async () => {
		const result = await load({
			params: { id: 'meeting-1' },
			locals: {
				userId: 'user-1',
				seams: {
					database: createDatabaseStub({
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
					})
				}
			},
			url: new URL('http://localhost/meeting/meeting-1?mind=staying%20present')
		} as never);

		expect((result as { initialCrisisMode: boolean }).initialCrisisMode).toBe(true);
		expect((result as { shouldTriggerInitialCrisisSupport: boolean }).shouldTriggerInitialCrisisSupport).toBe(
			false
		);
	});

	it('returns persisted ritual phase state when available', async () => {
		const result = await load({
			params: { id: 'meeting-1' },
			locals: {
				userId: 'user-1',
				seams: {
					database: createDatabaseStub({
						getMeetingPhase: async () => ({
							ok: true,
							value: {
								currentPhase: 'crisis_mode',
								phaseStartedAt: new Date('2026-02-22T20:00:00.000Z'),
								roundNumber: 2,
								charactersSpokenThisRound: ['marcus'],
								userHasSharedInRound: true
							}
						})
					})
				}
			},
			url: new URL('http://localhost/meeting/meeting-1?mind=staying%20present')
		} as never);

		expect((result as { phaseState: { currentPhase: string } }).phaseState.currentPhase).toBe('crisis_mode');
		expect((result as { phaseState: { userHasSharedInRound: boolean } }).phaseState.userHasSharedInRound).toBe(
			true
		);
	});

	it('throws 404 when meeting phase lookup reports missing meeting', async () => {
		await expect(
			load({
				params: { id: 'missing-meeting' },
				locals: {
					userId: 'user-1',
					seams: {
						database: createDatabaseStub({
							getMeetingPhase: async () => ({
								ok: false,
								error: { code: 'NOT_FOUND', message: 'missing' }
							})
						})
					}
				},
				url: new URL('http://localhost/meeting/missing-meeting?mind=staying%20present')
			} as never)
		).rejects.toMatchObject({ status: 404 });
	});
});
