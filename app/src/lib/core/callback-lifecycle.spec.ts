import { describe, expect, it } from 'vitest';
import {
	applyReferenceLifecycle,
	CALLBACK_RETIRE_MEETING_GAP,
	CALLBACK_STALE_THRESHOLD,
	shouldRetireForInactivity
} from './callback-lifecycle';
import type { CallbackRecord } from '$lib/seams/database/contract';

function makeCallback(overrides: Partial<CallbackRecord> = {}): CallbackRecord {
	return {
		id: 'cb-1',
		originShareId: 'share-1',
		characterId: 'marcus',
		originalText: 'trust the process in the hallway',
		callbackType: 'catchphrase',
		scope: 'character',
		potentialScore: 6,
		timesReferenced: 2,
		lastReferencedAt: '2026-02-01T00:00:00.000Z',
		status: 'active',
		parentCallbackId: null,
		...overrides
	};
}

describe('callback lifecycle', () => {
	it('increments references and timestamps', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ timesReferenced: 5 }),
			referencingCharacterId: 'marcus',
			generatedShareText: 'trust the process in the hallway together',
			significanceScore: 5,
			nowIso: '2026-02-18T12:30:00.000Z'
		});

		expect(result.timesReferenced).toBe(6);
		expect(result.lastReferencedAt).toBe('2026-02-18T12:30:00.000Z');
	});

	it('widens character callback scope to room when another character reuses it', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ scope: 'character', characterId: 'marcus' }),
			referencingCharacterId: 'heather',
			generatedShareText: 'trust the process in the hallway every Tuesday',
			significanceScore: 5
		});

		expect(result.scope).toBe('room');
	});

	it('creates evolution candidate when overlap and novelty thresholds are met', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ originalText: 'trust the process in the hallway' }),
			referencingCharacterId: 'marcus',
			generatedShareText:
				'trust the process in the hallway became our kitchen prayer after midnight coffee',
			significanceScore: 8
		});

		expect(result.evolutionCandidate).not.toBeNull();
		expect(result.evolutionCandidate?.parentCallbackId).toBe('cb-1');
		expect(result.evolutionCandidate?.originalText).toContain('kitchen');
	});

	it('moves active callbacks to stale at threshold when no evolution occurs', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ status: 'active', timesReferenced: CALLBACK_STALE_THRESHOLD - 1 }),
			referencingCharacterId: 'marcus',
			generatedShareText: 'trust process hallway',
			significanceScore: 5
		});

		expect(result.status).toBe('stale');
		expect(result.evolutionCandidate).toBeNull();
	});

	it('moves stale callbacks back to active when evolution occurs', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ status: 'stale' }),
			referencingCharacterId: 'marcus',
			generatedShareText:
				'trust the process in the hallway turned into a rooftop ritual after sober sunrise',
			significanceScore: 7
		});

		expect(result.status).toBe('active');
		expect(result.evolutionCandidate).not.toBeNull();
	});

	it('revives retired callbacks into legend on high-significance reuse', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ status: 'retired' }),
			referencingCharacterId: 'marcus',
			generatedShareText: 'trust the process in the hallway came back tonight',
			significanceScore: 9
		});

		expect(result.status).toBe('legend');
	});

	it('does not revive retired callbacks on low-significance reuse', () => {
		const result = applyReferenceLifecycle({
			callback: makeCallback({ status: 'retired' }),
			referencingCharacterId: 'marcus',
			generatedShareText: 'trust the process in the hallway came back tonight',
			significanceScore: 6
		});

		expect(result.status).toBe('retired');
	});

	it('retires active/stale callbacks after inactivity gap', () => {
		expect(
			shouldRetireForInactivity({
				callback: makeCallback({ status: 'active' }),
				meetingsSinceLastReferenced: CALLBACK_RETIRE_MEETING_GAP
			})
		).toBe(true);
		expect(
			shouldRetireForInactivity({
				callback: makeCallback({ status: 'stale' }),
				meetingsSinceLastReferenced: CALLBACK_RETIRE_MEETING_GAP + 1
			})
		).toBe(true);
	});

	it('does not retire legend/retired callbacks by inactivity', () => {
		expect(
			shouldRetireForInactivity({
				callback: makeCallback({ status: 'legend' }),
				meetingsSinceLastReferenced: CALLBACK_RETIRE_MEETING_GAP + 30
			})
		).toBe(false);
		expect(
			shouldRetireForInactivity({
				callback: makeCallback({ status: 'retired' }),
				meetingsSinceLastReferenced: CALLBACK_RETIRE_MEETING_GAP + 30
			})
		).toBe(false);
	});
});
