# iPhone App Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deadpods.com behave like a simple podcast/radio app on iPhone: mini player, full-screen Now Playing, home-screen install, and a playback audio session.

**Architecture:** CSS turns the existing `PlayerBar` into a one-row mini player at 640px and below. A new `NowPlaying.svelte` sheet opens through SvelteKit shallow routing (`pushState`), so the back gesture closes it. A web manifest and icons make the home-screen web app look right. The player module claims a `playback` audio session on first play. Desktop is unchanged.

**Tech Stack:** SvelteKit 3, Svelte 5 runes, TypeScript, Playwright.

Spec: `docs/superpowers/specs/2026-10-21-iphone-app-design.md`

## Running tests locally

Playwright's bundled Chromium isn't downloaded on this machine, so local runs use the system Chrome through a temporary config. Delete the file afterwards; don't commit it.

```bash
cat > pw.local.tmp.config.ts <<'EOF'
import base from './playwright.config';
export default {
	...base,
	projects: base.projects!.map((p) => ({ ...p, use: { ...p.use, channel: 'chrome' } }))
};
EOF
npx playwright test -c pw.local.tmp.config.ts   # add a file name to filter
rm pw.local.tmp.config.ts
```

Always run `nvm use` first: the project needs Node 22.17+.

## File map

- Modify `playwright.config.ts`: add an `iphone` project that runs `e2e/mobile.test.ts`.
- Create `e2e/mobile.test.ts`: phone behavior tests.
- Modify `src/app.d.ts`: `App.PageState.nowPlaying`.
- Modify `src/lib/components/Icon.svelte`: add `chevron-down`.
- Modify `src/lib/components/PlayerBar.svelte`: mini layout, progress line, "Show player" button.
- Create `src/lib/components/NowPlaying.svelte`: the full-screen view.
- Modify `src/routes/+layout.svelte`: mount `NowPlaying`, head tags, header safe area.
- Modify `src/app.html`: `viewport-fit=cover`.
- Modify `src/app.css`: touch behavior for buttons.
- Modify `src/routes/+page.svelte`: tighter phone hero.
- Create `static/manifest.webmanifest`, `static/apple-touch-icon.png`, `static/icon-192.png`, `static/icon-512.png`, `static/icon-maskable-512.png`.
- Modify `src/lib/player/player.svelte.ts`: claim the audio session.

---

### Task 1: Phone test project and failing tests

**Files:**

- Modify: `playwright.config.ts`
- Create: `e2e/mobile.test.ts`

- [ ] **Step 1: Add the iphone project**

Replace the `projects` line in `playwright.config.ts` with:

```ts
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
```

- [ ] **Step 2: Write the phone tests**

Create `e2e/mobile.test.ts`:

```ts
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
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `npx playwright test -c pw.local.tmp.config.ts mobile` (see "Running tests locally").
Expected: "Tune in sits above the fold" may pass; the others FAIL (no "Show player" button, no `audioSession` change, no manifest link).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts e2e/mobile.test.ts
git commit -m "Add failing iPhone e2e tests"
```

### Task 2: Home-screen app metadata and icons

**Files:**

- Create: `static/manifest.webmanifest`, `static/apple-touch-icon.png`, `static/icon-192.png`, `static/icon-512.png`, `static/icon-maskable-512.png`
- Modify: `src/routes/+layout.svelte` (head, header padding)
- Modify: `src/app.html` (viewport)

- [ ] **Step 1: Generate the PNG icons from the favicon artwork**

