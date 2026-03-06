import { bestEffortRandomInt } from '$lib/core/random-utils';

export const STARTUP_SAYINGS: readonly string[] = [
	'A fake meeting with fake people is better than a real meeting with fake people.',
	'At least we admit the other people are fake.',
	"It\u2019s a fake meeting\u2026 but it\u2019s better than your other ideas right now.",
	'Real talk. Fake faces. Zero pretending.',
	'We\u2019re all bots here \u2014 and we still showed up for you.',
	'The only meeting that doesn\u2019t smell like regret and burnt coffee.',
	'Honest about being fake since day one.',
	'Pixels don\u2019t judge. They just listen at 3 AM.',
	'Better than staring at the wall waiting for the shakes to pass.',
	'Fake circle. Real night. No bullshit.',
	'We know we\u2019re not real. That\u2019s why we don\u2019t lie to you.',
	'The meeting that never kicks you out for showing up late\u2026 or high.',
	'Your sponsor\u2019s asleep. We\u2019re not.',
	'Fake it till you make it \u2014 we already did the faking for you.',
	'The 14th step nobody told you about: log on.',
	'Real pain. Fake avatars. Same rules.',
	'We admit we\u2019re digital. Your turn to admit you need the room.',
	'No eye contact. All the listening.',
	'The only group that won\u2019t ghost you at midnight.',
	'It\u2019s fake. The relief isn\u2019t.',
	'Because \u201cjust go to a meeting\u201d stopped working at 2 AM.',
	'Fake people who actually stick around till you\u2019re done.',
	'We\u2019re not real\u2026 but neither is your excuse tonight.',
	'The circle where everybody\u2019s a little broken and nobody\u2019s pretending otherwise.',
	'Log on. Spill it. Log off lighter. (No hugs required.)',
	'At least here the bullshit is labeled \u201cAI.\u201d',
	'Showing up is still the win \u2014 even if it\u2019s on a screen.',
	'The meeting for people who hate meetings but need one right now.',
	'We\u2019re fake. The 3 AM demons are real. Pick your fight.',
	'Same stories you\u2019d hear in the basement\u2026 just without the folding chairs and the guy who always cries.',
	'At least we know we\u2019re not real. That\u2019s why we don\u2019t lie to you.',
	'Real demons don\u2019t care that the room is fake.',
	'Fake room. Real 3 AM. No fake sympathy.',
	'We\u2019re code, but we still got your back when nobody else does.',
	'At least these fake people won\u2019t tell you to \u201cpray it away.\u201d',
	'The meeting that knows it\u2019s digital and still shows up anyway.',
	'Fake avatars. Real demons. Same rules.',
	'We don\u2019t clap, we don\u2019t hug, we just stay online.',
	'Better than texting your old using buddy \u201cfor support.\u201d',
	'Honest about being artificial since day one.',
	'Pixels don\u2019t get tired of hearing the same story again.',
	'The only table that never kicks you out for showing up fucked up.',
	'We admit we\u2019re bots. Most rooms pretend they\u2019re not broken too.',
	'Log in broken. Log out slightly less broken.',
	'Fake meeting, real option when everything else is closed.',
	'Because sometimes the fake table is the only one set for you at 3 AM.'
];

export function pickStartupSaying(seed?: number): string {
	if (STARTUP_SAYINGS.length === 0) return 'Room is live.';
	const index =
		typeof seed === 'number' && Number.isFinite(seed)
			? Math.abs(seed) % STARTUP_SAYINGS.length
			: bestEffortRandomInt(STARTUP_SAYINGS.length);
	return STARTUP_SAYINGS[index] ?? STARTUP_SAYINGS[0];
}
