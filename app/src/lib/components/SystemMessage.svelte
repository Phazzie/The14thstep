<script lang="ts">
	let {
		message,
		kind = 'info'
	}: {
		message: string;
		kind?: 'info' | 'error' | 'success';
	} = $props();

	const styleMap = {
		info: 'border-sky-600 bg-sky-900/30 text-sky-200',
		error: 'border-rose-600 bg-rose-900/30 text-rose-200',
		success: 'border-emerald-600 bg-emerald-900/30 text-emerald-200'
	} as const;
</script>

<p class={`rounded-lg border px-3 py-2 text-sm ${styleMap[kind]}`}>{message}</p>
