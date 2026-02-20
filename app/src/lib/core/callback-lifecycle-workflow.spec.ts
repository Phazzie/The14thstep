import { describe, expect, it } from 'vitest';
import { err, ok } from '$lib/core/seam';
import type { CallbackRecord } from '$lib/seams/database/contract';
import { runCallbackLifecycleWorkflow } from './callback-lifecycle-workflow';

function makeCallback(overrides: Partial<CallbackRecord> = {}): CallbackRecord {
	return {
		id: 'cb-1',
		originShareId: 'share-1',
		characterId: 'marcus',
		originalText: 'trust the process in the hallway',
		callbackType: 'catchphrase',
		scope: 'character',
		potentialScore: 6,
		timesReferenced: 3,
		lastReferencedAt: '2026-02-01T00:00:00.000Z',
		status: 'active',
		parentCallbackId: null,
		...overrides
	};
}

describe('runCallbackLifecycleWorkflow', () => {
	it('retires callbacks when inactivity crosses threshold', async () => {
		const updates: Array<{ id: string; status?: string }> = [];
		const result = await runCallbackLifecycleWorkflow({
			meetingId: 'meeting-1',
			userId: 'user-1',
			presentCharacterIds: ['marcus'],
			database: {
				getActiveCallbacks: async () => ok([makeCallback()]),
				getMeetingCountAfterDate: async () => ok(20),
				updateCallback: async (input) => {
					updates.push({ id: input.id, status: input.updates.status });
					return ok(makeCallback({ id: input.id, status: input.updates.status ?? 'active' }));
				}
			}
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.retired).toBe(1);
			expect(result.value.evaluated).toBe(1);
		}
		expect(updates).toEqual([{ id: 'cb-1', status: 'retired' }]);
	});

	it('deduplicates room callbacks returned from multiple characters', async () => {
		const callback = makeCallback({ id: 'room-callback', scope: 'room', status: 'active' });
		let countChecks = 0;
		const result = await runCallbackLifecycleWorkflow({
			meetingId: 'meeting-1',
			userId: 'user-1',
			presentCharacterIds: ['marcus', 'heather'],
			database: {
				getActiveCallbacks: async () => ok([callback]),
				getMeetingCountAfterDate: async () => {
					countChecks += 1;
					return ok(3);
				},
				updateCallback: async (input) => ok(makeCallback({ id: input.id }))
			}
		});

		expect(result.ok).toBe(true);
		expect(countChecks).toBe(1);
		if (result.ok) {
			expect(result.value.evaluated).toBe(1);
			expect(result.value.retired).toBe(0);
		}
	});

	it('propagates seam errors when lifecycle queries fail', async () => {
		const result = await runCallbackLifecycleWorkflow({
			meetingId: 'meeting-1',
			userId: 'user-1',
			presentCharacterIds: ['marcus'],
			database: {
				getActiveCallbacks: async () => ok([makeCallback()]),
				getMeetingCountAfterDate: async () => err('UPSTREAM_UNAVAILABLE', 'database timeout'),
				updateCallback: async (input) => ok(makeCallback({ id: input.id }))
			}
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('UPSTREAM_UNAVAILABLE');
		}
	});
});
