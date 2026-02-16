<script lang="ts">
	export interface ShareView {
		id: string;
		speakerName: string;
		content: string;
		isUserShare: boolean;
		significanceScore: number;
		sequenceOrder: number;
	}

	let {
		entry,
		expandedText,
		onExpand,
		expanding = false
	}: {
		entry: ShareView;
		expandedText?: string;
		onExpand?: (shareId: string) => void;
		expanding?: boolean;
	} = $props();
</script>

<li class="rounded-xl border border-gray-700 bg-gray-800 p-3">
	<p class="text-sm font-semibold text-gray-100">{entry.speakerName}</p>
	<p class="mt-1 text-sm text-gray-200">{entry.content}</p>

	{#if !entry.isUserShare}
		<button
			type="button"
			onclick={() => onExpand?.(entry.id)}
			disabled={expanding}
			class="mt-2 rounded-md bg-teal-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
		>
			{expanding ? 'Expanding...' : 'Expand'}
		</button>
	{/if}

	{#if expandedText}
		<p class="mt-2 rounded-md border border-indigo-500 bg-indigo-950/40 p-2 text-sm text-indigo-100">
			{expandedText}
		</p>
	{/if}

	<p class="mt-2 text-xs text-gray-400">Significance {entry.significanceScore} · #{entry.sequenceOrder}</p>
</li>
