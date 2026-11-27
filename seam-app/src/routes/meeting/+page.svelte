<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import SeatingChart from '$lib/components/SeatingChart.svelte';
	import PhoneList from '$lib/components/PhoneList.svelte';
	import SignedSlip from '$lib/components/SignedSlip.svelte';
	import { advance, currentBeat, submitUserTurn, type FetchShare } from '$lib/client/runner';
	import { emptyPocket, putInPocket, takeFromPocket } from '$lib/client/pocket';
	import { getCharacter } from '$lib/core/characters';
	import { TOPICS } from '$lib/core/script';
	import { tapeLine } from '$lib/core/tape';
	import { ShareResponseSchema } from '$lib/contracts/share';
	import type { MeetingState, TranscriptEntry } from '$lib/contracts/meeting';

	let meeting = $state<MeetingState | null>(null);
	let typingId = $state<string | null>(null);
	let reveal = $state<{ id: string; shown: number } | null>(null);
	let draft = $state('');
	let topicChoice = $state('');
	let busy = $state(false);
	let listEl: HTMLOListElement | undefined = $state();
	let runToken = 0;
	let reducedMotion = false;

	const onTape = $derived(!!meeting?.transcript.some((e) => e.source === 'tape'));
	const beat = $derived(meeting ? currentBeat(meeting) : null);
	const waitingOnUser = $derived(
		!!meeting && !meeting.finished && beat?.kind === 'user_turn' && !meeting.intake.listeningOnly && !busy
	);
	const lastSpeaker = $derived.by(() => {
		if (typingId) return typingId;
		if (waitingOnUser) return 'you';
		const last = meeting?.transcript.findLast((e) => e.kind === 'share' || e.kind === 'user' || e.kind === 'crisis');
		if (!last) return null;
		return last.kind === 'user' ? 'you' : last.speakerId;
	});

	const fetchShare: FetchShare = async (request) => {
		try {
			const response = await fetch('/api/share', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(request)
			});
			if (response.ok) {
				const parsed = ShareResponseSchema.safeParse(await response.json());
				if (parsed.success) return parsed.data;
			}
		} catch {
			// The room does not go dark because the wifi did. The tape plays.
		}
		return {
			text: tapeLine(request.speakerId, request.slot, request.n, { name: request.userName, topic: request.topic }),
			source: 'tape'
		};
	};

	function wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function save(next: MeetingState) {
		meeting = next;
		putInPocket(next);
	}

	async function scrollDown() {
		await tick();
		const last = listEl?.lastElementChild as HTMLElement | null | undefined;
		last?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'end' });
	}

	async function typeOut(entry: TranscriptEntry, token: number) {
		if (reducedMotion || entry.kind !== 'share' || entry.source === 'authored') {
			await wait(entry.kind === 'ritual' ? 1100 : 650);
			return;
		}
		reveal = { id: entry.id, shown: 0 };
		const perTick = Math.max(2, Math.ceil(entry.text.length / 90));
		while (reveal && reveal.shown < entry.text.length) {
			if (token !== runToken) return;
			reveal = { id: entry.id, shown: Math.min(entry.text.length, reveal.shown + perTick) };
			await wait(22);
		}
		reveal = null;
		await wait(Math.min(2200, 500 + entry.text.length * 6));
	}

	async function run() {
		const token = ++runToken;
		while (meeting && token === runToken) {
			const next = currentBeat(meeting);
			if (!next || meeting.finished) break;
			if (next.kind === 'user_turn' && !meeting.intake.listeningOnly) break;
			typingId = next.kind === 'share' ? next.speakerId : null;
			const before = meeting.transcript.length;
			const after = await advance(meeting, fetchShare);
			if (token !== runToken) return;
			typingId = null;
			save(after);
			const added = after.transcript.slice(before);
			for (const entry of added) {
				await scrollDown();
				await typeOut(entry, token);
			}
		}
		await scrollDown();
	}

	async function respond(text: string | null, topic?: string) {
		if (!meeting || busy) return;
		busy = true;
		save(submitUserTurn(meeting, text, topic));
		draft = '';
		topicChoice = '';
		await scrollDown();
		await wait(900);
		busy = false;
		void run();
	}

	function fresh() {
		runToken += 1;
		emptyPocket();
		void goto('/');
	}

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const loaded = takeFromPocket();
		if (!loaded) {
			void goto('/', { replaceState: true });
			return;
		}
		meeting = loaded;
		if (loaded.transcript.length === 0 || !loaded.finished) void run();
		else void scrollDown();
		return () => {
			runToken += 1;
		};
	});

	$effect(() => {
		if (beat?.kind === 'user_turn' && beat.turn === 'intro' && meeting && !draft) {
			draft = `I'm ${meeting.intake.name}. ${meeting.intake.cleanTime}.`;
		}
	});

	function label(entry: TranscriptEntry): string {
		if (!entry.speakerId) return '';
		const c = getCharacter(entry.speakerId);
		return entry.speakerId === 'marcus' ? `${c.name} (chair)` : c.name;
	}
	function ink(entry: TranscriptEntry): string {
		return entry.speakerId ? getCharacter(entry.speakerId).color : 'var(--toner)';
	}
	function shown(entry: TranscriptEntry): string {
		return reveal && reveal.id === entry.id ? entry.text.slice(0, reveal.shown) : entry.text;
	}
