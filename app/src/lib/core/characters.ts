import type { CharacterProfile } from './types';

const defaultStatus = 'active' as const;

export const CORE_CHARACTERS: CharacterProfile[] = [
	{
		id: 'marcus',
		name: 'Marcus',
		tier: 'core',
		status: defaultStatus,
		archetype: 'The Chair',
		wound: 'Daughter will not speak to him, watched too many people die.',
		contradiction: 'Calm can read as distance.',
		voice: 'Measured, story-driven, starts with Now or See.',
		quirk: 'Always has the chipped coffee cup.',
		color: '#D97706',
		avatar: 'M',
		cleanTime: '12 years',
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
		quirk: 'Leans forward before saying something real.',
		color: '#EC4899',
		avatar: 'H',
		cleanTime: '2 weeks',
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
		quirk: 'Always takes the same seat.',
		color: '#8B5CF6',
		avatar: 'Me',
		cleanTime: 'In and out',
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
		quirk: 'Fidgets and restarts thoughts.',
		color: '#06B6D4',
		avatar: 'G',
		cleanTime: '8 months',
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
		quirk: 'Often references specific cities.',
		color: '#F59E0B',
		avatar: 'Gy',
		cleanTime: '14 months',
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
		quirk: 'Checks phone because she coaches others.',
		color: '#10B981',
		avatar: 'C',
		cleanTime: '3 years',
		meetingCount: 0,
		lastSeenAt: null
	}
];

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
