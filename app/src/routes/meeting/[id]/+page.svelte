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
		phaseState?: RitualPhaseStateSnapshot;
	}

	interface UserShareValue {
		share: ShareRecord;
		crisis: boolean;
		heavy: boolean;
		phaseState?: RitualPhaseStateSnapshot;
	}

	interface ExpandShareValue {
		shareId: string;
		expandedText: string;
	}

	interface CrisisResponseValue {
		shares: ShareRecord[];
		phaseState?: RitualPhaseStateSnapshot;
		resources: {
			sticky: boolean;
			title: string;
			lines: string[];
		};
	}

	interface RitualPhaseStateSnapshot {
		currentPhase: string;
		phaseStartedAt: string | Date | null;
		roundNumber?: number;
		charactersSpokenThisRound: string[];
		userHasSharedInRound: boolean;
	}

	type MeetingPhase = 'sharing' | 'closing' | 'reflection';

	let { data }: { data: PageData } = $props();
	const defaultTopic = $derived(data.defaultTopic);
	const initialUserName = $derived(data.initialUserName);
	const initialMood = $derived(data.initialMood);
	const initialCrisisMode = $derived(data.initialCrisisMode === true);
	const shouldTriggerInitialCrisisSupport = $derived(
		data.shouldTriggerInitialCrisisSupport === true
	);
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
	let crisisResources = $state({
		title: "If you're in crisis",
		lines: [
			'988 - Suicide & Crisis Lifeline',
			'1-800-662-4357 - SAMHSA National Helpline',
			'You can stay here with us.'
		]
	});
	let heavyMode = $state(false);
	let sharing = $state(false);
	let postingShare = $state(false);
	let closing = $state(false);
	let expandingShareId = $state<string | null>(null);
	let crisisResponding = $state(false);
	let setupCrisisSupportRequested = $state(false);
	let activeCharacterId = $state<string | null>(null);
	let meetingPhase = $state<MeetingPhase>('sharing');
	let ritualPhaseState = $state<RitualPhaseStateSnapshot | null>(null);
	let transcriptContainer: HTMLDivElement | null = null;

	$effect(() => {
		if (!topic) topic = defaultTopic;
		if (!selectedCharacterId) selectedCharacterId = data.characters[0]?.id ?? 'marcus';
		if (!userName) userName = initialUserName;
		if (userMood === 'present') userMood = initialMood;
	});

	$effect(() => {
		const serverPhaseState = (data.phaseState as unknown as RitualPhaseStateSnapshot | undefined) ?? null;
		if (!ritualPhaseState && serverPhaseState) {
			ritualPhaseState = serverPhaseState;
		}
	});

	$effect(() => {
		if (!initialCrisisMode) return;
		if (!crisisMode) crisisMode = true;
		if (!shouldTriggerInitialCrisisSupport || setupCrisisSupportRequested) return;
		setupCrisisSupportRequested = true;
		void requestCrisisSupport(topic || defaultTopic);
	});

	$effect(() => {
		const transcriptCount = transcript.length;
		if (transcriptContainer) {
			transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
		}
		void transcriptCount;
	});

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	function parseSeamResult<T>(value: unknown): SeamResult<T> | null {
		if (!isRecord(value) || typeof value.ok !== 'boolean') return null;
		if (value.ok) return { ok: true, value: value.value as T };
		if (
			!isRecord(value.error) ||
			typeof value.error.message !== 'string' ||
			typeof value.error.code !== 'string'
		) {
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
			transcript = [...transcript, entry].sort(
				(left, right) => left.sequenceOrder - right.sequenceOrder
			);
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
			if (payload.value.phaseState) ritualPhaseState = payload.value.phaseState;
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
			const parsed = parseSeamResult<{ chunk?: string }>(
				JSON.parse((event as MessageEvent<string>).data)
			);
			if (parsed?.ok && typeof parsed.value.chunk === 'string') {
				streamingDraft = streamingDraft
					? `${streamingDraft} ${parsed.value.chunk}`
					: parsed.value.chunk;
			}
		});

		eventSource.addEventListener('persisted', (event) => {
			const parsed = parseSeamResult<{
				share?: ShareRecord;
				phaseState?: RitualPhaseStateSnapshot;
				generation?: { attempts?: number; fallbackUsed?: boolean };
			}>(
				JSON.parse((event as MessageEvent<string>).data)
			);
			if (parsed?.ok) {
				if (parsed.value.phaseState) ritualPhaseState = parsed.value.phaseState;
			}
			if (parsed?.ok && isRecord(parsed.value.share)) {
				upsertShare(parsed.value.share as ShareRecord);
				statusLine = parsed.value.generation?.fallbackUsed
					? 'Character share saved (safe fallback used).'
					: 'Character share generated and saved.';
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
			const parsedMessage = parsed && !parsed.ok ? parsed.error.message : 'Share stream failed.';
			if (parsedMessage.toLowerCase().includes('crisis mode')) {
				crisisMode = true;
				errorMessage = '';
				statusLine = 'Crisis mode is active. Character shares are paused.';
			} else {
				errorMessage = parsedMessage;
			}
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
			if (payload.value.phaseState) ritualPhaseState = payload.value.phaseState;
			if (payload.value.resources?.sticky) {
				crisisResources = {
					title: payload.value.resources.title,
					lines: payload.value.resources.lines
				};
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
			if (payload.value.phaseState) ritualPhaseState = payload.value.phaseState;
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

<main class="room-shell">
	<section class="room-panel room-meta">
		<header class="room-head">
			<p class="kicker">Room Live</p>
			<h1>Meeting Room</h1>
			<p class="meeting-id">Meeting ID: <code>{data.meetingId}</code></p>
			<p class="phase-pill">Phase: {ritualPhaseState?.currentPhase ?? 'unknown'}</p>
			<p class="member-line">{userName} · {data.initialCleanTime ?? 'clean time not set'}</p>
		</header>

		<MeetingCircle characters={data.characters} {activeCharacterId} {crisisMode} />

		<section class="edit-grid" aria-label="Meeting metadata">
			<label>
				<span>Topic</span>
				<input bind:value={topic} />
			</label>
			<label>
				<span>Your Name</span>
				<input bind:value={userName} />
			</label>
			<label>
				<span>Mood</span>
				<input bind:value={userMood} />
			</label>
		</section>
	</section>

	<section class="room-panel room-transcript">
		<div class="toolbar">
			<button
				type="button"
				onclick={requestCharacterShare}
				disabled={sharing || postingShare || closing || crisisMode || meetingPhase !== 'sharing'}
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

		<div bind:this={transcriptContainer} class="transcript-scroll" aria-live="polite">
			{#if transcript.length === 0}
				<SystemMessage message="No shares yet." kind="info" />
			{:else}
				<ol class="transcript-list">
					{#each transcript as entry (entry.id)}
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

	<section class="room-panel room-turn">
		{#if crisisMode}
			<section class="crisis-card" role="status" aria-live="polite">
				<h2>{crisisResources.title}</h2>
				{#each crisisResources.lines as line (`${line}`)}
					<p>{line}</p>
				{/each}
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

<style>
	.room-shell {
		max-width: 1300px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.9rem;
	}

	.room-panel {
		border-radius: 1rem;
		border: 1px solid rgba(158, 178, 214, 0.24);
		background:
			radial-gradient(circle at 86% 8%, rgba(255, 171, 68, 0.1), transparent 36%),
			linear-gradient(170deg, rgba(9, 14, 24, 0.94), rgba(7, 10, 17, 0.88));
		padding: 0.92rem;
	}

	.room-head h1 {
		margin: 0.25rem 0 0;
		font-size: 1.52rem;
		color: #ffe8bb;
	}

	.kicker {
		margin: 0;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #f5c87a;
	}

	.meeting-id,
	.member-line {
		margin: 0.35rem 0 0;
		font-size: 0.84rem;
		color: #d4e2fb;
	}

	.phase-pill {
		display: inline-flex;
		margin: 0.4rem 0 0;
		padding: 0.22rem 0.45rem;
		border-radius: 999px;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		background: rgba(21, 31, 51, 0.84);
		border: 1px solid rgba(123, 156, 214, 0.34);
		color: #d9e7ff;
	}

	.edit-grid {
		margin-top: 0.8rem;
		display: grid;
		gap: 0.5rem;
	}

	.edit-grid label {
		display: grid;
		gap: 0.24rem;
	}

	.edit-grid span {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #ffd7a0;
	}

	.edit-grid input {
		width: 100%;
		border-radius: 0.66rem;
		border: 1px solid rgba(127, 149, 188, 0.36);
		background: rgba(12, 19, 32, 0.84);
		color: #e5eeff;
		padding: 0.48rem 0.58rem;
		font: inherit;
		font-size: 0.88rem;
	}

	.edit-grid input:focus {
		outline: 2px solid rgba(255, 195, 110, 0.66);
		outline-offset: 1px;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-bottom: 0.55rem;
	}

	.toolbar button {
		min-height: 2.65rem;
		padding: 0.56rem 0.75rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(140, 168, 218, 0.4);
		background: rgba(17, 47, 74, 0.88);
		color: #e0f2fe;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
	}

	.toolbar button:nth-child(2) {
		background: rgba(122, 58, 17, 0.88);
		border-color: rgba(251, 191, 36, 0.38);
		color: #fef3c7;
	}

	.toolbar button:disabled {
		opacity: 0.48;
		cursor: not-allowed;
	}

	.transcript-scroll {
		margin-top: 0.55rem;
		max-height: 34rem;
		overflow-y: auto;
		border-radius: 0.82rem;
		border: 1px solid rgba(104, 122, 156, 0.32);
		background: rgba(6, 10, 17, 0.8);
		padding: 0.62rem;
	}

	.transcript-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.52rem;
	}

	.crisis-card {
		margin-bottom: 0.62rem;
		padding: 0.74rem;
		border-radius: 0.78rem;
		border: 1px solid rgba(253, 164, 175, 0.45);
		background: rgba(127, 29, 29, 0.24);
		color: #fecaca;
	}

	.crisis-card h2 {
		margin: 0;
		font-size: 0.92rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.crisis-card p {
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	@media (min-width: 980px) {
		.room-shell {
			grid-template-columns: minmax(220px, 1fr) minmax(420px, 2fr) minmax(260px, 1fr);
			align-items: start;
		}

		.room-meta {
			position: sticky;
			top: 0.8rem;
		}

		.room-turn {
			position: sticky;
			top: 0.8rem;
		}
	}
</style>
