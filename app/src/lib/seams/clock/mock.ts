import type { ClockPort } from './contract';
import { validateClockInstant, type ClockInstant } from './contract';
import timestampsFixture from './fixtures/timestamps.json';

export function createClockMock(
	seedInstants: ClockInstant[] = timestampsFixture as ClockInstant[]
): ClockPort {
	const instants = [...seedInstants];
	if (instants.length === 0) {
		throw new Error('Clock mock requires at least one fixture instant');
	}
	if (!instants.every((instant) => validateClockInstant(instant))) {
		throw new Error('Clock mock fixture contains invalid timestamp entries');
	}

	let index = 0;
	const next = () => {
		const instant = instants[index % instants.length];
		index += 1;
		return instant;
	};

	return {
		nowMs() {
			return next().ms;
		},
		nowIso() {
			return next().iso;
		}
	};
}
