import { describe, expect, it } from 'vitest';
import { applyReferenceLifecycle } from './callback-lifecycle';
import { runCallbackLifecycleWorkflow } from './callback-lifecycle-workflow';
import { ok } from './seam';
import type { CallbackRecord } from '$lib/seams/database/contract';

function makeCallback(overrides: Partial<CallbackRecord> = {}): CallbackRecord {
	return {
		id: 'cb-seq',
		originShareId: 'share-1',
		characterId: 'marcus',
		originalText: 'trust the process in the hallway',
		callbackType: 'catchphrase',
		scope: 'character',
		potentialScore: 6,
		timesReferenced: 11,
		lastReferencedAt: '2026-01-01T00:00:00.000Z',
		status: 'active',
		parentCallbackId: null,
		...overrides
	};
}

describe('callback lifecycle integration sequence', () => {
	it('supports active -> stale -> retired -> legend progression across meetings', async () => {
		let callback = makeCallback();
		const createdChildren: Array<{ parentId: string; originShareId: string }> = [];

		const meeting1 = applyReferenceLifecycle({
			callback,
			referencingCharacterId: 'marcus',
			generatedShareText: 'trust process hallway',
			significanceScore: 5,
			nowIso: '2026-02-01T00:00:00.000Z'
		});
		expect(meeting1.status).toBe('stale');
		callback = { ...callback, ...meeting1 };

		const retirement = await runCallbackLifecycleWorkflow({
			meetingId: 'meeting-20',
			userId: 'user-1',
			presentCharacterIds: ['marcus'],
			database: {
				getActiveCallbacks: async () => ok([callback]),
				getMeetingCountAfterDate: async () => ok(18),
				updateCallback: async (input) => {
					callback = { ...callback, status: input.updates.status ?? callback.status };
					return ok(callback);
				}
			}
		});
		expect(retirement.ok).toBe(true);
		expect(callback.status).toBe('retired');

		const meeting21 = applyReferenceLifecycle({
			callback,
			referencingCharacterId: 'marcus',
			generatedShareText:
				'trust the process in the hallway became our kitchen prayer after midnight coffee',
			significanceScore: 9,
			nowIso: '2026-02-21T00:00:00.000Z'
		});
		expect(meeting21.status).toBe('legend');
		expect(meeting21.evolutionCandidate).not.toBeNull();

		if (meeting21.evolutionCandidate) {
			createdChildren.push({
				parentId: meeting21.evolutionCandidate.parentCallbackId ?? '',
				originShareId: 'share-21'
			});
		}

		expect(createdChildren).toEqual([{ parentId: 'cb-seq', originShareId: 'share-21' }]);
	});
});
