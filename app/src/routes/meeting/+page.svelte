<script lang="ts">
	import { onMount } from 'svelte';

	let lines: string[] = [];
	let error = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/meetings/stream');
			if (!response.ok || !response.body) {
				throw new Error('Meeting stream failed to start.');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const next = await reader.read();
				if (next.done) break;
				buffer += decoder.decode(next.value, { stream: true });

				const parts = buffer.split('\n\n');
				buffer = parts.pop() ?? '';

				for (const part of parts) {
					const match = part.match(/^data: (.+)$/m);
					if (!match) continue;
					if (match[1] === '[DONE]') continue;
					lines = [...lines, match[1]];
				}
			}
		} catch (meetingError) {
			error = meetingError instanceof Error ? meetingError.message : String(meetingError);
		}
	});
</script>

<section>
	<h1>Meeting in progress</h1>
	<p>The room is opening now.</p>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<ol>
		{#each lines as line}
			<li>{line}</li>
		{/each}
	</ol>
</section>

<style>
	section {
		max-width: 720px;
		margin: 3rem auto;
		padding: 1rem;
	}
	.error {
		color: #fca5a5;
	}
</style>
