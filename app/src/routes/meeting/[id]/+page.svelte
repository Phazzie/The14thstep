<script lang="ts">
	import type { PageData } from './$types';

	interface SeamError {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	}

	type SeamResult<T> = { ok: true; value: T } | { ok: false; error: SeamError };

	interface ShareRecord {
		id: string;
		meetingId: string;
		characterId: string | null;
		isUserShare: boolean;
		content: string;
		significanceScore: number;
		sequenceOrder: number;
		createdAt: string;
	}

	interface TranscriptEntry extends ShareRecord {
		speakerName: string;
	}

interface CloseSummaryValue {
	meetingId: string;
	summary: string;
}

interface UserShareValue {
	share: ShareRecord;
	crisis: boolean;
	heavy: boolean;
}

interface ExpandShareValue {
	shareId: string;
	expandedText: string;
}

let { data }: { data: PageData } = $props();
const defaultTopic = $derived(data.defaultTopic);
const defaultCharacterId = $derived(data.characters[0]?.id ?? 'marcus');
let topic = $state('');
let userName = $state('You');
let userMood = $state('present');
let selectedCharacterId = $state('');
let userShareText = $state('');
let transcript = $state<TranscriptEntry[]>([]);
let expandedShares = $state<Record<string, string>>({});
let streamingDraft = $state('');
let summaryText = $state('');
let statusLine = $state('');
let errorMessage = $state('');
let crisisMode = $state(false);
let heavyMode = $state(false);
let sharing = $state(false);
let postingShare = $state(false);
let closing = $state(false);
let expandingShareId = $state<string | null>(null);

