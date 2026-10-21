import type { Page } from '@playwright/test';

/**
 * Go to a page and wait until it is interactive. The prerendered HTML shows
 * buttons before the app's JavaScript starts, so a tap right after the load
 * event can be lost. The layout sets `data-hydrated` once buttons work.
 */
export async function open(page: Page, url: string) {
	await page.goto(url);
	await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
}
