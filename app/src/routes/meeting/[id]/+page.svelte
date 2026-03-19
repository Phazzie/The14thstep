<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import MeetingCircle from '$lib/components/MeetingCircle.svelte';
	import MeetingReflection from '$lib/components/MeetingReflection.svelte';
	import ShareMessage from '$lib/components/ShareMessage.svelte';
	import SystemMessage from '$lib/components/SystemMessage.svelte';
	import UserInput from '$lib/components/UserInput.svelte';
	import { createSeededRandom } from '$lib/core/random-utils';
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
		interactionType: string;
		significanceScore: number;
		sequenceOrder: number;
		createdAt: string;
	}

	interface TranscriptShare extends ShareRecord {
		speakerName: string;
	}

	interface TranscriptSystem {
		id: string;
		kind: 'system' | 'ritual' | 'action' | 'local-user';
		text: string;
	}

	type TranscriptItem = { id: string; kind: 'share'; entry: TranscriptShare } | TranscriptSystem;

	interface RitualPhaseStateSnapshot {
		currentPhase: string;
		phaseStartedAt: string | Date | null;
		roundNumber?: number;
		charactersSpokenThisRound: string[];
		userHasSharedInRound: boolean;
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

	interface CloseSummaryValue {
		meetingId: string;
		summary: string;
		phaseState?: RitualPhaseStateSnapshot;
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

	type InputMode = 'none' | 'intro' | 'topic' | 'share' | 'reflection';
	type TurnOutcome = 'shared' | 'crisis';

	let { data }: { data: PageData } = $props();
	const meetingId = $derived(data.meetingId);
	const loadedCharacters = $derived(
		[...data.characters].sort((left, right) => left.seatOrder - right.seatOrder)
	);
	const loadedPhaseState = $derived(
		(data.phaseState as RitualPhaseStateSnapshot | undefined) ?? null
	);

	const TOPIC_OPTIONS = [
		'Staying clean when everything falls apart',
		"People who don't understand what we've been through",
		'Trusting yourself again',
		'The difference between being alone and being lonely',
		"When the people closest to you don't believe you've changed",
		'Dealing with the things you did',
		'Finding reasons to stay',
		'Coming back after relapse',
		'The people we lost',
		'When staying clean feels harder than using'
	];

	const NEWCOMER_CLEAN_TIME = new Set([
		'This is my first meeting',
		'Less than a week',
		"I'm not clean right now"
	]);

	const ACTION_LINES: Record<string, string[]> = {
		marcus: ['Marcus shifts in his chair.', 'Marcus rubs the edge of his coffee cup.'],
		heather: ['Heather nods once.', 'Heather looks down for a second.'],
		meechie: ['Meechie leans back and lets it hang.', 'Meechie scrubs a hand over his jaw.'],
		gemini: ['Gemini exhales through her nose.', 'Gemini folds her arms tighter.'],
		gypsy: ['Gypsy shifts in her chair.', 'Gypsy taps one finger against her cup.'],
		chrystal: ['Chrystal looks up over the page.', 'Chrystal smooths the folded paper again.']
	};

	const sequenceRandom = createSeededRandom(`${meetingId}:room-sequence`);
	const meetingCharacters = loadedCharacters;
	const speakingOrder = shuffle(
		meetingCharacters.filter((character) => character.id !== 'marcus'),
		createSeededRandom(`${meetingId}:speaking-order`)
	);

	let transcript = $state<TranscriptItem[]>([]);
	let expandedShares = $state<Record<string, string>>({});
	let ritualPhaseState = $state<RitualPhaseStateSnapshot | null>(loadedPhaseState);
	let topic = $state(data.defaultTopic);
	let selectedTopic = $state('');
	let userName = $state(data.initialUserName);
	let userMood = $state(data.initialMood);
	let userShareText = $state('');
	let summaryText = $state('');
	let errorMessage = $state('');
	let inputMode = $state<InputMode>('none');
	let currentPrompt = $state('');
	let crisisMode = $state(data.initialCrisisMode === true);
	let crisisResponding = $state(false);
	let crisisResources = $state<CrisisResponseValue['resources'] | null>(null);
	let isCharacterThinking = $state(false);
	let streamingPreview = $state('');
	let activeCharacterId = $state<string | null>(null);
	let expandedShareId = $state<string | null>(null);
	let transcriptContainer: HTMLDivElement | null = null;
	let initialized = false;
	let runToken = 0;
	let localCounter = 0;
	let currentShareSource: EventSource | null = null;
	let pendingTurn: {
		resolve: (value: TurnOutcome) => void;
		prompt: string;
	} | null = null;

	const derivedInitialCleanTime = $derived(data.initialCleanTime ?? '');
	const newcomerGreetingNeeded = $derived(NEWCOMER_CLEAN_TIME.has(derivedInitialCleanTime));

	$effect(() => {
		const transcriptSize = transcript.length;
		if (transcriptContainer) {
			transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
		}
		void transcriptSize;
	});

	function shuffle<T>(items: T[], random: () => number): T[] {
		const copy = [...items];
		for (let index = copy.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(random() * (index + 1));
			[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
		}
		return copy;
	}

	function nextLocalId(prefix: string): string {
		localCounter += 1;
		return `${prefix}-${localCounter}`;
	}

	function wait(ms: number, token: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				if (token !== runToken) {
					reject(new Error('sequence-cancelled'));
					return;
				}
				resolve();
			}, ms);

			if (token !== runToken) {
				clearTimeout(timer);
				reject(new Error('sequence-cancelled'));
			}
		});
	}

	function speakerName(characterId: string | null): string {
		if (!characterId) return userName;
		return meetingCharacters.find((character) => character.id === characterId)?.name ?? 'Someone';
	}

	function shareCount(): number {
		return transcript.filter((item) => item.kind === 'share' && item.entry.sequenceOrder >= 0)
			.length;
	}

	function pushTranscriptItem(item: TranscriptItem) {
		transcript = [...transcript, item];
	}

	function pushSystem(text: string) {
		pushTranscriptItem({ id: nextLocalId('system'), kind: 'system', text });
	}

	function pushRitual(text: string) {
		pushTranscriptItem({ id: nextLocalId('ritual'), kind: 'ritual', text });
	}

	function pushAction(text: string) {
		pushTranscriptItem({ id: nextLocalId('action'), kind: 'action', text });
	}

	function pushLocalUserIntro(text: string) {
		pushTranscriptItem({ id: nextLocalId('user-intro'), kind: 'local-user', text });
	}

	function upsertShare(share: ShareRecord) {
		const entry: TranscriptShare = {
			...share,
			speakerName: share.isUserShare ? userName : speakerName(share.characterId)
		};
		const nextItems = [...transcript];
		const existingIndex = nextItems.findIndex(
			(item) => item.kind === 'share' && item.entry.id === share.id
		);
		if (existingIndex >= 0) {
			nextItems[existingIndex] = { id: share.id, kind: 'share', entry };
		} else {
			nextItems.push({ id: share.id, kind: 'share', entry });
		}
		transcript = nextItems;
		if (!share.isUserShare && share.characterId) {
			activeCharacterId = share.characterId;
		}
	}

	function closeCurrentShareSource() {
		currentShareSource?.close();
		currentShareSource = null;
		isCharacterThinking = false;
		streamingPreview = '';
	}

	function isMeaningfulUserShareText(content: string): boolean {
		const normalized = content.trim().toLowerCase();
		return normalized.length > 0 && normalized !== "i'll pass for now." && normalized !== 'ill pass for now.';
	}

	function meaningfulUserShareCount(): number {
		return transcript.filter(
			(item) =>
				item.kind === 'share' &&
				item.entry.isUserShare &&
				isMeaningfulUserShareText(item.entry.content)
		).length;
	}

	function latestMeaningfulUserShare(): TranscriptShare | null {
		for (let index = transcript.length - 1; index >= 0; index -= 1) {
			const item = transcript[index];
			if (
				item.kind === 'share' &&
				item.entry.isUserShare &&
				isMeaningfulUserShareText(item.entry.content)
			) {
				return item.entry;
			}
		}
		return null;
	}

	function findCharacterById(characterId: string | undefined) {
		if (!characterId) return null;
		return meetingCharacters.find((character) => character.id === characterId) ?? null;
	}

	function pickFarewellCharacter() {
		for (let index = transcript.length - 1; index >= 0; index -= 1) {
			const item = transcript[index];
			if (item.kind === 'share' && !item.entry.isUserShare && item.entry.characterId) {
				const matched = findCharacterById(item.entry.characterId);
				if (matched && matched.id !== 'marcus') return matched;
			}
		}
		return speakingOrder.find((character) => character.id !== 'marcus') ?? meetingCharacters[1] ?? null;
	}

	function promptForResumedPhase(phase: string | undefined): string {
		switch (phase) {
			case 'sharing_round_1':
				return 'What comes up for you?';
			case 'sharing_round_2':
				return 'How does this land?';
			case 'sharing_round_3':
				return 'Anything else before we close?';
			default:
				return '';
		}
	}

	function syncInputModeFromPersistedPhase() {
		if (!ritualPhaseState) {
			inputMode = 'none';
			currentPrompt = '';
			return;
		}

		if (crisisMode) {
			inputMode = 'none';
			currentPrompt = '';
			return;
		}

		switch (ritualPhaseState.currentPhase) {
			case 'topic_selection':
				inputMode = 'topic';
				currentPrompt = '';
				return;
			case 'introductions':
				if (ritualPhaseState.charactersSpokenThisRound.length >= meetingCharacters.length) {
					inputMode = 'intro';
					currentPrompt = '';
					return;
				}
				break;
			case 'sharing_round_1':
				if (!ritualPhaseState.userHasSharedInRound && ritualPhaseState.charactersSpokenThisRound.length >= 2) {
					inputMode = 'share';
					currentPrompt = promptForResumedPhase(ritualPhaseState.currentPhase);
					return;
				}
				break;
			case 'sharing_round_2':
				if (!ritualPhaseState.userHasSharedInRound && ritualPhaseState.charactersSpokenThisRound.length >= 3) {
					inputMode = 'share';
					currentPrompt = promptForResumedPhase(ritualPhaseState.currentPhase);
					return;
				}
				break;
			case 'sharing_round_3':
				if (!ritualPhaseState.userHasSharedInRound && ritualPhaseState.charactersSpokenThisRound.length >= 3) {
					inputMode = 'share';
					currentPrompt = promptForResumedPhase(ritualPhaseState.currentPhase);
					return;
				}
				break;
			case 'post_meeting':
				inputMode = 'reflection';
				currentPrompt = '';
				return;
		}

		inputMode = 'none';
		currentPrompt = '';
	}

	function shouldAutoResumeFromPersistedPhase() {
		if (!ritualPhaseState || crisisMode) return false;
		if (ritualPhaseState.userHasSharedInRound) return false;
		if (ritualPhaseState.charactersSpokenThisRound.length > 0) return false;

		return (
			ritualPhaseState.currentPhase === 'sharing_round_1' ||
			ritualPhaseState.currentPhase === 'sharing_round_2' ||
			ritualPhaseState.currentPhase === 'sharing_round_3' ||
			ritualPhaseState.currentPhase === 'closing'
		);
	}

	function parseSeamResult<T>(value: unknown): SeamResult<T> | null {
		if (
			!value ||
			typeof value !== 'object' ||
			typeof (value as { ok?: unknown }).ok !== 'boolean'
		) {
			return null;
		}
		const result = value as {
			ok: boolean;
			value?: T;
			error?: { code?: unknown; message?: unknown; details?: unknown };
		};
		if (result.ok) return { ok: true, value: result.value as T };
		if (
			!result.error ||
			typeof result.error.code !== 'string' ||
			typeof result.error.message !== 'string'
		) {
			return null;
		}
		return {
			ok: false,
			error: {
				code: result.error.code,
				message: result.error.message,
				details:
					result.error.details && typeof result.error.details === 'object'
						? (result.error.details as Record<string, unknown>)
						: undefined
			}
		};
	}

	function maybeAddNonverbalReaction(excludedIds: string[]) {
		if (sequenceRandom() > 0.3) return;
		const candidate = speakingOrder.find((character) => !excludedIds.includes(character.id));
		if (!candidate) return;
		const actions = ACTION_LINES[candidate.id] ?? [`${candidate.name} shifts in their chair.`];
		const line = actions[Math.floor(sequenceRandom() * actions.length)] ?? actions[0];
		pushAction(line);
	}

	function maybeAddAlmostShare(excludedIds: string[]) {
		if (sequenceRandom() > 0.2) return;
		const candidate = speakingOrder.find((character) => !excludedIds.includes(character.id));
		if (!candidate) return;
		pushAction(`${candidate.name} starts to say something, stops.`);
	}

	async function streamCharacterShare(
		options: {
			characterId?: string;
			interactionType?: string;
		} = {}
	): Promise<ShareRecord> {
		errorMessage = '';
		closeCurrentShareSource();

		const search = new SvelteURLSearchParams({
			topic,
			sequenceOrder: String(shareCount()),
			crisisMode: crisisMode ? '1' : '0',
			interactionType: options.interactionType ?? 'standard',
			userName,
			userMood
		});
		if (options.characterId) search.set('characterId', options.characterId);

		return await new Promise<ShareRecord>((resolve, reject) => {
			const source = new EventSource(`/meeting/${meetingId}/share?${search.toString()}`);
			currentShareSource = source;
			isCharacterThinking = true;
			let resolved = false;

			source.addEventListener('meta', (event) => {
				const parsed = parseSeamResult<{ character?: { id?: string } }>(
					JSON.parse((event as MessageEvent<string>).data)
				);
				if (parsed?.ok && parsed.value.character?.id) {
					activeCharacterId = parsed.value.character.id;
				}
			});

			source.addEventListener('chunk', (event) => {
				const parsed = parseSeamResult<{ chunk?: string }>(
					JSON.parse((event as MessageEvent<string>).data)
				);
				if (parsed?.ok && typeof parsed.value.chunk === 'string') {
					streamingPreview = `${streamingPreview}${streamingPreview ? ' ' : ''}${parsed.value.chunk}`;
				}
			});

			source.addEventListener('persisted', (event) => {
				const parsed = parseSeamResult<{
					share?: ShareRecord;
					phaseState?: RitualPhaseStateSnapshot;
				}>(JSON.parse((event as MessageEvent<string>).data));
				if (!parsed?.ok || !parsed.value.share) return;
				if (parsed.value.phaseState) ritualPhaseState = parsed.value.phaseState;
				upsertShare(parsed.value.share);
				closeCurrentShareSource();
				resolved = true;
				resolve(parsed.value.share);
			});

			source.addEventListener('error', (event) => {
				let parsed: SeamResult<unknown> | null = null;
				try {
					parsed = parseSeamResult(JSON.parse((event as MessageEvent<string>).data));
				} catch {
					parsed = null;
				}
				closeCurrentShareSource();
				if (resolved) return;
				reject(new Error(parsed && !parsed.ok ? parsed.error.message : 'Share stream failed.'));
			});

			source.addEventListener('done', () => {
				closeCurrentShareSource();
			});
		});
	}

	async function postUserShare(content: string): Promise<UserShareValue> {
		const response = await fetch(`/meeting/${meetingId}/user-share`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				content,
				sequenceOrder: shareCount(),
				interactionType: 'standard',
				isFirstUserShare: transcript.every(
					(item) => item.kind !== 'share' || item.entry.isUserShare === false
				)
			})
		});
		const payload = parseSeamResult<UserShareValue>(await response.json());
		if (!payload) throw new Error('Unexpected user-share response.');
		if (!payload.ok) throw new Error(payload.error.message);
		upsertShare(payload.value.share);
		if (payload.value.phaseState) ritualPhaseState = payload.value.phaseState;
		crisisMode = payload.value.crisis;
		return payload.value;
	}

	async function requestCrisisSupport(userText: string) {
		if (crisisResponding) return;
		crisisResponding = true;
		try {
			const response = await fetch(`/meeting/${meetingId}/crisis`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					userText,
					userName,
					sequenceOrder: shareCount()
				})
			});
			const payload = parseSeamResult<CrisisResponseValue>(await response.json());
			if (!payload) throw new Error('Unexpected crisis response.');
			if (!payload.ok) throw new Error(payload.error.message);
			for (const share of payload.value.shares) upsertShare(share);
			if (payload.value.phaseState) ritualPhaseState = payload.value.phaseState;
			crisisResources = payload.value.resources;
			crisisMode = true;
			inputMode = 'none';
			currentPrompt = '';
			pushSystem('The room stopped and turned toward you.');
		} finally {
			crisisResponding = false;
		}
	}

	async function requestExpandShare(shareId: string) {
		const selected = transcript.find((item) => item.kind === 'share' && item.entry.id === shareId);
		if (!selected || selected.kind !== 'share' || selected.entry.isUserShare || expandedShareId)
			return;
		expandedShareId = shareId;
		try {
			const response = await fetch(`/meeting/${meetingId}/expand`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					shareId,
					topic,
					recentShares: transcript
						.filter(
							(item): item is { id: string; kind: 'share'; entry: TranscriptShare } =>
								item.kind === 'share'
						)
						.slice(-6)
						.map((item) => ({
							speaker: item.entry.speakerName,
							content: item.entry.content
						}))
				})
			});
			const payload = parseSeamResult<ExpandShareValue>(await response.json());
			if (!payload) throw new Error('Unexpected expand response.');
			if (!payload.ok) throw new Error(payload.error.message);
			expandedShares = { ...expandedShares, [payload.value.shareId]: payload.value.expandedText };
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		} finally {
			expandedShareId = null;
		}
	}

	function introText(): string {
		const cleanTimeLine = derivedInitialCleanTime ? ` ${derivedInitialCleanTime}.` : '';
		return `I'm ${userName}. I'm an addict.${cleanTimeLine}`;
	}

	function hasAskedHardQuestion(): boolean {
		return transcript.some(
			(item) =>
				item.kind === 'share' &&
				!item.entry.isUserShare &&
				item.entry.interactionType === 'hard_question'
		);
	}

	function shouldAskHardQuestion(): boolean {
		return !data.listeningOnly && meaningfulUserShareCount() >= 2 && !hasAskedHardQuestion();
	}

	function lastUserTurnWasMeaningful(): boolean {
		for (let index = transcript.length - 1; index >= 0; index -= 1) {
			const item = transcript[index];
			if (item.kind === 'share') {
				return item.entry.isUserShare && isMeaningfulUserShareText(item.entry.content);
			}
		}
		return false;
	}

	function resolveRoundTwoSpeakers() {
		let first = speakingOrder[2] ?? speakingOrder[0] ?? meetingCharacters[0];
		let second = speakingOrder[3] ?? speakingOrder[1] ?? speakingOrder[0] ?? meetingCharacters[1] ?? first;
		const latestUserShare = latestMeaningfulUserShare();
		const parallelCharacterId = latestUserShare
			? detectParallelStoryCharacter(latestUserShare.content)
			: null;

		if (parallelCharacterId && parallelCharacterId !== second.id) {
			const mapped = findCharacterById(parallelCharacterId);
			if (mapped) {
				first = mapped;
			}
		}

		if (second.id === first.id) {
			second =
				speakingOrder.find(
					(character) => character.id !== first.id && character.id !== (speakingOrder[2]?.id ?? '')
				) ??
				meetingCharacters.find((character) => character.id !== first.id) ??
				second;
		}

		return { first, second };
	}

	async function waitForUserTurn(prompt: string): Promise<TurnOutcome> {
		currentPrompt = prompt;
		if (data.listeningOnly) {
			inputMode = 'none';
			currentPrompt = '';
			pendingTurn = { resolve: () => undefined, prompt };
			await wait(1200, runToken);
			return await handleSubmitShare("I'll pass for now.");
		}
		inputMode = 'share';
		return await new Promise<TurnOutcome>((resolve) => {
			pendingTurn = { resolve, prompt };
		});
	}

	async function continueFromPersistedPhase(currentPhase: string | undefined) {
		if (!currentPhase || crisisMode) return;
		switch (currentPhase) {
			case 'sharing_round_1':
				await runRoundOne();
				return;
			case 'sharing_round_2':
				await runRoundTwo();
				return;
			case 'sharing_round_3':
				if (shouldAskHardQuestion()) {
					await wait(900, runToken);
					await streamCharacterShare({
						characterId: sequenceRandom() > 0.5 ? 'meechie' : 'marcus',
						interactionType: 'hard_question'
					});
					await wait(1200, runToken);
				}
				await runRoundThree();
				return;
			case 'closing':
				await runClosing();
				return;
		}
	}

	async function handleSubmitShare(content = userShareText.trim()): Promise<TurnOutcome> {
		if (!content || crisisResponding) return 'shared';
		try {
			inputMode = 'none';
			currentPrompt = '';
			const result = await postUserShare(content);
			userShareText = '';
			if (result.heavy) {
				pushAction('The room goes quiet.');
				await wait(3500, runToken);
			} else {
				await wait(1500, runToken);
			}
			if (result.crisis) {
				await requestCrisisSupport(content);
				pendingTurn?.resolve('crisis');
				pendingTurn = null;
				return 'crisis';
			}
			const waitingTurn = pendingTurn;
			pendingTurn = null;
			waitingTurn?.resolve('shared');
			if (!waitingTurn) {
				await continueFromPersistedPhase(result.phaseState?.currentPhase);
			}
			pendingTurn = null;
			return 'shared';
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : String(cause);
			inputMode = 'share';
			return 'shared';
		}
	}

	async function handlePass() {
		await handleSubmitShare("I'll pass for now.");
	}

	async function handleIntroduceSelf() {
		inputMode = 'none';
		pushLocalUserIntro(introText());
		pushSystem(`Hi ${userName}.`);
		if (newcomerGreetingNeeded) {
			pushAction('A couple people nod like they knew this might be your first time.');
			await wait(1200, runToken);
		} else {
			await wait(1200, runToken);
		}
		await streamCharacterShare({ characterId: 'marcus', interactionType: 'standard' });
		selectedTopic = TOPIC_OPTIONS.includes(topic) ? topic : '';
		inputMode = 'topic';
	}

	async function chooseTopic(nextTopic: string) {
		topic = nextTopic;
		selectedTopic = nextTopic;
		inputMode = 'none';
		await streamCharacterShare({ characterId: 'marcus', interactionType: 'respond_to' });
		await wait(900, runToken);
		await runRounds();
	}

	async function runRounds() {
		await runRoundOne();
	}

	async function runRoundOne() {
		const roundOneA = speakingOrder[0] ?? meetingCharacters[0];
		const roundOneB = speakingOrder[1] ?? meetingCharacters[1] ?? roundOneA;
		await streamCharacterShare({ characterId: roundOneA?.id, interactionType: 'respond_to' });
		if (roundOneB && sequenceRandom() > 0.6) {
			await wait(700, runToken);
			await streamCharacterShare({
				characterId: roundOneB.id,
				interactionType: 'crosstalk'
			});
		}
		maybeAddNonverbalReaction([roundOneA?.id ?? '', roundOneB?.id ?? '']);
		await wait(900, runToken);
		await streamCharacterShare({ characterId: roundOneB?.id, interactionType: 'respond_to' });
		await wait(900, runToken);
		const outcome = await waitForUserTurn('What comes up for you?');
		if (outcome === 'crisis') return;
		await runRoundTwo();
	}

	async function runRoundTwo() {
		const { first, second } = resolveRoundTwoSpeakers();
		await streamCharacterShare({ characterId: first?.id, interactionType: 'respond_to' });
		maybeAddAlmostShare([first?.id ?? '', second?.id ?? '']);
		await wait(900, runToken);
		if (second && sequenceRandom() > 0.6) {
			await streamCharacterShare({ characterId: second.id, interactionType: 'crosstalk' });
			await wait(700, runToken);
		}
		await streamCharacterShare({ characterId: second?.id, interactionType: 'respond_to' });
		const questionPool = [speakingOrder[0], speakingOrder[1], first, second].filter(
			(character, index, list): character is NonNullable<typeof character> =>
				Boolean(character) && list.findIndex((candidate) => candidate?.id === character?.id) === index
		);
		const questionAsker = questionPool[Math.floor(sequenceRandom() * questionPool.length)];
		if (questionAsker) {
			await wait(900, runToken);
			await streamCharacterShare({ characterId: questionAsker.id, interactionType: 'respond_to' });
		}
		const outcome = await waitForUserTurn('How does this land?');
		if (outcome === 'crisis') return;

		if (shouldAskHardQuestion()) {
			await wait(900, runToken);
			await streamCharacterShare({
				characterId: sequenceRandom() > 0.5 ? 'meechie' : 'marcus',
				interactionType: 'hard_question'
			});
			await wait(1200, runToken);
		}
		await runRoundThree();
	}

	async function runRoundThree() {
		const roundThreeA = speakingOrder[4] ?? speakingOrder[2] ?? meetingCharacters[2] ?? meetingCharacters[0];
		const roundThreeB =
			speakingOrder[5] ?? speakingOrder[3] ?? meetingCharacters[3] ?? meetingCharacters[1] ?? roundThreeA;
		await streamCharacterShare({ characterId: roundThreeA?.id, interactionType: 'respond_to' });
		maybeAddNonverbalReaction([roundThreeA?.id ?? '', roundThreeB?.id ?? '']);
		await wait(900, runToken);
		await streamCharacterShare({ characterId: roundThreeB?.id, interactionType: 'respond_to' });
		await wait(900, runToken);
		await streamCharacterShare({ characterId: 'marcus', interactionType: 'respond_to' });
		const outcome = await waitForUserTurn('Anything else before we close?');
		if (outcome === 'crisis') return;
		await runClosing();
	}

	function detectParallelStoryCharacter(content: string): string | null {
		const normalized = content.toLowerCase();
		if (normalized.includes('custody') || normalized.includes('kid')) return 'marcus';
		if (normalized.includes('prison') || normalized.includes('jail')) return 'heather';
		if (normalized.includes('relapse') || normalized.includes('slip')) return 'gemini';
		if (
			normalized.includes('running') ||
			normalized.includes('moved') ||
			normalized.includes('city')
		)
			return 'gypsy';
		return null;
	}

	async function runClosing() {
		if (lastUserTurnWasMeaningful()) {
			await streamCharacterShare({ characterId: 'marcus', interactionType: 'respond_to' });
			await wait(1100, runToken);
		}
		await streamCharacterShare({ characterId: 'marcus', interactionType: 'respond_to' });
		await wait(2000, runToken);
		const goodbyeCharacter = findCharacterById('heather') ?? speakingOrder[0] ?? meetingCharacters[1] ?? null;
		if (goodbyeCharacter) {
			await streamCharacterShare({
				characterId: goodbyeCharacter.id,
				interactionType: 'respond_to'
			});
			await wait(1500, runToken);
		}
		pushRitual('— Keep coming back —');
		await wait(900, runToken);
		const farewellCharacter = pickFarewellCharacter();
		if (farewellCharacter) {
			await streamCharacterShare({
				characterId: farewellCharacter.id,
				interactionType: 'farewell'
			});
		}

		const response = await fetch(`/meeting/${meetingId}/close`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				topic,
				lastShares: transcript
					.filter(
						(item): item is { id: string; kind: 'share'; entry: TranscriptShare } =>
							item.kind === 'share'
					)
					.slice(-8)
					.map((item) => ({
						speakerName: item.entry.speakerName,
						content: item.entry.content
					}))
			})
		});
		const payload = parseSeamResult<CloseSummaryValue>(await response.json());
		if (!payload) throw new Error('Unexpected close response.');
		if (!payload.ok) throw new Error(payload.error.message);
		summaryText = payload.value.summary;
		if (payload.value.phaseState) ritualPhaseState = payload.value.phaseState;
		currentPrompt = '';
		inputMode = 'reflection';
	}

	async function runFreshMeeting(token: number) {
		try {
			await wait(500, token);
			pushSystem("This chair stays empty for everyone who couldn't make it tonight.");
			await wait(2000, token);
			await streamCharacterShare({ characterId: 'marcus' });
			await wait(3000, token);
			pushSystem('— moment of silence —');
			await wait(3000, token);
			pushAction('Chrystal pulls out a folded paper.');
			await wait(800, token);
			await streamCharacterShare({ characterId: 'chrystal' });
			await wait(3500, token);
			pushSystem('— introductions —');
			await wait(800, token);

			for (const character of meetingCharacters) {
				await streamCharacterShare({ characterId: character.id });
				if (sequenceRandom() > 0.5) {
					pushSystem(`Hi ${character.name}!`);
				}
				await wait(600, token);
			}

			pushAction('The room settles. Everyone is waiting.');
			await wait(1500, token);
			inputMode = 'intro';
		} catch (cause) {
			if (cause instanceof Error && cause.message === 'sequence-cancelled') return;
			errorMessage = cause instanceof Error ? cause.message : String(cause);
		}
	}

	onMount(() => {
		if (initialized) return;
		initialized = true;
		runToken += 1;
		const token = runToken;

		for (const share of data.initialShares ?? []) {
			upsertShare(share as ShareRecord);
		}

		if (
			data.initialCrisisMode &&
			data.shouldTriggerInitialCrisisSupport &&
			!data.initialShares?.length
		) {
			void requestCrisisSupport(topic);
			return () => {
				runToken += 1;
			};
		}

		if (!data.initialShares?.length) {
			void runFreshMeeting(token);
		} else if (shouldAutoResumeFromPersistedPhase()) {
			void continueFromPersistedPhase(ritualPhaseState?.currentPhase);
		} else {
			syncInputModeFromPersistedPhase();
		}

		return () => {
			closeCurrentShareSource();
			runToken += 1;
		};
	});
