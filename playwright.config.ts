import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	timeout: 90_000,
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
