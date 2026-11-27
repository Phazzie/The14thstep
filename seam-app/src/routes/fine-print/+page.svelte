<svelte:head>
	<title>Fine print · The 14th Step</title>
</svelte:head>

<article class="sheet fine">
	<p class="tiny">FORM 14-A · THE PART NOBODY READS · PLEASE READ IT</p>
	<h1>Fine print</h1>

	<h2>What this is</h2>
	<p>
		A recovery meeting simulator. Six regulars, written by hand and voiced by an AI (xAI's Grok): Marcus
		chairs, Heather, Meechie, Gemini, Gypsy and Chrystal share. They are not real. They do not have clean
		time. They will never call you. The 14th step is not a real step.
	</p>
	<p>It is for the hours when the real rooms are closed, your sponsor is asleep, and the other ideas you have are worse.</p>

	<h2>What it is not</h2>
	<p>
		Not treatment. Not a sponsor. Not a substitute for a real meeting, a doctor, or a crisis line. Not valid
		for court, probation or your P.O. If you might hurt yourself, the <a href="/phone-list">phone list</a>
		has real people on it.
	</p>

	<h2>What happens to what you say</h2>
	<ul>
		<li>Your slip lives in your own browser and nowhere else. No account, no database, no sign-in.</li>
		<li>
			To get the next person's share, your name, mood, the topic and the last few things said in the room
			are sent to our server and passed to Grok to write the reply. They are not saved, logged or kept.
		</li>
		<li>"Take a fresh slip" deletes the old one from your browser.</li>
		<li>If Grok is unreachable, the room plays the house tape: lines written by hand, marked "house tape".</li>
	</ul>

	<h2>Who made it</h2>
	<p>Skeptical Wombat. What's said here stays here, mostly because nothing here keeps it.</p>
	<p class="back-link"><a href="/">Back to the slip</a></p>
</article>

<style>
	.fine {
		max-width: 680px;
		margin: 8px auto 0;
		padding: 28px 30px 22px;
		transform: rotate(-0.4deg);
		font-size: 16px;
	}
	.tiny {
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--toner-soft);
		margin: 0;
	}
	h1 {
		font-family: var(--stamp-font);
		font-weight: 400;
		text-transform: uppercase;
		font-size: clamp(28px, 6vw, 40px);
		margin: 2px 0 6px;
	}
	h2 {
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 18px 0 4px;
		border-bottom: 1px solid var(--toner);
	}
	p {
		margin: 6px 0;
	}
	ul {
		margin: 6px 0;
		padding-left: 20px;
	}
	li {
		margin: 4px 0;
	}
	.back-link {
		margin-top: 16px;
		font-family: var(--hand);
		font-size: 20px;
		color: var(--ballpoint);
	}
	@media (max-width: 560px) {
		.fine {
			padding: 22px 18px;
			transform: none;
		}
	}
</style>
