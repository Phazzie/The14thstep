import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	workers: 1,
	timeout: 180_000,
	use: { baseURL: 'http://127.0.0.1:4173', reducedMotion: 'reduce', serviceWorkers: 'block' },
	webServer: {
		command: 'npm run build && npx vite preview --port 4173 --host 127.0.0.1',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		env: { XAI_API_KEY: '' }
	}
});
