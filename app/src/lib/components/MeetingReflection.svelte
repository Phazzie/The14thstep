<script lang="ts">
	let { summary }: { summary: string } = $props();
</script>

<section class="reflection-shell" aria-live="polite">
	<h2>Meeting Reflection</h2>
	<p>{summary}</p>
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
</style>
