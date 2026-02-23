import { describe, expect, it } from 'vitest';
import { CORE_CHARACTERS } from './characters';
import { STYLE_CONSTITUTION } from './style-constitution';
import {
	buildCharacterSharePrompt,
	buildCrisisTriagePrompt,
	buildExpandSharePrompt,
	buildHardQuestionPrompt,
	buildHeatherCrisisPrompt,
	buildMarcusCrisisPrompt,
	buildPostMeetingMemoryExtractionPrompt,
	buildQualityValidationPrompt,
	buildRitualOpeningPrompt,
	buildRitualIntroPrompt,
	buildRitualReadingPrompt,
	buildRitualClosingPrompt,
	buildEmptyChairPrompt
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
		expect(prompt).toContain(STYLE_CONSTITUTION);
		expect(prompt).not.toContain('Write exactly');
		expect(prompt).not.toContain('physical action');
		expect(prompt).not.toContain('The Chair');
		expect(prompt).not.toContain(': none');
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

	it('builds crisis triage and post-meeting memory extraction prompts', () => {
		const triagePrompt = buildCrisisTriagePrompt('I cannot do this anymore.');
		const memoryPrompt = buildPostMeetingMemoryExtractionPrompt(
			'staying sober today',
			'User: I stayed.',
			['marcus', 'heather']
		);

		expect(triagePrompt).toContain('JSON only');
		expect(triagePrompt).toContain('crisis');
		expect(memoryPrompt).toContain('userMemory');
		expect(memoryPrompt).toContain('characterThreads');
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
		expect(prompt).toContain(STYLE_CONSTITUTION);
	});

	it('builds ritual opening prompt with character voice and meeting context', () => {
		const prompt = buildRitualOpeningPrompt('trap', marcus);

		expect(prompt).toContain('You are Marcus');
		expect(prompt).toContain('opening this meeting for trap');
		expect(prompt).toContain('empty chair');
		expect(prompt).toContain(STYLE_CONSTITUTION);
		// Constraint: avoid clichéd therapy opening phrases
		expect(prompt).not.toContain('safe space');
		expect(prompt).not.toContain('vulnerable');
	});

	it('builds ritual intro prompt with first-timer acknowledgment', () => {
		const promptForFirstTimer = buildRitualIntroPrompt(marcus, true);
		const promptForRegular = buildRitualIntroPrompt(marcus, false);

		expect(promptForFirstTimer).toContain('You are Marcus');
		expect(promptForFirstTimer).toContain('newcomer');
		expect(promptForFirstTimer).toContain(STYLE_CONSTITUTION);

		expect(promptForRegular).toContain('Standard introduction');
		expect(promptForRegular).not.toContain('newcomer');
	});

	it('builds ritual reading prompt for empty chair moment', () => {
		const prompt = buildRitualReadingPrompt(marcus);

		expect(prompt).toContain('You are Marcus');
		expect(prompt).toContain('reading this evening');
		expect(prompt).toContain('showing up');
		expect(prompt).toContain('Street-level wisdom');
		expect(prompt).toContain(STYLE_CONSTITUTION);
		// Constraint: avoid therapy-speak and clichés
		expect(prompt).not.toContain('breakthrough');
		expect(prompt).not.toContain('transformation');
	});

	it('builds ritual closing prompt with confidentiality reminder', () => {
		const prompt = buildRitualClosingPrompt(marcus, 'trap', 'honesty, accountability, staying present');

		expect(prompt).toContain('You are Marcus');
		expect(prompt).toContain('closing this meeting');
		expect(prompt).toContain('Thank trap');
		expect(prompt).toContain('confidentiality');
		expect(prompt).toContain('what is said here stays here');
		expect(prompt).toContain(STYLE_CONSTITUTION);
	});

	it('builds empty chair prompt for narrative moment', () => {
		const prompt = buildEmptyChairPrompt();

		expect(prompt).toContain('empty chair');
		expect(prompt).toContain('recovery');
		expect(prompt).toContain('2-3 sentences');
		// Constraint: no character names in the actual prompt content
		expect(prompt).not.toContain('Marcus');
		expect(prompt).not.toContain('Heather');
		// Constraint: no banned therapy-speak phrases
		expect(prompt).not.toContain('vulnerable');
		expect(prompt).not.toContain('journey');
	});
});
