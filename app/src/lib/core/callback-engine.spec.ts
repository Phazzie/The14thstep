import { describe, expect, it } from 'vitest';
import { resolveCallbackProbability, shouldIncludeCallback } from './callback-engine';
import type { CallbackRecord } from './types';

const baseCallback: CallbackRecord = {
	id: 'cb-1',
	originShareId: 'share-1',
	characterId: 'marcus',
	originalText: 'I almost bounced and stayed in my chair.',
	callbackType: 'self_deprecation',
	scope: 'character',
	potentialScore: 7,
	timesReferenced: 0,
	status: 'active',
	lastReferencedAt: null,
	parentCallbackId: null
};

describe('callback engine', () => {
	it('uses baseline probability when no specific rule matches', () => {
		const resolved = resolveCallbackProbability({
			callback: baseCallback,
			currentCharacterId: 'heather',
			currentCharacterMeetingCount: 10,
			originatedCallbacksCount: 1
		});

		expect(resolved.rule).toBe('baseline');
		expect(resolved.probability).toBe(0.4);
	});

	it('prioritizes user opening overlap at 90%', () => {
		const resolved = resolveCallbackProbability({
			callback: baseCallback,
			currentCharacterId: 'heather',
			currentCharacterMeetingCount: 10,
			originatedCallbacksCount: 1,
			latestUserShareText: 'I almost bounced before coming in tonight.'
		});

		expect(resolved.rule).toBe('user_opening_overlap');
		expect(resolved.probability).toBe(0.9);
	});

	it('applies stale suppression at 5%', () => {
		const resolved = resolveCallbackProbability({
			callback: { ...baseCallback, status: 'stale' },
			currentCharacterId: 'marcus',
			currentCharacterMeetingCount: 10,
			originatedCallbacksCount: 4
		});

		expect(resolved.rule).toBe('status_stale');
		expect(resolved.probability).toBe(0.05);
	});

	it('applies retired suppression at 2%', () => {
		const resolved = resolveCallbackProbability({
			callback: { ...baseCallback, status: 'retired' },
			currentCharacterId: 'marcus',
			currentCharacterMeetingCount: 10,
			originatedCallbacksCount: 4
		});

		expect(resolved.rule).toBe('status_retired');
		expect(resolved.probability).toBe(0.02);
	});

	it('applies 65% for callbacks unused for 5+ meetings', () => {
		const resolved = resolveCallbackProbability({
			callback: baseCallback,
			currentCharacterId: 'heather',
			currentCharacterMeetingCount: 10,
			originatedCallbacksCount: 1,
			meetingsSinceLastReferenced: 6
		});

		expect(resolved.rule).toBe('unused_five_or_more');
		expect(resolved.probability).toBe(0.65);
	});

	it('applies 15% when callback was used last meeting', () => {
		const resolved = resolveCallbackProbability({
			callback: baseCallback,
			currentCharacterId: 'heather',
			currentCharacterMeetingCount: 10,
			originatedCallbacksCount: 1,
			meetingsSinceLastReferenced: 1
		});

		expect(resolved.rule).toBe('used_last_meeting');
		expect(resolved.probability).toBe(0.15);
	});

	it('applies 10% for new characters', () => {
		const resolved = resolveCallbackProbability({
			callback: baseCallback,
			currentCharacterId: 'newcomer',
			currentCharacterMeetingCount: 1,
			originatedCallbacksCount: 0
		});

		expect(resolved.rule).toBe('new_character');
		expect(resolved.probability).toBe(0.1);
	});

	it('uses highest probability among same specificity matches', () => {
		const resolved = resolveCallbackProbability({
			callback: baseCallback,
			currentCharacterId: 'marcus',
			currentCharacterMeetingCount: 1,
			originatedCallbacksCount: 0
		});

		expect(resolved.rule).toBe('origin_character');
		expect(resolved.probability).toBe(0.55);
	});

	it('returns include true when roll is below probability', () => {
		const decision = shouldIncludeCallback(
			{
				callback: baseCallback,
				currentCharacterId: 'heather',
				currentCharacterMeetingCount: 10,
				originatedCallbacksCount: 1
			},
			0.2
		);

		expect(decision.include).toBe(true);
	});

	it('returns include false when roll is above probability', () => {
		const decision = shouldIncludeCallback(
			{
				callback: baseCallback,
				currentCharacterId: 'heather',
				currentCharacterMeetingCount: 10,
				originatedCallbacksCount: 1
			},
			0.9
		);

		expect(decision.include).toBe(false);
	});
});
