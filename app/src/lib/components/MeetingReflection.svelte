<script lang="ts">
	let {
		summary,
		onClose
	}: {
		summary: string;
		onClose?: () => void;
	} = $props();
</script>

<section class="rounded-xl border border-amber-500 bg-gray-800 p-4">
	<h2 class="text-lg font-semibold text-amber-200">Meeting Reflection</h2>
	<p class="mt-2 text-sm text-gray-100">{summary}</p>
	<button
		type="button"
		onclick={() => onClose?.()}
		class="mt-3 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
	>
		Return to Meeting
	</button>
</section>
