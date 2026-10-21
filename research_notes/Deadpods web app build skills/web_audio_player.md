# Web-native podcast player in an Astro static/islands site (2026)

Scope: deadpods.com is an Astro static site listing ended podcasts and their best episodes. It should work as a barebones, easy-to-share podcast player, and (per the project owner) its core goal is to **auto-play great retired podcasts** in a lean-back, radio-like way. Audio is third-party MP3s from podcast enclosure URLs, which often go through tracking-prefix redirects. Research date: 2026-10-20. Notes marked "Inference" are my own reasoning; anything I couldn't find a source for is listed under Gaps.

---

## 1. HTML5 `<audio>` fundamentals for long-form audio (preload, seeking, buffering, range requests, playbackRate, errors, redirects)

### Takeaway

A single long-lived `<audio>` element (or `new Audio()`) playing the enclosure URL directly is the right primitive. It needs no CORS, follows redirects natively, and gives you `playbackRate`, `seekable` and `buffered`. Use `preload="metadata"` or `"none"`, handle the `play()` promise, and treat `error` / `networkState` as the dead-link signal. Ended podcasts are especially likely to have dead or redirected hosts.

### Cited Findings

- Media fragments syntax `#t=[start][,end]`, in seconds or `hh:mm:ss`. For example `#t=60` starts at 60 s, and `#t=10,20` plays 10–20 s. — [MDN: Audio and video delivery](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- `seekable.start(0)` / `seekable.end(0)` give the seekable range, setting `currentTime` seeks, and `played` gives the played ranges. The `buffered` ranges are covered in MDN's separate "Media buffering, seeking, and time ranges" guide. — [MDN: Audio and video delivery](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- Errors from `<source>` children fire on each failed `<source>`, not on the media element. When `networkState === NETWORK_NO_SOURCE`, all sources failed. — [MDN: Audio and video delivery](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- "The `preload` attribute may be ignored by some mobile browsers", and `autoplay` may be ignored too. — [MDN: Audio and video delivery](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- Preload on iOS: a 2013 analysis said mobile ignores all preload values ([Steve Souders](https://www.stevesouders.com/blog/2013/04/21/html5-video-bytes-on-ios)). A later WebKit post says Safari has honored `preload="metadata"` since iOS 8 ([MacStories quoting Jer Noble/WebKit](https://www.macstories.net/?p=44114)). A Discourse report says `preload="metadata"` let audio play on the first tap in iOS Safari, while `preload="none"` needed extra taps ([meta.discourse.org](https://meta.discourse.org/t/secure-media-audio-does-not-play-on-safari-on-the-first-click/156124?tl=he)).
- Gotcha: MP4/M4A files with the `moov` atom at the end fail on iPhone under `preload="metadata"`, because only the start of the file is fetched, but they work on desktop. — [dev.to](https://dev.to/dexterlung/audio-plays-on-desktop-but-not-on-iphone-ipad-the-culprit-is-the-mp4-moov-atom-1j01)
- `playbackRate` has been supported in all engines for a long time (Chrome 3, Safari 3.1, iOS 3, Firefox 20). `preservesPitch` (keeps voices from going "chipmunk" at 1.5x/2x) is in Chrome 86, Firefox 101 and Safari/iOS 17.2. — [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json) (queried 2026-10-20)
- Tracking prefixes work through HTTP redirects. "Any request for an audio file goes to their servers first, before redirecting back." — [iono.fm](https://support.iono.fm/docs/podcast-trackers). PRX/Dovetail recommends four or fewer chained prefixes because Apple limits how many prefix redirects it follows. — [PRX help](https://help.prx.org/hc/en-us/articles/30939698275611-How-to-add-and-remove-enclosure-prefix-URLS-in-Dovetail). If a tracking service goes down, media downloads can break. — [microfeed docs](https://mintlify.com/microfeed/microfeed/configuration/tracking-urls)
- A Perch user's tracked enclosure failed iTunes validation even though it resolved, and using the resolved final URL fixed it. — [Perch forum](https://forum.grabaperch.com/forum/02-21-2018-podcast-tracked-url-not-valid-for-itunes-store)

### Inferences

- Plain `<audio src>` follows 30x chains transparently, and no CORS is needed for playback (see section 2). So prefix chains mostly cost latency, not correctness. A dead prefix service, though, kills playback. **Build-time step:** resolve each enclosure (HEAD/GET with `Range: bytes=0-1`, following redirects), record the final status, `Accept-Ranges`, `Content-Length`, `Content-Type` and final URL, and keep both the original URL and the resolved URL. At runtime, play the original first (it keeps the shows' analytics honest) and fall back to the resolved URL on `error`. Flag 404s in the build. Ended shows rot.
- Range requests: seeking into an un-buffered part of a long MP3 depends on the server answering `Range` with `206 Partial Content`. If a host returns `200` and ignores Range, browsers generally can only seek within what has already downloaded (`seekable` may cover only buffered ranges). Seeking can then jump back to 0, or wait for a full download. The build-time probe above can detect this and mark the episode "seek may be slow". _(General HTTP/media behavior; I didn't fetch a primary source this session. Verify on a host that returns 200.)_
- Use `preload="none"` for the many list items on a page (saves data). Use `"metadata"` only on the single active player element. Never put an `<audio>` per episode on list pages; render play buttons that feed one shared element.
- `MediaError.code` values (1 aborted, 2 network, 3 decode, 4 src not supported) are what to switch on. Code 4 usually means a 404 or an HTML error page served instead of audio.

### Gaps

- No primary source fetched on exact Chrome/Safari/Firefox behavior when a server ignores Range for MP3 (whether `seekable` is limited to `buffered`). Needs a device test.
- Whether any major tracking prefixes (Podtrac, etc.) break Range or HEAD requests: no source found.

---

## 2. Do you need the Web Audio API? CORS implications

### Takeaway

No. Plain `<audio>` playback of cross-origin MP3s works without CORS. Web Audio (`createMediaElementSource`) for visualizers or EQ requires the audio host to send `Access-Control-Allow-Origin`, which podcast hosts and redirect prefixes often don't. Without it the node outputs **silence**, which breaks playback outright. Avoid Web Audio for third-party enclosures.

### Cited Findings

- Chrome logs "MediaElementAudioSource outputs zeroes due to CORS access restrictions". Firefox: "The HTMLMediaElement passed to createMediaElementSource has a cross-origin resource, the node will output silence." — [Chromium source](https://crrev.com/93d25b7e2449ca6fd7b1c3dc003f5bfce1495559/third_party/blink/renderer/modules/webaudio/media_element_audio_source_node.h); [Mozilla bug 1441153](https://bugzilla.mozilla.org/show_bug.cgi?id=1441153); [wavesurfer.js #2014](https://github.com/katspaugh/wavesurfer.js/issues/2014)
- The fix needs `crossOrigin="anonymous"` on the element **and** an `Access-Control-Allow-Origin` header from the media server. When the server doesn't send it, the request is blocked. — [wavesurfer.js #2014](https://github.com/katspaugh/wavesurfer.js/issues/2014); [Lightrun summary of wavesurfer CORS](https://lightrun.com/answers/katspaugh-wavesurfer-js-cors-audio-loading)
- iOS 26 home-screen PWAs: reports that Web Audio works only on first run and `AudioContext.resume()` never resolves. — [WebKit bug 198277 comments](https://bugs.webkit.org/show_bug.cgi?id=198277)
- Firefox's `media.autoplay.block-webaudio` (default true) lets Web Audio play only after sticky activation. — [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- Workbox notes that media elements need the `crossorigin` attribute when served from a service worker cache. — [Chrome Workbox: Serving cached audio and video](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video?hl=en)

### Inferences

- Setting `crossorigin="anonymous"` on a plain playback element is **harmful** for third-party enclosures. It turns the media fetch into a CORS request, and hosts without ACAO will then fail to load at all. Only set it if you control the host or have verified ACAO for the whole redirect chain.
- For waveforms or visual flair, precompute peaks at build time (e.g., with audiowaveform/ffmpeg on the deadpods side) and render SVG. That avoids CORS entirely. Or skip it; it's "barebones".
- A proxy (Cloudflare Worker adding ACAO) would enable Web Audio and SW caching, but it adds bandwidth cost, legal/analytics concerns (it hides listener IPs from the host's stats) and complexity. Not recommended for v1.

### Gaps

- No survey found of what share of podcast hosts send ACAO on enclosures.

---

## 3. Media Session API (lock-screen controls, artwork, seek, position)

### Takeaway

Media Session is supported in every engine you care about: Chrome 73 / Android Chrome 57, Safari and iOS 15, Firefox 82, with `setPositionState` and `seekto` in all of them. Always set metadata (title = episode, artist = show, album = "deadpods", multiple artwork sizes), the play/pause/seekbackward/seekforward/seekto handlers, nexttrack/previoustrack for radio mode, and update position state on `timeupdate`/`ratechange`/`seeked`. iOS shows **either** skip-15 **or** next/previous track buttons depending on which handlers are registered.

### Cited Findings

- Browser support (version added): `MediaSession` Chrome 73, Chrome Android 57, Safari 15, iOS Safari 15, Firefox 82 (desktop and Android). `setPositionState` Chrome 81 (desktop), others the same as above. The `seekto` action Chrome 78, Safari/iOS 15, Firefox 82. — [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json) (queried 2026-10-20). MDN still labels the API "Limited availability / not Baseline". — [MDN Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- Actions: `play`, `pause`, `stop`, `seekbackward`, `seekforward`, `seekto`, `previoustrack`, `nexttrack`, `skipad`, plus call/slide actions. Wrap `setActionHandler` in try/catch for unsupported actions, register only actions you support, and keep `playbackState` in sync. — [MDN Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- `MediaMetadata` has `title`, `artist`, `album`, and `artwork[]` of `{src, sizes, type}`. Provide multiple sizes (96…512). There is also a `ChapterInformation` interface for chapters. — [MDN Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- `setPositionState({duration, playbackRate, position})` throws a TypeError if duration is missing or negative, position is negative or greater than duration, or playbackRate is 0. Calling it with no argument clears the state. `seekbackward`/`seekforward` details include `seekOffset`; default to 10 s if absent. — [MDN setPositionState](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setPositionState)
- Lock-screen artwork on iOS Safari was fixed in 16.4. — [dbushell.com, "iOS Web Apps and Media Session API" (2023)](https://dbushell.com/2023/03/20/ios-pwa-media-session-api/) (seen via search snippet; the page returned 403 on fetch)
- An iOS PWA's lock-screen controls work until audio has been paused for about 30 s, then stop working until the app is foregrounded. Not an issue on Android. — [Apple Developer Forums 762582](https://developer.apple.com/forums/thread/762582)

### Inferences

- Guard `setPositionState` against `NaN`/`Infinity` duration (before `loadedmetadata`) and against position > duration (VBR MP3 durations shift as the file loads). Call it in try/catch.
- Artwork: podcast cover art lives on third-party CDNs. Media Session fetches it without CORS, but for reliability (dead shows, dead CDNs) mirror resized covers at build time on deadpods' own origin (96/192/512 px).
- iOS shows a 15-second skip vs. track-skip on the lock screen depending on registered handlers (commonly reported developer behavior; not verified in a primary source this session). For radio mode, prefer `nexttrack`/`previoustrack`, and keep `seekto` for scrubbing.

### Gaps

- No primary Apple/WebKit doc fetched on exactly which handler combinations iOS 18/26 lock screens render (skip vs. track buttons).

---

## 4. Persistent player across navigation (Astro ClientRouter + `transition:persist`)

### Takeaway

Astro's `<ClientRouter />` + `transition:persist` on the player island (or on the `<audio>` element itself) is the documented way to keep audio playing across page navigations in a static site. **Pin Astro ≥ the release containing PR #17750**: versions 7.2.1–7.2.4 had a regression that re-created persisted `<audio>` elements and stopped playback. The alternatives are a full SPA (loses Astro's static-first benefits) or a popup/iframe player (iframes reload even when persisted).

### Cited Findings

- `transition:persist` keeps an element or island across navigations. The docs' example is a `<video>` that keeps playing, forward and back. Islands keep state. `transition:persist="name"` matches elements across different components. — [Astro docs: View transitions](https://docs.astro.build/en/guides/view-transitions/)
- A persisted island keeps its state but re-renders with new props, and `transition:persist-props` (astro@4.5.0) keeps the old props. — [Astro docs](https://docs.astro.build/en/guides/view-transitions/)
- "The restart of CSS animations and the reload of iframes cannot be avoided during view transitions even when using `transition:persist`." This rules out iframe-embedded players such as an embedded Podlove iframe. — [Astro docs](https://docs.astro.build/en/guides/view-transitions/)
- Bundled module scripts run only once and are ignored on later pages. Inline scripts can re-run, and `data-astro-rerun` forces re-runs. Events: `astro:before-swap`, `astro:after-swap`, `astro:page-load` (fires on first load and on every navigation). — [Astro docs](https://docs.astro.build/en/guides/view-transitions/)
- Fallback for browsers without the View Transition API: `animate` (default), `swap`, or `none` (full page loads, which **would kill audio**). — [Astro docs](https://docs.astro.build/en/guides/view-transitions/)
- **Regression:** Astro 7.2.1–7.2.4 `reifyMediaElements()` replaced every `<audio>/<video>` in the new body, including persisted ones, destroying `currentTime`, listeners and framework refs. 7.1.6 was fine. The fix in [PR #17750](https://github.com/withastro/astro/pull/17750) was merged on 2026-08-20. — [withastro/astro#17749](https://github.com/withastro/astro/issues/17749)
- Persisting state for a component that isn't present on every page was an earlier open question. — [withastro/astro#8781](https://github.com/withastro/astro/issues/8781)

### Inferences

- Pattern: put `<Player client:load transition:persist="player" />` (or a plain custom element with `transition:persist`) in the shared Layout so it's on **every** page, then use nanostores to tell it what to play. Per-page "Play" buttons are tiny islands or vanilla scripts that write to the store. Wire them in an `astro:page-load` listener, since module scripts don't re-run.
- Keep the `<audio>` element created in JS (`new Audio()` held in a module singleton) rather than in markup. The element survives even if a DOM swap misbehaves (a defense against regressions like #17749). Persisted UI then just renders state.
- Add a Playwright e2e test: start playback, navigate twice, and assert that `currentTime` keeps increasing and `paused === false`. This catches router regressions on Astro upgrades.
- Since the shell is SPA-like after first load, external deep links still do full loads. That's fine, because the first user tap starts playback anyway.

### Gaps

- I didn't verify which exact Astro patch version shipped PR #17750 (likely 7.2.5+). Check the CHANGELOG.

---

## 5. State: global store, saved position, history, resume

### Takeaway

Use nanostores (MIT, Astro-recommended for sharing state between islands) for current episode, queue, playing/paused, rate and position. Persist small state (position per episode, played set, rate, queue) to localStorage, throttled to every ~5 s plus on `pause`/`pagehide`. Use IndexedDB only if you add offline downloads.

### Cited Findings

- nanostores is MIT-licensed and active (pushed 2026-10-15, about 7.6k stars). — [GitHub API: nanostores/nanostores](https://github.com/nanostores/nanostores)
- Safari applies a 7-day cap on script-writable storage (IndexedDB, SW registration, Cache API) if the user doesn't interact with the site. This doesn't apply to home-screen PWAs (since iOS 13.4 / Safari 13.1). — [web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web)
- `StorageManager.persist()` is supported in Chrome 55, Firefox 57 and Safari/iOS 15.2. — [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json)

### Inferences

- The 7-day ITP eviction likely applies to localStorage too in practice. Treat "resume" as best-effort, not durable. Note: web.dev's list names IndexedDB, SW and Cache; I didn't separately verify localStorage.
- Key the saved position by a stable episode id (GUID hash), not by URL, because enclosure URLs change.
- Resume logic: on `loadedmetadata`, if the saved position is > 30 s and < duration − 60 s, seek to it. Otherwise start from 0 or from `?t=`. Mark an episode "played" at ≥ 90% or on `ended`.
- `@nanostores/persistent` is the usual companion for localStorage sync. _(Not verified this session.)_

### Gaps

- No source fetched on `@nanostores/persistent` API or cross-tab sync behavior.

---

## 6. Autoplay policies: what is achievable on first visit vs after one tap (core goal)

### Takeaway

**True audible autoplay on a cold first visit is not achievable reliably** in any major browser. Chrome desktop allows it only after the user has built up Media Engagement on the origin, Safari blocks audible autoplay by heuristic, and iOS requires a gesture. The achievable design: **one tap starts a continuous session**, and after that tap the same element can keep auto-advancing through a queue with no further taps. On return visits, Chrome desktop's MEI and installed PWAs (Chrome) may permit true autoplay, so try `play()`, catch `NotAllowedError`, and show a big "▶ Tune in" button.

### Cited Findings

- Chrome: muted autoplay is always allowed. Autoplay with sound is allowed if (a) the user has interacted with the domain, (b) on desktop, the Media Engagement Index threshold has been crossed, or (c) on mobile, the site has been added to the home screen, or on desktop installed as a PWA. — [Chrome Developers: Autoplay policy](https://developer.chrome.com/blog/autoplay/) (page last updated 2017 per fetch; core rules unchanged as far as I know)
- MEI counts a playback when media plays > 7 s, with unmuted audio, in an active tab, at > 200×140 px. High-MEI sites can autoplay with sound, desktop only. Viewable at `about://media-engagement`. — [Chrome Developers](https://developer.chrome.com/blog/autoplay/)
- Inference from the above: the 200×140 size criterion is written for video. Whether audio-only playback counts toward MEI is not stated (see Gaps).
- Cross-origin iframes need `allow="autoplay"`. Otherwise `play()` rejects with `NotAllowedError`. — [Chrome Developers](https://developer.chrome.com/blog/autoplay/); [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- Safari: an inference engine blocks media with sound from autoplaying on most sites. Users can set per-site Auto-Play. "Assume any use of `<video>` or `<audio>` requires a user gesture click to play." **Restrictions apply per media element, so switch the element's source rather than creating new elements for sequential playback.** — [WebKit blog: Auto-Play Policy Changes for macOS](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- Firefox: `media.autoplay.default` (0 = allow, 1 = block audible, 2 = prompt). `media.block-autoplay-until-in-foreground` defaults to true, so background tabs don't autoplay until focused. — [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- Note: MDN's page lists Firefox's `media.autoplay.default` default as 0 (allowed). My recollection is that Firefox ships blocking audible autoplay by default (value 1). Treat as **conflicting/unverified** and test.
- `navigator.getAutoplayPolicy("mediaelement")` returns `"allowed"`, `"allowed-muted"` or `"disallowed"`. You can also pass an element. There is no change event. MDN doesn't give a support table in the guide. — [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- `play()` returns a Promise that rejects with `NotAllowedError` when blocked. Show a play button, and don't show a pause button before playback has actually started. — [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay); [WebKit blog](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- iOS: autoplay didn't work without user action, and keeping a single always-existing Audio object was needed "to avoid breaking playback permissions". — [dev.to: What we learned about PWAs and audio playback](https://dev.to/prototyp/what-we-learned-about-pwas-and-audio-playback-50eh)

### Inferences

- **Design for "one tap to radio":** the landing page shows a single giant "▶ Play a dead podcast" button. That tap calls `audio.play()` synchronously inside the click handler, before any `await` or fetch, so the gesture isn't lost. Pick the episode URL from data already embedded in the page; don't fetch it in the handler.
- Unlock trick: on the first gesture, call `play()` on the shared element even if the real src isn't ready (e.g., a tiny silent MP3 on your own origin), then swap `src`. This is per-element unlocking per WebKit's guidance.
- Attempt autoplay on load with `getAutoplayPolicy` when available. Otherwise call `play()` and catch the error. This will succeed for some return visitors on Chrome desktop (MEI) and for installed Chrome PWAs. Elsewhere, fall back to the button.
- Don't use muted autoplay as a hack ("start muted, unmute later"): unmuting requires a gesture too, and muted audio is pointless.
- Deep links (`/show/x/ep/y?t=123`) should land with the player "armed" at the timestamp and a big play button, not attempt audible autoplay.

### Gaps

- Whether audio-only playback accrues Chrome MEI (the size criterion is video-oriented): no source found.
- `getAutoplayPolicy` support matrix (I believe Firefox-only as of my knowledge): not verified this session.
- Current Firefox default autoplay value: conflicting (see above).

---

## 7. Continuous queue playback / auto-advance on `ended` (background tabs, iOS lock screen)

### Takeaway

Auto-advance by **reusing the same `<audio>` element**: on `ended`, set `src` to the next episode and call `play()`. This works in foreground and background tabs on desktop and Android Chrome. On iOS Safari it has a history of regressions (iOS 15, 17.2.1) where the next track silently doesn't play while the screen is locked. These were reportedly fixed by iOS 17.5 (WebKit commit June 2024). Test on current iOS 26, and keep `nexttrack` working as a manual escape hatch.

### Cited Findings

- WebKit bug: with the screen off, `ended` fires and handlers run, but after replacing `src` the `play()` promise resolves with no audio. — [WebKit bug 261554 et al. via search](https://bugs.webkit.org/show_bug.cgi?id=261554); [Apple Developer Forums 706499](https://developer.apple.com/forums/thread/706499)
- Reported as starting in iOS 15 (it worked in 14), and again in iOS 17.2.1. Reported resolved in iOS 17.5, with a WebKit commit in June 2024. Workarounds reported: a silent companion audio element (mixed results), or unlocking and tapping play. — [Apple Discussions 255418017](https://discussions.apple.com/thread/255418017); [Apple Developer Forums 706499](https://developer.apple.com/forums/thread/706499); [WebKit bug 173332](https://bugs.webkit.org/show_bug.cgi?id=173332)
- Safari guidance: "switch the element's source rather than creating new elements for sequential playback". — [WebKit blog](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- Firefox: `media.block-autoplay-until-in-foreground` blocks autoplay in background tabs until they're foregrounded. This applies to tabs that never had playback; a continuing session in a tab already playing is a different case (see Inferences). — [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- Android and desktop: PWA playback persisted when minimised, backgrounded and locked, with media controls shown. — [dev.to (prototyp)](https://dev.to/prototyp/what-we-learned-about-pwas-and-audio-playback-50eh)
- iOS home-screen PWA: audio stopped when minimised or locked in older iOS. A WebKit bug says standalone web-app background audio was only fixed for webview-launched apps. Discourse users report that the PWA stops while Safari-tab playback continues. — [dev.to (prototyp)](https://dev.to/prototyp/what-we-learned-about-pwas-and-audio-playback-50eh); [WebKit bug 221413](https://bugs.webkit.org/show_bug.cgi?id=221413); [meta.discourse.org](https://meta.discourse.org/t/media-playback-with-pwa-keep-playing-when-phone-locked/182219?tl=en)

### Inferences

- Implementation: `audio.addEventListener('ended', () => { const next = queue.next(); audio.src = next.url; audio.play().catch(showTapToContinue); updateMediaSession(next); })`. Do it synchronously in the handler; don't `await fetch` first. Pre-resolve the next item's URL and metadata while the current one plays.
- Dead-link resilience matters more in radio mode. On `error` for the next item, immediately skip to the following one (up to N retries), log the failure, and never leave the user in silence.
- Recommend that iOS users listen in the Safari tab rather than an installed PWA until it's verified on iOS 26 (see section 9).

### Gaps

- No 2026 (iOS 26) confirmation found that locked-screen auto-advance works. Needs a device test.

---

## 8. "Radio station" / lean-back mode design + preloading the next episode

### Takeaway

Model radio mode as a client-side queue generated from build-time data, e.g. a shuffled list of "best episodes" across shows, weighted and deduplicated. One shared `<audio>` element plays it, Media Session `nexttrack`/`previoustrack` map to queue skip/back, and the next item is warmed up shortly before the current one ends. True gapless isn't needed for spoken word; "near-instant" is the bar.

### Cited Findings

- `previoustrack`/`nexttrack` are standard Media Session actions, supported in Chrome 73+/Android 57+, Safari/iOS 15+ and Firefox 82+. — [MDN Media Session](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API); [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json)
- Reuse one element for sequential playback (per-element autoplay permission). — [WebKit blog](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- Some mobile browsers ignore `preload`. — [MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)

### Inferences

- **Queue generation:** at build time emit `/radio.json` (or inline it) with `{id, show, title, url, resolvedUrl, duration, art, startAt?}` for curated best episodes. On the client, shuffle with a seeded RNG (seed in URL → shareable station: `/radio?seed=abc`). Avoid repeating a show back-to-back, and skip the "played" set from localStorage.
- **Lean-back UI:** large now-playing card, a "Skip" button (→ next), "Back" (if position > 5 s, restart the episode; otherwise go to the previous item, mirroring music apps), "Love/Go to show", and a share button that copies `/ep/...?t=<now>`. Optional station filters by genre/era.
- **Optional intros:** some long episodes have slow openings. Curator-supplied `startAt` offsets can skip cold-open ads, applied via `currentTime` on `loadedmetadata`.
- **Preloading the next episode:** about 30–60 s before `ended` (`duration - currentTime < 45`), do one of the following:
  - (a) Cheapest and safest: `fetch(nextUrl, {method:'HEAD', mode:'no-cors'})` or a `<link rel="preconnect">` to the next host. This warms DNS/TLS and follows the redirect chain partly (no-cors HEAD may be limited).
  - (b) Create a second hidden `Audio()` with `preload="auto"` and the next src to buffer the start. On `ended`, either swap which element is "active" (risky on iOS, because the second element may lack autoplay permission unless it was also unlocked by the first gesture) or just set the primary's src to the same URL and hope for an HTTP cache hit (MP3 range responses are often not cached well).
  - **Recommendation:** use (b) only with the "ping-pong two elements, both unlocked on the first tap" pattern. Unlock both by calling `play()`/`pause()` on each inside the initial gesture. Otherwise stick with (a) plus single-element src swap. Spoken-word listeners tolerate a ~1 s gap.
- Don't preload on metered connections when `navigator.connection.saveData` is true. Note: Network Information API support is Chromium-only (not verified this session).
- Media Session metadata must update on every advance, and so must position state (reset via `setPositionState()` with no argument, then new values after `loadedmetadata`).

### Gaps

- No source found measuring whether a second pre-buffered `<audio>` keeps autoplay permission on iOS 26 after a gesture on another element.
- No source on HTTP cache reuse of MP3 range responses between two media elements.

---

## 9. iOS Safari quirks (autoplay, gestures, background, PWA standalone, volume)

### Takeaway

iOS Safari in a normal tab handles background and lock-screen podcast playback reasonably well with Media Session. **Home-screen (standalone) PWAs remain unreliable for background audio** (stops when locked, lock-screen controls die after about 30 s paused, Web Audio first-run bugs on iOS 26). `audio.volume` is read-only (always 1), so hide the volume slider on iOS and rely on hardware buttons. Use `muted` if needed.

### Cited Findings

- iOS volume is read-only. Reading `volume` returns 1, and setting it has no effect; use `muted` instead. — [WebKit bug 176045](https://bugs.webkit.org/show_bug.cgi?id=176045); [caniuse via w3cub](https://docs.w3cub.com/browser_support_tables/audio); [PlayCanvas forum](https://forum.playcanvas.com/t/volume-in-safari-not-changing/33270/2)
- iOS PWA lock-screen controls fail after about 30 s paused until the app is foregrounded. WakeLock is "supported in all browsers except Mobile Safari iOS" per that thread. — [Apple Developer Forums 762582](https://developer.apple.com/forums/thread/762582)
- That forum claim is contradicted or outdated: BCD lists the Screen Wake Lock API in iOS Safari 18.4. — [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json). Wake Lock is irrelevant to audio anyway; it keeps the screen on.
- Standalone web apps installed from Safari didn't get background audio; the fix applied only to native-webview-launched apps. — [WebKit bug 221413](https://bugs.webkit.org/show_bug.cgi?id=221413)
- iOS 26 PWA Web Audio works only on first run, and `AudioContext.resume()` hangs (Sept 2025 reports). — [WebKit bug 198277](https://bugs.webkit.org/show_bug.cgi?id=198277)
- iOS autoplay needs a user action, and one persistent Audio object avoids losing playback permission. — [dev.to (prototyp)](https://dev.to/prototyp/what-we-learned-about-pwas-and-audio-playback-50eh)
- `preservesPitch` is available from iOS 17.2. — [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json)

### Inferences

- Don't push "Add to Home Screen" on iOS for v1. Shareable links that play in a Safari tab are the better story.
- Calls, Siri and other apps interrupt the audio session. Listen for `pause` events you didn't initiate and update the UI and Media Session state accordingly.
- Sources on iOS PWA background audio are mostly bug reports and forum posts, not Apple docs. Behavior on iOS 26.x must be device-tested.

### Gaps

- No Apple documentation found on the current (iOS 26) standalone-PWA background audio status.

---

## 10. PWA: manifest, service worker, offline downloads

### Takeaway

A manifest plus a minimal SW for installability and offline shell is cheap. **Offline episode download is hard with third-party enclosures.** Without CORS you get opaque responses (big quota padding, can't verify status), media requests are Range requests that need the `workbox-range-requests` plugin, runtime caching of 206 responses doesn't work, and Safari storage is about 1 GB with PWA quirks. Defer offline downloads; if you do it, precache full 200 responses explicitly on user request.

### Cited Findings

- Workbox: to serve cached media you must honor `Range` via `RangeRequestsPlugin`, media elements need `crossorigin`, and media must be cached explicitly ahead of time (precache, `cache.add()`, `warmStrategyCache`). Runtime caching fails because players fetch partial content, and a cache miss's 206 isn't written to the cache. The sample uses `CacheFirst` + `CacheableResponsePlugin({statuses:[200]})` + `RangeRequestsPlugin`, matched on `request.destination` audio/video. — [Chrome Workbox: Serving cached audio and video](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video?hl=en)
- Quotas: Chrome lets an origin use up to 60% of disk (about 5% in incognito). Firefox: 50% of free disk, 2 GB per eTLD+1 group. Safari: about 1 GB, prompting in 200 MB increments; installed iOS PWAs have a separate container with no way to request more once full. `QuotaExceededError` is thrown on overflow. Chromium/Firefox evict LRU origins. The Safari 7-day cap doesn't apply to home-screen PWAs. — [web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web)
- `navigator.storage.persist()`: Chrome 55, Firefox 57, Safari 15.2. — [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json)
- Chrome treats an installed PWA (desktop) or home-screen site (mobile) as allowed for audible autoplay, a plus for radio mode on Android/desktop. — [Chrome Developers: Autoplay](https://developer.chrome.com/blog/autoplay/)

### Inferences

- Opaque responses can't be range-sliced by a SW, because the body is unreadable. So offline playback of third-party MP3s without CORS is effectively impossible via the Cache API. You'd need either ACAO from the host or a CORS proxy. Chrome also pads opaque responses heavily in quota accounting. _(Padding behavior is well-known but not fetched as a primary source this session.)_
- A one-hour 128 kbps MP3 is about 55–60 MB, so Safari's ~1 GB holds roughly 15–20 episodes.
- Keep the SW from intercepting audio requests at all in v1 (no `fetch` handler match for `destination === 'audio'`). Misconfigured SW media handling is a classic source of seek bugs.
- Installability: `manifest.webmanifest` with name, icons (192/512 + maskable), `start_url`, `display: standalone`, and a SW with a fetch handler (Chromium heuristics). iOS uses `apple-touch-icon`.

### Gaps

- Opaque-response quota padding size (Chrome reportedly about 7 MB per entry): not verified this session.

---

## 11. Deep linking: `?t=`, Media Fragments, start-at-time

### Takeaway

Use a query param (`?t=1h2m3s` or `?t=3723`) on deadpods episode pages for shareable timestamps. The page reads it and sets `currentTime` after `loadedmetadata`. You can optionally append `#t=` to the media src, but setting `currentTime` is more controllable. Autoplay still won't happen on a cold visit (section 6), so show "Play from 1:02:03".

### Cited Findings

- Media Fragments `#t=start[,end]` in seconds or `hh:mm:ss` on the media URL. — [MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)
- Seeking is done by setting `currentTime` within `seekable`. — [MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery)

### Inferences

- Appending `#t=` to a third-party enclosure URL doesn't change the HTTP request (fragments aren't sent), so it doesn't break tracking prefixes. But browser support for honoring it on `<audio>` varies, and it interacts awkwardly with resume. Prefer `currentTime`.
- Accept YouTube-style `t=1h2m3s`, `t=62:03` and plain seconds, and normalize. Include `og:audio` and a good `og:image` for share cards.
- Seeking to a late timestamp needs Range support on the host (section 1). If unsupported, warn or let it buffer.

### Gaps

- No current support matrix found for media-fragment `#t=` on `<audio>` across Safari/Chrome/Firefox.

---

## 12. Existing open-source players and libraries (tradeoffs, licenses, GPL-3.0 compatibility)

### Takeaway

For a barebones, persistent, custom-styled player, **don't adopt a heavyweight player**. Write a small vanilla/Preact controller around one `Audio()` and optionally use **media-chrome** (MIT, web components, framework-agnostic) for accessible controls. Every recommended library (Plyr, Howler, Shikwasa, media-chrome, Vidstack, Podlove Web Player) is MIT, which is compatible with GPL-3.0 if deadpods is GPL. Podverse is **AGPL-3.0**: learn from it, don't copy code unless you accept AGPL.

### Cited Findings

GitHub API, queried 2026-10-20: license, last push, stars.

| Repo                                       | License  | Last push          | Stars  |
| ------------------------------------------ | -------- | ------------------ | ------ |
| podlove/podlove-ui (Podlove Web Player 5)  | MIT      | 2026-01-30         | 93     |
| sampotts/plyr                              | MIT      | 2026-10-20         | ~30k   |
| goldfire/howler.js                         | MIT      | 2025-11-23         | ~25.4k |
| jessuni/shikwasa (podcast-specific player) | MIT      | 2024-04-13 (stale) | 505    |
| muxinc/media-chrome                        | MIT      | 2026-10-19         | ~2.8k  |
| vidstack/player                            | MIT      | 2026-10-07         | ~3.7k  |
| podverse/podverse-web                      | AGPL-3.0 | 2026-01-23         | 100    |
| podverse/podverse                          | AGPL-3.0 | 2026-10-20         | —      |
| Automattic/pocket-casts-android            | MPL-2.0  | 2026-10-20         | —      |

Source: [GitHub API](https://github.com/podlove/podlove-ui). A Pocket Casts web player repo (`Automattic/pocket-casts-webplayer`) returned 404; no public repo was found.

- Podlove Web Player npm `@podlove/web-player` 5.13.0 is MIT, and Podlove projects are "MIT, BSD or the like". — [jsDelivr](https://www.jsdelivr.com/package/npm/@podlove/web-player); [Podlove docs](https://docs.podlove.org/podlove-publisher/developer/projects)
- Iframes reload even with `transition:persist`, which makes iframe-embed players such as the Podlove embed incompatible with a persistent Astro player. — [Astro docs](https://docs.astro.build/en/guides/view-transitions/)

### Inferences

- **Podlove Web Player:** feature-rich podcast player (chapters, transcripts, share). It's a Vue app usually embedded via iframe, heavy, and has a low recent commit rate. Good to study for chapters/transcript UX; poor fit for a persistent island.
- **Plyr:** popular, accessible-ish controls, but video-centric. Wraps a given `<audio>`, which is fine, but it's more than you need.
- **Howler.js:** game/sound-effects oriented. It defaults to Web Audio, so it needs `html5: true` for streaming long files without CORS. Media Session isn't built in. Not ideal.
- **Shikwasa:** small, podcast-specific (chapters, speed) but stale since 2024.
- **media-chrome:** unstyled-ish web components (`<media-controller>`, `<media-play-button>`, `<media-time-range>`, `<media-playback-rate-button>`) that wrap a native `<audio slot="media">`. They work in any Astro page without a framework, and they're actively maintained by Mux. The best fit if you want accessible prebuilt controls.
- **Vidstack:** a polished, accessible player with an audio layout. Heavier, framework adapters, and maintained (its relationship with Mux/media-chrome was announced in 2024, per my recollection; not verified).
- **Castopod:** a self-hosted podcast host (PHP) with an embeddable player. I believe it's AGPL-3.0 (not verified this session). Reference only.
- **Pocket Casts web:** proprietary, but a good UX reference for speed, skip intervals and up-next. The mobile apps are MPL-2.0.
- **License compatibility:** MIT code can be included in a GPL-3.0 project; keep the MIT notices. AGPL-3.0 code can be combined with GPL-3.0 (GPLv3 §13), but the combined work then carries AGPL network-use obligations. _(Standard FSF guidance; not fetched this session.)_

### Gaps

- Castopod license and media-chrome/Vidstack audio-specific feature details were not verified via fetch.

---

## 13. Accessibility of custom audio controls; transcripts

### Takeaway

Use real `<button>`s for play/pause/skip/speed with `aria-label`s that update ("Pause", "Play"). Use a native `<input type="range">` or an APG-compliant `role="slider"` for seek, with `aria-valuetext` like "12 minutes 3 seconds of 58 minutes". Support keyboard shortcuts (Space/K, ←/→ ±10–15 s), keep visible focus, and announce track changes politely. Link transcripts if the feed has `podcast:transcript`.

### Cited Findings

- APG slider: `role="slider"` on the focusable thumb with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, plus `aria-valuetext` when the raw number isn't friendly. Label it with `aria-labelledby` or `aria-label`. Keys: Right/Up +step, Left/Down −step, Home/End min/max, PageUp/PageDown larger steps. APG has a "Media Seek Slider" example that uses `aria-valuetext` for minutes and seconds. — [W3C WAI-ARIA APG: Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- Don't show a pause button before playback has actually started. — [WebKit blog](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)

### Inferences

- `<input type="range">` gives keyboard and AT support for free. Set `aria-valuetext` on input. Throttle `aria-valuetext` updates during playback (e.g., only update on user interaction or every 10 s) so screen readers aren't spammed.
- Put the now-playing title in an `aria-live="polite"` region, which matters for radio auto-advance. Respect `prefers-reduced-motion` for any animated visualizer.
- Global shortcuts must not fire while focus is in a text input. Space on a focused button already toggles it, so avoid double-toggling.
- Transcripts: the Podcasting 2.0 `<podcast:transcript>` tag (VTT/SRT/JSON) exists on some feeds; many ended shows won't have one. Ingest at build time and render as static HTML (good for SEO and accessibility). Or generate with Whisper later.

### Gaps

- No source fetched on the `podcast:transcript` spec or the share of ended shows that carry transcripts.
