import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders two entry options', async () => {
		render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1, name: 'The 14th Step' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Start one-time meeting now' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Create account to save progress' }))
			.toBeVisible();
	});

	it('shows guest form when one-time mode selected', async () => {
		render(Page);

		await page.getByRole('button', { name: 'Start one-time meeting now' }).click();
		await expect
			.element(page.getByRole('heading', { level: 2, name: 'One-time meeting (no account)' }))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Enter the room' })).toBeVisible();
	});
});
