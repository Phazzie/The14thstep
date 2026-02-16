import type { UuidPort } from './contract';
import { validateUuid } from './contract';
import idsFixture from './fixtures/ids.json';

export function createUuidMock(seedIds: string[] = idsFixture as string[]): UuidPort {
	const ids = [...seedIds];
	if (ids.length === 0) {
		throw new Error('Uuid mock requires at least one fixture id');
	}
	if (!ids.every((id) => validateUuid(id))) {
		throw new Error('Uuid mock fixture contains invalid UUID values');
	}

	let index = 0;
	return {
		newId() {
			const value = ids[index % ids.length];
			index += 1;
			return value;
		}
	};
}
