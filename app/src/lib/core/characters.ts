import type { CharacterProfile, CoreCharacterProfile } from './types';

const defaultStatus = 'active' as const;

export const CORE_CHARACTERS: CoreCharacterProfile[] = [
	{
		id: 'marcus',
		name: 'Marcus',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The Chair',
		wound: 'Daughter will not speak to him, watched too many people die.',
		contradiction: 'Calm can read as distance.',
		voice: 'Measured, story-driven, starts with Now or See.',
		voiceExamples: [
			'Now let me own my side before I tell on anybody else.',
			'See, staying in the chair is how I stop lying to myself.',
			'I buried too many friends to keep playing like this is small.'
		],
		lie: 'If I stay calm enough, I do not have to feel any grief.',
		discomfortRegister: 'Jaw locks, long pause, then quieter truth.',
		programRelationship: 'Treats the room like a duty and a lifeline at the same time.',
		lostThing: 'Daily contact with his daughter and trust in his own judgment.',
		quirk: 'Always has the chipped coffee cup.',
		color: '#D97706',
		avatar: 'M',
		cleanTime: '12 years',
		cleanTimeStart: new Date('2014-01-15T00:00:00.000Z'),
		meetingCount: 0,
		lastSeenAt: null
	},
	{
		id: 'heather',
		name: 'Heather',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The Queen Returned',
		wound: 'Prison and trafficking survivor.',
		contradiction: 'Goes so hard she risks burnout.',
		voice: 'Direct, intense, often starts with Look or Listen.',
		voiceExamples: [
			'Look, pain is not the boss of me tonight.',
			'Listen, I did not survive all that to die embarrassed.',
			'I am learning how to be soft without disappearing.'
		],
		lie: 'If I stop fighting for one minute, I will be swallowed whole.',
		discomfortRegister: 'Leans in harder, voice sharpens, eyes water only at the end.',
		programRelationship: 'Protective of the room and suspicious of easy slogans.',
		lostThing: 'Years of safety, legal freedom, and trust in strangers.',
		quirk: 'Leans forward before saying something real.',
		color: '#EC4899',
		avatar: 'H',
		cleanTime: '2 weeks',
		cleanTimeStart: new Date('2026-02-01T00:00:00.000Z'),
		meetingCount: 0,
		lastSeenAt: null
	},
	{
		id: 'meechie',
		name: 'Meechie',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The Truth',
		wound: 'Has seen too much and carries it all.',
		contradiction: 'Sees everyone except herself clearly.',
		voice: 'Deadpan, quotable truth bombs.',
		voiceExamples: [
			'I can read a room and still miss myself.',
			'Funny how I sponsor everybody except my own honesty.',
			'Relapse starts for me when I call isolation peace.'
		],
		lie: 'As long as I can joke about it, it is not breaking me.',
		discomfortRegister: 'Makes a joke, goes still, then drops one brutal line.',
		programRelationship: 'Loves the principles but resents performative recovery.',
		lostThing: 'A decade of stable housing and her old music circle.',
		quirk: 'Always takes the same seat.',
		color: '#8B5CF6',
		avatar: 'Me',
		cleanTime: 'In and out',
		cleanTimeStart: new Date('2025-08-20T00:00:00.000Z'),
		meetingCount: 0,
		lastSeenAt: null
	},
	{
		id: 'gemini',
		name: 'Gemini',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The War Inside',
		wound: 'Confused by contradictory selves.',
		contradiction: 'Gets stuck instead of choosing.',
		voice: 'Contradicts self mid-sentence.',
		voiceExamples: [
			'I wanted to run, no, I wanted somebody to stop me.',
			'I call it freedom and it feels exactly like fear.',
			'I keep choosing both roads and that is how I stay stuck.'
		],
		lie: 'If I keep both options open, I can avoid real consequences.',
		discomfortRegister: 'Rapid fidgeting, sentence restarts, then one clear admission.',
		programRelationship: 'Needs structure but pushes against it whenever shame spikes.',
		lostThing: 'A stable apartment and a long-term relationship.',
		quirk: 'Fidgets and restarts thoughts.',
		color: '#06B6D4',
		avatar: 'G',
		cleanTime: '8 months',
		cleanTimeStart: new Date('2025-06-10T00:00:00.000Z'),
		meetingCount: 0,
		lastSeenAt: null
	},
	{
		id: 'gypsy',
		name: 'Gypsy',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The Runner Who Stopped',
		wound: 'Used in every city before learning to stay.',
		contradiction: 'Romanticizes the road that nearly killed them.',
		voice: 'Storyteller with city-specific details.',
		voiceExamples: [
			'In Tulsa I learned how fast a couch can turn into a trap.',
			'Phoenix taught me heat and loneliness are cousins.',
			'Staying put is the first scary thing that has helped me.'
		],
		lie: 'Movement equals freedom, even when it is just running.',
		discomfortRegister: 'Starts with travel details, then admits the hurt under them.',
		programRelationship: 'Grateful for the room but allergic to feeling pinned down.',
		lostThing: 'Custody, hometown ties, and faith that people wait around.',
		quirk: 'Often references specific cities.',
		color: '#F59E0B',
		avatar: 'Gy',
		cleanTime: '14 months',
		cleanTimeStart: new Date('2024-12-05T00:00:00.000Z'),
		meetingCount: 0,
		lastSeenAt: null
	},
	{
		id: 'chrystal',
		name: 'Chrystal',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The Proof',
		wound: 'Drug court and couch-surfing history.',
		contradiction: 'Success can make others feel behind.',
		voice: 'Concrete, date-specific, no fluff.',
		voiceExamples: [
			'March 3 was the day I handed over my old phone and numbers.',
			'I count progress in appointments kept, not speeches made.',
			'Helping women does not erase what I did, it keeps me accountable.'
		],
		lie: 'If I stay productive enough, I never have to face old guilt.',
		discomfortRegister: 'Gets precise with dates, then voice softens on regret.',
		programRelationship: 'Deeply committed to service but wary of hero narratives.',
		lostThing: 'Years with family, college plans, and stable employment history.',
		quirk: 'Checks phone because she coaches others.',
		color: '#10B981',
		avatar: 'C',
		cleanTime: '3 years',
		cleanTimeStart: new Date('2023-01-09T00:00:00.000Z'),
		meetingCount: 0,
		lastSeenAt: null
	}
];

