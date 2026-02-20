<script lang="ts">
	type EntryMode = 'guest' | 'account' | null;

	let mode: EntryMode = null;
	let displayName = '';
	let mood = '';
	let listeningOnly = false;
	let meetingStatus: 'idle' | 'starting' | 'ready' = 'idle';
	let meetingError = '';
	let createdMeeting: {
		meetingId: string;
		topic: string;
		startedAt: string;
	} | null = null;

	const guestExplanation =
		'Jump in right now. No account, no long setup, no fake promises. Your one-off meeting is temporary unless you later choose to save progress.';
	const accountExplanation =
		'Create an account only if you want meeting history and returning character memory. We will never block a one-time meeting behind signup.';

	async function startGuestMeeting() {
		meetingStatus = 'starting';
		meetingError = '';
		createdMeeting = null;

		const trimmedName = displayName.trim();
		const effectiveName = trimmedName.length > 0 ? trimmedName : 'Friend';
		const effectiveMood = mood.trim().length > 0 ? mood.trim() : 'rough day';

		const sessionResponse = await fetch('/api/session/guest', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ displayName: effectiveName })
		});

		if (!sessionResponse.ok) {
			meetingStatus = 'idle';
			meetingError = 'Could not start a guest session right now. Give it another shot in a minute.';
			return;
		}

		const meetingResponse = await fetch('/api/meetings/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic: 'Keeping your head straight today',
				mood: effectiveMood,
				listeningOnly
			})
		});

		if (!meetingResponse.ok) {
			meetingStatus = 'idle';
			meetingError = 'Service is temporarily down on our side. No blame on you. Try again shortly.';
			return;
		}

		createdMeeting = await meetingResponse.json();
		meetingStatus = 'ready';
	}
</script>

<h1>The 14th Step</h1>
<p class="lede">No lectures. No fake positivity. Just a room you can walk into right now.</p>

<section class="mode-grid">
	<button class="mode-btn" type="button" on:click={() => (mode = 'guest')}
		>Start one-time meeting now</button
	>
	<button class="mode-btn secondary" type="button" on:click={() => (mode = 'account')}>
		Create account to save progress
	</button>
</section>

{#if mode === 'guest'}
	<section class="panel" aria-live="polite">
		<h2>One-time meeting (no account)</h2>
		<p>{guestExplanation}</p>

		<label>
			What should the room call you?
			<input bind:value={displayName} placeholder="Name or nickname" />
		</label>
		<small>Why we ask: People in the room need a name to talk to you like a real person.</small>

		<label>
			How are you showing up today?
			<input bind:value={mood} placeholder="Angry, numb, wired, hopeful..." />
		</label>
		<small
			>Why we ask: Sets the tone so responses match your reality, not some scripted nonsense.</small
		>

		<label class="check-row">
			<input type="checkbox" bind:checked={listeningOnly} />
			<span>Listening-only for now</span>
		</label>

		<button type="button" on:click={startGuestMeeting} disabled={meetingStatus === 'starting'}>
			{meetingStatus === 'starting' ? 'Starting...' : 'Enter the room'}
		</button>

		{#if meetingError}
			<p class="error">{meetingError}</p>
		{/if}

		{#if createdMeeting}
			<div class="meeting-ready">
				<p><strong>Meeting live.</strong> You are in.</p>
				<p>Topic: {createdMeeting.topic}</p>
				<p>Meeting ID: {createdMeeting.meetingId}</p>
			</div>
		{/if}
	</section>
{/if}

{#if mode === 'account'}
	<section class="panel" aria-live="polite">
		<h2>Account for saved history</h2>
		<p>{accountExplanation}</p>
		<p class="muted">
			Account signup is being rebuilt to remove the key/config friction you hit. Until then, use
			one-time mode above.
		</p>
	</section>
{/if}

<style>
	:global(body) {
		font-family: Inter, system-ui, sans-serif;
		background: #131111;
		color: #f4ece6;
	}
	.lede {
		max-width: 55ch;
	}
	.mode-grid {
		display: flex;
		gap: 0.75rem;
		margin: 1rem 0;
		flex-wrap: wrap;
	}
	.mode-btn,
	button {
		background: #f4ece6;
		color: #1a1616;
		border: 0;
		padding: 0.65rem 1rem;
		border-radius: 0.45rem;
		font-weight: 700;
		cursor: pointer;
	}
	.mode-btn.secondary {
		background: #2f2828;
		color: #f4ece6;
		outline: 1px solid #5a4c4c;
	}
	.panel {
		background: #221d1d;
		padding: 1rem;
		border-radius: 0.5rem;
		max-width: 42rem;
		display: grid;
		gap: 0.5rem;
	}
	label {
		display: grid;
		gap: 0.3rem;
		font-weight: 600;
	}
	input {
		padding: 0.5rem;
		border-radius: 0.35rem;
		border: 1px solid #4b4040;
		background: #161212;
		color: #f4ece6;
	}
	small,
	.muted {
		color: #c8b8b0;
	}
	.check-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.error {
		color: #ff9a9a;
		font-weight: 600;
	}
	.meeting-ready {
		margin-top: 0.5rem;
		padding: 0.75rem;
		border-radius: 0.4rem;
		background: #19331f;
		color: #d7ffd8;
	}
</style>
