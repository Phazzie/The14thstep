import { SeamErrorCodes, err, ok, type SeamErrorCode } from '$lib/core/seam';
import type { GrokAiPort, GenerateShareOutput } from './contract';
import { validateGenerateShareInput, validateGenerateShareOutput } from './contract';
import sampleFixture from './fixtures/sample.json';
import faultFixture from './fixtures/fault.json';

type GrokMockScenario = 'sample' | 'fault';

interface GrokMockOptions {
	scenario?: GrokMockScenario;
	output?: GenerateShareOutput;
}

const DEFAULT_SCENARIO: GrokMockScenario = 'sample';

function toSeamErrorCode(value: unknown): SeamErrorCode {
	if (typeof value !== 'string') return SeamErrorCodes.UNEXPECTED;
	if ((Object.values(SeamErrorCodes) as string[]).includes(value)) {
		return value as SeamErrorCode;
	}
	return SeamErrorCodes.UNEXPECTED;
}

function parseFaultFixture(): { code: SeamErrorCode; message: string; details?: Record<string, unknown> } {
	const fixture = faultFixture as Record<string, unknown>;
	return {
		code: toSeamErrorCode(fixture.code),
		message:
			typeof fixture.message === 'string' && fixture.message.trim().length > 0
				? fixture.message
				: 'Unknown grok-ai mock failure',
		details: typeof fixture.details === 'object' && fixture.details !== null
			? (fixture.details as Record<string, unknown>)
			: undefined
	};
}

export function createGrokAiMock(options: GrokMockOptions = {}): GrokAiPort {
	const scenario = options.scenario ?? DEFAULT_SCENARIO;
	const output = (options.output ?? sampleFixture) as GenerateShareOutput;
	const fault = parseFaultFixture();

	return {
		async generateShare(input) {
			if (!validateGenerateShareInput(input)) {
				return err(SeamErrorCodes.INPUT_INVALID, 'Invalid generateShare input');
			}

			if (scenario === 'fault') {
				return err(fault.code, fault.message, fault.details);
			}

			if (!validateGenerateShareOutput(output)) {
				return err(SeamErrorCodes.CONTRACT_VIOLATION, 'Mock fixture violates GenerateShareOutput');
			}

			return ok(output);
		}
	};
}
