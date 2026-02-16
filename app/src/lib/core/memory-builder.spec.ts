import { describe, expect, it } from 'vitest';
import { err, ok, SeamErrorCodes } from './seam';
import { buildPromptContext } from './memory-builder';
import type { ShareRecord } from '$lib/seams/database/contract';
import type { CallbackRecord } from './types';

const shares: ShareRecord[] = [
	{
		id: 's1',
		meetingId: 'm1',
		characterId: 'marcus',
		isUserShare: false,
		content: 'standard',
		significanceScore: 3,
		sequenceOrder: 1,
		createdAt: '2026-02-10T00:00:00.000Z'
	},
	{
		id: 's2',
		meetingId: 'm2',
		characterId: null,
		isUserShare: true,
		content: 'heavy user event',
		significanceScore: 6,
		sequenceOrder: 2,
		createdAt: '2026-02-11T00:00:00.000Z'
	},
	{
		id: 's3',
		meetingId: 'm3',
		characterId: 'heather',
		isUserShare: false,
		content: 'breakthrough',
		significanceScore: 8,
		sequenceOrder: 3,
		createdAt: '2026-02-12T00:00:00.000Z'
	},
	{
		id: 's4',
		meetingId: 'm4',
		characterId: 'gypsy',
		isUserShare: false,
		content: 'low score but in last meeting',
		significanceScore: 2,
		sequenceOrder: 4,
		createdAt: '2026-02-13T00:00:00.000Z'
	}
];

const callbacks: CallbackRecord[] = [
	{
		id: 'c1',
		originShareId: 's3',
		characterId: 'marcus',
		originalText: 'coffee cup callback',
		callbackType: 'quirk_habit',
		scope: 'character',
		potentialScore: 8,
		timesReferenced: 2,
		status: 'active',
		lastReferencedAt: null,
		parentCallbackId: null
	},
	{
		id: 'c2',
		originShareId: 's2',
		characterId: 'heather',
		originalText: 'room callback',
		callbackType: 'room_meta',
		scope: 'room',
		potentialScore: 7,
		timesReferenced: 4,
		status: 'legend',
		lastReferencedAt: null,
		parentCallbackId: null
	},
	{
		id: 'c3',
		originShareId: 's1',
		characterId: 'marcus',
		originalText: 'stale callback',
		callbackType: 'catchphrase',
		scope: 'character',
		potentialScore: 3,
		timesReferenced: 13,
		status: 'stale',
		lastReferencedAt: null,
		parentCallbackId: null
	}
];

describe('buildPromptContext', () => {
	it('returns filtered heavy memory and callback lines', async () => {
		const result = await buildPromptContext({
			userId: 'user-1',
			characterId: 'marcus',
			meetingId: 'meeting-1',
			database: {
				getHeavyMemory: async () => ok(shares),
				getActiveCallbacks: async () => ok(callbacks),
				getUserById: async () =>
					ok({
						id: 'user-1',
						displayName: 'trap',
						cleanTime: '19 days',
						meetingCount: 12,
						firstMeetingAt: '2025-12-01T00:00:00.000Z',
						lastMeetingAt: '2026-02-13T00:00:00.000Z'
					})
			}
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.heavyMemory).toHaveLength(3);
			expect(result.value.callbacks).toHaveLength(2);
			expect(result.value.heavyMemoryLines[0]).toContain('score 6');
			expect(result.value.callbackLines[0]).toContain('quirk_habit');
			expect(result.value.continuityLines.join(' ')).toContain('Attendance count');
		}
	});

	it('returns input error for malformed input', async () => {
		const result = await buildPromptContext({
			userId: '',
			characterId: 'marcus',
			meetingId: 'meeting-1',
			database: { getHeavyMemory: async () => ok([]) }
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.INPUT_INVALID);
		}
	});

	it('propagates seam errors', async () => {
		const result = await buildPromptContext({
			userId: 'user-1',
			characterId: 'marcus',
			meetingId: 'meeting-1',
			database: {
				getHeavyMemory: async () => err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'db timeout')
			}
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
		}
	});
});