</script>

<svelte:head>
	<title>{meeting ? `Minutes · Slip No. ${meeting.slipNumber}` : 'Walking in…'} · The 14th Step</title>
</svelte:head>

{#if !meeting}
	<p class="unstack">Unstacking chairs…</p>
{:else}
	<article class="sheet minutes" aria-labelledby="minutes-title">
		<header class="head">
			<div>
				<p class="tiny">BACK OF FORM 14-A · KEPT BY THE SECRETARY (A TYPEWRITER)</p>
				<h1 id="minutes-title">Minutes</h1>
				<dl class="meta">
					<div><dt>Slip No.</dt><dd class="red">{meeting.slipNumber}</dd></div>
					<div><dt>Newcomer</dt><dd class="hand">{meeting.intake.name}</dd></div>
					<div><dt>Walked in</dt><dd class="hand">{meeting.intake.mood}</dd></div>
					<div><dt>Topic</dt><dd>{meeting.topic ?? 'not yet'}</dd></div>
					{#if onTape}<div class="wide"><dt>Voices</dt><dd>house tape tonight (Grok is not answering), marked (tape)</dd></div>{/if}
				</dl>
			</div>
			<SeatingChart speakingId={lastSpeaker} userName={meeting.intake.name} crisis={meeting.crisis && !meeting.finished} />
		</header>

		<ol class="log" bind:this={listEl} aria-live="polite" aria-relevant="additions">
			{#each meeting.transcript as entry (entry.id)}
				{#if entry.kind === 'ritual'}
					<li class="ritual">— {entry.text} —</li>
				{:else if entry.kind === 'action'}
					<li class="action">[{entry.text}]</li>
				{:else if entry.kind === 'user'}
					<li class="user">
						<span class="who">{meeting.intake.name.toUpperCase()}:</span>
						<span class="hand said">{entry.text}</span>
						{#if entry.id.endsWith(':intro')}<span class="room-hi">ROOM: Hi, {meeting.intake.name}.</span>{/if}
					</li>
				{:else if entry.kind === 'phone_list'}
					<li class="phones"><PhoneList highlighted heading="Phone list (secretary highlighted it)" /></li>
				{:else}
					<li class="share" class:crisis={entry.kind === 'crisis'} style={`--ink:${ink(entry)}`}>
						<span class="who">{label(entry).toUpperCase()}:</span>
						<span class="said" aria-hidden={reveal?.id === entry.id ? 'true' : undefined}>{shown(entry)}{#if reveal?.id === entry.id}<span class="caret">▌</span>{/if}</span>{#if reveal?.id === entry.id}<span class="sr-only">{entry.text}</span>{/if}
						{#if entry.source === 'tape'}<span class="tape" title="Grok was unavailable, so this line came off the house tape">(tape)</span>{/if}
					</li>
				{/if}
			{/each}
			{#if typingId}
				<li class="typing" aria-label="The secretary is typing">
					<span class="who">{getCharacter(typingId).name.toUpperCase()}:</span>
					<span class="dots"><span>.</span><span>.</span><span>.</span></span>
					<span class="sr-only">{getCharacter(typingId).name} is about to speak.</span>
				</li>
			{/if}
		</ol>

		{#if waitingOnUser && beat?.kind === 'user_turn'}
			<section class="turn no-print" aria-label="Your turn">
				<p class="prompt">{beat.prompt}</p>
				{#if beat.turn === 'topic'}
					<fieldset class="topics">
						<legend>Tonight's topic <span class="tiny">(newcomer checks one)</span></legend>
						{#each TOPICS as topic (topic)}
							<label class="box">
								<input type="radio" name="topic" value={topic} bind:group={topicChoice} />
								<span class="tick" aria-hidden="true"></span>
								<span>{topic}</span>
							</label>
						{/each}
					</fieldset>
					<div class="buttons">
						<button type="button" class="btn" disabled={!topicChoice} onclick={() => void respond(null, topicChoice)}>Hand it back</button>
						<button type="button" class="btn ghost" onclick={() => void respond(null)}>Let Marcus pick</button>
					</div>
				{:else}
					<label class="sr-only" for="say">{beat.turn === 'intro' ? 'Introduce yourself' : 'What you want to say'}</label>
					<textarea id="say" class="lined hand" rows={beat.turn === 'intro' ? 2 : 4} bind:value={draft} maxlength="1200"
						placeholder={beat.turn === 'intro' ? '' : 'say it however it comes out'}></textarea>
					<div class="buttons">
						<button type="button" class="btn" disabled={!draft.trim()} onclick={() => void respond(draft)}>
							{beat.turn === 'intro' ? 'Say it' : 'Share it'}
						</button>
						<button type="button" class="btn ghost" onclick={() => void respond(null)}>
							{beat.turn === 'intro' ? 'Just my name' : 'Pass'}
						</button>
					</div>
				{/if}
			</section>
		{:else if meeting.intake.listeningOnly && !meeting.finished}
			<p class="listening no-print">You checked “listening only”. The room will go around you. <button type="button" class="linkish" onclick={fresh}>Leave early</button></p>
		{/if}
	</article>

	{#if meeting.finished}
		<SignedSlip {meeting} onFresh={fresh} />
	{/if}
{/if}

<style>
	.unstack {
		color: #e9e2cf;
		text-align: center;
		margin-top: 30vh;
		font-family: var(--stamp-font);
	}
	.minutes {
		max-width: 860px;
		margin: 6px auto 0;
		padding: 26px 30px 22px;
		transform: rotate(0.25deg);
	}
	.head {
		display: grid;
		grid-template-columns: 1fr 200px;
		gap: 18px;
		align-items: start;
		border-bottom: 3px double var(--toner);
		padding-bottom: 10px;
	}
	.tiny {
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--toner-soft);
		text-transform: uppercase;
		margin: 0;
	}
	h1 {
		font-family: var(--stamp-font);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: clamp(30px, 6vw, 44px);
		margin: 0 0 6px;
	}
	.meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2px 18px;
		margin: 0;
		font-size: 14px;
	}
	.meta div {
		display: flex;
		gap: 8px;
		align-items: baseline;
		border-bottom: 1px solid var(--rule);
		min-width: 0;
	}
	.meta .wide {
		grid-column: 1 / -1;
	}
	.meta dt {
		font-weight: 700;
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		flex: none;
	}
	.meta dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.meta .hand {
		font-size: 19px;
		line-height: 1.2;
	}
	.red {
		color: var(--stamp);
	}
	.log {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
		display: grid;
		gap: 12px;
	}
	.ritual {
		text-align: center;
		font-family: var(--stamp-font);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 15px;
		color: var(--toner-soft);
		padding: 4px 0;
	}
	.action {
		font-style: italic;
		color: var(--toner-soft);
		font-size: 15px;
		padding-left: 22px;
	}
	.share,
	.user,
	.typing {
		padding-left: 22px;
		position: relative;
	}
	.share::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 6px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--ink);
		opacity: 0.85;
	}
	.who {
		font-weight: 700;
		letter-spacing: 0.04em;
		margin-right: 6px;
	}
	.said {
		white-space: pre-wrap;
	}
	.user .said {
		font-size: 21px;
		line-height: 1.4;
	}
	.room-hi {
		display: block;
		font-size: 14px;
		color: var(--toner-soft);
		margin-top: 2px;
	}
	.crisis {
		background: linear-gradient(transparent 0, rgba(255, 242, 122, 0.55) 0);
		padding: 10px 12px 10px 26px;
		border-left: 4px solid var(--stamp);
	}
	.tape {
		margin-left: 6px;
		font-size: 12px;
		color: var(--toner-soft);
		white-space: nowrap;
	}
	.caret {
		animation: blink 0.7s steps(1) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.dots span {
		animation: blink 1s steps(1) infinite;
		font-weight: 700;
	}
	.dots span:nth-child(2) {
		animation-delay: 0.2s;
	}
	.dots span:nth-child(3) {
		animation-delay: 0.4s;
	}
	.turn {
		margin-top: 18px;
		border-top: 1.5px dashed var(--toner);
		padding-top: 12px;
		display: grid;
		gap: 10px;
	}
	.prompt {
		margin: 0;
		font-style: italic;
	}
	.lined {
		border: 0;
		width: 100%;
		resize: vertical;
		font-size: 22px;
		line-height: 36px;
		padding: 0 4px;
		background: repeating-linear-gradient(transparent 0 35px, var(--rule) 35px 36px);
		min-height: 72px;
	}
	.buttons {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.btn {
		font-family: var(--stamp-font);
		background: var(--toner);
		color: var(--paper);
		border: 0;
		padding: 10px 16px;
		cursor: pointer;
		font-size: 16px;
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.btn.ghost {
		background: transparent;
		color: var(--toner);
		border: 2px solid var(--toner);
	}
	.topics {
		border: 1.5px solid var(--toner);
		margin: 0;
		padding: 8px 12px 12px;
		display: grid;
		gap: 8px;
	}
	legend {
		font-weight: 700;
		text-transform: uppercase;
		font-size: 13px;
		letter-spacing: 0.06em;
	}
	.box {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		cursor: pointer;
		position: relative;
		font-size: 16px;
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
		margin-top: 2px;
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
	.listening {
		margin: 16px 0 0;
		font-style: italic;
		font-size: 15px;
	}
	.linkish {
		background: none;
		border: 0;
		padding: 0;
		text-decoration: underline;
		cursor: pointer;
		font-style: normal;
	}
	@media (max-width: 640px) {
		.minutes {
			padding: 20px 16px 18px;
			transform: none;
		}
		.head {
			grid-template-columns: 1fr;
		}
		.head :global(.chart) {
			max-width: 170px;
			margin: 0 auto;
		}
		.meta {
			grid-template-columns: 1fr;
		}
		.share,
		.user,
		.typing,
		.action {
			padding-left: 16px;
		}
	}
</style>
