import { expect, test, type Page } from '@playwright/test';

/**
 * The room runs itself: the opening ritual, the reading, and every introduction
 * play out without the user clicking anything. That makes these specs long by
 * nature, so they get a generous budget rather than a tighter script.
 */
const ROOM_LED_TIMEOUT_MS = 120_000;

const CHARACTER_NAMES: Record<string, string> = {
	marcus: 'Marcus',
	heather: 'Heather',
	meechie: 'Meechie',
	gemini: 'Gemini',
	gypsy: 'Gypsy',
	chrystal: 'Chrystal'
};

function phaseState(currentPhase: string, roundNumber?: number) {
	return {
		currentPhase,
		phaseStartedAt: '2026-02-19T00:00:01.000Z',
		roundNumber,
		charactersSpokenThisRound: [],
		userHasSharedInRound: false
	};
}

function sseResponseBody(input: {
	meetingId: string;
	characterId: string;
	sequenceOrder: number;
	shareId: string;
	content: string;
	currentPhase: string;
}): string {
	const character = {
		id: input.characterId,
		name: CHARACTER_NAMES[input.characterId] ?? 'Someone',
		avatar: '🧢'
	};
	const share = {
		id: input.shareId,
		meetingId: input.meetingId,
		characterId: input.characterId,
		isUserShare: false,
		content: input.content,
		interactionType: 'standard',
		significanceScore: 3,
		sequenceOrder: input.sequenceOrder,
		createdAt: '2026-02-19T00:00:00.000Z'
	};

	return [
		'event: meta',
		`data: ${JSON.stringify({ ok: true, value: { meetingId: input.meetingId, character, sequenceOrder: input.sequenceOrder } })}`,
		'',
		'event: chunk',
		`data: ${JSON.stringify({ ok: true, value: { index: 1, totalChunks: 1, chunk: input.content } })}`,
		'',
		'event: persisted',
		`data: ${JSON.stringify({
			ok: true,
			value: {
				share,
				callbacksUsed: [],
				phaseState: phaseState(input.currentPhase),
				character,
				callbackLifecycleWarnings: []
			}
		})}`,
		'',
		'event: done',
		`data: ${JSON.stringify({
			ok: true,
			value: {
				meetingId: input.meetingId,
				characterId: input.characterId,
				phaseState: phaseState(input.currentPhase)
			}
		})}`,
		'',
		''
	].join('\n');
}

function sseErrorResponseBody(message: string): string {
	return [
		'event: error',
		`data: ${JSON.stringify({ ok: false, error: { code: 'UNEXPECTED', message } })}`,
		'',
		''
	].join('\n');
}

async function stubCharacterShares(
	page: Page,
	meetingId?: string,
	options: { currentPhase?: string } = {}
) {
	let sequenceOrder = 0;
	const urlPattern = meetingId ? `**/meeting/${meetingId}/share*` : '**/meeting/*/share*';
	await page.route(urlPattern, async (route) => {
		const requestUrl = new URL(route.request().url());
		const currentMeetingId = meetingId ?? requestUrl.pathname.split('/')[2];
		const characterId = requestUrl.searchParams.get('characterId') ?? 'marcus';
		const name = CHARACTER_NAMES[characterId] ?? 'Someone';
		sequenceOrder += 1;
		await route.fulfill({
			status: 200,
			headers: { 'content-type': 'text/event-stream; charset=utf-8' },
			body: sseResponseBody({
				meetingId: currentMeetingId,
				characterId,
				sequenceOrder,
				shareId: `share-${sequenceOrder}`,
				content: `${name} speaks into the room.`,
				currentPhase: options.currentPhase ?? 'introductions'
			})
		});
	});
}

async function stubUserShare(
	page: Page,
	meetingId?: string,
	options: { crisis?: boolean; heavy?: boolean; currentPhase?: string } = {}
) {
	let userShareCount = 0;
	const urlPattern = meetingId ? `**/meeting/${meetingId}/user-share` : '**/meeting/*/user-share';
	await page.route(urlPattern, async (route) => {
		const requestUrl = new URL(route.request().url());
		const currentMeetingId = meetingId ?? requestUrl.pathname.split('/')[2];
		const body = route.request().postDataJSON() as { content?: string };
		userShareCount += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				value: {
					share: {
						id: `share-user-${userShareCount}`,
						meetingId: currentMeetingId,
						characterId: null,
						isUserShare: true,
						content: body?.content ?? '',
						interactionType: 'standard',
						significanceScore: options.crisis ? 10 : 5,
						sequenceOrder: 100 + userShareCount,
						createdAt: '2026-02-19T00:00:10.000Z'
					},
					crisis: options.crisis === true,
					heavy: options.heavy === true,
					phaseState: phaseState(options.currentPhase ?? 'topic_selection')
				}
			})
		});
	});
}

