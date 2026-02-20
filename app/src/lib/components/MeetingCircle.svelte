<script lang="ts">
	export interface CircleCharacter {
		id: string;
		name: string;
		avatar: string;
		cleanTime: string;
		color: string;
	}

	let {
		characters,
		activeCharacterId,
		crisisMode = false
	}: {
		characters: CircleCharacter[];
		activeCharacterId: string | null;
		crisisMode?: boolean;
	} = $props();
</script>

<section>
	<h2 class="text-base font-semibold text-gray-100">Meeting Circle</h2>
	<ul class="mt-3 flex flex-wrap gap-3">
		{#each characters as character (character.id)}
			<li
				class={`min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm ${
					activeCharacterId === character.id
						? 'border-amber-400 bg-amber-500/20 text-amber-100'
						: 'border-gray-700 bg-gray-800 text-gray-100'
				}`}
			>
				<p class="font-semibold">{character.name}</p>
				<p class="text-xs text-gray-300">{character.cleanTime}</p>
				{#if activeCharacterId === character.id}
					<p class="text-xs font-medium text-amber-300">Speaking</p>
				{/if}
			</li>
		{/each}
	</ul>
	{#if crisisMode}
		<p class="mt-3 text-sm text-rose-200">Crisis mode active: regular share cycle is paused.</p>
	{/if}
</section>
