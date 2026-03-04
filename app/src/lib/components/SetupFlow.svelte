<script lang="ts">
	import { pickStartupSaying } from '$lib/content/startup-sayings';

	type StepId = 1 | 2 | 3 | 4;
	type SetupValues = {
		userName?: string;
		cleanTime?: string;
		mood?: string;
		mind?: string;
		userId?: string;
		listeningOnly?: boolean;
	};

	let { form }: { form?: { message?: string; values?: SetupValues } } = $props();

	let step = $state<StepId>(1);
	const initialUserName = $derived(form?.values?.userName ?? '');
	const initialCleanTime = $derived(form?.values?.cleanTime ?? '');
	const initialMood = $derived(form?.values?.mood ?? 'anxious');
	const initialMind = $derived(form?.values?.mind ?? '');
	const initialUserId = $derived(form?.values?.userId ?? '');
	const initialListeningOnly = $derived(form?.values?.listeningOnly ?? false);
	let userName = $state('');
	let cleanTime = $state('');
	let mood = $state('anxious');
	let mind = $state('');
	let userId = $state('');
	let listeningOnly = $state(false);
	let startupSaying = $state('');

	$effect(() => {
		if (!userName) userName = initialUserName;
		if (!cleanTime) cleanTime = initialCleanTime;
		if (!mind) mind = initialMind;
		if (!userId) userId = initialUserId;
		if (mood === 'anxious' && initialMood !== 'anxious') mood = initialMood;
		if (!listeningOnly && initialListeningOnly) listeningOnly = initialListeningOnly;
		if (!startupSaying) startupSaying = pickStartupSaying();
	});

	const totalSteps = 4;
	const moodOptions = [
		{ value: 'anxious', label: 'Anxious' },
		{ value: 'hopeful', label: 'Hopeful' },
		{ value: 'angry', label: 'Angry' },
		{ value: 'numb', label: 'Numb' },
		{ value: 'grateful', label: 'Grateful' },
		{ value: 'burned out', label: 'Burned Out' },
		{ value: 'restless', label: 'Restless' },
		{ value: 'ashamed', label: 'Ashamed' }
	];

	function nextStep() {
		if (step < totalSteps) step = (step + 1) as StepId;
	}

	function previousStep() {
		if (step > 1) step = (step - 1) as StepId;
	}

	function canAdvance(): boolean {
		if (step === 1) return userName.trim().length > 0;
		if (step === 2) return cleanTime.trim().length > 0;
		if (step === 3) return mood.trim().length > 0;
		if (step === 4) return mind.trim().length > 0;
		return false;
	}
</script>

