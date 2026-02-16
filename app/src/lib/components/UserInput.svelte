<script lang="ts">
	let {
		value,
		onValueChange,
		onSubmit,
		onPass,
		disabled = false,
		crisisMode = false,
		listeningOnly = false
	}: {
		value: string;
		onValueChange: (next: string) => void;
		onSubmit: () => void;
		onPass: () => void;
		disabled?: boolean;
		crisisMode?: boolean;
		listeningOnly?: boolean;
	} = $props();
</script>

<section class="space-y-2">
	{#if listeningOnly}
		<p class="rounded-md border border-gray-700 bg-gray-800 p-3 text-sm text-gray-300">
			Listening mode enabled. You can keep the room open and receive shares.
		</p>
	{:else}
		<label for="user-share" class="text-sm font-semibold text-gray-100">Your Share</label>
		<textarea
			id="user-share"
			rows="4"
			class="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-gray-100"
			value={value}
			oninput={(event) => onValueChange((event.currentTarget as HTMLTextAreaElement).value)}
			placeholder={crisisMode ? "Take your time. We're here." : 'Type your share...'}
			disabled={disabled}
		></textarea>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={onSubmit}
				disabled={disabled || !value.trim()}
				class="min-h-11 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
			>
				Submit Share
			</button>
			<button
				type="button"
				onclick={onPass}
				disabled={disabled}
				class="min-h-11 rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
			>
				Pass
			</button>
		</div>
	{/if}
</section>
