import { describe, expect, it } from 'vitest';
import { CORE_CHARACTERS } from './characters';
import {
	buildCharacterSharePrompt,
	buildExpandSharePrompt,
	buildHardQuestionPrompt,
	buildHeatherCrisisPrompt,
	buildMarcusCrisisPrompt,
	buildQualityValidationPrompt
} from './prompt-templates';

const marcus = CORE_CHARACTERS.find((character) => character.id === 'marcus')!;

describe('prompt templates', () => {
	it('builds character share prompts with context and memory sections', () => {
		const prompt = buildCharacterSharePrompt(marcus, {
			topic: 'Staying when I want to leave',
			userName: 'trap',
			userMood: 'anxious',
			recentShares: [{ speaker: 'User', content: 'I almost left.' }],
			heavyMemoryLines: ['Last week user called sponsor before using.'],
			continuityLines: ['Attendance count: 12 meetings.'],
			callbackLines: ['Coffee cup joke from meeting 2.']
		});

		expect(prompt).toContain('You are Marcus');
		expect(prompt).toContain('YOUR HISTORY');
		expect(prompt).toContain('CONTINUITY NOTES');
		expect(prompt).toContain('CALLBACK OPPORTUNITIES THIS MEETING');
		expect(prompt).toContain('Staying when I want to leave');
	});

	it('builds hard question prompts', () => {
		const prompt = buildHardQuestionPrompt('trap', ['I keep blaming everyone else.']);
		expect(prompt).toContain('hard but fair question');
		expect(prompt).toContain('trap');
	});

	it('builds expand prompts for longer character follow-up', () => {
		const prompt = buildExpandSharePrompt(marcus, {
			topic: 'Staying',
			originalShare: 'I almost bounced and stayed.',
			recentShares: [{ speaker: 'User', content: 'I keep running.' }]
		});

		expect(prompt).toContain('8-10 sentences');
		expect(prompt).toContain('Original share');
		expect(prompt).toContain('I almost bounced and stayed');
	});

	it('builds crisis prompts for Marcus and Heather', () => {
		const marcusPrompt = buildMarcusCrisisPrompt('trap', 'I do not know if I can keep going.');
		const heatherPrompt = buildHeatherCrisisPrompt('trap', 'I do not know if I can keep going.');

		expect(marcusPrompt).toContain('Marcus');
		expect(heatherPrompt).toContain('Heather');
	});

	it('builds quality validation prompt with required JSON contract and blocklist', () => {
		const prompt = buildQualityValidationPrompt(
			marcus,
			'Now I stayed in my seat instead of running.',
			{
				topic: 'Staying',
				userName: 'trap',
				userMood: 'anxious',
				recentShares: []
			},
			[]
		);

		expect(prompt).toContain('return JSON only');
		expect(prompt).toContain('therapySpeakDetected');
		expect(prompt).toContain('I hear you.');
	});
});
