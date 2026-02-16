export interface ClockPort {
	nowMs(): number;
	nowIso(): string;
}

export interface ClockInstant {
	ms: number;
	iso: string;
}

export function validateClockInstant(value: unknown): value is ClockInstant {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	if (!Number.isInteger(record.ms) || (record.ms as number) < 0) return false;
	if (typeof record.iso !== 'string' || record.iso.trim().length === 0) return false;
	return Number.isFinite(Date.parse(record.iso));
}
