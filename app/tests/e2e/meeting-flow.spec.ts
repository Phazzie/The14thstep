import { expect, test } from '@playwright/test';

function sseResponseBody(meetingId: string) {
	return [
		'event: meta',
		`data: ${JSON.stringify({
			ok: true,
			value: {
				meetingId,
				character: {
					id: 'marcus',
					name: 'Marcus',
					avatar: '🧢'
				},
				sequenceOrder: 0
			}
		})}`,
		'',
		'event: chunk',
		`data: ${JSON.stringify({
			ok: true,
			value: {
				index: 1,
				totalChunks: 1,
				chunk: 'Marcus from SSE stream.'
			}
		})}`,
		'',
		'event: persisted',
		`data: ${JSON.stringify({
			ok: true,
			value: {
				share: {
					id: 'share-1',
					meetingId,
					characterId: 'marcus',
					isUserShare: false,
					content: 'Marcus from SSE stream.',
					significanceScore: 3,
					sequenceOrder: 0,
					createdAt: '2026-02-19T00:00:00.000Z'
				},
				callbacksUsed: [],
				character: {
					id: 'marcus',
					name: 'Marcus',
					color: '#ef4444'
				},
				callbackLifecycleWarnings: []
			}
		})}`,
		'',
		'event: done',
		`data: ${JSON.stringify({
			ok: true,
			value: {
				meetingId,
				characterId: 'marcus'
			}
		})}`,
		'',
		''
	].join('\n');
}

test('meeting browser flow: share generation, user share, and close reflection', async ({
	page
}) => {
	const meetingId = 'e2e-normal';

	await page.route(`**/meeting/${meetingId}/share*`, async (route) => {
		await route.fulfill({
			status: 200,
			headers: { 'content-type': 'text/event-stream; charset=utf-8' },
			body: sseResponseBody(meetingId)
		});
	});

	await page.route(`**/meeting/${meetingId}/user-share`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				value: {
					share: {
						id: 'share-user-1',
						meetingId,
						characterId: null,
						isUserShare: true,
						content: 'I am staying for today.',
						significanceScore: 5,
						sequenceOrder: 1,
						createdAt: '2026-02-19T00:00:10.000Z'
					},
					crisis: false,
					heavy: false
				}
			})
		});
	});

	await page.route(`**/meeting/${meetingId}/close`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				value: {
					meetingId,
					summary: 'You stayed grounded and connected with the room tonight.'
				}
			})
		});
	});

	await page.goto(
		`/meeting/${meetingId}?name=Tester&cleanTime=7%20days&mood=hopeful&mind=Staying%20present`
	);
	await expect(page.getByRole('heading', { name: 'Meeting Room' })).toBeVisible();

	await expect(page.getByText('Marcus from SSE stream.')).toBeVisible();

	await page.getByLabel('Your Share').fill('I am staying for today.');
	await page.getByRole('button', { name: 'Submit Share' }).click();
	await expect(page.getByText('Your share was saved.')).toBeVisible();

	await page.getByRole('button', { name: 'Close Meeting' }).click();
	await expect(page.getByRole('heading', { name: 'Meeting Reflection' })).toBeVisible();
	await expect(
		page.getByText('You stayed grounded and connected with the room tonight.')
	).toBeVisible();
});

test('meeting browser flow: crisis mode switches UI and renders sticky resources', async ({
	page
}) => {
	const meetingId = 'e2e-crisis';

	await page.route(`**/meeting/${meetingId}/user-share`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				value: {
					share: {
						id: 'share-user-crisis',
						meetingId,
						characterId: null,
						isUserShare: true,
						content: 'I want to die tonight.',
						significanceScore: 10,
						sequenceOrder: 0,
						createdAt: '2026-02-19T00:00:00.000Z'
					},
					crisis: true,
					heavy: true
				}
			})
		});
	});

	await page.route(`**/meeting/${meetingId}/crisis`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				value: {
					shares: [
						{
							id: 'share-marcus',
							meetingId,
							characterId: 'marcus',
							isUserShare: false,
							content: "I'm right here with you.",
							significanceScore: 10,
							sequenceOrder: 1,
							createdAt: '2026-02-19T00:00:01.000Z'
						},
						{
							id: 'share-heather',
							meetingId,
							characterId: 'heather',
							isUserShare: false,
							content: 'You matter and we are staying with you.',
							significanceScore: 10,
							sequenceOrder: 2,
							createdAt: '2026-02-19T00:00:02.000Z'
						}
					],
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

	await page.goto(
		`/meeting/${meetingId}?name=Tester&cleanTime=7%20days&mood=anxious&mind=Trying%20to%20hang%20on`
	);
	await page.getByLabel('Your Share').fill('I want to die tonight.');
	await page.getByRole('button', { name: 'Submit Share' }).click();

	await expect(page.getByText("If you're in crisis")).toBeVisible();
	await expect(page.getByText('988 - Suicide & Crisis Lifeline')).toBeVisible();
	await expect(page.getByText("I'm right here with you.")).toBeVisible();
	await expect(page.getByText('You matter and we are staying with you.')).toBeVisible();
});
