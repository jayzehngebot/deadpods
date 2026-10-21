# deadpods on iPhone: behave like a simple podcast/radio app

Date: 2026-10-21. Status: approved (user delegated decisions).

## Goal

On an iPhone, deadpods.com should feel like a small podcast/radio app: one tap
starts the radio, a mini player sits at the bottom, tapping it opens a
full-screen Now Playing view, and the site can live on the home screen with
its own icon. Desktop behavior stays as it is.

## Constraints that shape the design

- **iOS 26 opens every home-screen site as a web app by default** ("Open as Web
  App" toggle, on by default). So users who add deadpods get standalone mode
  whatever we do. We must make standalone look right and play as reliably as
  we can.
- **Standalone audio on iOS is still fragile.** Reports through iOS 26.2 show
  audio breaking after first use and stopping on screen lock in home-screen
  apps, while Safari tabs keep playing. Mitigation: declare a playback audio
  session (`navigator.audioSession.type = 'playback'`) on the first tap. Lock-
  screen auto-advance in standalone needs a real-device test; the lock-screen
  "next track" control already exists as the fallback.
- **No offline audio.** Podcast hosts don't send CORS headers, so a service
  worker can't cache audio. No service worker in this change.
- The audio player module and its rules (play() synchronously in taps, one
  reused `<audio>`, no Web Audio, no crossOrigin) are unchanged.

## Design

### 1. Home-screen app metadata

- `static/manifest.webmanifest`: name "deadpods", short_name "deadpods",
  start_url `/`, scope `/`, display `standalone`, theme and background
  `#13151a`, icons 192 and 512 PNG plus a 512 maskable.
- `static/apple-touch-icon.png` (180x180), generated from the existing
  favicon artwork with an opaque background.
- In the layout head: manifest link, apple-touch-icon link,
  `apple-mobile-web-app-title` "deadpods", and
  `apple-mobile-web-app-status-bar-style` `black-translucent` so the dark
  theme runs under the status bar.
- Viewport gains `viewport-fit=cover`; the header pads by
  `env(safe-area-inset-top)` and the player already pads the bottom inset.

### 2. Mini player (phones, up to 640px wide)

The existing player bar becomes a one-row mini player on narrow screens:
artwork, title and show (one line each), play/pause, next. A 2px progress
line runs along its top edge. Tapping the artwork/title area opens Now
Playing (on desktop the same area still links to the episode page). The
seek row, skip buttons and speed are hidden in the mini player; they live in
Now Playing.

### 3. Now Playing view (phones)

A full-screen sheet (new `NowPlaying.svelte`), opened from the mini player:

- Close button (chevron down) at top; Escape also closes.
- Large artwork, episode title (links to the episode page), show name,
  "Radio" tag in radio mode.
- Seek slider with elapsed and total time.
- Main row: back 15, play/pause (large), forward 30.
- Second row: previous, playback speed, next.
- The status message line from the player.

It opens with SvelteKit shallow routing (`pushState` with
`{ nowPlaying: true }`), so the iOS back swipe and the browser back button
close it, like an app screen. Navigating to another page closes it.
It uses `role="dialog"` with `aria-modal`, moves focus to the close button on
open and returns it to the mini player on close, and locks page scroll
while open.

### 4. App feel

- Buttons: `touch-action: manipulation` (no double-tap zoom delay), no tap
  highlight, no text selection on controls.
- Phone hero: smaller padding and heading so "Tune in" sits above the fold on
  a 390x844 screen.

### 5. Audio session

In the player, on the first user-initiated play, set
`navigator.audioSession.type = 'playback'` when the API exists. Feature-
detected; no effect elsewhere.

## Out of scope

Service worker / offline, push notifications, bottom tab bar, a native
wrapper (Capacitor), lock-screen loop workaround (revisit after device test).

## Testing

- New Playwright project emulating an iPhone viewport in Chrome (touch,
  mobile): Tune in shows the mini player; tapping it opens Now Playing;
  pause/play and seek work there; back closes the sheet and audio keeps
  playing; the page navigation keeps playing.
- Existing desktop e2e and unit tests keep passing; type check and lint.
- Check the manifest and icons are served and pass the CSP.
- Manual: on a real iPhone, in Safari and as a home-screen app: play, lock
  the screen, let an episode end, use lock-screen controls.