$effect(() => {
	if (!topic) topic = defaultTopic;
	if (!selectedCharacterId) selectedCharacterId = defaultCharacterId;
});

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	function parseSeamResult<T>(value: unknown): SeamResult<T> | null {
		if (!isRecord(value) || typeof value.ok !== 'boolean') return null;
		if (value.ok) {
			return { ok: true, value: value.value as T };
		}
		if (!isRecord(value.error) || typeof value.error.message !== 'string' || typeof value.error.code !== 'string') {
			return null;
		}
		return {
			ok: false,
			error: {
				code: value.error.code,
				message: value.error.message,
				details: isRecord(value.error.details) ? value.error.details : undefined
			}
		};
	}

	function characterName(characterId: string | null): string {
		if (!characterId) return userName;
		const character = data.characters.find((entry) => entry.id === characterId);
		return character?.name ?? 'Character';
	}

	function upsertShare(share: ShareRecord) {
		const speakerName = share.isUserShare ? userName : characterName(share.characterId);
		const entry: TranscriptEntry = { ...share, speakerName };
		const existingIndex = transcript.findIndex((item) => item.id === share.id);

		if (existingIndex >= 0) {
			const copy = [...transcript];
			copy[existingIndex] = entry;
			transcript = copy.sort((left, right) => left.sequenceOrder - right.sequenceOrder);
			return;
		}

		transcript = [...transcript, entry].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
	}

	function parseSseBlock(block: string): { eventName: string; payload: unknown } | null {
		const lines = block.split('\n').map((line) => line.trim());
		let eventName = 'message';
		const payloadLines: string[] = [];

		for (const line of lines) {
			if (line.startsWith('event:')) {
				eventName = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				payloadLines.push(line.slice(5).trim());
			}
		}

		if (payloadLines.length === 0) return null;

		const payloadText = payloadLines.join('\n');
		try {
			return { eventName, payload: JSON.parse(payloadText) };
		} catch {
			return { eventName, payload: payloadText };
		}
	}

	async function submitUserShare() {
		const content = userShareText.trim();
		if (!content || postingShare) return;

		errorMessage = '';
		statusLine = '';
		postingShare = true;

		try {
			const response = await fetch(`/meeting/${data.meetingId}/user-share`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					content,
					sequenceOrder: transcript.length,
					interactionType: 'standard',
					isFirstUserShare: transcript.every((entry) => !entry.isUserShare)
				})
			});
			const payload = parseSeamResult<UserShareValue>(await response.json());

			if (!payload) {
				errorMessage = 'Unexpected user-share response format.';
				return;
			}
			if (!payload.ok) {
				errorMessage = payload.error.message;
				return;
			}

			upsertShare(payload.value.share);
			crisisMode = payload.value.crisis;
			heavyMode = payload.value.heavy;
			userShareText = '';
			statusLine = crisisMode
				? 'Crisis mode detected. The room will stay with you.'
				: heavyMode
					? 'Your share was saved (heavy topic noted).'
					: 'Your share was saved.';
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			postingShare = false;
		}
	}

	async function requestExpandShare(shareId: string) {
		const selected = transcript.find((entry) => entry.id === shareId);
		if (!selected || selected.isUserShare || expandingShareId) return;

		errorMessage = '';
		statusLine = '';
		expandingShareId = shareId;

		try {
			const response = await fetch(`/meeting/${data.meetingId}/expand`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					shareId,
					topic,
					recentShares: transcript.slice(-6).map((entry) => ({
						speaker: entry.speakerName,
						content: entry.content
					}))
				})
			});
			const payload = parseSeamResult<ExpandShareValue>(await response.json());

			if (!payload) {
				errorMessage = 'Unexpected expand response format.';
				return;
			}
			if (!payload.ok) {
				errorMessage = payload.error.message;
				return;
			}

			expandedShares = {
				...expandedShares,
				[payload.value.shareId]: payload.value.expandedText
			};
			statusLine = 'Expanded share ready.';
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			expandingShareId = null;
		}
	}

	async function requestCharacterShare() {
		if (sharing) return;

		errorMessage = '';
		statusLine = '';
		streamingDraft = '';
		sharing = true;

		try {
			const response = await fetch(`/meeting/${data.meetingId}/share`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					topic,
					characterId: selectedCharacterId,
					sequenceOrder: transcript.length,
					interactionType: 'respond_to',
					userName,
					userMood,
					recentShares: transcript.slice(-6).map((entry) => ({
						speaker: entry.speakerName,
						content: entry.content,
						isUserShare: entry.isUserShare
					}))
				})
			});

			if (!response.ok && response.headers.get('content-type')?.includes('application/json')) {
				const payload = parseSeamResult<unknown>(await response.json());
				errorMessage = payload && !payload.ok ? payload.error.message : `Share request failed (${response.status})`;
				return;
			}
			if (!response.body) {
				errorMessage = 'Share stream did not include a response body.';
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const next = await reader.read();
				if (next.done) break;

				buffer += decoder.decode(next.value, { stream: true });
				const blocks = buffer.split('\n\n');
				buffer = blocks.pop() ?? '';

				for (const block of blocks) {
					const parsed = parseSseBlock(block);
					if (!parsed) continue;

					if (parsed.eventName === 'chunk' && isRecord(parsed.payload)) {
						const result = parseSeamResult<{ chunk?: string }>(parsed.payload);
						if (result?.ok && typeof result.value.chunk === 'string') {
							streamingDraft = streamingDraft
								? `${streamingDraft} ${result.value.chunk}`
								: result.value.chunk;
						}
						continue;
					}

					if (parsed.eventName === 'persisted' && isRecord(parsed.payload)) {
						const result = parseSeamResult<{ share?: ShareRecord }>(parsed.payload);
						if (result?.ok && isRecord(result.value.share)) {
							upsertShare(result.value.share as ShareRecord);
							statusLine = 'Character share generated and saved.';
							streamingDraft = '';
						}
						continue;
					}

					if (parsed.eventName === 'error' && isRecord(parsed.payload)) {
						const result = parseSeamResult<unknown>(parsed.payload);
						errorMessage = result && !result.ok ? result.error.message : 'Share stream failed.';
					}
				}
			}
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			sharing = false;
		}
	}

	async function requestCloseSummary() {
		if (closing) return;

		errorMessage = '';
		statusLine = '';
		closing = true;

		try {
			const response = await fetch(`/meeting/${data.meetingId}/close`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					topic,
					lastShares: transcript.slice(-8).map((entry) => ({
						speakerName: entry.speakerName,
						content: entry.content
					}))
				})
			});
			const payload = parseSeamResult<CloseSummaryValue>(await response.json());

			if (!payload) {
				errorMessage = 'Unexpected close response format.';
				return;
			}
			if (!payload.ok) {
				errorMessage = payload.error.message;
				return;
			}

			summaryText = payload.value.summary;
			statusLine = 'Close summary ready.';
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			closing = false;
		}
	}
</script>

