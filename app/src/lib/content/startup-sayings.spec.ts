import { describe, expect, it } from 'vitest';
import { pickStartupSaying } from './startup-sayings';

describe('pickStartupSaying', () => {
	it('returns a saying', () => {
		const saying = pickStartupSaying();
		expect(typeof saying).toBe('string');
		expect(saying.length).toBeGreaterThan(0);
	});

	it('returns the same saying for the same seed', () => {
		const saying1 = pickStartupSaying(123);
		const saying2 = pickStartupSaying(123);
		expect(saying1).toBe(saying2);
	});
});
