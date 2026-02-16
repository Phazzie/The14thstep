import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders setup form fields', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1, name: 'Start a Recovery Meeting' });
		const topic = page.getByLabelText('Topic');
		const mood = page.getByLabelText('Mood');
		const userId = page.getByLabelText('User ID (optional)');
		const listeningOnly = page.getByLabelText('Listening only');
		const submit = page.getByRole('button', { name: 'Join Meeting' });

		await expect.element(heading).toBeInTheDocument();
		await expect.element(topic).toBeInTheDocument();
		await expect.element(mood).toBeInTheDocument();
		await expect.element(userId).toBeInTheDocument();
		await expect.element(listeningOnly).toBeInTheDocument();
		await expect.element(submit).toBeInTheDocument();
	});
});
