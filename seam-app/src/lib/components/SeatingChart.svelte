<script lang="ts">
	import { CHARACTERS } from '$lib/core/characters';

	let { speakingId = null, userName, crisis = false }: { speakingId?: string | null; userName: string; crisis?: boolean } = $props();

	// Eight chairs: six regulars, you, and the one that stays empty. Drawn like the secretary's sketch.
	const seats = [
		...CHARACTERS.map((c) => ({ id: c.id, label: c.name, initial: c.name.slice(0, 2), color: c.color })),
		{ id: 'you', label: 'You', initial: 'you', color: '#1f3a93' },
		{ id: 'empty', label: 'Empty chair', initial: '', color: '#8a8270' }
	];
	const R = 74;
	const placed = seats.map((seat, i) => {
		const angle = (i / seats.length) * Math.PI * 2 - Math.PI / 2;
		return { ...seat, x: 100 + Math.cos(angle) * R, y: 100 + Math.sin(angle) * R };
	});
</script>

<figure class="chart" aria-label="Seating chart">
	<svg viewBox="0 0 200 200" role="img" aria-labelledby="chart-title">
		<title id="chart-title">Seating chart. {speakingId === 'you' ? userName : (CHARACTERS.find((c) => c.id === speakingId)?.name ?? 'Nobody')} has the floor.</title>
		<ellipse cx="100" cy="100" rx="42" ry="30" class="table" />
		<text x="100" y="98" class="table-label">coffee</text>
		<text x="100" y="110" class="table-label">(bad)</text>
		{#each placed as seat (seat.id)}
			<g class:speaking={seat.id === speakingId} class:empty={seat.id === 'empty'} class:you={seat.id === 'you'}>
				<rect x={seat.x - 13} y={seat.y - 13} width="26" height="26" rx="3" style={`--ink:${seat.color}`} />
				<text x={seat.x} y={seat.y + 4} class="initial" style={`fill:${seat.color}`}>{seat.initial}</text>
				{#if seat.id === speakingId}
					<ellipse cx={seat.x} cy={seat.y} rx="21" ry="19" class="circled" />
				{/if}
			</g>
		{/each}
	</svg>
	<figcaption>
		{#if crisis}
			<span class="hl">Meeting paused for {userName}.</span>
		{:else if speakingId === 'you'}
			Floor: <span class="hand">{userName}</span>
		{:else if speakingId}
			Floor: {CHARACTERS.find((c) => c.id === speakingId)?.name}
		{:else}
			Floor: open
		{/if}
	</figcaption>
</figure>

<style>
	.chart {
		margin: 0;
		width: 100%;
		max-width: 210px;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.table {
		fill: none;
		stroke: var(--toner);
		stroke-width: 1.4;
		stroke-dasharray: 3 2;
	}
	.table-label {
		font-family: var(--hand);
		font-size: 10px;
		text-anchor: middle;
		fill: var(--toner-soft);
	}
	rect {
		fill: var(--paper);
		stroke: var(--toner);
		stroke-width: 1.3;
	}
	.empty rect {
		stroke-dasharray: 2 2;
		fill: transparent;
	}
	.you rect {
		stroke: var(--ballpoint);
		stroke-width: 1.8;
	}
	.initial {
		font-family: var(--type);
		font-weight: 700;
		font-size: 10px;
		text-anchor: middle;
	}
	.you .initial {
		font-family: var(--hand);
		font-weight: 400;
		font-size: 11px;
	}
	.circled {
		fill: none;
		stroke: var(--ballpoint);
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-dasharray: 130;
		stroke-dashoffset: 130;
		animation: circle 0.5s ease-out forwards;
		transform-box: fill-box;
		transform-origin: center;
		transform: rotate(-20deg);
	}
	@keyframes circle {
		to {
			stroke-dashoffset: 4;
		}
	}
	figcaption {
		text-align: center;
		font-size: 13px;
		margin-top: 2px;
	}
	figcaption .hand {
		font-size: 17px;
	}
	.hl {
		background: linear-gradient(transparent 30%, var(--highlight) 30% 88%, transparent 88%);
	}
</style>
