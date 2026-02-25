import { logger } from './logger';

export function trackTokenUsage(model: string, input: number, output: number): void {
	logger.info('metric:token_usage', { model, input, output });
}

export function trackLatency(operation: string, ms: number): void {
	logger.info('metric:latency', { operation, ms });
}

export function trackCost(model: string, cost: number): void {
	logger.info('metric:cost', { model, cost });
}
