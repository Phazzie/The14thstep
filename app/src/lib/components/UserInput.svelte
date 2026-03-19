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

<section class="input-shell">
	{#if listeningOnly}
		<p class="listening-note">Listening mode enabled. Keep the room open and receive shares.</p>
	{:else}
		<textarea
			id="user-share"
			rows="5"
			{value}
			oninput={(event) => onValueChange((event.currentTarget as HTMLTextAreaElement).value)}
			placeholder={crisisMode ? "Take your time. We're here." : "Say what's true."}
			{disabled}
		></textarea>
		<div class="actions">
			<button
				type="button"
				onclick={onSubmit}
				disabled={disabled || !value.trim()}
				class="submit-btn">Share</button
			>
			<button type="button" onclick={onPass} {disabled} class="pass-btn">Pass</button>
		</div>
	{/if}
</section>

<style>
	.input-shell {
		display: grid;
		gap: 0.52rem;
	}

	textarea {
		width: 100%;
		border: 1px solid rgba(140, 165, 205, 0.33);
		border-radius: 0.78rem;
		padding: 0.72rem;
		font: inherit;
		font-size: 0.94rem;
		line-height: 1.5;
		color: #edf2ff;
		background: rgba(10, 17, 29, 0.88);
		resize: vertical;
	}

	textarea:focus {
		outline: 2px solid rgba(255, 187, 94, 0.72);
		outline-offset: 1px;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.submit-btn,
	.pass-btn {
		min-height: 2.7rem;
		padding: 0.6rem 0.88rem;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		border-radius: 0.68rem;
		cursor: pointer;
	}

	.submit-btn {
		border: 1px solid rgba(104, 176, 224, 0.5);
		background: rgba(17, 56, 85, 0.9);
		color: #d8f3ff;
	}

	.pass-btn {
		border: 1px solid rgba(148, 163, 184, 0.5);
		background: rgba(27, 33, 45, 0.9);
		color: #dbe6ff;
	}

	.submit-btn:disabled,
	.pass-btn:disabled {
		opacity: 0.52;
		cursor: not-allowed;
	}

	.listening-note {
		margin: 0;
		padding: 0.68rem;
		border-radius: 0.68rem;
		border: 1px solid rgba(148, 163, 184, 0.45);
		background: rgba(17, 24, 39, 0.84);
		color: #dbe3f6;
		font-size: 0.88rem;
	}
</style>
