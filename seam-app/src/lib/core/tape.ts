/**
 * Purpose: the house tape. Hand-written lines, in each character's voice, for every share the
 * script can ask for, plus the six fixed introductions.
 * Why: the meeting must never fail to open. When Grok is down or no key is set, the room plays
 * the tape instead of showing an error at 3am, and the slip says "from the house tape".
 * Invariants: pure; every line passes findTherapySpeak; {name} and {topic} are the only holes.
 */
import type { ShareSlot } from '$lib/contracts/meeting';
import { getCharacter } from './characters';

/** Introductions are formula in a real room, so they are authored, never generated. */
export const INTRODUCTIONS: Record<string, string> = {
	marcus: "Marcus. Addict. Twelve years, and I still count them.",
	heather: "Heather. Addict. Two weeks. Don't clap yet.",
	meechie: "Meechie. Addict. Clean time is in and out, so tonight it's in.",
	gemini: "I'm Gemini, I'm a — I mean, addict. I'm an addict. Eight months.",
	gypsy: 'Gypsy. Addict. Fourteen months in one city, which is a personal record.',
	chrystal: 'Chrystal. Addict. Clean date January ninth, 2023.'
};

type TapeBook = Partial<Record<ShareSlot, string[]>>;

const TAPE: Record<string, TapeBook> = {
	marcus: {
		opening: [
			"See, that chair's been empty since before I had this cup. Somebody's out there tonight who meant to come. We keep it for them, and we start.",
			"Now we leave that chair alone. It's for whoever's sitting in a car outside deciding. Welcome. Coffee's terrible, same as always."
		],
		topic: [
			"Now the card says {topic}. I've picked worse ones. Let's go.",
			"See, tonight it's {topic}. I didn't write it, but I've lived it, so I'll shut up and let the room have it."
		],
		round: [
			"Now I'll tell on myself. My daughter's birthday was Tuesday. I wrote the card and didn't mail it. It's still on the dash of the truck. I keep telling myself the stamp is the hard part.",
			"See, when I was out there I thought calm meant I had it handled. Twelve years in, I've figured out calm is just the face I make when I don't want anybody asking.",
			"Now I buried a man I sponsored in March. His number's still in my phone under his name. I don't call it. I don't delete it either."
		],
		hard_question: [
			"{name}, I'm going to ask you straight, because somebody asked me once and it kept me alive. What are you still not saying?",
			'Now {name}, you said it out loud in here. Who else knows? Anybody outside this room?'
		],
		closing: [
			"Now that's the time. What got said in here stays in here. Leave it on the chairs. Take the coffee if you want it.",
			"See, we close the same way every night, whoever came. What you heard here stays here. Door's unlocked same time tomorrow."
		],
		farewell: ['{name}. Same time tomorrow. The cup and I will be here.']
	},
	heather: {
		round: [
			"Look, I did eleven months where they told me when to eat. Out here nobody tells me anything, and some nights I miss the count. That's sick, and I'm saying it anyway.",
			"Listen, two weeks. I know that's nothing to some of y'all. It's the longest I've gone without somebody else holding my phone.",
			"Look, I keep my shoes by the bed. Old habit. I'm practicing putting them in the closet, which sounds stupid until you've had to leave somewhere fast."
		],
		farewell: [
			"Listen, {name}. Come back Thursday. I'll be in the same chair being loud about it.",
			'Look, {name}, you walked in the door. Some of us took years to do that part.'
		]
	},
	meechie: {
		round: [
			"I told my cousin I was doing good. I was. That's the problem. Good is when I stop calling anybody.",
			"Everybody in here has a story where they almost died. Mine's boring. I stopped answering the door for a year and called it peace.",
			"I can tell you exactly what's wrong with every person in this room. Ask me what's wrong with me and I'll make a joke. Watch."
		],
		hard_question: [
			'{name}. That thing you said. Is it true, or is it the version that sounds okay out loud?',
			'So, {name}, real question. Where would you be right now if you hadn\'t come in here?'
		],
		farewell: ['{name}. Same seat next time. I\'ll be in mine.', "Don't get weird about it, {name}. Just come back."]
	},
	gemini: {
		round: [
			'I almost didn\'t come. No, I was coming, I just sat in the parking lot for twenty minutes deciding if I was coming.',
			"I told him I was done with him, and I meant it, and then I kept his hoodie. I sleep in it. I'm done with him.",
			"Eight months. I'm proud. I'm scared, actually, because every time I get proud I get stupid. So I'm not proud. Okay. A little."
		],
		farewell: ['Bye, {name}. Come back. I mean, you don\'t have to. No. Come back.', "{name}, I'm glad you... yeah. I'm glad."]
	},
	gypsy: {
		round: [
			'In Albuquerque I had a whole system. Bus pass, two backpacks, never the same shelter twice. I was so organized about falling apart.',
			"Memphis was the first place anybody asked me to stay for dinner, and I left before the food came. Fourteen months here and I still check where the exits are.",
			"I used to think a new city was a fresh start. It's the same me with a different area code."
		],
		farewell: [
			"{name}, I've left every city I ever lived in. I'm still here. Make of that what you want.",
			"See you around, {name}. I mean that literally. I'm not going anywhere this time."
		]
	},
	chrystal: {
		reading: [
			"This is the one taped by the door. I come in. I sit down. I don't have to be good at it. I just have to be here while the coffee's still hot.",
			"Somebody wrote this in the margin of the old book and I copy it out every week: I didn't come back because I was ready. I came back because the door was open."
		],
		round: [
			"January ninth, 2023. Drug court. The judge asked if I had anybody who would show up. I said no. Tuesday I drove a girl to her first appointment. I keep a list now of who shows up.",
			"I've got three missed calls right now from women I sponsor. I'll call them back after. I used to be the missed call.",
			"My mom still locks her purse in the trunk when I visit. Three years. I don't argue with it. I keep visiting."
		],
		farewell: [
			"{name}, I'm putting you on my phone list. You don't have to answer. I'll still check.",
			'First time I came, I left during the closing. You stayed for all of it, {name}. Write down the date.'
		]
	}
};

export function tapeLine(
	speakerId: string,
	slot: ShareSlot,
	n: number,
	context: { name?: string; topic?: string | null } = {}
): string {
	const lines = TAPE[speakerId]?.[slot] ?? TAPE[speakerId]?.round;
	const chosen = lines?.length ? lines[Math.abs(n) % lines.length] : getCharacter(speakerId).voiceExamples[0];
	return chosen
		.replaceAll('{name}', context.name?.trim() || 'new friend')
		.replaceAll('{topic}', context.topic?.trim() || 'whatever walked in with us');
}
