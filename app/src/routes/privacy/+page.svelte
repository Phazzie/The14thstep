<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy | The 14th Step</title>
	<meta
		name="description"
		content="Privacy policy for The 14th Step recovery meeting simulator."
	/>
</svelte:head>

<main class="legal-shell">
	<article class="legal-card">
		<p class="kicker">The 14th Step</p>
		<h1>Privacy Policy</h1>
		<p class="updated">Last updated: March 4, 2026</p>

		<section>
			<h2>What We Collect</h2>
			<p>
				We collect the minimum information needed to run your account and meetings, such as email
				address (for sign-in), session identifiers, and meeting content you submit in the app.
			</p>
		</section>

		<section>
			<h2>How We Use Data</h2>
			<p>
				Your data is used to authenticate access, run meeting flows, and preserve continuity features
				like callbacks and contextual memory.
			</p>
		</section>

		<section>
			<h2>Third-Party Services</h2>
			<p>
				The app uses Supabase for authentication and persistence and Vercel for hosting. Data may be
				processed by these providers to deliver core functionality.
			</p>
		</section>

		<section>
			<h2>Data Retention</h2>
			<p>
				We retain data as needed to operate the product and continuity features. You can request
				account/data removal by contacting support.
			</p>
		</section>

		<section>
			<h2>Contact</h2>
			<p>
				For privacy requests, contact: <a href="mailto:support@14thstep.com">support@14thstep.com</a>
			</p>
		</section>

		<p class="back-link"><a href={resolve('/')}>Back to home</a></p>
	</article>
</main>

<style>
	.legal-shell {
		max-width: 860px;
		margin: 0 auto;
		padding: 1.25rem 1rem 2rem;
	}

	.legal-card {
		border: 1px solid rgba(177, 193, 220, 0.22);
		border-radius: 1rem;
		background: rgba(10, 14, 22, 0.78);
		padding: 1.2rem 1.1rem;
		box-shadow: 0 16px 30px rgba(0, 0, 0, 0.32);
	}

	.kicker {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.75rem;
		color: #ffd486;
	}

	h1 {
		margin: 0.35rem 0 0;
		font-size: 1.8rem;
		color: #fff7dd;
	}

	.updated {
		margin: 0.35rem 0 1rem;
		color: #a8b3c8;
		font-size: 0.86rem;
	}

	section + section {
		margin-top: 1rem;
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
		color: #e7f0ff;
	}

	p {
		margin: 0.35rem 0 0;
		line-height: 1.55;
		color: #cfd8e9;
	}

	a {
		color: #f5c56a;
	}

	.back-link {
		margin-top: 1.3rem;
	}
</style>
