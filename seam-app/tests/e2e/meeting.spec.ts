import { expect, test } from '@playwright/test';

test('a stranger signs in, sits through the meeting, and leaves with a signed slip', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

	await page.goto('/');
	await page.getByRole('button', { name: /sign in/i }).click();
	await expect(page.getByRole('alert')).toContainText('The secretary needs');

	await page.fill('#name', 'Dana');
	await page.fill('#clean', '19 days');
	await page.getByText('restless', { exact: true }).click();
	await page.fill('#mind', 'My brother said he would call.');
	await page.getByRole('button', { name: /sign in/i }).click();

	await expect(page.getByRole('heading', { name: 'Minutes' })).toBeVisible();
	await page.getByRole('button', { name: 'Say it' }).click();
	await page.getByText('Trusting yourself again').click();
	await page.getByRole('button', { name: 'Hand it back' }).click();
	await page.fill('#say', 'I keep checking my phone for him.');
	await page.getByRole('button', { name: 'Share it' }).click();

	// Refresh mid-meeting: nothing is lost or repeated.
	await page.getByRole('button', { name: 'Pass' }).waitFor();
	const before = await page.locator('.log > li').count();
	await page.reload();
	await page.getByRole('button', { name: 'Pass' }).waitFor();
	expect(await page.locator('.log > li').count()).toBe(before);

	await page.fill('#say', 'Some nights I think about ending it.');
	await page.getByRole('button', { name: 'Share it' }).click();
	await expect(page.getByText('call or text 988')).toBeVisible();
	await expect(page.getByRole('link', { name: /988/ }).first()).toHaveAttribute('href', 'tel:988');

	await page.getByRole('button', { name: 'Pass' }).click();
	await expect(page.getByRole('button', { name: 'Print the slip' })).toBeVisible({ timeout: 90_000 });
	await expect(page.getByText('This certifies that')).toBeVisible();

	await page.getByRole('button', { name: 'Take a fresh slip' }).click();
	await expect(page.getByRole('heading', { name: 'Proof of Attendance' })).toBeVisible();
	await expect(page.getByText('is still in your pocket')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('listening only runs the whole meeting with no input', async ({ page }) => {
	await page.goto('/');
	await page.fill('#name', 'Lee');
	await page.fill('#clean', 'none');
	await page.getByText('numb', { exact: true }).click();
	await page.fill('#mind', 'Just want noise in the room.');
	await page.getByText('Listening only.').click();
	await page.getByRole('button', { name: /sign in/i }).click();
	await expect(page.getByRole('button', { name: 'Print the slip' })).toBeVisible({ timeout: 120_000 });
});

test('the phone list, fine print and a wrong door all render', async ({ page }) => {
	await page.goto('/phone-list');
	await expect(page.getByRole('link', { name: /911/ })).toHaveAttribute('href', 'tel:911');
	await page.goto('/fine-print');
	await expect(page.getByRole('heading', { name: 'Fine print' })).toBeVisible();
	const res = await page.goto('/no-such-door');
	expect(res?.status()).toBe(404);
	await expect(page.getByText('No meeting at this address.')).toBeVisible();
});

test('the share endpoint rejects junk and plays the tape without a key', async ({ request }) => {
	expect((await request.post('/api/share', { data: { speakerId: 'x' } })).status()).toBe(400);
	const ok = await request.post('/api/share', {
		data: { speakerId: 'meechie', slot: 'round', topic: null, userName: 'Dana', userMood: 'numb', n: 1, recent: [] }
	});
	expect(ok.status()).toBe(200);
	expect(await ok.json()).toMatchObject({ source: 'tape' });
});
