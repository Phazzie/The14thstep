<script lang="ts">
	import { OUTSIDE_US_LINE, PHONE_LIST } from '$lib/core/crisis';
	let { highlighted = false, heading = 'Phone list' }: { highlighted?: boolean; heading?: string } = $props();
</script>

<section class="phones" class:highlighted aria-label={heading}>
	<h2>{heading}</h2>
	<p class="lede">These are real people. Not us. Free, any hour.</p>
	<ul>
		{#each PHONE_LIST as entry (entry.number)}
			<li>
				<a href={entry.href}><span class="num">{entry.number}</span><span class="what"><strong>{entry.label}</strong> {entry.how}</span></a>
			</li>
		{/each}
	</ul>
	<p class="outside">{OUTSIDE_US_LINE}</p>
</section>

<style>
	.phones {
		border: 2px solid var(--toner);
		padding: 12px 14px 10px;
		background: var(--paper);
		position: relative;
	}
	.highlighted {
		border: 4px solid var(--stamp);
		box-shadow: 0 0 0 6px rgba(255, 242, 122, 0.7);
	}
	h2 {
		margin: 0;
		font-family: var(--stamp-font);
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 20px;
	}
	.lede {
		margin: 2px 0 8px;
		font-size: 14px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	a {
		display: grid;
		grid-template-columns: minmax(118px, auto) 1fr;
		gap: 12px;
		align-items: baseline;
		text-decoration: none;
		padding: 6px 4px;
		border-bottom: 1px dotted var(--toner-soft);
	}
	a:hover .num,
	.highlighted .num {
		background: linear-gradient(transparent 25%, var(--highlight) 25% 90%, transparent 90%);
	}
	.num {
		font-weight: 700;
		font-size: 22px;
		letter-spacing: 0.02em;
	}
	.what {
		font-size: 15px;
	}
	.outside {
		margin: 8px 0 0;
		font-size: 13px;
		color: var(--toner-soft);
	}
	@media (max-width: 480px) {
		a {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
