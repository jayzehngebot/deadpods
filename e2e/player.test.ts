// End-to-end checks for the player's core promises. These stream real audio
// from the podcasts' hosts, so they need network access.
import { expect, test, type Page } from '@playwright/test';

const bar = (page: Page) => page.getByRole('region', { name: 'Audio player' });
const seek = (page: Page) => bar(page).getByRole('slider', { name: 'Seek' });
const position = async (page: Page) => Number(await seek(page).inputValue());
const nowTitle = (page: Page) => bar(page).locator('.title');

async function expectPlaying(page: Page) {
	await expect(bar(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
	const start = await position(page);
	await expect.poll(() => position(page), { timeout: 30_000 }).toBeGreaterThan(start);
}

test('one tap starts radio, and it keeps playing across page changes', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Tune in' }).click();
	await expectPlaying(page);
	const title = await nowTitle(page).textContent();
	const before = await position(page);

	// Navigate to a show page, then an about page, without a full reload.
	await page.getByRole('link', { name: 'Mystery Show' }).first().click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mystery Show' })).toBeVisible();
	await page.getByRole('link', { name: 'About' }).first().click();
	await expect(page.getByRole('heading', { level: 1, name: 'About deadpods' })).toBeVisible();

	await expect(nowTitle(page)).toHaveText(title ?? '');
	await expectPlaying(page);
	expect(await position(page)).toBeGreaterThanOrEqual(before);
});

test('moves on to the next episode when one ends', async ({ page }) => {
	await page.goto('/mystery-show/');
	await page.getByRole('button', { name: 'Play the best of' }).click();
	await expectPlaying(page);
	await expect(nowTitle(page)).toHaveText('Case #3 Belt Buckle');

	// Jump to 3 seconds before the end.
	const max = Number(await seek(page).getAttribute('max'));
	await seek(page).fill(String(max - 3));
	await seek(page).dispatchEvent('change');

	await expect(nowTitle(page)).toHaveText('Case #2 Britney', { timeout: 30_000 });
	await expectPlaying(page);
});

test('skips an episode whose audio is gone', async ({ page }) => {
	// Make the first Mystery Show pick fail as if its audio had been deleted.
	await page.route('**/GLT1666362563.mp3*', (route) => route.fulfill({ status: 404 }));
	await page.goto('/mystery-show/');
	await page.getByRole('button', { name: 'Play the best of' }).click();

	await expect(bar(page).getByRole('status')).toContainText('Skipped');
	await expect(nowTitle(page)).toHaveText('Case #2 Britney');
	await expectPlaying(page);
});

test('a shared link offers to start at the shared time', async ({ page }) => {
	await page.goto('/mystery-show/case-3-belt-buckle/?t=12m34s');
	const play = page.getByRole('button', { name: 'Play from 12:34' });
	await expect(play).toBeVisible();
	await play.click();
	await expectPlaying(page);
	expect(await position(page)).toBeGreaterThanOrEqual(754);
});

test('remembers where you were after a reload', async ({ page }) => {
	await page.goto('/mystery-show/case-1-video-store/?t=300');
	await page.getByRole('button', { name: 'Play from 5:00' }).click();
	await expectPlaying(page);
	await bar(page).getByRole('button', { name: 'Pause', exact: true }).click();
	const pausedAt = await position(page);

	await page.reload();
	await expect(nowTitle(page)).toHaveText('Case #1 Video Store');
	expect(Math.abs((await position(page)) - pausedAt)).toBeLessThanOrEqual(2);
	await bar(page).getByRole('button', { name: 'Play', exact: true }).click();
	await expectPlaying(page);
	expect(await position(page)).toBeGreaterThanOrEqual(pausedAt);
});
