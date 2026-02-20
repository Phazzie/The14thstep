import { describe, expect, it } from 'vitest';
import { CRISIS_KEYWORDS, detectCrisisContent, isMeetingInCrisis } from './crisis-engine';

describe('crisis engine', () => {
	it('matches the full crisis keyword matrix', () => {
		for (const keyword of CRISIS_KEYWORDS) {
			expect(detectCrisisContent(`context ${keyword} context`)).toBe(true);
		}
	});

	it('returns false for non-crisis text', () => {
		expect(detectCrisisContent('Today was hard but I am staying sober')).toBe(false);
	});

	it('detects crisis mode from setup text', () => {
		expect(
			isMeetingInCrisis({
				setupText: 'I think I want to die tonight',
				shares: []
			})
		).toBe(true);
	});

	it('detects crisis mode from persisted share signals', () => {
		expect(
			isMeetingInCrisis({
				shares: [
					{ content: 'standard share', significanceScore: 3 },
					{ content: 'I am better off dead', significanceScore: 10 }
				]
			})
		).toBe(true);
	});

	it('returns false when no setup or share crisis signal exists', () => {
		expect(
			isMeetingInCrisis({
				setupText: 'staying present today',
				shares: [{ content: 'I am here and listening', significanceScore: 3 }]
			})
		).toBe(false);
	});
});
