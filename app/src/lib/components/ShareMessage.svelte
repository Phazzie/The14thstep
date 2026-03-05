<script lang="ts">
	export interface ShareView {
		id: string;
		speakerName: string;
		content: string;
		isUserShare: boolean;
		significanceScore: number;
		sequenceOrder: number;
	}

	let {
		entry,
		expandedText,
		onExpand,
		expanding = false
	}: {
		entry: ShareView;
		expandedText?: string;
		onExpand?: (shareId: string) => void;
		expanding?: boolean;
	} = $props();

	const expandedRegionId = $derived(`expanded-${entry.id}`);
	const isExpanded = $derived(Boolean(expandedText));
</script>

<li class="share-card" class:user={entry.isUserShare}>
	<p class="speaker">{entry.speakerName}</p>
	<p class="body">{entry.content}</p>

	{#if !entry.isUserShare}
		<button
			type="button"
			onclick={() => onExpand?.(entry.id)}
			disabled={expanding || isExpanded}
			class="expand-btn"
			aria-expanded={isExpanded}
			aria-controls={expandedRegionId}
		>
			{expanding ? 'Expanding...' : isExpanded ? 'Expanded' : 'Expand'}
		</button>
	{/if}

	{#if expandedText}
		<p id={expandedRegionId} class="expanded">{expandedText}</p>
	{/if}

	<p class="meta">Significance {entry.significanceScore} · #{entry.sequenceOrder}</p>
</li>

<style>
	.share-card {
		border: 1px solid rgba(131, 156, 198, 0.28);
		border-radius: 0.82rem;
		padding: 0.74rem;
		background: rgba(11, 18, 31, 0.76);
	}

	.share-card.user {
		border-color: rgba(255, 196, 112, 0.45);
		background: rgba(37, 28, 16, 0.6);
	}

	.speaker {
		margin: 0;
		font-size: 0.73rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #ffd59d;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	.body {
		margin: 0.42rem 0 0;
		font-size: 0.96rem;
		line-height: 1.55;
		color: #edf2ff;
	}

	.expand-btn {
		margin-top: 0.58rem;
		padding: 0.35rem 0.56rem;
		font: inherit;
		font-size: 0.76rem;
		font-weight: 700;
		border-radius: 0.6rem;
		border: 1px solid rgba(106, 173, 204, 0.44);
		background: rgba(16, 43, 61, 0.85);
		color: #d7f2ff;
		cursor: pointer;
	}

	.expand-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.expanded {
		margin: 0.58rem 0 0;
		padding: 0.56rem;
		border-radius: 0.68rem;
		background: rgba(38, 27, 73, 0.48);
		border: 1px solid rgba(167, 139, 250, 0.45);
		color: #ede9fe;
		font-size: 0.88rem;
		line-height: 1.45;
	}

	.meta {
		margin: 0.55rem 0 0;
		font-size: 0.72rem;
		color: #9db0d4;
	}
</style>
