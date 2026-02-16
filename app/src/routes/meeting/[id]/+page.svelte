<script lang="ts">
	import MeetingCircle from '$lib/components/MeetingCircle.svelte';
	import MeetingReflection from '$lib/components/MeetingReflection.svelte';
	import ShareMessage from '$lib/components/ShareMessage.svelte';
	import SystemMessage from '$lib/components/SystemMessage.svelte';
	import UserInput from '$lib/components/UserInput.svelte';
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

	interface CrisisResponseValue {
		shares: ShareRecord[];
		resources: string[];
	}

	type MeetingPhase = 'sharing' | 'closing' | 'reflection';

	let { data }: { data: PageData } = $props();
	const defaultTopic = $derived(data.defaultTopic);
	const initialUserName = $derived(data.initialUserName);
	const initialMood = $derived(data.initialMood);
	let topic = $state('');
	let userName = $state('');
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
	let crisisResponding = $state(false);
	let activeCharacterId = $state<string | null>(null);
	let meetingPhase = $state<MeetingPhase>('sharing');
	let transcriptContainer: HTMLDivElement | null = null;

	$effect(() => {
		if (!topic) topic = defaultTopic;
		if (!selectedCharacterId) selectedCharacterId = data.characters[0]?.id ?? 'marcus';
		if (!userName) userName = initialUserName;
		if (userMood === 'present') userMood = initialMood;
	});

	$effect(() => {
		transcript.length;
		if (transcriptContainer) {
			transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
		}
	});

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	function parseSeamResult<T>(value: unknown): SeamResult<T> | null {
		if (!isRecord(value) || typeof value.ok !== 'boolean') return null;
		if (value.ok) return { ok: true, value: value.value as T };
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
		} else {
			transcript = [...transcript, entry].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
		}

		if (!entry.isUserShare && entry.characterId) activeCharacterId = entry.characterId;
	}

	async function submitUserShare(content: string = userShareText.trim()) {
		if (!content || postingShare || data.listeningOnly) return;

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

			if (crisisMode) {
				await requestCrisisSupport(content);
			}
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			postingShare = false;
		}
	}

	async function submitPass() {
		if (data.listeningOnly) return;
		await submitUserShare("I'll pass for now.");
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

	function requestCharacterShare() {
		if (sharing || crisisMode || meetingPhase !== 'sharing') return;

		errorMessage = '';
		statusLine = '';
		streamingDraft = '';
		sharing = true;

		const search = new URLSearchParams({
			topic,
			characterId: selectedCharacterId,
			sequenceOrder: String(transcript.length),
			crisisMode: crisisMode ? '1' : '0',
			interactionType: 'respond_to',
			userName,
			userMood
		});

		const eventSource = new EventSource(`/meeting/${data.meetingId}/share?${search.toString()}`);

		eventSource.addEventListener('chunk', (event) => {
			const parsed = parseSeamResult<{ chunk?: string }>(JSON.parse((event as MessageEvent<string>).data));
			if (parsed?.ok && typeof parsed.value.chunk === 'string') {
				streamingDraft = streamingDraft ? `${streamingDraft} ${parsed.value.chunk}` : parsed.value.chunk;
			}
		});

		eventSource.addEventListener('persisted', (event) => {
			const parsed = parseSeamResult<{ share?: ShareRecord }>(JSON.parse((event as MessageEvent<string>).data));
			if (parsed?.ok && isRecord(parsed.value.share)) {
				upsertShare(parsed.value.share as ShareRecord);
				statusLine = 'Character share generated and saved.';
				streamingDraft = '';
			}
		});

		eventSource.addEventListener('error', (event) => {
			let parsed: SeamResult<unknown> | null = null;
			try {
				parsed = parseSeamResult(JSON.parse((event as MessageEvent<string>).data));
			} catch {
				parsed = null;
			}
			errorMessage = parsed && !parsed.ok ? parsed.error.message : 'Share stream failed.';
			eventSource.close();
			sharing = false;
		});

		eventSource.addEventListener('done', () => {
			eventSource.close();
			sharing = false;
		});
	}

	async function requestCrisisSupport(userText: string) {
		if (crisisResponding) return;

		errorMessage = '';
		crisisResponding = true;
		statusLine = '... room goes quiet ...';

		try {
			const response = await fetch(`/meeting/${data.meetingId}/crisis`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					userText,
					userName,
					sequenceOrder: transcript.length
				})
			});
			const payload = parseSeamResult<CrisisResponseValue>(await response.json());

			if (!payload) {
				errorMessage = 'Unexpected crisis response format.';
				return;
			}
			if (!payload.ok) {
				errorMessage = payload.error.message;
				return;
			}

			for (const share of payload.value.shares) {
				upsertShare(share);
			}
			statusLine = 'Crisis support responses added. You are not alone.';
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			crisisResponding = false;
		}
	}

	async function requestCloseSummary() {
		if (closing || meetingPhase !== 'sharing') return;

		errorMessage = '';
		statusLine = '';
		closing = true;
		meetingPhase = 'closing';

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
				meetingPhase = 'sharing';
				return;
			}
			if (!payload.ok) {
				errorMessage = payload.error.message;
				meetingPhase = 'sharing';
				return;
			}

			summaryText = payload.value.summary;
			meetingPhase = 'reflection';
			statusLine = 'Close summary ready.';
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
			meetingPhase = 'sharing';
		} finally {
			closing = false;
		}
	}
