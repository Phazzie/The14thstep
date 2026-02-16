import { describe, expect, it } from 'vitest';
import { validateClockInstant } from './contract';
import timestampsFixture from './fixtures/timestamps.json';
import { createClockMock } from './mock';

describe('clock seam contract', () => {
	it('validates clock fixture instants', () => {
		expect((timestampsFixture as unknown[]).every((instant) => validateClockInstant(instant))).toBe(true);
	});

	it('mock returns deterministic fixture timeline', () => {
		const fixtures = timestampsFixture as { ms: number; iso: string }[];
		const mock = createClockMock(fixtures);

		expect(mock.nowMs()).toBe(fixtures[0].ms);
		expect(mock.nowIso()).toBe(fixtures[1].iso);
		expect(mock.nowMs()).toBe(fixtures[2].ms);
		expect(mock.nowIso()).toBe(fixtures[0].iso);
	});

	it('rejects malformed clock payloads', () => {
		expect(validateClockInstant({ ms: -1, iso: '2025-01-01T00:00:00.000Z' })).toBe(false);
		expect(validateClockInstant({ ms: 1735689600000, iso: '' })).toBe(false);
	});
});
