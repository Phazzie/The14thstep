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

<section class="circle-panel" aria-label="Meeting circle">
	<h2>The Circle</h2>
	<ul>
		{#each characters as character (character.id)}
			<li class:active={activeCharacterId === character.id}>
				<p class="name">{character.name}</p>
				<p class="meta">{character.cleanTime}</p>
				{#if activeCharacterId === character.id}
					<p class="speaking">Speaking</p>
				{/if}
			</li>
		{/each}
	</ul>
	{#if crisisMode}
		<p class="crisis-line" role="status">Crisis support active. Regular share cycle is paused.</p>
	{/if}
</section>

<style>
	.circle-panel h2 {
		margin: 0;
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #ffdca2;
	}

	.circle-panel ul {
		list-style: none;
		padding: 0;
		margin: 0.72rem 0 0;
		display: grid;
		gap: 0.45rem;
	}

	.circle-panel li {
		padding: 0.56rem 0.62rem;
		border-radius: 0.72rem;
		border: 1px solid rgba(125, 149, 187, 0.3);
		background: rgba(11, 20, 36, 0.74);
	}

	.circle-panel li.active {
		border-color: rgba(255, 192, 103, 0.66);
		box-shadow: inset 3px 0 0 #f7a423;
	}

	.name {
		margin: 0;
		font-weight: 700;
		color: #e8f2ff;
	}

	.meta {
		margin: 0.14rem 0 0;
		font-size: 0.78rem;
		color: #a4b5d2;
	}

	.speaking {
		margin: 0.24rem 0 0;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #ffd797;
	}

	.crisis-line {
		margin: 0.72rem 0 0;
		padding: 0.58rem 0.62rem;
		border-radius: 0.65rem;
		background: rgba(128, 28, 46, 0.22);
		border: 1px solid rgba(252, 165, 165, 0.42);
		color: #fecaca;
		font-size: 0.82rem;
	}
</style>