One-off script, run from outside the repo (it's not committed). It renders `src/lib/assets/favicon.svg` on the page background. The regular icons fill 88% of the square; the maskable icon fills 64%, inside the safe zone that Android and iOS may crop to.

```js
// make-icons.mjs  (run: node make-icons.mjs /path/to/deadpods)
import { chromium } from '<repo>/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const repo = process.argv[2];
const svg = readFileSync(`${repo}/src/lib/assets/favicon.svg`, 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
for (const [file, size, fill] of [
	['apple-touch-icon.png', 180, 0.88],
	['icon-192.png', 192, 0.88],
	['icon-512.png', 512, 0.88],
	['icon-maskable-512.png', 512, 0.64]
]) {
	await p.setViewportSize({ width: size, height: size });
	await p.setContent(
		`<body style="margin:0;background:#13151a;display:grid;place-items:center;height:${size}px">` +
			`<div style="width:${size * fill}px;height:${size * fill}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`
	);
	await p.screenshot({ path: `${repo}/static/${file}`, omitBackground: false });
}
await b.close();
```

Check: `file static/*.png` reports the four PNGs at 180x180, 192x192, 512x512, 512x512.

- [ ] **Step 2: Write the manifest**

Create `static/manifest.webmanifest`:

```json
{
	"name": "deadpods",
	"short_name": "deadpods",
	"description": "Great podcasts that have ended, and their best episodes.",
	"start_url": "/",
	"scope": "/",
	"display": "standalone",
	"background_color": "#13151a",
	"theme_color": "#13151a",
	"icons": [
		{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
		{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
		{
			"src": "/icon-maskable-512.png",
			"sizes": "512x512",
			"type": "image/png",
			"purpose": "maskable"
		}
	]
}
```

- [ ] **Step 3: Head tags and safe area in the layout**

In `src/routes/+layout.svelte`, replace the `<svelte:head>` block with:

```svelte
<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#13151a" />
	<meta name="apple-mobile-web-app-title" content="deadpods" />
	<!-- Home-screen app: let the dark page run under the status bar. -->
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>
```

and in its `<style>`, change `.site-header`'s `padding-block: 18px;` to:

```css
/* Clear the status bar / notch in the home-screen app. */
padding-block: calc(18px + env(safe-area-inset-top, 0px)) 18px;
```

- [ ] **Step 4: Viewport**

In `src/app.html`, change the viewport meta to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

- [ ] **Step 5: Run the install test**

Run: `npx playwright test -c pw.local.tmp.config.ts mobile -g "home screen"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add static src/routes/+layout.svelte src/app.html
git commit -m "Add web app manifest, icons and safe-area layout"
```

### Task 3: Playback audio session

**Files:**

- Modify: `src/lib/player/player.svelte.ts` (`#start`)

- [ ] **Step 1: Claim the session in `#start()`**

`#start()` runs inside the user's tap for every play, so claiming the session there satisfies iOS. Add a method after `#start()`:

```ts
	/**
	 * iOS Safari 16.4+: declare a media "playback" audio session so audio keeps
	 * going with the screen locked, including in the home-screen app.
	 * Feature-detected; other browsers have no audioSession.
	 */
	#claimAudioSession() {
		const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
		if (!session || session.type === 'playback') return;
		try {
			session.type = 'playback';
		} catch {
			// Read-only or unsupported value: keep the default session.
		}
	}
```

and make the first line of `#start()` (before `const a = this.#el;`):

```ts
this.#claimAudioSession();
```

- [ ] **Step 2: Run the audio session test**

Run: `npx playwright test -c pw.local.tmp.config.ts mobile -g "audio session"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/player/player.svelte.ts
git commit -m "Claim a playback audio session on iOS"
```

### Task 4: Mini player

**Files:**

- Modify: `src/app.d.ts`
- Modify: `src/lib/components/Icon.svelte`
- Modify: `src/lib/components/PlayerBar.svelte`

- [ ] **Step 1: Page state type**

In `src/app.d.ts`, replace `// interface PageState {}` with:

```ts
interface PageState {
	/** The full-screen Now Playing view is open (phones). */
	nowPlaying?: boolean;
}
```

- [ ] **Step 2: Chevron icon**

In `src/lib/components/Icon.svelte`, add `| 'chevron-down'` to the `Name` union, and before `{/if}` add:

```svelte
	{:else if name === 'chevron-down'}
		<path d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4z" />
```

- [ ] **Step 3: Mini player markup**

In `src/lib/components/PlayerBar.svelte`:

Add to the script imports:

```ts
import { pushState } from '$app/navigation';
```

and after the `total` line:

```ts
const progress = $derived(total > 0 ? Math.min(1, shown / total) : 0);

/** Phones: open the full-screen player. Back (gesture or button) closes it. */
function showPlayer() {
	pushState('', { nowPlaying: true });
}
```

Right after the opening `<section class="bar" ...>` tag (before `<div class="inner wrap">`), add the progress line. `.bar` is `position: fixed`, so it anchors the line:

```svelte
<div class="progress" aria-hidden="true">
	<span style:transform={`scaleX(${progress})`}></span>
</div>
```

Wrap the `<a class="now" ...>...</a>` in a `<div class="now-wrap">` and add the button after the link, inside the wrapper:

```svelte
<!-- Phones: the whole now-playing area opens the full-screen player. -->
<button type="button" class="expand" aria-label="Show player" onclick={showPlayer}></button>
```

Add `mini` to the class list of the play/pause button (`class="ctl main mini"`) and the next button (`class="ctl mini"`).

- [ ] **Step 4: Mini player styles**

In the `<style>` block, change `.now { grid-area: now; ...` to `.now-wrap { grid-area: now; position: relative; min-width: 0; }` plus a `.now` rule without `grid-area`, and add:

