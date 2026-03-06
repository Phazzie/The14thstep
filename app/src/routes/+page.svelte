<script lang="ts">
	import { resolve } from '$app/paths';
	import SetupFlow from '$lib/components/SetupFlow.svelte';
	import { onMount } from 'svelte';
	import type { Clerk as ClerkInstance } from '@clerk/clerk-js';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data?: PageData; form?: ActionData }>();
	const userId = $derived(data?.userId ?? null);
	const sessionKind = $derived(data?.sessionKind ?? null);
	const authNotice = $derived(data?.authNotice ?? null);
	const authNoticeKind = $derived(data?.authNoticeKind ?? null);
	const clerkPublishableKey = $derived(data?.clerkPublishableKey?.trim() ?? '');
	const authError = $derived(form && 'authMessage' in form ? form.authMessage : null);

	let clerkReady = $state(false);
	let clerkLoadError = $state<string | null>(null);
	let openingSignIn = $state(false);
	let openingSignUp = $state(false);
	let clerk: ClerkInstance | null = null;
	const clerkLoading = $derived(Boolean(clerkPublishableKey) && !clerkReady && !clerkLoadError);

	onMount(async () => {
		const key = clerkPublishableKey;
		if (!key) {
			clerkLoadError = 'Member sign-in is temporarily unavailable.';
			return;
		}

		try {
			const { Clerk } = await import('@clerk/clerk-js');
			const instance = new Clerk(key);
			await instance.load();
			clerk = instance;
			clerkReady = true;
		} catch (cause) {
			clerkLoadError = cause instanceof Error ? cause.message : 'Unable to load sign-in.';
		}
	});

	async function openSignIn() {
		if (!clerk) {
			clerkLoadError = 'Member sign-in is not ready yet.';
			return;
		}
		openingSignIn = true;
		try {
			await clerk.redirectToSignIn();
		} catch (cause) {
			clerkLoadError = cause instanceof Error ? cause.message : 'Unable to open sign-in.';
			openingSignIn = false;
		}
	}

	async function openSignUp() {
		if (!clerk) {
			clerkLoadError = 'Account creation is not ready yet.';
			return;
		}
		openingSignUp = true;
		try {
			await clerk.redirectToSignUp();
		} catch (cause) {
			clerkLoadError = cause instanceof Error ? cause.message : 'Unable to open sign-up.';
			openingSignUp = false;
		}
	}
</script>

