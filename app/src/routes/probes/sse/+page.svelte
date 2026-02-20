<script lang="ts">
	let running = false;
	let error = '';
	let lines: string[] = [];

	async function runProbe() {
		running = true;
		error = '';
		lines = [];

		try {
			const response = await fetch('/api/probes/sse');
			if (!response.ok || !response.body) {
				throw new Error(`Probe endpoint failed: ${response.status}`);
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
					const compact = part.replace(/\n/g, ' | ').trim();
					if (compact.length > 0) {
						lines = [...lines, compact];
					}
				}
			}
		} catch (probeError) {
			error = probeError instanceof Error ? probeError.message : String(probeError);
		} finally {
			running = false;
		}
	}
</script>

<h1>SSE Probe</h1>
<p>Use this page to verify chunked streaming behavior before deploying to Vercel.</p>

<button on:click={runProbe} disabled={running}>
	{running ? 'Running…' : 'Run Probe'}
</button>

{#if error}
	<p style="color: #b91c1c;">{error}</p>
{/if}

<ol>
	{#each lines as line, index (`${index}-${line}`)}
		<li><code>{line}</code></li>
	{/each}
</ol>
