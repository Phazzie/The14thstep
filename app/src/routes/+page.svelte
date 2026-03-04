<script lang="ts">
	import { resolve } from '$app/paths';
	import SetupFlow from '$lib/components/SetupFlow.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data?: PageData; form?: ActionData }>();
	const userId = $derived(data?.userId ?? null);
	const sessionKind = $derived(data?.sessionKind ?? null);
	const authNotice = $derived(data?.authNotice ?? null);
	const authNoticeKind = $derived(data?.authNoticeKind ?? null);
	const authError = $derived(form && 'authMessage' in form ? form.authMessage : null);
	const authSuccess = $derived(form && 'authSuccess' in form ? form.authSuccess : null);
	const authEmail = $derived(form && 'authEmail' in form ? form.authEmail : '');
</script>

<main class="landing-shell">
	<section class="hero-card">
		<div class="hero-meta">
			<p class="hero-kicker">Recovery Meeting Simulator</p>
			<p class="hero-status">Room Live - 24/7</p>
		</div>
		<div class="hero-image-wrap">
			<img
				src="/images/recoverymeetingui.jpg"
				alt="Recovery room mood board with coffee, smoke break outside, and late-night meeting energy."
			/>
			<div class="hero-overlay">
				<p class="hero-title">The 14th Step</p>
				<p class="hero-copy">Fake meeting. Real night. No bullshit.</p>
				<div class="hero-tags">
					<span>Zero preachy tone</span>
					<span>Continuity memory</span>
					<span>Crisis-aware pacing</span>
				</div>
			</div>
		</div>
		<ul class="hero-facts">
			<li>Speak or pass anytime.</li>
			<li>Join in under a minute.</li>
			<li>Guest mode works without an account.</li>
		</ul>
	</section>

	<section class="main-pane">
		<section class="account-card">
			<div class="card-head">
				<h2>Start a Meeting</h2>
				<p class="meta-line">You can stay guest, or use magic-link continuity.</p>
			</div>
			{#if userId}
				<p class="session-pill">
					{sessionKind === 'guest' ? 'Guest session active' : 'Signed in'}
				</p>
				<form method="POST" action="?/signOut" class="auth-form">
					<button type="submit" class="ghost-btn full-width">
						Sign Out
					</button>
				</form>
			{:else}
				<p class="helper-line">Guest sessions stay in this browser until you sign out or clear storage.</p>
				{#if authNotice}
					<p class:auth-alert={authNoticeKind === 'error'} class:auth-success={authNoticeKind === 'success'} role="status">
						{authNotice}
					</p>
				{/if}
				{#if authError}
					<p class="auth-alert" role="alert">{authError}</p>
				{/if}
				{#if authSuccess}
					<p class="auth-success" role="status">{authSuccess}</p>
				{/if}
				<form method="POST" action="?/continueGuest" class="auth-form">
					<button type="submit" class="auth-btn full-width">
						Continue as Guest
					</button>
				</form>
				<form method="POST" action="?/sendMagicLink" class="auth-form auth-grid">
					<label for="magicEmail">Email me a sign-in link (if this account exists)</label>
					<input
						id="magicEmail"
						name="magicEmail"
						type="email"
						required
						autocomplete="email"
						value={authEmail}
						placeholder="you@example.com"
					/>
					<button type="submit" class="ghost-btn full-width">Send Sign-In Link</button>
				</form>
				<details class="more-auth">
					<summary>Use password instead (existing account)</summary>
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
						<button type="submit" class="ghost-btn full-width">Sign In with Password</button>
					</form>
					<p class="helper-line">
						New here? Use the magic link above first, then set a password later from your account flow.
					</p>
				</details>
			{/if}
			<p class="legal-links">
				<a href={resolve('/privacy')}>Privacy</a>
				<span aria-hidden="true">&bull;</span>
				<a href={resolve('/terms')}>Terms</a>
			</p>
		</section>
		<SetupFlow {form} />
	</section>
</main>

<style>
	.landing-shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.4rem 1rem 1.8rem;
		display: grid;
		grid-template-columns: minmax(280px, 1fr) minmax(370px, 1.2fr);
		gap: 1.1rem;
	}

	.hero-card {
		border: 1px solid var(--line);
		border-radius: 1.1rem;
		background: linear-gradient(170deg, rgba(14, 18, 29, 0.9), rgba(9, 12, 18, 0.74));
		padding: 0.8rem;
		box-shadow:
			0 24px 40px rgba(0, 0, 0, 0.46),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		animation: cardRise 520ms ease-out;
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.1rem 0.3rem 0.7rem;
	}

	.hero-kicker {
		margin: 0;
		color: var(--mist);
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.hero-status {
		margin: 0;
		color: var(--signal-soft);
		font-size: 0.74rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.hero-image-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 0.85rem;
	}

	.hero-image-wrap img {
		display: block;
		width: 100%;
		height: 376px;
		object-fit: cover;
		filter: saturate(0.95) contrast(1.04);
		transform: scale(1.01);
	}

	.hero-overlay {
		position: absolute;
		inset: auto 0 0 0;
		padding: 1rem 0.95rem;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.83));
	}

	.hero-title {
		margin: 0;
		font-size: 1.52rem;
		font-weight: 600;
		color: #f8fafc;
		letter-spacing: 0.02em;
	}

	.hero-copy {
		margin: 0.26rem 0 0;
		color: var(--signal-soft);
		font-size: 0.92rem;
		font-weight: 500;
	}

	.hero-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.65rem;
	}

	.hero-tags span {
		padding: 0.26rem 0.46rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(17, 25, 40, 0.55);
		color: #dbe7ff;
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.hero-facts {
		list-style: none;
		padding: 0.88rem 0.3rem 0.22rem;
		margin: 0;
		display: grid;
		gap: 0.4rem;
		color: var(--mist);
		font-size: 0.88rem;
	}

	.hero-facts li::before {
		content: '\25B8';
		margin-right: 0.5rem;
		color: var(--signal);
	}

	.main-pane {
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.account-card {
		border: 1px solid var(--line);
		border-radius: 1.1rem;
		background: var(--glass);
		backdrop-filter: blur(5px);
		padding: 1rem 1rem 1.05rem;
		box-shadow: 0 20px 32px rgba(0, 0, 0, 0.32);
		animation: cardRise 560ms ease-out;
	}

	.card-head {
		display: grid;
		gap: 0.25rem;
	}

	.account-card h2 {
		margin: 0;
		font-size: 1.24rem;
		font-weight: 600;
		color: #fff7dd;
	}

	.meta-line {
		margin: 0;
		color: #d8e2f5;
		font-size: 0.88rem;
	}

	.helper-line {
		margin: 0.35rem 0 0;
		color: var(--muted);
		font-size: 0.82rem;
	}

	.session-pill {
		margin: 0.72rem 0 0;
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.58rem;
		border-radius: 999px;
		background: rgba(30, 41, 59, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #f8fafc;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.auth-alert {
		margin: 0.65rem 0 0;
		padding: 0.66rem 0.7rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(255, 99, 132, 0.38);
		background: rgba(127, 29, 29, 0.24);
		color: #fecdd3;
		font-size: 0.83rem;
	}

	.auth-success {
		margin: 0.65rem 0 0;
		padding: 0.66rem 0.7rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(34, 197, 94, 0.35);
		background: rgba(21, 128, 61, 0.12);
		color: #dcfce7;
		font-size: 0.83rem;
	}

	.auth-form {
		margin-top: 0.7rem;
	}

	.auth-grid {
		display: grid;
		gap: 0.48rem;
	}

	.auth-grid label {
		font-size: 0.77rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--mist);
	}

	.auth-grid input {
		border: 1px solid rgba(159, 178, 210, 0.28);
		border-radius: 0.62rem;
		background: rgba(6, 9, 15, 0.86);
		color: #f8fafc;
		padding: 0.65rem 0.75rem;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 120ms ease, box-shadow 120ms ease;
	}

	.auth-grid input:focus {
		border-color: rgba(246, 163, 27, 0.92);
		box-shadow: 0 0 0 3px rgba(246, 163, 27, 0.2);
	}

	.auth-btn,
	.ghost-btn {
		appearance: none;
		border: 0;
		border-radius: 0.68rem;
		padding: 0.68rem 0.92rem;
		font-size: 0.86rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: transform 120ms ease, filter 120ms ease;
	}

	.auth-btn {
		margin-top: 0.25rem;
		background: linear-gradient(125deg, #f08b14, #ffd176);
		color: #0d1623;
	}

	.ghost-btn {
		background: rgba(37, 48, 68, 0.95);
		color: #eaf1ff;
	}

	.auth-btn:hover,
	.ghost-btn:hover {
		transform: translateY(-1px);
		filter: brightness(1.04);
	}

	.full-width {
		width: 100%;
	}

	.more-auth {
		margin-top: 0.78rem;
		border-top: 1px solid rgba(148, 163, 184, 0.22);
		padding-top: 0.65rem;
	}

	.more-auth summary {
		cursor: pointer;
		color: #dae3f4;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.03em;
	}

	.legal-links {
		margin: 0.9rem 0 0;
		padding-top: 0.62rem;
		border-top: 1px solid rgba(148, 163, 184, 0.18);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		letter-spacing: 0.03em;
		color: var(--muted);
	}

	.legal-links a {
		color: #d7e5ff;
		text-decoration: none;
	}

	.legal-links a:hover {
		text-decoration: underline;
	}

	@keyframes cardRise {
		from {
			transform: translateY(6px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@media (max-width: 900px) {
		.landing-shell {
			grid-template-columns: 1fr;
			padding-top: 1rem;
		}

		.hero-image-wrap img {
			height: 260px;
		}

		.hero-meta {
			padding-bottom: 0.6rem;
		}
	}
</style>