<main class="landing-shell">
	<section class="landing-stage">
		<p class="kicker">Recovery Meeting Simulator</p>
		<h1 class="landing-title">The 14th Step</h1>
		<p class="tagline">Fake meeting. Real night. No bullshit.</p>
		<p class="subline">Practice the room. Then go to the real one.</p>

		<div class="tag-pills" aria-label="Room principles">
			<span>Zero preachy tone</span>
			<span>Speak or pass anytime</span>
			<span>No fake sympathy</span>
		</div>

		<section class="auth-panel" aria-label="Authentication controls">
			{#if userId}
				<p class="session-pill">
					{sessionKind === 'guest' ? 'Guest session active' : 'Member session active'}
				</p>
				<form method="POST" action="?/signOut" class="auth-form">
					<button type="submit" class="secondary-btn full">Sign Out</button>
				</form>
			{:else}
				{#if authNotice}
					<p class:auth-alert={authNoticeKind === 'error'} class:auth-success={authNoticeKind === 'success'} role="status">
						{authNotice}
					</p>
				{/if}
				{#if authError}
					<p class="auth-alert" role="alert">{authError}</p>
				{/if}
				{#if clerkLoadError}
					<p class="auth-alert" role="alert">{clerkLoadError}</p>
				{/if}
				{#if clerkLoading}
					<p class="auth-loading" role="status" aria-live="polite">
						<span class="auth-loading-dot" aria-hidden="true"></span>
						Loading member sign-in...
					</p>
				{/if}
				<div class="auth-actions">
					<button
						type="button"
						class="primary-btn full"
						onclick={openSignIn}
						aria-busy={clerkLoading || openingSignIn}
						disabled={!clerkReady || openingSignIn || openingSignUp}
					>
						{#if openingSignIn}
							Opening sign in...
						{:else if clerkLoading}
							Loading sign in...
						{:else}
							Sign In
						{/if}
					</button>
					<button
						type="button"
						class="secondary-btn full"
						onclick={openSignUp}
						aria-busy={clerkLoading || openingSignUp}
						disabled={!clerkReady || openingSignIn || openingSignUp}
					>
						{#if openingSignUp}
							Opening sign up...
						{:else if clerkLoading}
							Loading sign up...
						{:else}
							Create Account
						{/if}
					</button>
				</div>
				<form method="POST" action="?/continueGuest" class="auth-form">
					<button type="submit" class="ghost-btn full">Continue as Guest</button>
				</form>
			{/if}
			<p class="legal-links">
				<a href={resolve('/privacy')}>Privacy</a>
				<span aria-hidden="true">&bull;</span>
				<a href={resolve('/terms')}>Terms</a>
			</p>
		</section>
	</section>

	<section class="setup-stage">
		<SetupFlow {form} />
	</section>
</main>

<style>
	.landing-shell {
		max-width: 1220px;
		margin: 0 auto;
		padding: 1.3rem 1rem 1.8rem;
		display: grid;
		grid-template-columns: minmax(280px, 1fr) minmax(380px, 1.1fr);
		gap: 1rem;
	}

	.landing-stage {
		position: relative;
		overflow: hidden;
		padding: 1.4rem;
		border-radius: 1.2rem;
		border: 1px solid rgba(230, 188, 103, 0.24);
		background:
			radial-gradient(circle at 84% 14%, rgba(255, 169, 60, 0.15), transparent 44%),
			linear-gradient(165deg, rgba(11, 16, 27, 0.95), rgba(8, 10, 17, 0.92));
		box-shadow:
			0 26px 48px rgba(0, 0, 0, 0.46),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.kicker {
		margin: 0;
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: #f7d38a;
	}

	.landing-title {
		margin: 0.55rem 0 0;
		font-size: clamp(2.2rem, 5vw, 4rem);
		line-height: 1;
		letter-spacing: 0.03em;
		font-weight: 700;
		color: #fff3da;
	}

	.tagline {
		margin: 0.7rem 0 0;
		font-size: clamp(1rem, 2vw, 1.2rem);
		font-weight: 600;
		color: #ffd88d;
	}

	.subline {
		margin: 0.45rem 0 0;
		max-width: 34ch;
		font-size: 0.93rem;
		color: var(--mist);
	}

	.tag-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.9rem;
	}

	.tag-pills span {
		padding: 0.35rem 0.55rem;
		border-radius: 999px;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border: 1px solid rgba(255, 255, 255, 0.13);
		background: rgba(15, 25, 43, 0.52);
		color: #d8e7ff;
	}

	.auth-panel {
		margin-top: 1.2rem;
		padding: 1rem;
		border-radius: 0.95rem;
		border: 1px solid rgba(176, 195, 229, 0.2);
		background: rgba(8, 14, 25, 0.67);
	}

	.auth-actions,
	.auth-form {
		display: grid;
		gap: 0.55rem;
	}

	button {
		font: inherit;
	}

	.primary-btn,
	.secondary-btn,
	.ghost-btn {
		min-height: 2.75rem;
		padding: 0.65rem 0.9rem;
		border-radius: 0.74rem;
		border: 1px solid transparent;
		font-weight: 700;
		letter-spacing: 0.03em;
		cursor: pointer;
		transition: transform 120ms ease, box-shadow 140ms ease, border-color 140ms ease;
	}

	.primary-btn {
		background: linear-gradient(90deg, #f29e20, #ffce72);
		color: #261607;
	}

	.secondary-btn {
		background: rgba(22, 39, 67, 0.92);
		border-color: rgba(143, 172, 221, 0.32);
		color: #e3efff;
	}

	.ghost-btn {
		background: rgba(14, 22, 36, 0.8);
		border-color: rgba(119, 146, 190, 0.32);
		color: #d8e8ff;
	}

	.primary-btn:hover,
	.secondary-btn:hover,
	.ghost-btn:hover {
		transform: translateY(-1px);
	}

	.primary-btn:disabled,
	.secondary-btn:disabled,
	.ghost-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		transform: none;
	}

	.full {
		width: 100%;
	}

	.session-pill {
		margin: 0 0 0.55rem;
		display: inline-flex;
		align-items: center;
		padding: 0.28rem 0.55rem;
		border-radius: 999px;
		background: rgba(24, 40, 66, 0.88);
		border: 1px solid rgba(149, 178, 226, 0.33);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.auth-alert,
	.auth-success,
	.auth-loading {
		margin: 0 0 0.55rem;
		padding: 0.7rem 0.78rem;
		border-radius: 0.72rem;
		font-size: 0.88rem;
	}

	.auth-alert {
		border: 1px solid rgba(251, 113, 133, 0.44);
		background: rgba(128, 20, 49, 0.24);
		color: #fecdd3;
	}

	.auth-success {
		border: 1px solid rgba(110, 231, 183, 0.42);
		background: rgba(18, 70, 50, 0.26);
		color: #d1fae5;
	}

	.auth-loading {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		border: 1px solid rgba(143, 172, 221, 0.28);
		background: rgba(20, 31, 53, 0.44);
		color: #dce9ff;
	}

	.auth-loading-dot {
		width: 0.58rem;
		height: 0.58rem;
		border-radius: 999px;
		background: #ffd88d;
		box-shadow: 0 0 0 0 rgba(255, 216, 141, 0.4);
		animation: auth-pulse 1.3s ease-out infinite;
	}

	.legal-links {
		margin: 0.86rem 0 0;
		display: flex;
		align-items: center;
		gap: 0.48rem;
		font-size: 0.82rem;
		color: var(--muted);
	}

	.legal-links a {
		color: inherit;
		text-decoration: none;
	}

	.legal-links a:hover {
		color: var(--signal-soft);
	}

	.setup-stage {
		display: grid;
		align-content: start;
	}

	@media (max-width: 960px) {
		.landing-shell {
			grid-template-columns: 1fr;
		}
	}

	@keyframes auth-pulse {
		0% {
			transform: scale(0.92);
			box-shadow: 0 0 0 0 rgba(255, 216, 141, 0.38);
		}

		70% {
			transform: scale(1);
			box-shadow: 0 0 0 10px rgba(255, 216, 141, 0);
		}

		100% {
			transform: scale(0.92);
			box-shadow: 0 0 0 0 rgba(255, 216, 141, 0);
		}
	}
</style>