```css
.progress,
.expand {
	display: none;
}
```

Replace the whole `@media (max-width: 640px)` block with:

```css
/* Phones: one-row mini player. Everything else lives in Now Playing. */
@media (max-width: 640px) {
	.bar {
		padding-top: 8px;
	}
	.inner {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'now controls';
	}
	.seek,
	.ctl:not(.mini) {
		display: none;
	}
	.ctl.main {
		width: 44px;
		height: 44px;
	}
	.progress {
		display: block;
		position: absolute;
		inset: 0 0 auto 0;
		height: 2px;
		background: var(--border);
	}
	.progress span {
		display: block;
		height: 100%;
		background: var(--accent);
		transform-origin: left;
	}
	.expand {
		display: block;
		position: absolute;
		inset: 0;
		border: none;
		background: none;
		border-radius: 8px;
	}
}
```

- [ ] **Step 5: Run the desktop tests (unchanged behavior)**

Run: `npx playwright test -c pw.local.tmp.config.ts player`
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app.d.ts src/lib/components/Icon.svelte src/lib/components/PlayerBar.svelte
git commit -m "Turn the player bar into a mini player on phones"
```

### Task 5: Now Playing view

**Files:**

- Create: `src/lib/components/NowPlaying.svelte`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/components/NowPlaying.svelte`:

```svelte
<script lang="ts">
	// Full-screen player for phones. Opened from the mini player with shallow
	// routing (page.state.nowPlaying), so the back gesture closes it.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { player } from '#lib/player/player.svelte.js';
	import { formatTime, spokenTime } from '#lib/time.js';

	let closeButton = $state<HTMLButtonElement | null>(null);
	let dragging = $state<number | null>(null);

	const track = $derived(player.track);
	const open = $derived(Boolean(page.state.nowPlaying) && track !== null);
	const shown = $derived(dragging ?? player.currentTime);
	const total = $derived(player.duration || track?.durationSec || 0);

	function close() {
		history.back();
	}

	// While open: focus the close button, stop the page behind from scrolling,
	// and hand focus back to whatever opened it.
	$effect(() => {
		if (!open) return;
		const opener = document.activeElement as HTMLElement | null;
		closeButton?.focus();
		const root = document.documentElement;
		const before = root.style.overflow;
		root.style.overflow = 'hidden';
		return () => {
			root.style.overflow = before;
			opener?.focus();
		};
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close();
	}}
/>

{#if open && track}
	<div class="np" role="dialog" aria-modal="true" aria-label="Now playing">
		<div class="top">
			<button
				type="button"
				class="ctl"
				aria-label="Close player"
				bind:this={closeButton}
				onclick={close}
			>
				<Icon name="chevron-down" size={30} />
			</button>
			<span class="label muted">{player.mode === 'radio' ? 'deadpods radio' : 'Now playing'}</span>
			<span class="ctl" aria-hidden="true"></span>
		</div>

		<div class="art">
			{#if track.artwork}
				<img src={track.artwork} alt="" width="600" height="600" />
			{/if}
		</div>

		<div class="meta">
			<a
				class="title"
				href={resolve('/[show]/[episode]', { show: track.showSlug, episode: track.episodeSlug })}
				>{track.title}</a
			>
			<span class="show muted">{track.showTitle}</span>
		</div>

		<div class="seek">
			<input
				type="range"
				min="0"
				max={Math.max(1, Math.floor(total))}
				step="1"
				value={Math.floor(shown)}
				aria-label="Seek"
				aria-valuetext={`${spokenTime(shown)} of ${spokenTime(total)}`}
				oninput={(e) => (dragging = Number(e.currentTarget.value))}
				onchange={(e) => {
					player.seek(Number(e.currentTarget.value));
					dragging = null;
				}}
			/>
			<div class="times" aria-hidden="true">
				<span>{formatTime(shown)}</span>
				<span>-{formatTime(Math.max(0, total - shown))}</span>
			</div>
		</div>

		<div class="row main-row">
			<button
				type="button"
				class="ctl big"
				aria-label="Back 15 seconds"
				onclick={() => player.skip(-15)}
			>
				<Icon name="back15" size={36} />
			</button>
			<button
				type="button"
				class="ctl play"
				aria-label={player.playing ? 'Pause' : 'Play'}
				onclick={() => player.toggle()}
			>
				{#if player.loading && player.playing}
					<Icon name="spinner" size={36} />
				{:else}
					<Icon name={player.playing ? 'pause' : 'play'} size={36} />
				{/if}
			</button>
			<button
				type="button"
				class="ctl big"
				aria-label="Forward 30 seconds"
				onclick={() => player.skip(30)}
			>
				<Icon name="fwd30" size={36} />
			</button>
		</div>

		<div class="row">
			<button type="button" class="ctl" aria-label="Previous" onclick={() => player.previous()}>
				<Icon name="prev" size={24} />
			</button>
			<button
				type="button"
				class="ctl rate"
				aria-label={`Playback speed ${player.rate}x`}
				onclick={() => player.cycleRate()}
			>
				{player.rate}×
			</button>
			<button
				type="button"
				class="ctl"
				aria-label="Next episode"
				disabled={!player.hasNext}
				onclick={() => player.next()}
			>
				<Icon name="next" size={24} />
			</button>
		</div>

		<!-- The player bar's status region already announces this to screen readers. -->
		<p class="message" aria-hidden="true">{player.message}</p>
	</div>
{/if}

<style>
	.np {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: calc(8px + env(safe-area-inset-top, 0px)) 24px
			calc(24px + env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
		overscroll-behavior: contain;
		background: linear-gradient(var(--surface-2), var(--bg) 60%);
		animation: rise 0.22s ease-out;
	}
	@keyframes rise {
		from {
			transform: translateY(12%);
			opacity: 0;
		}
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.label {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.art {
		flex: 1 1 auto;
		display: grid;
		place-items: center;
		min-height: 0;
	}
	.art img {
		width: min(100%, 46vh);
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 14px;
		box-shadow: 0 18px 50px rgb(0 0 0 / 0.5);
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.title {
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.25;
		color: var(--text);
		text-decoration: none;
	}
	.seek input {
		width: 100%;
		accent-color: var(--accent);
		height: 28px;
		margin: 0;
	}
	.times {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-around;
	}
	.ctl {
		display: grid;
		place-items: center;
		min-width: 48px;
		height: 48px;
		border: none;
		background: none;
		border-radius: 50%;
		color: var(--text);
	}
	.ctl:disabled {
		opacity: 0.4;
	}
	.big {
		width: 64px;
		height: 64px;
	}
	.play {
		width: 80px;
		height: 80px;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.rate {
		font-weight: 700;
		border-radius: 999px;
		padding-inline: 12px;
	}
	.message {
		margin: 0;
		min-height: 1.3em;
		text-align: center;
		font-size: 0.85rem;
		color: var(--accent-strong);
	}
</style>
```

