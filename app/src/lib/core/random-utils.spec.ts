import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	bestEffortRandomInt,
	bestEffortRandomUint32,
	secureRandomInt,
	secureRandomUint32
} from './random-utils';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('random-utils', () => {
	it('secureRandomUint32 returns uint32 values', () => {
		const value = secureRandomUint32();
		expect(Number.isInteger(value)).toBe(true);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThanOrEqual(0xffffffff);
	});

	it('secureRandomInt stays within bounds', () => {
		for (let i = 0; i < 200; i += 1) {
			const value = secureRandomInt(10);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(10);
		}
	});

	it('returns 0 for non-positive effective bounds', () => {
		expect(bestEffortRandomInt(0)).toBe(0);
		expect(bestEffortRandomInt(-1)).toBe(0);
		expect(bestEffortRandomInt(0.5)).toBe(0);
		expect(bestEffortRandomInt(1.9)).toBe(0);
	});

	it('throws for secure random when crypto is unavailable', () => {
		vi.stubGlobal('crypto', undefined);
		expect(() => secureRandomUint32()).toThrow('Web Crypto unavailable');
	});

	it('falls back for best-effort random when crypto is unavailable', () => {
		vi.stubGlobal('crypto', undefined);
		const value = bestEffortRandomUint32();
		expect(Number.isInteger(value)).toBe(true);
		expect(value).toBeGreaterThanOrEqual(0);
		expect(value).toBeLessThanOrEqual(0xffffffff);
	});
});
