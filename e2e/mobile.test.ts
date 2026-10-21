// Phone behavior: mini player, full-screen Now Playing, home-screen install.
// Streams real audio, so it needs network access.
import { expect, test, type Page } from '@playwright/test';

const bar = (page: Page) => page.getByRole('region', { name: 'Audio player' });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Now playing' });

async function expectAdvancing(page: Page) {
	const seek = sheet(page).getByRole('slider', { name: 'Seek' });
	const start = Number(await seek.inputValue());
	await expect
		.poll(async () => Number(await seek.inputValue()), { timeout: 30_000 })
		.toBeGreaterThan(start);
}

test('Tune in sits above the fold', async ({ page }) => {
	await page.goto('/');
	const box = await page.getByRole('button', { name: 'Tune in' }).boundingBox();
	const height = page.viewportSize()!.height;
	expect(box).not.toBeNull();
	expect(box!.y + box!.height).toBeLessThan(height);
});

test('mini player opens Now Playing, and back closes it', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Tune in' }).click();

	// The mini player shows play/pause but keeps the seek bar for Now Playing.
	await expect(bar(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
	await expect(bar(page).getByRole('slider', { name: 'Seek' })).toBeHidden();

	await bar(page).getByRole('button', { name: 'Show player' }).click();
	await expect(sheet(page)).toBeVisible();
	await expect(sheet(page).getByRole('button', { name: 'Close player' })).toBeFocused();
	await expectAdvancing(page);

	await sheet(page).getByRole('button', { name: 'Pause', exact: true }).click();
	await sheet(page).getByRole('button', { name: 'Play', exact: true }).click();
	await expectAdvancing(page);

	// Like an app screen: the back gesture closes it and audio keeps going.
	await page.goBack();
	await expect(sheet(page)).toBeHidden();
	await expect(page).toHaveURL(/\/$/);
	await expect(bar(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('close button returns focus to the mini player', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Tune in' }).click();
	const open = bar(page).getByRole('button', { name: 'Show player' });
	await open.click();
	await sheet(page).getByRole('button', { name: 'Close player' }).click();
	await expect(sheet(page)).toBeHidden();
	await expect(open).toBeFocused();
});

test('asks iOS for a playback audio session on the first tap', async ({ page }) => {
	// Chrome has no navigator.audioSession; stand in for Safari's.
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' } });
	});
	await page.goto('/');
	await page.getByRole('button', { name: 'Tune in' }).click();
	await expect
		.poll(() =>
			page.evaluate(
				() => (navigator as unknown as { audioSession: { type: string } }).audioSession.type
			)
		)
		.toBe('playback');
});

test('can be added to the home screen as an app', async ({ page, request }) => {
	await page.goto('/');
	const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
	const manifest = await (await request.get(manifestHref!)).json();
	expect(manifest.display).toBe('standalone');
	expect(manifest.start_url).toBe('/');
	for (const icon of manifest.icons) {
		const res = await request.get(icon.src);
		expect(res.ok(), icon.src).toBe(true);
		expect(res.headers()['content-type']).toContain('image/png');
	}
	const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
	expect((await request.get(touchIcon!)).ok()).toBe(true);
	await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
		'content',
		/viewport-fit=cover/
	);
});
