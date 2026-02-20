import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('shows dual-path entry actions', async () => {
		render(Page);

		await expect
			.element(page.getByRole('heading', { name: /Need a meeting right now/i }))
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /Start as guest/i }))
			.toHaveAttribute('href', '/start/guest');
		await expect
			.element(page.getByRole('link', { name: /Create account/i }))
			.toHaveAttribute('href', '/signup');
	});
});
