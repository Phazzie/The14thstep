import { describe, expect, it, vi } from 'vitest';
import { SeamErrorCodes, err, ok } from '$lib/core/seam';
import {
	POST as shareRoutePost,
	GET as shareRouteGet
} from '../../src/routes/meeting/[id]/share/+server';

vi.mock('$lib/server/seams/auth/adapter', () => ({
	createAuthAdapter: () => ({
		getSession: async () => err(SeamErrorCodes.UNAUTHORIZED, 'session unavailable'),
		signOut: async () => ok({ success: true })
	})
}));

vi.mock('$lib/server/seams/database/adapter', () => ({
	createDatabaseAdapter: () =>
		({
			getUserById: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			createMeeting: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			appendShare: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			getHeavyMemory: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			getShareById: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			getMeetingShares: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			getMeetingPhase: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			updateMeetingPhase: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			createCallback: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			getActiveCallbacks: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			markCallbackReferenced: async () =>
				err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			completeMeeting: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			updateCallback: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable'),
			getMeetingCountAfterDate: async () =>
				err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable')
		}) as never
}));

vi.mock('$lib/server/seams/grok-ai/adapter', () => ({
	createGrokAiAdapter: () =>
		({
			generateShare: async () => err(SeamErrorCodes.RATE_LIMITED, 'rate limited')
		}) as never
}));

import { handle } from '../../src/hooks.server';

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

describe('composition: seam failure injection', () => {
	it('handles database upstream failure while resolving persisted crisis state', async () => {
		const request = new Request('http://localhost/meeting/meeting-1/share', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'staying sober',
				sequenceOrder: 0,
				crisisMode: false
			})
		});

		const response = await shareRoutePost({
			params: { id: 'meeting-1' },
			request,
			locals: {
				userId: 'user-1',
				seams: {
					database: {
						getMeetingShares: async () =>
							err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'database unavailable')
					} as never,
					grokAi: {} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(503);
		const payload = await response.json();
		expect(payload.ok).toBe(false);
		expect(payload.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
	});

	it('emits SSE error when grok generation is rate-limited', async () => {
		const response = await shareRouteGet({
			params: { id: 'meeting-2' },
			url: new URL(
				'http://localhost/meeting/meeting-2/share?topic=staying%20sober&sequenceOrder=0&characterId=marcus'
			),
			locals: {
				userId: 'user-2',
				seams: {
					database: {
						getMeetingShares: async () => ok([]),
						getMeetingPhase: async () => ok(null),
						updateMeetingPhase: async () => ok(undefined),
						getHeavyMemory: async () => ok([]),
						getActiveCallbacks: async () => ok([])
					} as never,
					grokAi: {
						generateShare: async () => err(SeamErrorCodes.RATE_LIMITED, 'rate limited')
					} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(200);
		const events = parseSseEvents(await response.text());
		const errorEvent = events.find((event) => event.event === 'error');
		expect(errorEvent).toBeTruthy();
		expect((errorEvent?.data as { error?: { code?: string } })?.error?.code).toBe(
			SeamErrorCodes.RATE_LIMITED
		);
	});

	it('continues request resolution when auth seam fails in hooks', async () => {
		const resolve = vi.fn(async () => new Response('ok', { status: 200 }));
		const event = {
			request: new Request('http://localhost/'),
			locals: {}
		};

		const response = await handle({
			event: event as never,
			resolve: resolve as never
		});

		expect(response.status).toBe(200);
		expect(resolve).toHaveBeenCalledTimes(1);
		expect((event.locals as { userId?: string | null }).userId).toBeNull();
	});

	it('emits SSE error when appendShare fails', async () => {
		const response = await shareRouteGet({
			params: { id: 'meeting-3' },
			url: new URL(
				'http://localhost/meeting/meeting-3/share?topic=test&sequenceOrder=0'
			),
			locals: {
				userId: 'user-3',
				seams: {
					database: {
						getMeetingShares: async () => ok([]),
						getMeetingPhase: async () => ok(null),
						updateMeetingPhase: async () => ok(undefined),
						getHeavyMemory: async () => ok([]),
						getActiveCallbacks: async () => ok([]),
						appendShare: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db unavailable')
					} as never,
					grokAi: {
						generateShare: async () =>
							ok({ shareText: 'generated content', attempts: 1, fallbackUsed: false })
					} as never,
					auth: {} as never
				}
			}
		} as never);

		expect(response.status).toBe(200);
		const events = parseSseEvents(await response.text());
		const errorEvent = events.find((event) => event.event === 'error');
		expect(errorEvent).toBeTruthy();
		expect((errorEvent?.data as { error?: { code?: string } })?.error?.code).toBe(
			SeamErrorCodes.UPSTREAM_UNAVAILABLE
		);
	});

	it('retries updateMeetingPhase on failure', async () => {
		const updateSpy = vi
			.fn()
			.mockResolvedValueOnce(err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'fail 1'))
			.mockResolvedValueOnce(ok(undefined));

		const response = await shareRouteGet({
			params: { id: 'meeting-4' },
			url: new URL(
				'http://localhost/meeting/meeting-4/share?topic=test&sequenceOrder=0'
			),
			locals: {
				userId: 'user-4',
				seams: {
					database: {
						getMeetingShares: async () => ok([]),
						getMeetingPhase: async () => ok(null),
						updateMeetingPhase: updateSpy,
						getHeavyMemory: async () => ok([]),
						getActiveCallbacks: async () => ok([]),
						appendShare: async () =>
							ok({ id: 'share-1', createdAt: new Date().toISOString() })
					} as never,
					grokAi: {
						generateShare: async () =>
							ok({ shareText: 'generated content', attempts: 1, fallbackUsed: false })
					} as never,
					auth: {} as never
				}
			}
		} as never);

		// Consume stream
		await response.text();

		expect(updateSpy).toHaveBeenCalledTimes(2);
	});
});
