import { expect, test } from '@playwright/test';

test('guest can start one-time meeting without account', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Start one-time meeting now' }).click();
	await page.getByLabel('What should the room call you?').fill('Rico');
	await page.getByLabel('How are you showing up today?').fill('On edge');
	await page.getByRole('button', { name: 'Enter the room' }).click();

	await expect(page.getByText('Meeting live.')).toBeVisible();
	await expect(page.getByText('Topic: Keeping your head straight today')).toBeVisible();
});