- [ ] **Step 2: Mount it in the layout**

In `src/routes/+layout.svelte`, add the import:

```ts
import NowPlaying from '#lib/components/NowPlaying.svelte';
```

and after `<PlayerBar />`:

```svelte
<NowPlaying />
```

- [ ] **Step 3: Run the phone tests**

Run: `npx playwright test -c pw.local.tmp.config.ts mobile`
Expected: all PASS except possibly "Tune in sits above the fold" (Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/NowPlaying.svelte src/routes/+layout.svelte
git commit -m "Add full-screen Now Playing view for phones"
```

### Task 6: App feel and phone hero

**Files:**

- Modify: `src/app.css`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Touch behavior for buttons**

In `src/app.css`, extend the `button` rule:

```css
button {
	font: inherit;
	color: inherit;
	cursor: pointer;
	/* App-like taps: no double-tap zoom delay, no grey flash, no text selection. */
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
	-webkit-user-select: none;
	user-select: none;
}
```

- [ ] **Step 2: Tighter hero on phones**

In `src/routes/+page.svelte` `<style>`, add at the end:

```css
@media (max-width: 640px) {
	.hero {
		padding: 8px 0 36px;
	}
	.lede {
		font-size: 1rem;
		margin-bottom: 22px;
	}
}
```

- [ ] **Step 3: Full verification**

```bash
npm run check && npm run lint && npm test
npx playwright test -c pw.local.tmp.config.ts
```

Expected: 0 type errors, lint clean, 9 unit tests pass, 5 desktop + 5 phone e2e pass. Then screenshot `/` and the open Now Playing view at 390x844 and look at them.

- [ ] **Step 4: Commit**

```bash
git add src/app.css src/routes/+page.svelte
git commit -m "Phone polish: touch behavior and hero spacing"
```

## Manual check on a real iPhone (after deploy)

In Safari, and again after Share → Add to Home Screen:

1. Tap Tune in; audio plays. Tap the mini player; Now Playing opens. Swipe back; it closes.
2. Lock the screen; audio keeps playing. Lock-screen pause, play, skip and next work.
3. Seek to near the end of an episode, lock the screen, and wait: the next episode should start on its own. If it doesn't in the home-screen app, note the iOS version; the lock-screen next button is the fallback.
