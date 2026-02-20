<section class="hero">
	<p class="eyebrow">The 14th Step</p>
	<h1>Need a meeting right now?</h1>
	<p class="lede">
		No lecture. No fake therapy voice. Pick a lane and we will get you in the room.
	</p>

	<div class="actions">
		<a class="primary" href="/start/guest">Start as guest</a>
		<a class="secondary" href="/signup">Create account</a>
	</div>

	<ul>
		<li>Guest mode gets you in fast. No account required.</li>
		<li>Account mode saves meeting history and continuity.</li>
		<li>If you are in immediate danger, call or text 988 now.</li>
	</ul>
</section>

<style>
	:global(body) {
		font-family: Inter, system-ui, sans-serif;
		background: #0f0f10;
		color: #f5f5f5;
	}

	.hero {
		max-width: 720px;
		margin: 4rem auto;
		padding: 1.5rem;
	}

	.eyebrow {
		color: #f59e0b;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		margin: 0.4rem 0 0.8rem;
	}

	.lede {
		color: #d1d5db;
		font-size: 1.1rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin: 1.25rem 0;
		flex-wrap: wrap;
	}

	a {
		text-decoration: none;
		border-radius: 0.6rem;
		padding: 0.75rem 1rem;
		font-weight: 700;
	}

	.primary {
		background: #f59e0b;
		color: #111827;
	}

	.secondary {
		background: #27272a;
		color: #f4f4f5;
		border: 1px solid #3f3f46;
	}

	ul {
		margin: 0;
		padding-left: 1.25rem;
		color: #d4d4d8;
		line-height: 1.5;
	}
</style>
