function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
	const payload = {
		level,
		message,
		timestamp: new Date().toISOString(),
		...context
	};
	if (level === 'info') console.info(JSON.stringify(payload));
	if (level === 'warn') console.warn(JSON.stringify(payload));
	if (level === 'error') console.error(JSON.stringify(payload));
}

export const logger = {
	info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
	warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
	error: (message: string, context?: Record<string, unknown>) => log('error', message, context)
};

export function trackCallbackTransition(callbackId: string, oldStatus: string, newStatus: string): void {
	if (oldStatus === newStatus) return;
	logger.info('Callback transition', {
		event: 'callback_transition',
		callbackId,
		oldStatus,
		newStatus
	});
}

export function trackCrisisMode(meetingId: string, trigger: 'persistence' | 'input'): void {
	logger.info('Crisis mode activated', {
		event: 'crisis_mode_active',
		meetingId,
		trigger
	});
}
