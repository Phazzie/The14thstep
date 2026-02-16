import { describe, expect, it } from 'vitest';
import { validateUuid } from './contract';
import idsFixture from './fixtures/ids.json';
import { createUuidMock } from './mock';

describe('uuid seam contract', () => {
	it('validates uuid fixture values', () => {
		expect((idsFixture as unknown[]).every((id) => validateUuid(id))).toBe(true);
	});

	it('mock returns fixture ids in deterministic order', () => {
		const ids = idsFixture as string[];
		const mock = createUuidMock(ids);

		expect(mock.newId()).toBe(ids[0]);
		expect(mock.newId()).toBe(ids[1]);
		expect(mock.newId()).toBe(ids[2]);
		expect(mock.newId()).toBe(ids[0]);
	});

	it('rejects invalid ids at contract boundary', () => {
		expect(validateUuid('not-a-uuid')).toBe(false);
		expect(validateUuid('')).toBe(false);
	});
});
