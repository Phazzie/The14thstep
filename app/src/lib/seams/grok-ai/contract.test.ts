import { describe, expect, it } from 'vitest';
import { SeamErrorCodes } from '$lib/core/seam';
import {
	GROK_AI_ERROR_CODES,
	validateGenerateShareInput,
	validateGenerateShareOutput
} from './contract';
import { createGrokAiMock } from './mock';
import sampleFixture from './fixtures/sample.json';
import faultFixture from './fixtures/fault.json';

describe('grok-ai seam contract', () => {
	it('accepts documented seam error codes', () => {
		expect(GROK_AI_ERROR_CODES).toContain(SeamErrorCodes.UPSTREAM_UNAVAILABLE);
		expect(GROK_AI_ERROR_CODES).toContain(SeamErrorCodes.CONTRACT_VIOLATION);
	});

	it('validates sample output fixture shape', () => {
		expect(validateGenerateShareOutput(sampleFixture)).toBe(true);
	});

	it('mock returns the sample fixture output exactly', async () => {
		const mock = createGrokAiMock();
		const result = await mock.generateShare({
			meetingId: 'meeting-1',
			characterId: 'marcus',
			prompt: 'Generate a grounded share.',
			contextMessages: [{ role: 'system', content: 'You are Marcus.' }],
			stream: false
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(sampleFixture);
		}
	});

	it('mock surfaces fixture-based fault scenario', async () => {
		const mock = createGrokAiMock({ scenario: 'fault' });
		const result = await mock.generateShare({
			meetingId: 'meeting-1',
			characterId: 'heather',
			prompt: 'Generate a direct share.',
			contextMessages: [{ role: 'user', content: 'Keep it honest.' }]
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe((faultFixture as { code: string }).code);
			expect(result.error.message).toBe((faultFixture as { message: string }).message);
		}
	});

	it('rejects malformed input during validation', () => {
		expect(validateGenerateShareInput({})).toBe(false);
		expect(validateGenerateShareInput({ meetingId: 'ok', contextMessages: [] })).toBe(false);
	});
});
