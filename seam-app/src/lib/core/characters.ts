/**
 * Purpose: the six core characters, ported unchanged from app/src/lib/core/characters.ts.
 * Why: the writing in these profiles is the product; the rebuild keeps every word.
 * Invariants: voiceExamples is a required 3-tuple of real lines. Never make it optional.
 */
export interface Character {
	id: string;
	pronoun: 'he' | 'she' | 'they';
	name: string;
	archetype: string;
	wound: string;
	contradiction: string;
	voice: string;
	voiceExamples: [string, string, string];
	lie: string;
	discomfortRegister: string;
	programRelationship: string;
	lostThing: string;
	quirk: string;
	color: string;
	cleanTime: string;
}

export const CHARACTERS: Character[] = [
	{
		id: 'marcus',
		pronoun: 'he',
		name: 'Marcus',
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
		cleanTime: '12 years',
	},
	{
		id: 'heather',
		pronoun: 'she',
		name: 'Heather',
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
		cleanTime: '2 weeks',
	},
	{
		id: 'meechie',
		pronoun: 'she',
		name: 'Meechie',
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
		cleanTime: 'In and out',
	},
	{
		id: 'gemini',
		pronoun: 'she',
		name: 'Gemini',
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
		cleanTime: '8 months',
	},
	{
		id: 'gypsy',
		pronoun: 'they',
		name: 'Gypsy',
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
		cleanTime: '14 months',
	},
	{
		id: 'chrystal',
		pronoun: 'she',
		name: 'Chrystal',
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
		cleanTime: '3 years',
	}
];


export function getCharacter(id: string): Character {
	const found = CHARACTERS.find((character) => character.id === id);
	if (!found) throw new Error(`Unknown character: ${id}`);
	return found;
}
