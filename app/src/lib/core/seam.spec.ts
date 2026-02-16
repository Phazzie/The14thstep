import { describe, expect, it } from 'vitest';
import { SeamErrorCodes, err, ok } from './seam';

describe('seam result envelope', () => {
	it('creates ok envelopes', () => {
		const result = ok({ value: 42 });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.value).toBe(42);
		}
	});

	it('creates error envelopes with shared taxonomy', () => {
		const result = err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, 'network timeout');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('UPSTREAM_UNAVAILABLE');
			expect(result.error.message).toContain('timeout');
		}
	});
});
