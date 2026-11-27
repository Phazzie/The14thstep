<script lang="ts">
	import type { MeetingState } from '$lib/contracts/meeting';
	import { PASS_TEXT } from '$lib/client/runner';

	let { meeting, onFresh }: { meeting: MeetingState; onFresh: () => void } = $props();

	const started = $derived(new Date(meeting.startedAt));
	const heard = $derived(meeting.transcript.filter((e) => e.kind === 'share').length);
	const yours = $derived(meeting.transcript.filter((e) => e.kind === 'user' && e.text !== PASS_TEXT).length);
	const taped = $derived(meeting.transcript.some((e) => e.source === 'tape'));
	const when = $derived(
		started.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
	);
</script>

<article class="sheet signed" aria-labelledby="signed-title">
	<p class="tiny">FORM 14-A · PROOF OF ATTENDANCE · No. <span class="red">{meeting.slipNumber}</span></p>
	<h2 id="signed-title">This certifies that</h2>
	<p class="who hand">{meeting.intake.name}</p>
	<p class="body">
		sat through the whole meeting on <strong>{when}</strong>, topic
		<strong>“{meeting.topic ?? 'whatever walked in'}”</strong>. Heard {heard} share{heard === 1 ? '' : 's'}.
		{#if yours > 0}Said {yours} thing{yours === 1 ? '' : 's'} out loud.{:else}Said nothing, which is allowed.{/if}
	</p>
	<div class="sig-row">
	<div class="sig">
		<svg viewBox="0 0 220 60" aria-hidden="true">
			<path d="M6 42 C 20 8, 30 8, 34 40 S 52 12, 60 36 S 76 50, 84 22 C 90 8, 98 46, 110 30 S 132 18, 140 38 S 170 26, 214 30" />
		</svg>
		<p>Marcus, Chair <span class="tiny">(a chatbot)</span></p>
	</div>
	<span class="stamp attended" aria-label="Stamped: attended">Attended</span>
	</div>
	<dl>
		<div><dt>Valid for</dt><dd>tonight</dd></div>
		<div><dt>Not valid for</dt><dd>court, probation, your P.O., your sponsor, or your mother</dd></div>
		{#if taped}<div><dt>Note</dt><dd>some voices tonight came off the house tape</dd></div>{/if}
	</dl>
	<div class="actions no-print">
		<button type="button" class="btn" onclick={() => window.print()}>Print the slip</button>
		<button type="button" class="btn ghost" onclick={onFresh}>Take a fresh slip</button>
		<a class="btn ghost" href="/phone-list">Phone list</a>
	</div>
</article>

<style>
	.signed {
		max-width: 620px;
		margin: 26px auto 0;
		padding: 26px 30px 22px;
		transform: rotate(0.7deg);
		position: relative;
		overflow: hidden;
	}
	.tiny {
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--toner-soft);
		margin: 0;
	}
	.red {
		color: var(--stamp);
	}
	h2 {
		font-family: var(--stamp-font);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 10px 0 0;
		font-size: 22px;
	}
	.who {
		font-size: 44px;
		margin: 0;
		line-height: 1.1;
		border-bottom: 1.5px solid var(--toner);
		padding-bottom: 2px;
		word-break: break-word;
	}
	.body {
		margin: 10px 0 0;
	}
	.sig {
		margin-top: 12px;
		width: 240px;
		max-width: 100%;
	}
	.sig svg {
		width: 100%;
		height: 54px;
		display: block;
	}
	.sig path {
		fill: none;
		stroke: var(--ballpoint);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-dasharray: 600;
		stroke-dashoffset: 600;
		animation: sign 1.6s 0.3s ease-in-out forwards;
	}
	@keyframes sign {
		to {
			stroke-dashoffset: 0;
		}
	}
	.sig p {
		margin: 0;
		border-top: 1.5px solid var(--toner);
		font-size: 14px;
	}
	.sig-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.attended {
		font-size: clamp(24px, 6vw, 36px);
		border-width: 5px;
		margin-right: 6px;
		transform: rotate(-14deg) scale(2);
		opacity: 0;
		animation: thunk 0.28s 1.9s cubic-bezier(0.2, 0.9, 0.3, 1.3) forwards;
	}
	@keyframes thunk {
		to {
			transform: rotate(-14deg) scale(1);
			opacity: 0.88;
		}
	}
	dl {
		margin: 16px 0 0;
		display: grid;
		gap: 4px;
		font-size: 14px;
	}
	dl div {
		display: grid;
		grid-template-columns: 130px 1fr;
		gap: 8px;
	}
	dt {
		font-weight: 700;
		text-transform: uppercase;
		font-size: 12px;
		letter-spacing: 0.06em;
		padding-top: 2px;
	}
	dd {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 18px;
	}
	.btn {
		font-family: var(--stamp-font);
		background: var(--toner);
		color: var(--paper);
		border: 0;
		padding: 9px 13px;
		text-decoration: none;
		cursor: pointer;
		font-size: 15px;
	}
	.btn.ghost {
		background: transparent;
		color: var(--toner);
		border: 2px solid var(--toner);
	}
	@media (max-width: 560px) {
		.signed {
			padding: 22px 18px 18px;
			transform: none;
		}
		dl div {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
