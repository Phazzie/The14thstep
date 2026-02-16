<script lang="ts">
	import SetupFlow from '$lib/components/SetupFlow.svelte';
	import type { ActionData } from './$types';

	let { form } = $props<{ form?: ActionData }>();
</script>

<main class="mx-auto max-w-2xl p-4">
	<SetupFlow {form} />
</main>
