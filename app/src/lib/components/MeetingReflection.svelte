<script lang="ts">
	let {
		summary,
		onClose
	}: {
		summary: string;
		onClose?: () => void;
	} = $props();
</script>

<section class="reflection-shell" aria-live="polite">
	<h2>Meeting Reflection</h2>
	<p>{summary}</p>
	<button type="button" onclick={() => onClose?.()}>Return to Meeting</button>
</section>

<style>
	.reflection-shell {
		border-radius: 0.9rem;
		border: 1px solid rgba(252, 211, 77, 0.46);
		background: rgba(56, 37, 11, 0.42);
		padding: 0.92rem;
	}

	h2 {
		margin: 0;
		font-size: 1.02rem;
		color: #fde68a;
	}

	p {
		margin: 0.52rem 0 0;
		line-height: 1.55;
		font-size: 0.93rem;
		color: #fef3c7;
	}

	button {
		margin-top: 0.72rem;
		min-height: 2.6rem;
		padding: 0.58rem 0.78rem;
		font: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		border-radius: 0.66rem;
		border: 1px solid rgba(251, 191, 36, 0.52);
		background: rgba(180, 83, 9, 0.85);
		color: #fff7e7;
		cursor: pointer;
	}
</style>
