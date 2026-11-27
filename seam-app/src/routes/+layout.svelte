<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	let { children } = $props();
</script>

<a class="skip no-print" href="#main">Skip to the slip</a>

<header class="table-top no-print">
	<a class="house" href="/" aria-label="The 14th Step, home">
		<span class="mark">14</span>
		<span class="words">THE 14TH STEP<small>room open 24 hrs · chairs: 8</small></span>
	</a>
	<nav aria-label="Pinned to the table">
		<a class="note yellow" href="/phone-list" aria-current={page.url.pathname === '/phone-list' ? 'page' : undefined}>Phone list</a>
		<a class="note pink" href="/fine-print" aria-current={page.url.pathname === '/fine-print' ? 'page' : undefined}>Fine print</a>
	</nav>
</header>

<main id="main">
	{@render children()}
</main>

<style>
	.skip {
		position: absolute;
		left: -999px;
		top: 8px;
		background: var(--paper);
		padding: 8px 12px;
		z-index: 10;
	}
	.skip:focus {
		left: 8px;
	}
	.table-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		max-width: 980px;
		margin: 0 auto;
		padding: 14px 16px 4px;
	}
	.house {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #e9e2cf;
	}
	.mark {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 3px solid #d8574d;
		border-radius: 50%;
		color: #d8574d;
		font-family: var(--stamp-font);
		font-size: 18px;
		transform: rotate(-12deg);
	}
	.words {
		font-family: var(--stamp-font);
		letter-spacing: 0.12em;
		font-size: 15px;
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}
	.words small {
		font-family: var(--type);
		letter-spacing: 0.02em;
		font-size: 12px;
		color: #a9a08a;
	}
	nav {
		display: flex;
		gap: 10px;
	}
	.note {
		white-space: nowrap;
		font-family: var(--hand);
		font-size: 17px;
		text-decoration: none;
		color: #2a2410;
		padding: 6px 12px 4px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.45);
	}
	.note.yellow {
		background: #f7e46b;
		transform: rotate(-3deg);
	}
	.note.pink {
		background: #f4a9b8;
		transform: rotate(2.5deg);
	}
	.note[aria-current='page'] {
		text-decoration: underline;
		text-decoration-thickness: 2px;
	}
	main {
		max-width: 980px;
		margin: 0 auto;
		padding: 12px 16px 64px;
	}
	@media (max-width: 520px) {
		.words small {
			display: none;
		}
		.note {
			font-size: 15px;
			padding: 5px 9px 3px;
		}
	}
</style>
