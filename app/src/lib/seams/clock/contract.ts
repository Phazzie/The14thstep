export interface ClockPort {
	nowMs(): number;
	nowIso(): string;
}
