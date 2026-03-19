<script lang="ts">
	let {
		message,
		kind = 'info'
	}: {
		message: string;
		kind?: 'info' | 'error' | 'success' | 'ritual';
	} = $props();

	const styleMap = {
		info: 'info',
		error: 'error',
		success: 'success',
		ritual: 'ritual'
	} as const;
</script>

<p
	class={`system-message ${styleMap[kind]}`}
	role={kind === 'error' ? 'alert' : 'status'}
	aria-live={kind === 'error' ? 'assertive' : 'polite'}
>
	{message}
</p>

<style>
	.system-message {
		margin: 0;
		padding: 0.58rem 0.68rem;
		border-radius: 0.65rem;
		font-size: 0.85rem;
		border: 1px solid;
	}

	.system-message.info {
		border-color: rgba(125, 211, 252, 0.45);
		background: rgba(12, 46, 71, 0.3);
		color: #d0edff;
	}

	.system-message.error {
		border-color: rgba(252, 165, 165, 0.48);
		background: rgba(123, 18, 36, 0.24);
		color: #fecdd3;
	}

	.system-message.success {
		border-color: rgba(110, 231, 183, 0.45);
		background: rgba(19, 78, 56, 0.26);
		color: #d1fae5;
	}

	.system-message.ritual {
		border-color: rgba(245, 158, 11, 0.58);
		background: rgba(120, 53, 15, 0.28);
		color: #fde68a;
		font-weight: 700;
		text-align: center;
		letter-spacing: 0.05em;
	}
</style>