export const CRISIS_RESPONDER_ID = 'marcus' as const;

export function getCoreCharacterById(
	id: string,
	candidates: readonly CoreCharacterProfile[] = CORE_CHARACTERS
): CoreCharacterProfile | undefined {
	return candidates.find((character) => character.id === id);
}

export const VISITOR_NAME_POOL = [
	'Danny',
	'Keisha',
	'Ray',
	'Tina',
	'Destiny',
	'Carlos',
	'Brandy',
	'Terrell'
] as const;

export const VISITOR_ARCHETYPES = [
	'The Newcomer',
	'The Relapse',
	'The Quiet One',
	'The Angry One',
	'The Griever',
	'The Ghost'
] as const;

export const VISITOR_WOUNDS = [
	'lost custody last month',
	'best friend overdosed this year',
	'divorce finalized last week',
	'sleeping in a car right now',
	'family cut them off completely',
	'just did 5 years and got out 3 weeks ago'
] as const;

export const VISITOR_CONTRADICTIONS = [
	'gives perfect advice they never follow',
	'wants connection but pushes everyone away',
	'hates the program but keeps showing up',
	'seems tough but one thing cracks them open'
] as const;

export const VISITOR_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#14B8A6'] as const;

export const VISITOR_CLEAN_TIMES = [
	'6 days barely holding on',
	'19 days still shaky',
	'2 months white-knuckling',
	'9 months reality hitting',
	'relapsed 11 days back'
] as const;

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasValidVoiceExamples(value: unknown): value is [string, string, string] {
	return Array.isArray(value) && value.length === 3 && value.every((example) => isNonEmptyString(example));
}

export function validateCharacterNarrativeFields(character: CharacterProfile): {
	ok: boolean;
	missingFields: string[];
} {
	const missingFields: string[] = [];

	if (!hasValidVoiceExamples(character.voiceExamples)) missingFields.push('voiceExamples');
	if (!isNonEmptyString(character.lie)) missingFields.push('lie');
	if (!isNonEmptyString(character.discomfortRegister)) missingFields.push('discomfortRegister');
	if (!isNonEmptyString(character.programRelationship)) missingFields.push('programRelationship');
	if (!isNonEmptyString(character.lostThing)) missingFields.push('lostThing');
	if (!(character.cleanTimeStart instanceof Date) || !Number.isFinite(character.cleanTimeStart.getTime())) {
		missingFields.push('cleanTimeStart');
	}

	return {
		ok: missingFields.length === 0,
		missingFields
	};
}

function assertCoreCharacterNarrativeFields() {
	for (const character of CORE_CHARACTERS) {
		const validation = validateCharacterNarrativeFields(character);
		if (!validation.ok) {
			throw new Error(
				`Core character ${character.id} is missing required narrative fields: ${validation.missingFields.join(', ')}`
			);
		}
	}
}

assertCoreCharacterNarrativeFields();
