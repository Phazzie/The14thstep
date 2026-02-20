import { expect, test } from '@playwright/test';

test('home page has guest and account entry points', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: 'Start as guest' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
});
