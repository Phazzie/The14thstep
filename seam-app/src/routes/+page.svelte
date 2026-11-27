<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { IntakeSchema, MOODS, type Intake } from '$lib/contracts/intake';
	import { emptyPocket, putInPocket, takeFromPocket } from '$lib/client/pocket';
	import { newMeeting } from '$lib/client/runner';
	import { pickStartupSaying } from '$lib/core/sayings';
	import type { MeetingState } from '$lib/contracts/meeting';

	let name = $state('');
	let cleanTime = $state('');
	let mood = $state<Intake['mood'] | ''>('');
	let mind = $state('');
	let listeningOnly = $state(false);
	let saying = $state('A fake meeting with fake people is better than a real meeting with fake people.');
	let pocket = $state<MeetingState | null>(null);
	let problem = $state('');
	let walking = $state(false);

	const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

	onMount(() => {
		saying = pickStartupSaying(Date.now());
		pocket = takeFromPocket();
	});

	async function signIn(event: SubmitEvent) {
		event.preventDefault();
		const parsed = IntakeSchema.safeParse({ name, cleanTime, mood, mind, listeningOnly });
		if (!parsed.success) {
			const missing = parsed.error.issues.map((issue) => String(issue.path[0]));
			const words: Record<string, string> = {
				name: 'a name',
				cleanTime: 'clean time (any answer counts, even "none")',
				mood: 'how you walked in',
				mind: 'what you brought'
			};
			problem = `The secretary needs ${[...new Set(missing)].map((m) => words[m] ?? m).join(', ')}.`;
			return;
		}
		problem = '';
		walking = true;
		const seed = Math.floor(Math.random() * 2_000_000_000);
		putInPocket(newMeeting(parsed.data, seed, new Date()));
		await goto('/meeting');
	}

	function freshSlip() {
		emptyPocket();
		pocket = null;
	}
</script>

<svelte:head>
	<title>The 14th Step · Proof of Attendance</title>
</svelte:head>

