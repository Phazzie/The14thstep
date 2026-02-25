export interface Logger {
	info(msg: string, data?: unknown): void;
	warn(msg: string, data?: unknown): void;
	error(msg: string, data?: unknown): void;
}

export const logger: Logger = {
	info(msg: string, data?: unknown) {
		console.log(JSON.stringify({ level: 'info', msg, data, timestamp: new Date().toISOString() }));
	},
	warn(msg: string, data?: unknown) {
		console.warn(JSON.stringify({ level: 'warn', msg, data, timestamp: new Date().toISOString() }));
	},
	error(msg: string, data?: unknown) {
		console.error(JSON.stringify({ level: 'error', msg, data, timestamp: new Date().toISOString() }));
	}
};
