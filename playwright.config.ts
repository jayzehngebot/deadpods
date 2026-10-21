import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	timeout: 90_000,
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	projects: [
		{
			name: 'chromium',
			testIgnore: /mobile\.test/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			// iPhone screen, touch and user agent, run in Chromium (Playwright's
			// WebKit is not iOS Safari either; real-device checks are manual).
			name: 'iphone',
			testMatch: /mobile\.test/,
			use: { ...devices['iPhone 15'], defaultBrowserType: 'chromium' }
		}
	],
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
