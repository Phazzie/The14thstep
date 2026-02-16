<script lang="ts">
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

	$effect(() => {
		if (!userName) userName = initialUserName;
		if (!cleanTime) cleanTime = initialCleanTime;
		if (!mind) mind = initialMind;
		if (!userId) userId = initialUserId;
		if (mood === 'anxious' && initialMood !== 'anxious') mood = initialMood;
		if (!listeningOnly && initialListeningOnly) listeningOnly = initialListeningOnly;
	});

	const totalSteps = 4;

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
				<option value="anxious">Anxious</option>
				<option value="hopeful">Hopeful</option>
				<option value="angry">Angry</option>
				<option value="numb">Numb</option>
				<option value="grateful">Grateful</option>
			</select>
		{/if}

		{#if step === 4}
			<label for="mind">What's on your mind?</label>
			<textarea id="mind" rows="4" bind:value={mind} placeholder="What are you bringing into the room?"></textarea>

			<label for="userId">User ID (optional)</label>
			<input id="userId" type="text" bind:value={userId} placeholder="Supabase auth user id" />

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