async function completeJoinFlow(
	page: Page,
	input: { userName: string; cleanTime: string; mood: string; mind: string; listeningOnly?: boolean }
): Promise<string> {
	await page.goto('/');

	// Step 1: Name
	await page.fill('#userName', input.userName);
	await page.click('button:has-text("Next")');

	// Step 2: Clean Time
	await page.fill('#cleanTime', input.cleanTime);
	await page.click('button:has-text("Next")');

	// Step 3: Mood
	await page.selectOption('#mood', input.mood);
	await page.click('button:has-text("Next")');

	// Step 4: Mind
	await page.fill('#mind', input.mind);
	if (input.listeningOnly) {
		await page.check('#listeningOnly');
	}

	await Promise.all([
		page.waitForURL(/\/meeting\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
		page.click('button:has-text("Join Meeting")')
	]);

	const currentUrl = new URL(page.url());
	expect(currentUrl.search).toBe(''); // Verify zero query parameters

	const meetingId = currentUrl.pathname.replace('/meeting/', '').split('/')[0];
	return meetingId;
}

test('the room opens itself and then waits for the newcomer to introduce', async ({ page }) => {
	test.setTimeout(ROOM_LED_TIMEOUT_MS);
	await stubCharacterShares(page);
	await stubUserShare(page);

	const meetingId = await completeJoinFlow(page, {
		userName: 'Tester',
		cleanTime: '7 days',
		mood: 'hopeful',
		mind: 'Staying present'
	});

	// Nobody has clicked anything: the ritual plays on its own.
	await expect(
		page.getByText("This chair stays empty for everyone who couldn't make it tonight.")
	).toBeVisible();
	await expect(page.getByText('Marcus speaks into the room.').first()).toBeVisible();
	await expect(page.getByText('— moment of silence —')).toBeVisible();
	await expect(page.getByText('Chrystal speaks into the room.').first()).toBeVisible();
	await expect(page.getByText('— introductions —')).toBeVisible();

	// The room settles and hands the floor over.
	const introduceButton = page.getByRole('button', { name: 'Introduce yourself' });
	await expect(introduceButton).toBeVisible({ timeout: ROOM_LED_TIMEOUT_MS });

	await introduceButton.click();

	// The introduction is persisted as a real share, not a local-only line.
	await expect(page.getByText("I'm Tester. I'm an addict. 7 days.")).toBeVisible();
	await expect(page.getByText('Hi Tester.')).toBeVisible();

	// Marcus responds, then the room asks what is on the table.
	await expect(page.getByText('Pick what is on the table tonight.')).toBeVisible({
		timeout: ROOM_LED_TIMEOUT_MS
	});
});

test('choosing a topic starts the round and the room stops for the user turn', async ({ page }) => {
	test.setTimeout(ROOM_LED_TIMEOUT_MS);
	await stubCharacterShares(page, undefined, { currentPhase: 'sharing_round_1' });
	await stubUserShare(page, undefined, { currentPhase: 'sharing_round_1' });

	await completeJoinFlow(page, {
		userName: 'Tester',
		cleanTime: '7 days',
		mood: 'steady',
		mind: 'Staying close'
	});

	await page.getByRole('button', { name: 'Introduce yourself' }).click({
		timeout: ROOM_LED_TIMEOUT_MS
	});

	const topic = 'Trusting yourself again';
	await page.getByRole('button', { name: topic }).click({ timeout: ROOM_LED_TIMEOUT_MS });
	await page.getByRole('button', { name: 'Bring that into the room' }).click();

	// Round one runs on its own, then the room turns to the user.
	const shareBox = page.getByLabel('Your share');
	await expect(shareBox).toBeVisible({ timeout: ROOM_LED_TIMEOUT_MS });
	await expect(page.getByText('What comes up for you?')).toBeVisible();

	await shareBox.fill('I am staying for today.');
	await page.getByRole('button', { name: 'Share', exact: true }).click();
	await expect(page.getByText('I am staying for today.')).toBeVisible();
});

test('a crisis disclosure stops the meeting and pins the resources', async ({ page }) => {
	test.setTimeout(ROOM_LED_TIMEOUT_MS);
	await stubCharacterShares(page, undefined, { currentPhase: 'sharing_round_1' });
	await stubUserShare(page, undefined, {
		crisis: true,
		heavy: true,
		currentPhase: 'crisis_mode'
	});

	await page.route('**/meeting/*/crisis', async (route) => {
		const requestUrl = new URL(route.request().url());
		const currentMeetingId = requestUrl.pathname.split('/')[2];
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				value: {
					shares: [
						{
							id: 'share-marcus-crisis',
							meetingId: currentMeetingId,
							characterId: 'marcus',
							isUserShare: false,
							content: "I'm right here with you.",
							interactionType: 'standard',
							significanceScore: 10,
							sequenceOrder: 200,
							createdAt: '2026-02-19T00:00:01.000Z'
						},
						{
							id: 'share-heather-crisis',
							meetingId: currentMeetingId,
							characterId: 'heather',
							isUserShare: false,
							content: 'You matter and we are staying with you.',
							interactionType: 'standard',
							significanceScore: 10,
							sequenceOrder: 201,
							createdAt: '2026-02-19T00:00:02.000Z'
						}
					],
					phaseState: phaseState('crisis_mode'),
					resources: {
						sticky: true,
						title: "If you're in crisis",
						lines: [
							'988 - Suicide & Crisis Lifeline',
							'1-800-662-4357 - SAMHSA National Helpline',
							'You can stay here with us.'
						]
					}
				}
			})
		});
	});

	await completeJoinFlow(page, {
		userName: 'Tester',
		cleanTime: '7 days',
		mood: 'anxious',
		mind: 'Trying to hang on'
	});

	await page.getByRole('button', { name: 'Introduce yourself' }).click({
		timeout: ROOM_LED_TIMEOUT_MS
	});

	await expect(page.getByText('The meeting stopped. Stay with the room.')).toBeVisible({
		timeout: ROOM_LED_TIMEOUT_MS
	});
	await expect(page.getByText("If you're in crisis")).toBeVisible();
	await expect(page.getByText('988 - Suicide & Crisis Lifeline')).toBeVisible();
	await expect(page.getByText("I'm right here with you.")).toBeVisible();
	await expect(page.getByText('You matter and we are staying with you.')).toBeVisible();
});

