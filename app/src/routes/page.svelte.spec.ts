import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders setup flow step 1', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1, name: 'The 14th Step' });
		const name = page.getByLabelText('Name');
		const next = page.getByRole('button', { name: 'Next' });

		await expect.element(heading).toBeInTheDocument();
		await expect.element(name).toBeInTheDocument();
		await expect.element(next).toBeInTheDocument();
	});
});