</script>

<main class="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[2fr_1fr]">
	<section class="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
		<header class="space-y-2">
			<h1 class="text-2xl font-bold text-amber-200">Meeting Room</h1>
			<p class="text-sm text-gray-300">Meeting ID: <code>{data.meetingId}</code></p>
			<p class="text-sm text-gray-300">{userName} · {data.initialCleanTime ?? 'clean time not set'}</p>
		</header>

		<MeetingCircle characters={data.characters} {activeCharacterId} {crisisMode} />

		<section class="grid gap-2 sm:grid-cols-3">
			<label class="text-sm text-gray-200">
				Topic
				<input class="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 p-2" bind:value={topic} />
			</label>
			<label class="text-sm text-gray-200">
				Your Name
				<input class="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 p-2" bind:value={userName} />
			</label>
			<label class="text-sm text-gray-200">
				Mood
				<input class="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 p-2" bind:value={userMood} />
			</label>
		</section>

		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={requestCharacterShare}
				disabled={sharing || postingShare || closing || crisisMode || meetingPhase !== 'sharing'}
				class="min-h-11 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
			>
				{crisisMode
					? 'Character Shares Paused (Crisis Mode)'
					: sharing
						? 'Generating Character Share...'
						: 'Generate Character Share'}
			</button>
			<button
				type="button"
				onclick={requestCloseSummary}
				disabled={closing || sharing || meetingPhase !== 'sharing'}
				class="min-h-11 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
			>
				{closing ? 'Closing Meeting...' : 'Close Meeting'}
			</button>
		</div>

		{#if errorMessage}
			<SystemMessage message={errorMessage} kind="error" />
		{/if}
		{#if statusLine}
			<SystemMessage message={statusLine} kind="info" />
		{/if}
		{#if streamingDraft}
			<SystemMessage message={`Streaming: ${streamingDraft}`} kind="success" />
		{/if}

		<div bind:this={transcriptContainer} class="max-h-[28rem] space-y-3 overflow-y-auto rounded-xl border border-gray-700 bg-gray-950 p-3">
			{#if transcript.length === 0}
				<SystemMessage message="No shares yet." kind="info" />
			{:else}
				<ol class="space-y-3">
					{#each transcript as entry}
						<ShareMessage
							{entry}
							expandedText={expandedShares[entry.id]}
							onExpand={requestExpandShare}
							expanding={expandingShareId === entry.id}
						/>
					{/each}
				</ol>
			{/if}
		</div>
	</section>

	<section class="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
		{#if crisisMode}
			<section class="rounded-xl border border-rose-600 bg-rose-950/30 p-4">
				<h2 class="text-base font-semibold text-rose-200">If you're in crisis</h2>
				<p class="text-sm text-rose-100">988 - Suicide & Crisis Lifeline</p>
				<p class="text-sm text-rose-100">1-800-662-4357 - SAMHSA National Helpline</p>
				<p class="text-sm text-rose-100">You can stay here with us.</p>
			</section>
		{/if}

		{#if meetingPhase === 'reflection' && summaryText}
			<MeetingReflection summary={summaryText} onClose={() => (meetingPhase = 'sharing')} />
		{:else}
			<UserInput
				value={userShareText}
				onValueChange={(next) => (userShareText = next)}
				onSubmit={() => submitUserShare()}
				onPass={submitPass}
				disabled={postingShare || sharing || crisisResponding || meetingPhase !== 'sharing'}
				{crisisMode}
				listeningOnly={data.listeningOnly}
			/>
		{/if}
	</section>
</main>