<section class="setup-shell">
	<header>
		<h1>The 14th Step</h1>
		<p>Step {step} of {totalSteps}</p>
		<div class="step-rail" style={`--progress:${(step / totalSteps) * 100}%`} aria-hidden="true">
			<span></span>
		</div>
		{#if startupSaying}
			<blockquote class="startup-saying">{startupSaying}</blockquote>
		{/if}
	</header>

	{#if form?.message}
		<p class="alert" role="alert">{form.message}</p>
	{/if}

	<form method="POST" action="?/join" class="setup-form">
		<input type="hidden" name="userName" value={userName} />
		<input type="hidden" name="cleanTime" value={cleanTime} />
		<input type="hidden" name="mood" value={mood} />
		<input type="hidden" name="mind" value={mind} />
		<input type="hidden" name="userId" value={userId} />
		<input type="hidden" name="listeningOnly" value={listeningOnly ? 'on' : ''} />

		{#if step === 1}
			<label for="userName">Name</label>
			<input id="userName" type="text" bind:value={userName} placeholder="What should the room call you?" />
		{/if}

		{#if step === 2}
			<label for="cleanTime">Clean Time</label>
			<input id="cleanTime" type="text" bind:value={cleanTime} placeholder="e.g., 19 days, 2 years" />
		{/if}

		{#if step === 3}
			<label for="mood">Mood</label>
			<select id="mood" bind:value={mood}>
				{#each moodOptions as moodOption (moodOption.value)}
					<option value={moodOption.value}>{moodOption.label}</option>
				{/each}
			</select>
		{/if}

		{#if step === 4}
			<label for="mind">What's on your mind?</label>
			<textarea id="mind" rows="4" bind:value={mind} placeholder="What are you bringing into the room?"></textarea>

			<label class="toggle" for="listeningOnly">
				<input id="listeningOnly" type="checkbox" bind:checked={listeningOnly} />
				Listening only
			</label>
		{/if}

		<footer class="actions">
			<button type="button" onclick={previousStep} disabled={step === 1}>Back</button>
			{#if step < 4}
				<button type="button" onclick={nextStep} disabled={!canAdvance()}>Next</button>
			{:else}
				<button type="submit" disabled={!canAdvance()}>Join Meeting</button>
			{/if}
		</footer>
	</form>
</section>

<style>
	.setup-shell {
		border: 1px solid rgba(177, 193, 220, 0.22);
		border-radius: 1.1rem;
		background:
			linear-gradient(180deg, rgba(17, 24, 39, 0.84), rgba(5, 9, 16, 0.9)),
			radial-gradient(circle at 94% 2%, rgba(246, 163, 27, 0.2), transparent 42%);
		padding: 1.12rem;
		backdrop-filter: blur(4px);
		box-shadow:
			0 22px 34px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		animation: shellRise 560ms ease-out;
	}

	header h1 {
		margin: 0;
		color: #fff7dd;
		font-size: 1.56rem;
		font-weight: 600;
	}

	header p {
		margin: 0.35rem 0 0;
		color: #ffd486;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.step-rail {
		margin-top: 0.58rem;
		height: 0.32rem;
		border-radius: 999px;
		background: rgba(77, 88, 112, 0.4);
		overflow: hidden;
	}

	.step-rail span {
		display: block;
		height: 100%;
		width: var(--progress);
		background: linear-gradient(90deg, #f6a31b, #ffd176);
		border-radius: inherit;
		transition: width 220ms ease;
	}

	.startup-saying {
		margin: 0.9rem 0 0;
		padding: 0.7rem 0.75rem;
		border-left: 3px solid rgba(255, 209, 118, 0.9);
		background: rgba(13, 20, 34, 0.68);
		color: #e8eefc;
		font-size: 0.89rem;
		line-height: 1.45;
		font-style: italic;
	}

	.alert {
		margin: 0.9rem 0;
		padding: 0.75rem;
		border: 1px solid rgba(253, 164, 175, 0.4);
		border-radius: 0.65rem;
		color: #fecdd3;
		background: rgba(136, 19, 55, 0.2);
	}

	.setup-form {
		display: grid;
		gap: 0.66rem;
		margin-top: 1rem;
	}

	.setup-form label {
		color: #dbe7ff;
		font-size: 0.77rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.setup-form input,
	.setup-form select,
	.setup-form textarea {
		width: 100%;
		border: 1px solid rgba(159, 178, 210, 0.28);
		border-radius: 0.68rem;
		background: rgba(6, 9, 15, 0.85);
		color: #f8fafc;
		font-size: 0.95rem;
		padding: 0.68rem 0.8rem;
		outline: none;
		transition: border-color 120ms ease, box-shadow 120ms ease;
	}

	.setup-form textarea {
		resize: vertical;
		min-height: 6rem;
	}

	.setup-form input:focus,
	.setup-form select:focus,
	.setup-form textarea:focus {
		border-color: rgba(246, 163, 27, 0.9);
		box-shadow: 0 0 0 3px rgba(246, 163, 27, 0.2);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.88rem;
	}

	.toggle input {
		width: auto;
	}

	.actions {
		display: flex;
		justify-content: space-between;
		gap: 0.65rem;
		margin-top: 0.5rem;
	}

	.actions button {
		appearance: none;
		border: 0;
		border-radius: 0.68rem;
		padding: 0.72rem 1rem;
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
	}

	.actions button:first-child {
		flex: 1;
		background: rgba(51, 65, 85, 0.95);
		color: #f1f5f9;
	}

	.actions button:last-child {
		flex: 1.4;
		background: linear-gradient(125deg, #f08b14, #ffd176);
		color: #0d1623;
	}

	.actions button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		filter: grayscale(25%);
	}

	.actions button:not(:disabled):hover {
		transform: translateY(-1px);
		filter: brightness(1.03);
	}

	@keyframes shellRise {
		from {
			transform: translateY(7px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
