<script lang="ts">
	import type { ActionData } from './$types';

	let { form } = $props<{ form?: ActionData }>();
</script>

<h1>Start a Recovery Meeting</h1>
<p>Set up your meeting context, then continue to the live room.</p>

{#if form?.message}
	<p role="alert" style="color: #b91c1c;">{form.message}</p>
{/if}

<form method="POST" action="?/join">
	<label for="topic">Topic</label>
	<input
		id="topic"
		name="topic"
		type="text"
		required
		maxlength="140"
		value={form?.values?.topic ?? ''}
		placeholder="What are you bringing into the room?"
	/>

	<label for="mood">Mood</label>
	<select id="mood" name="mood" required>
		<option value="anxious" selected={(form?.values?.mood ?? 'anxious') === 'anxious'}>Anxious</option>
		<option value="hopeful" selected={(form?.values?.mood ?? 'anxious') === 'hopeful'}>Hopeful</option>
		<option value="angry" selected={(form?.values?.mood ?? 'anxious') === 'angry'}>Angry</option>
		<option value="numb" selected={(form?.values?.mood ?? 'anxious') === 'numb'}>Numb</option>
		<option value="grateful" selected={(form?.values?.mood ?? 'anxious') === 'grateful'}>Grateful</option>
	</select>

	<label for="userId">User ID (optional)</label>
	<input
		id="userId"
		name="userId"
		type="text"
		value={form?.values?.userId ?? ''}
		placeholder="user-123"
	/>

	<label for="listeningOnly">
		<input
			id="listeningOnly"
			name="listeningOnly"
			type="checkbox"
			checked={form?.values?.listeningOnly ?? false}
		/>
		Listening only
	</label>

	<button type="submit">Join Meeting</button>
</form>