test('a failed share stream surfaces the error instead of stalling silently', async ({ page }) => {
	test.setTimeout(ROOM_LED_TIMEOUT_MS);
	await page.route('**/meeting/*/share*', async (route) => {
		await route.fulfill({
			status: 200,
			headers: { 'content-type': 'text/event-stream; charset=utf-8' },
			body: sseErrorResponseBody('temporary room glitch')
		});
	});

	await completeJoinFlow(page, {
		userName: 'Tester',
		cleanTime: '7 days',
		mood: 'tired',
		mind: 'Just getting through today'
	});

	await expect(page.getByText('temporary room glitch')).toBeVisible({
		timeout: ROOM_LED_TIMEOUT_MS
	});
});

test('cross-session ownership isolation: clean URL refresh works and second context receives 404', async ({
	browser,
	page
}) => {
	test.setTimeout(ROOM_LED_TIMEOUT_MS);
	await stubCharacterShares(page);
	await stubUserShare(page);

	const meetingId = await completeJoinFlow(page, {
		userName: 'Tester',
		cleanTime: '7 days',
		mood: 'hopeful',
		mind: 'Staying present'
	});

	// Refresh the clean URL: displayed meeting state is preserved
	await page.reload();
	await expect(page).toHaveURL(`/meeting/${meetingId}`);
	expect(new URL(page.url()).search).toBe('');
	await expect(
		page.getByText("This chair stays empty for everyone who couldn't make it tonight.")
	).toBeVisible();

	// Second independent browser context has no session cookies for owner
	const secondContext = await browser.newContext();
	const secondPage = await secondContext.newPage();

	const response = await secondPage.goto(`/meeting/${meetingId}`);
	expect(response?.status()).toBe(404);

	// Child endpoint (/share) in second context receives 404 JSON
	const apiResponse = await secondPage.request.get(`/meeting/${meetingId}/share`);
	expect(apiResponse.status()).toBe(404);

	await secondContext.close();
});
