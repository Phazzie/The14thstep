let fallbackCounter = 0;

function fallbackUint32(): number {
	// Keep runtime behavior alive in environments without Web Crypto.
	// This is not cryptographically secure and should be a rare fallback path.
	fallbackCounter = (fallbackCounter + 0x9e3779b9) >>> 0;
	return ((Date.now() >>> 0) ^ fallbackCounter) >>> 0;
}

export function secureRandomUint32(): number {
	const array = new Uint32Array(1);
	const crypto = globalThis.crypto;
	if (!crypto?.getRandomValues) {
		throw new Error('Web Crypto unavailable');
	}
	crypto.getRandomValues(array);
	return array[0] ?? 0;
}

export function secureRandom(): number {
	return secureRandomUint32() / 4_294_967_296;
}

export function secureRandomInt(maxExclusive: number): number {
	if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) return 0;
	const max = maxExclusive;
	const uint32Space = 4_294_967_296;
	const threshold = uint32Space - (uint32Space % max);

	let value = secureRandomUint32();
	while (value >= threshold) {
		value = secureRandomUint32();
	}

	return value % max;
}

// Best-effort helpers for non-security runtime decisions.
export function bestEffortRandomUint32(): number {
	try {
		return secureRandomUint32();
	} catch {
		return fallbackUint32();
	}
}

export function bestEffortRandom(): number {
	return bestEffortRandomUint32() / 4_294_967_296;
}

export function bestEffortRandomInt(maxExclusive: number): number {
	if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) return 0;
	const max = maxExclusive;
	const uint32Space = 4_294_967_296;
	const threshold = uint32Space - (uint32Space % max);

	let value = bestEffortRandomUint32();
	while (value >= threshold) {
		value = bestEffortRandomUint32();
	}

	return value % max;
}