{#if pocket}
	<aside class="pocket no-print" aria-label="Unfinished meeting">
		<p class="hand">Slip No. {pocket.slipNumber} is still in your pocket{pocket.finished ? ', signed' : ''}.</p>
		<div>
			<a class="btn" href="/meeting">{pocket.finished ? 'Look at it' : 'Go back in'}</a>
			<button class="btn ghost" type="button" onclick={freshSlip}>Take a fresh slip</button>
		</div>
	</aside>
{/if}

<article class="sheet slip" aria-labelledby="slip-title">
	<div class="perf" aria-hidden="true"></div>
	<header class="slip-head">
		<p class="tiny">FORM 14-A · REV. 3AM · DO NOT LAMINATE</p>
		<h1 id="slip-title">Proof of Attendance</h1>
		<p class="sub">The 14th Step Nightly Meeting · Room open 24 hours · Chairs: 8 · People: 6 (fake) · You: real · One chair stays empty</p>
		<p class="slipno">No. <span class="redno">— — — — —</span></p>
	</header>

	<form onsubmit={signIn} novalidate>
		<div class="row">
			<label for="name">Name</label>
			<input id="name" class="line hand" bind:value={name} maxlength="40" autocomplete="nickname" placeholder="what the room calls you" />
		</div>
		<div class="row split">
			<div>
				<label for="clean">Clean time</label>
				<input id="clean" class="line hand" bind:value={cleanTime} maxlength="40" placeholder="19 days, 2 yrs, none" />
			</div>
			<div>
				<span class="label">Date</span>
				<span class="line hand static">{today}</span>
			</div>
		</div>

		<fieldset>
			<legend>How you walked in <span class="tiny">(check one)</span></legend>
			<div class="boxes">
				{#each MOODS as option (option)}
					<label class="box">
						<input type="radio" name="mood" value={option} bind:group={mood} />
						<span class="tick" aria-hidden="true"></span>
						<span>{option}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="row">
			<label for="mind">What you brought in with you</label>
			<textarea id="mind" class="lined hand" rows="4" bind:value={mind} maxlength="600" placeholder="nobody reads this but the room"></textarea>
		</div>

		<label class="box listen">
			<input type="checkbox" bind:checked={listeningOnly} />
			<span class="tick" aria-hidden="true"></span>
			<span>Listening only. I don't have to share. <span class="tiny">(Nobody has to.)</span></span>
		</label>

		{#if problem}
			<p class="problem" role="alert">{problem}</p>
		{/if}

		<div class="sign">
			<button class="stamp-btn" type="submit" disabled={walking}>
				<span class="stamp">{walking ? 'Walking in…' : 'Sign in & walk in'}</span>
			</button>
			<p class="house-rule"><span class="tiny">HOUSE RULE:</span> {saying}</p>
		</div>
	</form>

	<p class="po">Probation officer initials: <span class="blank"></span> <span class="tiny">(nobody here will check)</span></p>
	<div class="ring" aria-hidden="true"></div>
	<div class="staple" aria-hidden="true"></div>
	<footer class="fine">
		Chairperson signature: ____________ (assigned on exit). This slip is not valid for court, probation,
		your P.O., or your mother. It is valid for tonight. If tonight is the kind of night where you might not
		be safe, the <a href="/phone-list">phone list</a> is on the back, and those are real people.
	</footer>
</article>

<style>
	.pocket {
		max-width: 680px;
		margin: 0 auto 18px;
		background: #f7e46b;
		padding: 12px 16px;
		transform: rotate(-0.8deg);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.45);
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}
	.pocket p {
		margin: 0;
		font-size: 19px;
		color: #2a2410;
	}
	.pocket div {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.btn {
		font-family: var(--stamp-font);
		background: var(--toner);
		color: var(--paper);
		border: 0;
		padding: 8px 12px;
		text-decoration: none;
		cursor: pointer;
		font-size: 15px;
	}
	.btn.ghost {
		background: transparent;
		color: var(--toner);
		border: 2px solid var(--toner);
	}
	.slip {
		max-width: 680px;
		margin: 8px auto 0;
		padding: 34px 34px 26px;
		transform: rotate(-0.6deg);
	}
	.perf {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 10px;
		background: radial-gradient(circle at 6px 0, var(--table) 4px, transparent 4.5px) 0 0 / 16px 10px repeat-x;
	}
	.slip-head {
		border-bottom: 3px double var(--toner);
		padding-bottom: 10px;
		margin-bottom: 18px;
		position: relative;
	}
	.tiny {
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--toner-soft);
		text-transform: uppercase;
	}
	h1 {
		font-family: var(--stamp-font);
		font-weight: 400;
		font-size: clamp(30px, 7vw, 46px);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		margin: 2px 0 4px;
		line-height: 1.05;
	}
	.sub {
		margin: 0;
		font-size: 14px;
	}
	.slipno {
		position: absolute;
		right: 0;
		top: 0;
		margin: 0;
		font-size: 13px;
	}
	.redno {
		color: var(--stamp);
		letter-spacing: 0.1em;
	}
	form {
		display: grid;
		gap: 16px;
	}
	label,
	.label,
	legend {
		font-weight: 700;
		text-transform: uppercase;
		font-size: 13px;
		letter-spacing: 0.06em;
	}
	.row {
		display: grid;
		gap: 2px;
	}
	.split {
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.split > div {
		display: grid;
		gap: 2px;
	}
	.line {
		border: 0;
		border-bottom: 1.5px solid var(--toner);
		background: transparent;
		font-size: 24px;
		padding: 2px 4px 0;
		min-height: 40px;
		width: 100%;
	}
	.line.static {
		display: block;
	}
	.line::placeholder,
	.lined::placeholder {
		color: #9b937f;
		font-size: 18px;
	}
	.lined {
		border: 0;
		width: 100%;
		resize: vertical;
		font-size: 22px;
		line-height: 36px;
		padding: 0 4px;
		background: repeating-linear-gradient(transparent 0 35px, var(--rule) 35px 36px);
		min-height: 144px;
	}
	fieldset {
		border: 1.5px solid var(--toner);
		padding: 8px 12px 12px;
		margin: 0;
	}
	.boxes {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px 12px;
	}
	.box {
		display: flex;
		align-items: center;
		gap: 8px;
		text-transform: none;
		font-weight: 400;
		font-size: 16px;
		letter-spacing: 0;
		cursor: pointer;
		position: relative;
	}
	.box input {
		position: absolute;
		opacity: 0;
		width: 20px;
		height: 20px;
		margin: 0;
	}
	.tick {
		flex: none;
		width: 20px;
		height: 20px;
		border: 1.5px solid var(--toner);
		position: relative;
		background: var(--paper);
	}
	.box input:checked + .tick::after {
		content: '✓';
		position: absolute;
		left: 1px;
		top: -14px;
		font-family: var(--hand);
		font-size: 30px;
		color: var(--ballpoint);
		transform: rotate(-8deg);
	}
	.box input:focus-visible + .tick {
		outline: 3px solid var(--ballpoint);
		outline-offset: 2px;
	}
	.listen {
		font-size: 16px;
	}
	.problem {
		margin: 0;
		color: var(--stamp);
		font-family: var(--hand);
		font-size: 20px;
	}
	.sign {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
		margin-top: 4px;
	}
	.stamp-btn {
		background: none;
		border: 0;
		padding: 6px;
		cursor: pointer;
		transform: rotate(-4deg);
		transition: transform 0.12s;
	}
	.stamp-btn .stamp {
		font-size: 24px;
		border-width: 4px;
	}
	.stamp-btn:hover {
		transform: rotate(-4deg) scale(1.04);
	}
	.stamp-btn:active {
		transform: rotate(-4deg) scale(0.96);
	}
	.house-rule {
		flex: 1 1 240px;
		margin: 0;
		font-size: 14px;
		font-style: italic;
	}
	.po {
		margin: 18px 0 0;
		font-size: 13px;
	}
	.blank {
		display: inline-block;
		width: 90px;
		border-bottom: 1.5px solid var(--toner);
		vertical-align: -2px;
	}
	.ring {
		position: absolute;
		width: 150px;
		height: 150px;
		right: -30px;
		top: 210px;
		border-radius: 50%;
		background: radial-gradient(circle, transparent 58%, rgba(120, 72, 24, 0.22) 60%, rgba(120, 72, 24, 0.08) 64%, transparent 67%);
		transform: rotate(18deg) scaleX(1.06);
		pointer-events: none;
		mix-blend-mode: multiply;
	}
	.staple {
		position: absolute;
		top: 22px;
		left: 18px;
		width: 34px;
		height: 5px;
		border: 2px solid #9a9a96;
		border-bottom: 0;
		border-radius: 2px 2px 0 0;
		transform: rotate(-38deg);
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
	}
	.fine {
		margin-top: 16px;
		border-top: 1px dashed var(--toner-soft);
		padding-top: 10px;
		font-size: 12px;
		line-height: 1.5;
		color: var(--toner-soft);
	}
	@media (max-width: 560px) {
		.slip {
			padding: 26px 18px 20px;
			transform: none;
		}
		.boxes {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.split {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.slipno {
			position: static;
			margin-top: 6px;
		}
	}
</style>