</script>

<main class="meeting-shell">
	<section class="circle-wrap">
		<MeetingCircle characters={meetingCharacters} {activeCharacterId} {crisisMode} />
	</section>

	<section class="transcript-wrap">
		{#if errorMessage}
			<div class="inline-system"><SystemMessage message={errorMessage} kind="error" /></div>
		{/if}
		{#if isCharacterThinking}
			<div class="thinking-line" aria-live="polite" aria-label="Someone is gathering themselves to speak">
				<span></span><span></span><span></span>
			</div>
		{/if}

		<div bind:this={transcriptContainer} class="transcript-scroll">
			<ol class="transcript-list">
				{#if streamingPreview}
					<li class="streaming-preview">
						<p class="speaker">{speakerName(activeCharacterId)}</p>
						<p>{streamingPreview}</p>
					</li>
				{/if}
				{#each transcript as item (item.id)}
					{#if item.kind === 'share'}
						<ShareMessage
							entry={item.entry}
							expandedText={expandedShares[item.entry.id]}
							onExpand={requestExpandShare}
							expanding={expandedShareId === item.entry.id}
						/>
					{:else if item.kind === 'local-user'}
						<li class="local-user-share">
							<p class="speaker">{userName}</p>
							<p>{item.text}</p>
						</li>
					{:else if item.kind === 'action'}
						<li class="action-line"><p>{item.text}</p></li>
					{:else}
						<li class="inline-system">
							<SystemMessage message={item.text} kind={item.kind === 'ritual' ? 'ritual' : 'info'} />
						</li>
					{/if}
				{/each}
			</ol>
		</div>
	</section>

	<section class="input-wrap">
		{#if crisisMode}
			<div class="inline-system">
				<SystemMessage message="The meeting stopped. Stay with the room." kind="error" />
			</div>
			{#if crisisResources}
				<div class="control-card crisis-card">
					<p class="prompt-line">{crisisResources.title}</p>
					<ul class="resource-list">
						{#each crisisResources.lines as line (line)}
							<li>{line}</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}

		{#if inputMode === 'intro'}
			<div class="control-card">
				<button class="primary-btn" type="button" onclick={handleIntroduceSelf}>
					Introduce yourself
				</button>
			</div>
		{:else if inputMode === 'topic'}
			<div class="control-card">
				<p class="prompt-line">Pick what is on the table tonight.</p>
				<div class="topic-grid">
					{#each TOPIC_OPTIONS as option (option)}
						<button
							type="button"
							class:selected={selectedTopic === option}
							class="topic-btn"
							onclick={() => (selectedTopic = option)}
						>
							{option}
						</button>
					{/each}
				</div>
				<div class="topic-actions">
					<button
						type="button"
						class="primary-btn"
						disabled={!selectedTopic}
						onclick={() => selectedTopic && chooseTopic(selectedTopic)}
					>
						Bring that into the room
					</button>
				</div>
			</div>
		{:else if inputMode === 'share'}
			<div class="control-card">
				<p class="prompt-line">{currentPrompt}</p>
				<UserInput
					value={userShareText}
					onValueChange={(next) => (userShareText = next)}
					onSubmit={() => void handleSubmitShare()}
					onPass={() => void handlePass()}
					disabled={crisisResponding}
					{crisisMode}
					listeningOnly={data.listeningOnly}
				/>
			</div>
		{:else if inputMode === 'reflection'}
			<div class="control-card">
				<p class="prompt-line">Meeting's over. You showed up.</p>
				{#if summaryText}
					<MeetingReflection summary={summaryText} />
				{/if}
				<div class="end-actions">
					<a class="primary-btn link-btn" href={resolve('/')}>New meeting</a>
				</div>
			</div>
		{:else}
			<div class="control-card waiting-card" aria-hidden="true"></div>
		{/if}
	</section>
</main>

<style>
	:global(body) {
		background:
			radial-gradient(circle at top, rgba(196, 127, 54, 0.14), transparent 28%),
			linear-gradient(180deg, #090d14 0%, #111827 50%, #090d14 100%);
	}

	.meeting-shell {
		max-width: 860px;
		margin: 0 auto;
		padding: 1rem 0.9rem 2rem;
		display: grid;
		gap: 0.9rem;
	}

	.circle-wrap,
	.transcript-wrap,
	.input-wrap,
	.control-card {
		border: 1px solid rgba(167, 139, 96, 0.22);
		border-radius: 1rem;
		background: rgba(11, 17, 26, 0.84);
		backdrop-filter: blur(12px);
	}

	.circle-wrap,
	.input-wrap,
	.control-card {
		padding: 0.9rem;
	}

	.transcript-wrap {
		padding: 0.55rem;
		min-height: 24rem;
	}

	.transcript-scroll {
		max-height: 55vh;
		overflow: auto;
		padding: 0.2rem;
	}

	.transcript-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.72rem;
	}

	.inline-system {
		list-style: none;
	}

	.action-line {
		list-style: none;
		padding: 0.1rem 0.2rem;
		color: #d9c7a1;
		font-style: italic;
		opacity: 0.9;
	}

	.action-line p {
		margin: 0;
	}

	.local-user-share {
		list-style: none;
		padding: 0.8rem;
		border-radius: 0.82rem;
		border: 1px solid rgba(255, 196, 112, 0.45);
		background: rgba(37, 28, 16, 0.6);
		color: #f9f4ea;
	}

	.local-user-share .speaker {
		margin: 0 0 0.35rem;
		font-size: 0.73rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #ffd59d;
	}

	.streaming-preview {
		list-style: none;
		padding: 0.8rem;
		border-radius: 0.82rem;
		border: 1px solid rgba(245, 199, 126, 0.36);
		background: rgba(20, 27, 39, 0.78);
		color: #f7f2e7;
	}

	.streaming-preview p {
		margin: 0;
	}

	.streaming-preview p + p {
		margin-top: 0.4rem;
		line-height: 1.55;
	}

	.prompt-line {
		margin: 0 0 0.75rem;
		font-size: 0.98rem;
		line-height: 1.5;
		color: #efe8da;
	}

	.thinking-line {
		display: inline-flex;
		gap: 0.32rem;
		padding: 0.2rem 0.15rem 0.6rem;
	}

	.thinking-line span {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 999px;
		background: rgba(245, 199, 126, 0.9);
		animation: room-pulse 1s infinite ease-in-out;
	}

	.thinking-line span:nth-child(2) {
		animation-delay: 0.12s;
	}

	.thinking-line span:nth-child(3) {
		animation-delay: 0.24s;
	}

	.crisis-card {
		margin-top: 0.8rem;
	}

	.resource-list {
		margin: 0;
		padding-left: 1.1rem;
		display: grid;
		gap: 0.35rem;
		color: #fef3c7;
		line-height: 1.45;
	}

	.primary-btn,
	.topic-btn,
	.link-btn {
		font: inherit;
	}

	.primary-btn,
	.link-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.9rem;
		padding: 0.7rem 1rem;
		border-radius: 0.78rem;
		border: 1px solid rgba(227, 179, 97, 0.55);
		background: rgba(148, 92, 27, 0.88);
		color: #fff7ea;
		font-weight: 700;
		cursor: pointer;
		text-decoration: none;
	}

	.topic-grid {
		display: grid;
		gap: 0.55rem;
	}

	.topic-btn {
		text-align: left;
		padding: 0.78rem 0.82rem;
		border-radius: 0.78rem;
		border: 1px solid rgba(131, 156, 198, 0.24);
		background: rgba(16, 24, 36, 0.95);
		color: #ebf1ff;
		cursor: pointer;
	}

	.topic-btn.selected {
		border-color: rgba(245, 199, 126, 0.58);
		background: rgba(57, 39, 16, 0.9);
		color: #fff7ea;
	}

	.topic-actions {
		margin-top: 0.8rem;
	}

	.topic-btn:hover,
	.primary-btn:hover,
	.link-btn:hover {
		filter: brightness(1.08);
	}

	.waiting-card {
		min-height: 3.9rem;
	}

	.end-actions {
		margin-top: 0.8rem;
	}

	@keyframes room-pulse {
		0%,
		80%,
		100% {
			transform: translateY(0);
			opacity: 0.42;
		}

		40% {
			transform: translateY(-0.12rem);
			opacity: 1;
		}
	}

	@media (min-width: 768px) {
		.meeting-shell {
			padding: 1.5rem 1.1rem 2.8rem;
		}

		.topic-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
