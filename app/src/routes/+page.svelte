<script lang="ts">
	import SetupFlow from '$lib/components/SetupFlow.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data?: PageData; form?: ActionData }>();
	const userId = $derived(data?.userId ?? null);
</script>

<main class="landing-shell">
	<section class="hero-card">
		<div class="hero-image-wrap">
			<img
				src="/images/recoverymeetingui.jpg"
				alt="Recovery room mood board with coffee, smoke break outside, and late-night meeting energy."
			/>
			<div class="hero-overlay">
				<p class="hero-title">The 14th Step</p>
				<p>Fake meeting. Real night. No bullshit.</p>
			</div>
		</div>
		<ul class="hero-facts">
			<li>Room is live 24/7.</li>
			<li>Pass anytime.</li>
			<li>No therapy-speak.</li>
		</ul>
	</section>

	<section class="main-pane">
		<section class="account-card">
			<h2>Account</h2>
			{#if userId}
				<p class="meta-line">Signed in as <code>{userId}</code></p>
				<form method="POST" action="?/signOut" class="auth-form">
					<button type="submit" class="ghost-btn"> Sign Out </button>
				</form>
			{:else}
				<p class="meta-line">Sign in with your Supabase account.</p>
				{#if form && 'authMessage' in form && form.authMessage}
					<p class="auth-alert" role="alert">{form.authMessage}</p>
				{/if}
				<form method="POST" action="?/signIn" class="auth-form auth-grid">
					<label for="email">Email</label>
					<input id="email" name="email" type="email" required autocomplete="email" />
					<label for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
					/>
					<button type="submit" class="auth-btn"> Sign In </button>
				</form>
			{/if}
		</section>
		<SetupFlow {form} />
	</section>
</main>

<style>
	.landing-shell {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		grid-template-columns: minmax(280px, 0.95fr) minmax(340px, 1.3fr);
		gap: 1rem;
	}

	.hero-card {
		border: 1px solid rgba(148, 163, 184, 0.24);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(3, 7, 18, 0.95), rgba(17, 24, 39, 0.9));
		padding: 0.7rem;
		box-shadow: 0 20px 36px rgba(0, 0, 0, 0.45);
	}

	.hero-image-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 0.85rem;
	}

	.hero-image-wrap img {
		display: block;
		width: 100%;
		height: 360px;
		object-fit: cover;
		filter: saturate(0.95) contrast(1.03);
	}

	.hero-overlay {
		position: absolute;
		inset: auto 0 0 0;
		padding: 1rem 0.95rem;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.78));
	}

	.hero-title {
		margin: 0;
		font-size: 1.45rem;
		font-weight: 800;
		color: #f8fafc;
		letter-spacing: 0.02em;
	}

	.hero-overlay p {
		margin: 0.28rem 0 0;
		color: #fcd34d;
		font-size: 0.95rem;
	}

	.hero-facts {
		list-style: none;
		padding: 0.8rem 0.3rem 0.2rem;
		margin: 0;
		display: grid;
		gap: 0.45rem;
		color: #cbd5e1;
		font-size: 0.9rem;
	}

	.hero-facts li::before {
		content: '\2022';
		margin-right: 0.5rem;
		color: #fbbf24;
	}

	.main-pane {
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.account-card {
		border: 1px solid rgba(148, 163, 184, 0.24);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.9));
		padding: 1rem;
	}

	.account-card h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #fde68a;
	}

	.meta-line {
		margin: 0.4rem 0 0;
		color: #cbd5e1;
		font-size: 0.9rem;
	}

	.auth-alert {
		margin: 0.65rem 0 0;
		padding: 0.68rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(244, 63, 94, 0.45);
		background: rgba(127, 29, 29, 0.2);
		color: #fecdd3;
		font-size: 0.86rem;
	}

	.auth-form {
		margin-top: 0.75rem;
	}

	.auth-grid {
		display: grid;
		gap: 0.5rem;
	}

	.auth-grid label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.auth-grid input {
		border: 1px solid rgba(100, 116, 139, 0.45);
		border-radius: 0.62rem;
		background: rgba(2, 6, 23, 0.86);
		color: #f8fafc;
		padding: 0.62rem 0.72rem;
		font-size: 0.9rem;
		outline: none;
	}

	.auth-grid input:focus {
		border-color: rgba(250, 204, 21, 0.88);
		box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.2);
	}

	.auth-btn,
	.ghost-btn {
		appearance: none;
		border: 0;
		border-radius: 0.68rem;
		padding: 0.62rem 0.9rem;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}

	.auth-btn {
		margin-top: 0.25rem;
		background: linear-gradient(120deg, #f59e0b, #fcd34d);
		color: #0f172a;
	}

	.ghost-btn {
		background: rgba(51, 65, 85, 0.95);
		color: #f8fafc;
	}

	@media (max-width: 900px) {
		.landing-shell {
			grid-template-columns: 1fr;
		}

		.hero-image-wrap img {
			height: 260px;
		}
	}
</style>