<main class="meeting-shell">
	<header class="meeting-header">
		<h1>Meeting Flow</h1>
		<p>Meeting ID: <code>{data.meetingId}</code></p>
	</header>

	<section class="control-grid">
		<label>
			Topic
			<input bind:value={topic} placeholder="Meeting topic" />
		</label>
		<label>
			Your name
			<input bind:value={userName} placeholder="You" />
		</label>
		<label>
			Mood
			<input bind:value={userMood} placeholder="present" />
		</label>
		<label>
			Character
			<select bind:value={selectedCharacterId}>
				{#each data.characters as character}
					<option value={character.id}>{character.name} ({character.cleanTime})</option>
				{/each}
			</select>
		</label>
	</section>

	<section class="button-row">
		<button onclick={requestCharacterShare} disabled={sharing || postingShare || closing}>
			{sharing ? 'Generating share...' : 'Generate Character Share (SSE)'}
		</button>
		<button onclick={requestCloseSummary} disabled={closing || sharing}>
			{closing ? 'Closing...' : 'Request Close Summary'}
		</button>
	</section>

	<section class="share-box">
		<label for="user-share">Your share</label>
		<textarea
			id="user-share"
			rows="4"
			bind:value={userShareText}
			placeholder="Type your share to post to the room..."
		></textarea>
		<button onclick={submitUserShare} disabled={postingShare || sharing || !userShareText.trim()}>
			{postingShare ? 'Saving...' : 'Submit User Share'}
		</button>
	</section>

	{#if errorMessage}
		<p class="error">{errorMessage}</p>
	{/if}
	{#if statusLine}
		<p class="status">{statusLine}</p>
	{/if}
	{#if crisisMode}
		<section class="crisis">
			<h2>If you're in crisis</h2>
			<p>988 - Suicide & Crisis Lifeline</p>
			<p>1-800-662-4357 - SAMHSA National Helpline</p>
			<p>You can stay here with us.</p>
		</section>
	{/if}
	{#if streamingDraft}
		<section class="streaming">
			<h2>Streaming Draft</h2>
			<p>{streamingDraft}</p>
		</section>
	{/if}

	<section class="panel-grid">
		<section class="panel">
			<h2>Transcript</h2>
			{#if transcript.length === 0}
				<p class="empty">No shares yet.</p>
			{:else}
				<ol>
					{#each transcript as entry}
						<li>
							<p><strong>{entry.speakerName}</strong></p>
							<p>{entry.content}</p>
							{#if !entry.isUserShare}
								<button
									type="button"
									class="expand-btn"
									onclick={() => requestExpandShare(entry.id)}
									disabled={expandingShareId !== null}
								>
									{expandingShareId === entry.id ? 'Expanding...' : 'Expand'}
								</button>
							{/if}
							{#if expandedShares[entry.id]}
								<p class="expanded">{expandedShares[entry.id]}</p>
							{/if}
							<p class="meta">Significance: {entry.significanceScore} | #{entry.sequenceOrder}</p>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<section class="panel">
			<h2>Close Summary</h2>
			{#if summaryText}
				<p>{summaryText}</p>
			{:else}
				<p class="empty">No summary yet.</p>
			{/if}
		</section>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		background: #f6f7f9;
		color: #111827;
	}

	.meeting-shell {
		max-width: 980px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		gap: 1rem;
	}

	.meeting-header {
		background: #ffffff;
		border: 1px solid #d1d5db;
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.meeting-header h1 {
		margin: 0 0 0.35rem 0;
		font-size: 1.4rem;
	}

	.meeting-header p {
		margin: 0;
		color: #4b5563;
	}

	.control-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.control-grid label,
	.share-box label {
		display: grid;
		gap: 0.35rem;
		font-weight: 600;
		font-size: 0.95rem;
	}

	input,
	select,
	textarea,
	button {
		font: inherit;
	}

	input,
	select,
	textarea {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		border-radius: 0.55rem;
		padding: 0.55rem 0.65rem;
	}

	textarea {
		resize: vertical;
	}

	.button-row,
	.share-box {
		display: grid;
		gap: 0.65rem;
	}

	button {
		background: #1d4ed8;
		color: #ffffff;
		border: none;
		border-radius: 0.6rem;
		padding: 0.6rem 0.8rem;
		cursor: pointer;
	}

	button:disabled {
		background: #94a3b8;
		cursor: not-allowed;
	}

	.share-box,
	.streaming,
	.panel,
	.crisis {
		background: #ffffff;
		border: 1px solid #d1d5db;
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.crisis {
		border-color: #b91c1c;
		background: #fff1f2;
	}

	.error {
		margin: 0;
		color: #b91c1c;
		font-weight: 600;
	}

	.status {
		margin: 0;
		color: #0369a1;
		font-weight: 600;
	}

	.panel-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.panel h2,
	.streaming h2 {
		margin: 0 0 0.6rem 0;
		font-size: 1.05rem;
	}

	.panel ol {
		margin: 0;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.7rem;
	}

	.panel li p {
		margin: 0;
	}

	.meta,
	.empty {
		color: #6b7280;
		font-size: 0.9rem;
	}

	.expand-btn {
		background: #0f766e;
		margin-top: 0.45rem;
		padding: 0.4rem 0.65rem;
	}

	.expanded {
		margin-top: 0.55rem;
		padding: 0.6rem;
		border-radius: 0.5rem;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
	}

	@media (min-width: 860px) {
		.button-row {
			grid-template-columns: repeat(2, minmax(220px, max-content));
			align-items: center;
		}

		.panel-grid {
			grid-template-columns: 2fr 1fr;
		}
	}
</style>
