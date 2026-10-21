# One tap away from dead-podcast radio

The core goal of deadpods.com, auto-playing great retired podcasts, can be built as a lean static Astro site. One hard limit shapes it: **no major browser reliably allows audible autoplay on a cold first visit**. So the product to build is "one tap starts an endless radio session". After that first gesture, a single persistent `<audio>` element can auto-advance through a curated queue with no further taps, across page navigations and onto the lock screen ([Chrome autoplay policy](https://developer.chrome.com/blog/autoplay/); [WebKit](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)). Everything else supports that loop:

- **Data.** A Google Sheet snapshotted to JSON in git, so builds never depend on Google being up.
- **Media.** A build-time pipeline that resolves each feed and enclosure and flags dead links.
- **Pages.** Shareable per-show and per-episode pages with good Open Graph cards.
- **Legal posture.** Stream from the publisher's own enclosure URL, the way a well-behaved podcast app does. Never proxy, cache or rehost audio.

The opportunity is real. No competitor combines ended non-fiction shows, editor-picked best episodes, in-browser playback and shareable episode links. The closest, The End, covers fiction only and links out ([The End](https://www.theend.fyi/)). There is plenty of supply: **76 well-regarded ended shows are still freely playable from public RSS** as of 2026-10-20 (Appendix A). The skills needed are mostly front-end media engineering, small-scale data plumbing, editorial writing and a working grasp of podcast-industry norms. The two biggest technical risks are iOS Safari's history of lock-screen auto-advance bugs and link rot in the archives of shows that have ended. The repo itself needs groundwork first: it is on Astro 4 while Astro is on 7.x, and it ships placeholder metadata and an accent color that fails contrast checks.

## The player is the product, and the autoplay policy sets its shape

### What browsers actually permit

The autoplay rules are blunt. Chrome always allows muted autoplay. It allows audible autoplay only if one of three things is true:

- the user has interacted with the domain;
- on desktop, the site has crossed a **Media Engagement Index** threshold, which counts plays longer than 7 seconds, unmuted, in an active tab, with a video-sized element;
- on mobile the site was added to the home screen, or on desktop it was installed as a PWA.

([Chrome Developers](https://developer.chrome.com/blog/autoplay/)). Safari runs an inference engine that blocks audible autoplay on most sites. WebKit tells developers to "assume any use of `<video>` or `<audio>` requires a user gesture click to play". Crucially, **the permission is granted per media element**, so sequential playback should switch the `src` on one element rather than create new ones ([WebKit blog](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)). Firefox blocks autoplay in background tabs until they are focused. MDN lists the default `media.autoplay.default` as 0 (allowed), which conflicts with the widely held view that Firefox blocks audible autoplay by default, so test it ([MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)). Whether audio-only playback ever builds up Chrome's MEI is undocumented.

This leads to one design: **a giant "▶ Play a dead podcast" button**. Its click handler calls `audio.play()` synchronously, before any `await` or fetch, using an episode URL already embedded in the page. On load, the page can still try `play()` (or `navigator.getAutoplayPolicy()` where it exists) and catch `NotAllowedError`. That attempt will succeed for some returning Chrome desktop visitors and for installed Chrome PWAs, and everyone else gets the button ([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)). Muted autoplay doesn't help, because unmuting needs a gesture too. Deep links such as `/mystery-show/belt-buckle?t=754` should open with the player armed at that timestamp and a "Play from 12:34" button, not attempt audible autoplay.

### Continuous auto-advance

Lean-back radio mode is a client-side queue generated at build time: a shuffled, weighted list of curated best episodes that never plays the same show twice in a row. On `ended`, the handler sets the same element's `src` to the next episode and calls `play()`, synchronously and without fetching first. That works in foreground and background tabs on desktop and Android ([dev.to: PWAs and audio](https://dev.to/prototyp/what-we-learned-about-pwas-and-audio-playback-50eh)).

iOS is the weak point. With the screen locked, WebKit had a bug where `ended` fired and the handler ran, but `play()` on the new `src` resolved with **no audio**. It was reported from iOS 15, again in 17.2.1, and reportedly fixed in iOS 17.5 by a June 2024 WebKit commit ([WebKit bug 261554](https://bugs.webkit.org/show_bug.cgi?id=261554); [Apple Developer Forums](https://developer.apple.com/forums/thread/706499); [Apple Discussions](https://discussions.apple.com/thread/255418017)). **No source confirms it works on iOS 26**, so it needs a device test, and a working `nexttrack` control is the manual escape hatch.

Radio mode makes dead links much worse: a 404 must never leave the listener in silence. On `error`, the player should immediately skip to the next item, up to N retries, and log the failure.

Preloading the next episode is optional for spoken word, where a gap of about a second is acceptable. The cheap version warms DNS and TLS for the next host. The aggressive version "ping-pongs" two elements, but only works if both are unlocked inside the first tap.

### Lock screen and persistence across pages

The Media Session API is now supported everywhere it matters: Chrome 73, Android Chrome 57, Safari and iOS 15, Firefox 82, including `setPositionState` and `seekto` ([MDN Media Session](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API); [@mdn/browser-compat-data](https://unpkg.com/@mdn/browser-compat-data/data.json)). It should carry episode, show and artwork metadata at several sizes, with handlers for play, pause, seek and `nexttrack`/`previoustrack`. Two guards are needed:

- `setPositionState` throws if the duration is missing or the position exceeds the duration, so guard against NaN durations before `loadedmetadata` and against the drift that variable-bitrate MP3s produce ([MDN setPositionState](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setPositionState)).
- Lock-screen artwork on iOS was only fixed in 16.4 ([dbushell.com](https://dbushell.com/2023/03/20/ios-pwa-media-session-api/)). Mirroring resized covers on deadpods' own origin protects against artwork CDNs disappearing.

To keep audio playing while the listener browses, Astro's `<ClientRouter />` plus `transition:persist` on a player that lives in the shared Layout is the documented approach. The docs' own example keeps a `<video>` playing across navigations ([Astro view transitions](https://docs.astro.build/en/guides/view-transitions/)). Three caveats apply:

- **iframes reload even when persisted**, which rules out embedded third-party players such as Podlove.
- Bundled module scripts run only once, so per-page play buttons have to be wired in `astro:page-load`.
- **Astro 7.2.1–7.2.4 had a regression** that re-created persisted `<audio>` elements and stopped playback. The fix was merged 2026-08-20 in PR #17750 ([withastro/astro#17749](https://github.com/withastro/astro/issues/17749)). Holding the element as a `new Audio()` module singleton, and adding a Playwright test that navigates twice and asserts `currentTime` keeps rising, protects against the next regression.

nanostores (MIT, actively maintained) is the usual way to share "now playing", the queue and the playback rate between islands ([GitHub: nanostores](https://github.com/nanostores/nanostores)). Saved positions in localStorage are best-effort only, because Safari can evict script-writable storage after 7 days without interaction ([web.dev storage](https://web.dev/articles/storage-for-the-web)).

### What to avoid

**Do not use the Web Audio API or set `crossorigin="anonymous"`.** A `MediaElementAudioSourceNode` outputs silence for cross-origin media unless the host sends `Access-Control-Allow-Origin` ([Mozilla bug 1441153](https://bugzilla.mozilla.org/show_bug.cgi?id=1441153); [wavesurfer.js #2014](https://github.com/katspaugh/wavesurfer.js/issues/2014)). Setting `crossorigin` turns a working plain-`<audio>` fetch into a CORS request that hosts without that header will refuse.

Offline downloads are a trap for the same reason. Service workers can't range-slice opaque responses, and runtime caching of 206 responses fails ([Chrome Workbox](https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video?hl=en)).

**iOS home-screen PWAs remain unreliable for background audio**:

- Lock-screen controls die after about 30 seconds paused ([Apple Developer Forums 762582](https://developer.apple.com/forums/thread/762582)).
- Standalone background audio was fixed only for webview-launched apps ([WebKit bug 221413](https://bugs.webkit.org/show_bug.cgi?id=221413)).

So the v1 story for iOS is "play in a Safari tab". iOS `audio.volume` is read-only, so the volume slider should be hidden there ([WebKit bug 176045](https://bugs.webkit.org/show_bug.cgi?id=176045)).

### Player libraries

All the libraries worth considering are MIT and therefore GPL-compatible: Plyr, Howler, media-chrome, Vidstack and the Podlove Web Player. Podverse is AGPL-3.0, so study it but don't copy from it ([GitHub API, podlove-ui](https://github.com/podlove/podlove-ui)). For a barebones player, a small vanilla controller around one `Audio()` object is the best fit, optionally with media-chrome web components for accessible controls. Howler defaults to Web Audio, which is the wrong primitive here.

## A Sheet snapshot committed to git beats live reads on every build

### Astro version and data loading

Astro is on the 7.x line (7.1 shipped July 2026). Astro 6 removed legacy content collections and requires Node 22.12+, Zod 4 imports from `astro/zod`, and `<ClientRouter />` in place of `<ViewTransitions />` ([Astro v6 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v6/); [Astro 7.1](https://astro.build/blog/astro-710)). The official path from 4 goes through 5 first. With one page and one component, **re-scaffolding on 7.x is less work than three sequential migrations**.

Astro ships only `glob()` and `file()` loaders, and no maintained Google Sheets loader turned up. A roughly 30-line inline object loader with a Zod schema is the standard pattern: the loader context provides `store`, `meta`, `parseData` and `generateDigest` ([Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)).

### Reading the Sheet

At one fetch an hour, quotas don't matter. The Sheets API allows 300 reads per minute per project, and a batch request counts as one ([Sheets API limits](https://developers.google.com/workspace/sheets/api/limits)). That same page warns that "charges for exceeding quota limits are planned for later in 2026".

The pragmatic choice is **Sheets API v4 with a restricted API key, on a sheet shared as link-viewable**. The data is public podcast metadata anyway. A service account is the upgrade if the sheet holds private notes. Publish-to-web CSV and gviz endpoints need no credentials but are undocumented and cached opaquely on Google's side ([Observable notebook](https://observablehq.com/d/1dcb1c1e430e8ca9)). Whichever route, coerce types in Zod (every cell comes back as a string) and validate header names, because a renamed column silently breaks the mapping.

### Hourly regeneration

The cheapest pipeline is a **GitHub Actions cron** that fetches the sheet, hashes it, and commits `data/snapshot.json` only when the hash changes. Astro then reads that file with the `file()` loader, and the commit triggers a deploy. This design has four payoffs:

- Builds become deterministic.
- A Google outage can't break a deploy.
- Every content edit gets a git audit trail with rollback.
- Fork PRs build without secrets.

The commit also counts as repository activity, which matters because **scheduled workflows in public repos auto-disable after 60 days without activity**. Cron runs are also delayed under load and run only on the default branch ([GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)).

Hosting choices interact with this:

| Host             | Hourly builds on the free tier?    | Notes                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Hobby     | No native hourly cron (daily only) | Hook-triggered builds fit within 100 deployments/day. Hobby bans commercial use, ads included ([Vercel cron](https://vercel.com/docs/cron-jobs/usage-and-pricing); [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines)) |
| Netlify Free     | Effectively no                     | 300 credits/month at 15 per production deploy, so about 20 deploys exhausts it ([Netlify pricing](https://www.netlify.com/pricing/))                                                                                                      |
| Cloudflare Pages | Only with hash-gating              | Free tier allows 500 builds/month ([Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/))                                                                                                                   |

**Cloudflare static assets or GitHub Pages, deployed from the Actions runner, is the best fit.** Since audio streams from publishers' hosts, deadpods' own bandwidth stays trivial.

### When to leave Sheets

Sheets suits a single curator editing a small, fixed-field table ([iThome](https://ithelp.ithome.com.tw/articles/10409247)). The natural graduation is git-native YAML/JSON with PR review, optionally with Keystatic or Decap as the editing UI. That fits a GPL project that invites contributions.

### Analytics and CI

For analytics, Umami Cloud's free Hobby tier (100K events/month, custom events, MIT) or GoatCounter can track a `play` event from the audio element's handler without cookies ([solodevstack](https://solodevstack.com/blog/umami-vs-plausible-solo-developers)). These numbers come from third-party comparison posts and should be checked against vendor pages.

CI should run `astro check`, the build, an internal link check with lychee, and Lighthouse CI. A separate weekly job should check external enclosures and open issues for failures rather than failing the build.

## Dead feeds lie, so status and playability need a pipeline

### Parsing feeds

The essential fields are the RSS `<enclosure>`, the item `<guid>` and a few `itunes:` tags ([PSP-1 spec](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)). Real dead feeds are sparse and strange. Mystery Show's still-live Megaphone feed has seven items, enclosures with `length="0"`, legacy WNYC URLs as GUIDs, and **no `itunes:complete` flag** even though Gimlet stopped the show in 2016 ([Mystery Show feed](https://feeds.megaphone.fm/mysteryshow); [Wikipedia](https://en.wikipedia.org/wiki/Mystery_Show)).

For parsing, `fast-xml-parser` (about 47M weekly downloads, released September 2026) plus a small hand-written mapper is the maintainable choice. `rss-parser` hasn't had a release since April 2023 ([npm registry](https://registry.npmjs.org/fast-xml-parser)).

Podcasting 2.0 tags would be ideal if they were present:

- `podcast:soundbite`: ready-made "best moment" clips.
- `podcast:transcript`
- `podcast:guid`: stable identity across feed moves.
- `podcast:updateFrequency complete="true"`

Shows that died before about 2021 almost never carry them ([podcast-namespace 1.0](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md)). So the Sheet should hold editor-entered start/duration pairs in the soundbite shape.

### Metadata APIs

**Podcast Index** is the best API fit. It is free with key auth, exposes feed-health fields (`lastGoodHttpStatusTime`, `crawlErrors`, `dead`), and publishes a public CSV of dead feeds ([docs-api](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/root.yaml)). Its terms forbid embedding credentials in open-source projects and limit permanent copies, so keep the keys in CI secrets and prefer caching publisher RSS over caching API responses ([Podcast Index ToS](https://raw.githubusercontent.com/Podcastindex-org/legal/main/TermsOfService.md)).

The others:

- **Apple Lookup:** needs no key and returns `feedUrl` and artwork, but is rate-limited to about 20 calls/minute. Its artwork counts as promo-only content that must sit next to an Apple badge ([Apple Search API](https://performance-partners.apple.com/search-api)).
- **Listen Notes:** the free and Pro tiers forbid server-side caching, which is incompatible with a static build ([Listen Notes pricing](https://www.listennotes.com/api/pricing/)).
- **Spotify:** exposes neither RSS nor playable audio.

### Deciding a show is dead

"Ended" and "feed dead" are separate states, and no single signal settles either one. Podcast Index's `dead` means the _feed URL_ has failed about 1,000 times, not that the show ended ([dead.yaml](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/dead.yaml)). Reply All ended in 2022, yet its feed still gets promo items, including one dated 2026-03-30 ([Reply All feed](https://feeds.megaphone.fm/replyall)).

The catalog audit found the same pattern again and again:

- **Promo drops.** "Introducing…" items fill dead feeds for years.
- **Re-uploads that scramble dates.** Dirty John's items are all dated 2025-05-14.
- **Shared feeds.** Magnus Archives now shares its feed with its sequel.
- **Missing episodes.** WTF's public feed starts at episode 501.

The data model therefore needs an **explicit per-show episode allowlist keyed by GUID**, ordering by episode number rather than pubDate, and promo filtering so radio mode skips "Introducing…" items (Appendix A). The Sheet should be authoritative, with heuristics only flagging rows for review. One example: alert when a show gains a non-promo item after its recorded end date, as happened with Heavyweight's revival ([Podnews](https://podnews.net/update/heavyweight-pushkin-news)).

### Link rot

Link rot is the main long-term content risk, and analytics prefixes add failure points. Chartable was sunset in December 2024, yet **Reply All's enclosures still route through `chrt.fm`**, a prefix whose owner has warned it "will stop working at some point" ([Podnews](https://podnews.net/update/chartable-final-switchoff); [Reply All feed](https://feeds.megaphone.fm/replyall)). Megaphone redirects to signed URLs with an expiring `timetoken`, so the build should **never persist the final redirect target**.

The resilient record per episode stores four things:

- the raw enclosure;
- a de-prefixed fallback;
- an optional Wayback `id_` URL;
- the last check status.

A weekly checker should send a `GET` with `Range: bytes=0-1` and follow redirects. Apple already requires hosts to support HEAD and byte ranges ([Apple requirements](https://podcasters.apple.com/support/823-podcast-requirements)). Save Page Now can archive feed XML, and the Wayback CDX API reports existing captures: Mystery Show's feed has snapshots back to 2016 ([CDX API](http://web.archive.org/cdx/search/cdx?url=feeds.megaphone.fm/mysteryshow&limit=5&output=json)).

Artwork should be downloaded into `src/assets/` at ingest time, so it outlives its host and passes through `astro:assets` optimization ([Astro images](https://docs.astro.build/en/guides/images/)).

## Shareable URLs, real editorial text and accessible controls drive discovery

### URLs and share cards

Every show and curated episode needs a permanent, human-readable URL, because that URL is what gets shared. It is also the canonical and the `og:url`, which Open Graph defines as "the canonical URL used as the object's permanent ID" ([ogp.me](https://ogp.me/)). `?t=` is a client-side hint that never changes the canonical.

Open Graph has no podcast type. A solid baseline on every page is `og:title`, `og:type`, a 1200×630 `og:image`, `og:url`, `og:description`, plus `og:audio` and `twitter:card=summary_large_image`. How the major consumers behave:

- **Slack** reads oEmbed, Twitter Card and OG tags, fetches referenced media with Range requests, and caches the result for about 30 minutes ([Slack robots](https://api.slack.com/robots)).
- **Mastodon** doesn't render rich iframe cards ([Mastodon PreviewCard](https://docs.joinmastodon.org/entities/PreviewCard/)).
- **X's Player Card** needs X's approval and has to work in every X client, so it is a poor bet for a small site ([Current.org](https://current.org/2017/12/how-to-make-tweets-talk)).

Build-time OG images, from `astro-og-canvas` or Satori with resvg, are the real share asset ([astro-og-canvas](https://github.com/delucis/astro-og-canvas/blob/latest/packages/astro-og-canvas/README.md)). A single Share button should call `navigator.share()` where it exists (it requires a click) and fall back to "Copy link at 12:34" ([MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)). An `/embed/` page with a prebuilt oEmbed JSON file serves bloggers ([oembed.com](https://oembed.com/)).

### Structured data and SEO

Google lists no Podcast rich result, and Google Podcasts shut down in 2024 ([Google Search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery); [TechCrunch](https://techcrunch.com/2024/03/29/google-pushes-podcasts-users-in-u-s-to-move-to-youtube-music-by-april-2/)). Pages should still carry `PodcastSeries` (with `endDate`, which suits a dead show), `PodcastEpisode` with an `AudioObject`, `ItemList` and `BreadcrumbList`. Breadcrumb is the one that can still earn a Google rich result.

The SEO moat is original writing: 150–300 words of "why it's great" per show and a sentence or two per episode. Search demand likely clusters around show names ("Mystery Show best episodes"), and "binge/finished" framing should beat "dead" in search even though "dead pods" works as brand voice.

For a feed of its own, a pointer feed is the right shape: an OPML file of the original feeds, or a Podcasting 2.0 `podcastL` list of `remoteItem` references ([remote-item.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/remote-item.md)). Re-hosting is out.

### Accessibility

The target is WCAG 2.2 AA. It adds 2.5.7 Dragging Movements, which applies to the seek scrubber, 2.5.8 Target Size (at least 24×24 px) and 2.4.11 Focus Not Obscured, which applies to a sticky player bar ([W3C WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)). The player's controls should follow these rules:

- Play, pause and skip are real `<button>` elements with updating labels.
- The seek control is a native range input, or an APG slider with `aria-valuetext` such as "12 minutes 3 seconds of 58 minutes" ([W3C APG Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)).
- Track changes in radio mode are announced through a polite live region.

Third-party audio means full 1.2.1 transcript compliance is often impossible. The practical answer is to link `podcast:transcript` files where a feed has them.

### Performance

Performance comes almost free. Astro's zero-JS default, one hydrated player island, artwork run through `<Image>`/`<Picture>` (taking 3000 px JPEGs down to small AVIF/WebP) and `preload="none"` on audio should meet Core Web Vitals: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 ([web.dev Web Vitals](https://web.dev/articles/vitals)).

## Hotlinking is defensible; proxying, rehosting and pre-roll ads are not

### Copyright

US law protects streaming from the publisher's own URL better than it did a year ago:

- **Perfect 10 v. Amazon (9th Cir. 2007), reaffirmed in Hunley v. Instagram (2023).** The "server test" holds that embedding sites don't display what they don't store ([Loeb & Loeb](https://www.loeb.com/en/insights/publications/2023/07/hunley-v-instagram-llc)).
- **Emmerich Newspapers v. Particle Media (5th Cir., August 2026).** The court rejected the server test but adopted a "transmit" test: "one cannot transmit content it does not have". It found no direct infringement where an authorized source transmits the content and can reject the request, even with ads displayed alongside ([Proskauer](https://www.proskauer.com/insights/get-pdf/30263)).
- **SDNY and the 2d Circuit** remain open or hostile to the server test ([Proskauer on Richardson](https://newmedialaw.proskauer.com/2026/05/05/second-circuit-sidesteps-server-test-in-embedded-video-copyright-ruling-highlighting-how-platform-terms-matter/)).

An `<audio src="publisher.mp3">` player matches the _Emmerich_ facts closely, but no case squarely covers a third-party web podcast player.

The industry's "unwritten contract" draws the same line ([Podnews](https://podnews.net/article/the-unwritten-contract)):

- **Apps may** list feeds, show metadata exactly as supplied and stream from the publisher's host.
- **Apps must not** rehost, cache, proxy, re-encode, insert ads or paywall.

Luminary's 2019 proxying cost it shows from Rogan, Barstool and PRX ([Nieman Lab](https://www.niemanlab.org/2019/04/what-does-luminarys-very-bad-week-tell-us-about-podcasters-collective-power/)).

Mirroring audio when the original disappears is the highest-risk move. Hachette v. Internet Archive shows that archival or nonprofit framing doesn't guarantee fair use ([Authors Alliance](https://www.authorsalliance.org/2024/09/05/hachette-v-internet-archive-update-second-circuit-court-of-appeals-rules-against-internet-archive/)). DMCA §512(c) protects only material stored at a _user's_ direction, never operator copies ([17 U.S.C. §512](https://www.law.cornell.edu/uscode/text/17/512)). The safe options are to link to existing Wayback or archive.org copies, or to rehost only with written permission or a compatible CC license.

### Supporting legal hygiene

- **Artwork.** Take it from the RSS `<itunes:image>`, not the Apple or Spotify APIs, whose terms make art promo-only ([Spotify Developer Policy](https://developer.spotify.com/policy/)).
- **Code vs content licenses.** GPL-3.0 covers the code, not the content. A separate CC BY 4.0 notice for original blurbs, which explicitly excludes third-party audio and art, avoids claiming to license what deadpods doesn't own ([GNU license list](https://www.gnu.org/licenses/license-list.html)).
- **DMCA agent.** Registering a designated agent is cheap insurance once community submissions arrive. The fee was reported at $6, but that figure dates from 2016–2019 coverage, so check the current amount ([Copyright Office](https://www.copyright.gov/dmca-directory/transcripts/renew.pdf)).
- **Privacy.** Cookieless analytics avoids a consent banner in most readings, although vendors dispute the hashed-IP edge case ([Plausible](https://plausible.io/cookieless-web-analytics); [Sealmetrics](https://sealmetrics.com/blog/gdpr-eprivacy-analytics-legal-assessment.md)). The privacy policy should disclose that playback reveals the listener's IP address to publisher and prefix hosts.

### Ads and other revenue

Ads mostly don't pay at this scale:

- **EthicalAds** requires 50,000 pageviews a month and pays about $2.50 CPM to a developer-focused audience ([EthicalAds FAQ](https://www.ethicalads.io/publishers/faq/)). Carbon is invite-only.
- At 10k pageviews a month, display ads would earn roughly $25 a month. They would add cookies and a consent banner, and they would break the Vercel Hobby terms.
- **Pre-roll before third-party episodes** looks like ad insertion and breaks the unwritten contract.

Better fits:

- Bookshop.org affiliate links to hosts' books, at 10% commission ([Bookshop.org](https://support.bookshop.org/en/support/solutions/articles/65000191390-can-you-explain-bookshop-org-s-affiliate-program-)).
- A Ko-fi tip link (0% platform fee on donations).
- Later, a single direct sponsor slot in a "Dead Pod of the Week" newsletter.

A realistic first year is about $0–50 a month.

### Community submissions

Two submission routes keep everything in existing tools:

- **Tally**, free with native Sheets integration ([Tally pricing](https://www.tally.so/pricing)).
- **An Apps Script `doPost`** that verifies a Cloudflare Turnstile token before appending a row ([Cloudflare Turnstile](https://developers.cloudflare.com/pages/functions/plugins/turnstile/)).

Moderation is a `status` column in a Submissions tab, with only approved rows published. A GitHub issue form offers a spam-resistant second channel for technical users ([GitHub issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)). Publishing inclusion criteria up front cuts arguments, for example "ended at least a year ago, back catalog still public".

Anonymous upvotes on a Cloudflare Worker with D1 fit the free tier, which allows 100k writes a day ([Cloudflare D1](https://developers.cloudflare.com/d1/platform/pricing/)). They are trivially gameable, though, so treat votes as a soft "listener favorites" signal and keep curator picks canonical.

## The open lane: non-fiction dead shows, played in the browser

The End is the only well-maintained finished-podcast directory. It is **fiction-only, rates whole shows, and has no in-browser player or best-episode picks** ([The End](https://www.theend.fyi/)). Best-episode curation survives only as aging SEO articles without players, such as Discover Pods' 2019 Reply All list ([Discover Pods](https://discoverpods.com/best-reply-all-episodes/)), and as per-show "start here" pages that die with the show. Apple's closest first-party feature is its October 2024 Series category ([Apple Newsroom](https://www.apple.com/us-es/newsroom/2024/10/apple-podcasts-spotlights-narrative-series)).

Supply is enormous. **39.1% of 14,915 sampled shows had no new episode in over a year** ([Talker News](https://www.columbiagorgenews.com/news/national/are-most-podcasts-dead-four-in-10-without-new-episode-in-a-year/article_e3dd42f0-3a63-5191-82f3-4242c888fa58.html)). Interest in ended shows persists too: Podcast Review ran "Our Enduring Love For Mystery Show" in July 2026 ([Podcast Review](https://podcastreview.org/list/what-to-listen-to-if-you-miss-mystery-show/)).

The archive is fragile. In 2023 alone Spotify cut six more shows in June, then Heavyweight and Stolen in December ([MobileSyrup](https://mobilesyrup.com/2023/12/05/spotify-cancels-two-acclaimed-gimlet-podcasts/)). Shows also come back: Heavyweight returned at Pushkin in 2025 ([Pushkin](https://www.pushkin.fm/news/jonathan-goldstein-joins-pushkin-industries-to-revive-acclaimed-heavyweight-podcast)). So the status taxonomy should include **Ended, Complete limited series, Hiatus and Revived**.

The positioning that follows: lead with non-fiction (Gimlet-era, documentary, chat and comedy), link to The End for audio fiction, and make each show page the permanent "start here" for a dead show.

## The current repo needs five fixes before any features

The repository is the Astro 4 starter with one card. These issues stand out:

1. **No `site` in `astro.config.mjs`.** The config is an empty `defineConfig({})`. `@astrojs/sitemap`, absolute `og:url` and `og:image` values, and canonical URLs all depend on `site: 'https://deadpods.com'`. A trailing-slash policy should be chosen at the same time.
2. **Placeholder meta description.** `src/layouts/Layout.astro` ships `<meta name="description" content="Astro description" />`. It has no OG tags, no Twitter tags and no canonical link, and the home title is the only per-page title.
3. **The purple accent fails contrast.** `--accent: 136, 58, 234` (#883aea) measures **3.34:1 on the #13151a page background and 2.77:1 on the #23262d card background**, against 4.5:1 required for normal text and 3:1 for UI components. These ratios were computed locally with the WCAG luminance formula. The gradient `h1` passes only because it counts as large text. Use accent-light (#e0ccfa, 10.2:1) for text, or lighten the accent to about #a77bf3 and recheck. Also add `:focus-visible` styles, mark the card arrow `aria-hidden`, and add a forced-colors fallback for the gradient text.
4. **The card links off-site.** The Mystery Show card's `href` points to `gimletmedia.com/shows/mystery-show/...`, a page of a network Wikipedia lists as defunct since 2023 ([Wikipedia: Gimlet Media](https://en.wikipedia.org/wiki/Gimlet_Media)). That defeats the core goal, because the click takes the user away instead of playing. It is also a link-rot liability. It should go to `/mystery-show/` (or `/shows/mystery-show/`), backed by the live feed `https://feeds.megaphone.fm/mysteryshow`. The body text, "A podcast about solving mysteries.", is placeholder copy.
5. **The Astro 4 → 7 upgrade path.** `package.json` pins `astro ^4.12.0` and `@astrojs/check ^0.8.2`. The official route steps through v5 to v6, which requires Node 22.12+, the Content Layer, Zod 4, `getEntry()` and `<ClientRouter />` ([Astro v6 upgrade](https://docs.astro.build/en/guides/upgrade-to/v6/)). The recommended path is to run `npm create astro@latest` on 7.x, port `index.astro`, `Card.astro` and `Layout.astro`, and pin Node 22+ in `.nvmrc` and `engines`. Choose a version **at or after the release that contains PR #17750**, because 7.2.1–7.2.4 broke persisted audio. The package name is still `deadpodcasts`, and the repo has no CI, no content collection and no LICENSE notice for content.

## Skills map

| Skill area                   | Specific skills                                                                                                                                                              | Tools / libraries                                                         | Difficulty                           | Priority                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| Astro platform               | v7 scaffold, Content Layer custom loaders, `getStaticPaths`, ClientRouter + `transition:persist`, islands, Zod 4 schemas                                                     | Astro 7.x, `astro/zod`, `@astrojs/check`, TypeScript                      | Medium                               | MVP                                            |
| Media engineering            | One shared `Audio()`, `play()` promise and `NotAllowedError` handling, `MediaError` codes, `ended`-driven src swap, gesture unlock, dead-link skip, resume and `?t=` parsing | Vanilla TS, nanostores, optional media-chrome                             | **High**                             | MVP                                            |
| Lock-screen / OS integration | Media Session metadata, action handlers, `setPositionState` guards, artwork sizes                                                                                            | Media Session API                                                         | Medium                               | MVP                                            |
| Cross-browser QA             | iOS Safari and Android device testing, autoplay matrix, regression e2e (navigate and keep playing)                                                                           | Playwright, real iPhone on iOS 26, BrowserStack-type service              | **High**                             | MVP                                            |
| Data plumbing                | Sheets API v4 or service account, hash-gated snapshot, Zod coercion, header validation                                                                                       | `fetch`, `googleapis`/`google-spreadsheet`, GitHub Actions                | Low–Medium                           | MVP                                            |
| Feed ingestion               | RSS/iTunes parsing, GUID allowlists, promo filtering, episode-number ordering, artwork download                                                                              | `fast-xml-parser` or `podcast-partytime`, Apple Lookup, Podcast Index API | Medium                               | MVP (manual) → Phase 2 (automated)             |
| Link-rot / preservation      | Range-GET checker following redirects, de-prefixing, Wayback CDX / SPN2, status taxonomy                                                                                     | lychee, custom Node script, Wayback APIs                                  | Medium                               | Phase 2                                        |
| Editorial curation           | Selecting best episodes, writing "why it's great" blurbs, criteria, status judgments                                                                                         | Google Sheet, style guide                                                 | Medium (time-heavy)                  | MVP                                            |
| Sharing / social             | OG/Twitter tags, build-time OG images, Web Share and copy-at-time, oEmbed, embed page                                                                                        | astro-og-canvas or Satori + resvg, `navigator.share`                      | Medium                               | MVP (tags, share) → Phase 2 (OG images, embed) |
| SEO / structured data        | IA and slugs, canonicals, sitemap, JSON-LD (PodcastSeries/Episode, ItemList, Breadcrumb), internal linking                                                                   | `@astrojs/sitemap`, `schema-dts`, validator.schema.org                    | Low–Medium                           | MVP                                            |
| Accessibility                | WCAG 2.2 AA, APG slider, live regions, focus styles, contrast fixes, target size                                                                                             | axe, Lighthouse, screen readers (VoiceOver/NVDA)                          | Medium                               | MVP                                            |
| Performance                  | Zero-JS default, image pipeline, `preload="none"`, CWV budgets                                                                                                               | `astro:assets`, Lighthouse CI                                             | Low                                  | MVP                                            |
| DevOps / hosting             | Cron workflows, concurrency groups, secrets, static deploy, 60-day cron keepalive                                                                                            | GitHub Actions, Cloudflare (wrangler) or GitHub Pages                     | Low–Medium                           | MVP                                            |
| Analytics                    | Cookieless pageviews plus `play` / `listened-30s` events                                                                                                                     | Umami Cloud or GoatCounter                                                | Low                                  | MVP                                            |
| Legal / licensing            | Hotlink-only posture, attribution and disclaimer, content license, takedown process, DMCA agent, privacy policy                                                              | CC BY 4.0 notice, copyright.gov DMCA directory                            | Low (process), legal review optional | MVP (posture) → Phase 3 (DMCA agent)           |
| Community                    | Submission form + Turnstile, sheet moderation, GitHub issue forms, inclusion criteria                                                                                        | Tally or Apps Script, Cloudflare Turnstile                                | Medium                               | Phase 3                                        |
| Voting                       | Anonymous upvotes, salted voter hash, rate limits, Wilson ranking                                                                                                            | Cloudflare Worker + D1                                                    | Medium–High                          | Later                                          |
| Monetization / growth        | Affiliate links, tip jar, newsletter, Reddit/Bluesky outreach, sponsor slot                                                                                                  | Bookshop.org, Ko-fi, Buttondown                                           | Low                                  | Phase 3+                                       |
| PWA / offline                | Manifest, minimal SW that ignores audio requests; offline downloads deferred                                                                                                 | Workbox (later)                                                           | High for offline                     | Later                                          |

## Recommended MVP architecture and phased roadmap

### Architecture

The MVP is a fully static Astro 7 site on Cloudflare static assets or GitHub Pages, with a single persistent player.

**Content flow.** The curator edits a Google Sheet with two tabs, Shows and Episodes. Columns include slug, title, feed URL, years, status, a blurb, and the episode GUID allowlist with editorial notes and optional start offsets. An hourly GitHub Actions job, scheduled off the top of the hour, does the following:

1. Fetches both tabs in one `values:batchGet`.
2. Validates them with Zod.
3. Fetches each listed show's RSS feed to resolve enclosures, durations and artwork.
4. Writes `data/snapshot.json` and downloads artwork into `src/assets/art/`.
5. Commits only if the hash changed.

The push triggers a build-and-deploy workflow that runs `astro check`, the build, internal link checks and Lighthouse budgets.

**Site structure.**

- `/` holds the giant "Tune in" button and the curated list.
- `/[show]/` and `/[show]/[episode]/` pages carry OG tags, JSON-LD and canonicals.
- `/radio.json` (or inlined data) holds the queue.
- `/feeds.opml` lists the original feeds.

**Player.** One `new Audio()` singleton lives in a `transition:persist` Layout component. It uses nanostores for state, Media Session for lock-screen controls, auto-skip on error, and localStorage for resume.

**Fallbacks.** Audio always streams from the original enclosure URL, with the de-prefixed URL as fallback. There is no server, proxy or database.

### Phases

| Phase                                   | Scope                                                                                                                                                                                                                                                                                        | Exit criteria                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Groundwork (days)**               | Re-scaffold on Astro 7.x (version with PR #17750 fix), Node 22+, `site` config, real meta and OG base, contrast and focus fixes, content license and disclaimer, CI skeleton                                                                                                                 | Lighthouse a11y ≥ 95; no placeholder metadata                                                                                             |
| **1 — MVP "one tap radio" (2–4 weeks)** | Sheet → snapshot pipeline; 15–25 shows from Appendix A with 2–5 best episodes each and original blurbs; show and episode pages; persistent player with auto-advance, Media Session, `?t=` deep links, share/copy-at-time; sitemap, JSON-LD; Umami play events                                | Playback survives two navigations (Playwright); auto-advance verified on iOS 26 Safari tab, Android Chrome, desktop Chrome/Firefox/Safari |
| **2 — Resilience and reach**            | Weekly enclosure health checker that opens issues; de-prefix and Wayback fallbacks; status taxonomy + revival detector; build-time OG images; embed page + oEmbed; collections ("Gimlet graveyard", "Done in a day"); seeded shareable stations (`/radio?seed=`); expand toward all 76 shows | Zero silent failures in radio mode; every page has a unique OG image                                                                      |
| **3 — Community and sustainability**    | Submission form (Tally or Apps Script + Turnstile) with sheet moderation; GitHub issue form; published inclusion criteria; DMCA agent + takedown page; privacy policy; Ko-fi, Bookshop affiliate links; newsletter                                                                           | Submissions flowing without spam; takedown path documented                                                                                |
| **Later**                               | Anonymous voting (Worker + D1) as "listener favorites"; move content to git-native YAML/Keystatic if contributors grow; transcripts via `podcast:transcript`; PWA manifest (no offline audio); a direct sponsor once traffic warrants                                                        | Driven by traffic and contributor demand                                                                                                  |

## Conclusion

The project's center of gravity is not where the README puts it. The README treats the Sheet-to-page refresh as the hard part, but that is a solved, nearly free pattern, especially once the snapshot is committed to git. The hard part is the **five seconds after the first tap**: keeping one audio element alive and permitted through navigations, lock screens, iOS quirks and dead links, so radio mode never falls silent. Close behind is the **curation discipline** that makes dead feeds usable: GUID allowlists, promo filtering, date-scrambled re-uploads and revival detection. The skills that matter most are therefore media engineering, device QA and editorial judgment, not CMS work.

Two things favor deadpods. The legal ground for hotlinking firmed up in 2026 with _Emmerich_. And the playable archive is larger than expected, because most of Gimlet's catalog is still on public Megaphone feeds. That archive is held at Spotify's discretion, though. Building the link checker and feed snapshots early is therefore part of the product, not optional hygiene: when the next catalog goes dark, deadpods can show what was lost and where an archived copy lives.

---

## Appendix A — Retired podcast seed catalog (status as of 2026-10-20)

**How this was checked.** Feed URLs come from the Apple iTunes Search API's `feedUrl` field. On 2026-10-20 every candidate feed was fetched directly, and its item count, oldest and newest items, and the presence of the candidate best-episode titles were recorded. "Last real ep" is the last actual episode of the show. Many dead feeds still get promo drops for other shows, so the feed's newest date is often _not_ the show's end date. Every feed URL below returned HTTP 200 with `<enclosure>` audio on 2026-10-20 unless marked otherwise, and no feed URL was guessed.

**Evidence key.**

- **[feed]**: verified directly from the RSS feed on 2026-10-20 (titles, dates, counts). This means the episode exists and plays, not that critics agree it is the best.
- **[unsourced]**: editorial pick or general reputation, with no critic or fan consensus source found.

**Only two picks have cited consensus:**

- **Mystery Show's "Belt Buckle"**: #1 on The Atlantic's top 50 podcast episodes of 2015, and the show was Apple's Best New Podcast of 2015 ([Wikipedia](https://en.wikipedia.org/wiki/Mystery_Show)).
- **WTF's Obama episodes** ([NPR](https://www.npr.org/2025/10/13/nx-s1-5573479/obama-marc-maron-wtf-podcast-last)).

All other picks are a starting point, not consensus. Shows marked **uncertain** may be dormant rather than ended.

### A. Narrative / investigative / documentary

| #   | Show                                                | Host(s) · Network                                               | Years              | Best / starter episodes                                                                                                                           | Feed URL                                                                                                                                                          | Status                                                                                                                                                                                     |
| --- | --------------------------------------------------- | --------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Mystery Show                                        | Starlee Kine · Gimlet                                           | 2015               | **Case #3 Belt Buckle** (Atlantic #1 ep of 2015, [Wiki](https://en.wikipedia.org/wiki/Mystery_Show)); Case #2 Britney; Case #1 Video Store [feed] | https://feeds.megaphone.fm/mysteryshow                                                                                                                            | Ended, full archive (7 items: trailer + Cases #1–#6, last 2015-07-31)                                                                                                                      |
| 2   | Reply All                                           | PJ Vogt, Alex Goldman (later Emmanuel Dzotsi) · Gimlet          | 2014–2022          | #102–103 Long Distance; #158 The Case of the Missing Hit; #130 The Snapchat Thief; #86 Man of the People; #79 Boy in Photo [feed]                 | https://feeds.megaphone.fm/replyall                                                                                                                               | Ended ("#189 Goodbye All" 2022-06-23). 214 items, later ones promos; pulled Bon Appétit eps absent. Enclosures still use `chrt.fm` prefix                                                  |
| 3   | S-Town                                              | Brian Reed · Serial Productions / This American Life            | 2017               | Chapter I; Chapter VI [feed]                                                                                                                      | https://feeds.simplecast.com/P0BiJiki                                                                                                                             | Limited series, complete (Chapters I–VII)                                                                                                                                                  |
| 4   | Surprisingly Awesome                                | Adam Davidson, Adam McKay (later others) · Gimlet               | 2015–2017          | #1 Mold; #2 Free Throws; #3 Concrete; #6 Broccoli [feed]                                                                                          | https://feeds.megaphone.fm/surprisinglyawesome                                                                                                                    | Ended 2017 (32 items)                                                                                                                                                                      |
| 5   | Every Little Thing                                  | Flora Lichtman · Gimlet                                         | 2017–2022          | "Rapture Chasers" (ep 1) [feed; pick unsourced]                                                                                                   | https://feeds.megaphone.fm/elt-spot                                                                                                                               | Ended ("Goodbye" 2022-10-11), cut by Spotify ([Siècle Digital](https://siecledigital.fr/2022/10/07/spotify-supprime-11-podcasts-originaux/)). 213 items                                    |
| 6   | Crimetown (S1)                                      | Marc Smerling, Zac Stuart-Pontier · Gimlet                      | 2016–2018          | S1 E01 Divine Providence; S1 E17 The Trial of Buddy Cianci [feed]                                                                                 | https://feeds.megaphone.fm/crimetown                                                                                                                              | Ended (S2 originally Spotify-exclusive). 54 items, now carries promos                                                                                                                      |
| 7   | Missing Richard Simmons                             | Dan Taberski · Pineapple Street / First Look (now "Headlong")   | 2017               | "Where's Richard?" (ep 1) [feed]                                                                                                                  | https://rss.art19.com/missing-richard-simmons                                                                                                                     | Limited, complete. Feed retitled "Headlong: Missing Richard Simmons"; memorial item 2024-07-19                                                                                             |
| 8   | Dirty John                                          | Christopher Goffard · LA Times / Wondery                        | 2017               | Ep. 1: The Real Thing; Ep 6: Terra [feed]                                                                                                         | https://feeds.simplecast.com/rUWxZcFU                                                                                                                             | Limited, complete. **All items re-dated 2025-05-14**, so order by title                                                                                                                    |
| 9   | Invisibilia                                         | Lulu Miller, Alix Spiegel, Hanna Rosin (later others) · NPR     | 2015–2023          | The Secret History of Thoughts; Fearless; How to Become Batman; Entanglement [feed]                                                               | https://feeds.npr.org/510307/podcast.xml                                                                                                                          | Ended, cancelled March 2023 ([NPR](https://www.npr.org/2023/03/23/1165559810/npr-layoffs-cancels-podcasts-invisibilia-rough-translation)). Only 89 items; recent items are Embedded promos |
| 10  | Rough Translation                                   | Gregory Warner · NPR                                            | 2017–2023          | "Brazil In Black And White"; "Calling It Quits" [feed; picks unsourced]                                                                           | https://feeds.npr.org/510324/podcast.xml                                                                                                                          | Ended (last item 2023-12-27). 102 items                                                                                                                                                    |
| 11  | Wind of Change                                      | Patrick Radden Keefe · Pineapple Street / Crooked               | 2020               | "1. My Friend Michael" [feed]                                                                                                                     | https://feeds.megaphone.fm/wind-of-change-wide                                                                                                                    | Limited, complete; feed now runs Keefe promos                                                                                                                                              |
| 12  | Uncivil                                             | Jack Hitt, Chenjerai Kumanyika · Gimlet                         | 2017–2018          | The Raid; The Paper [feed]                                                                                                                        | https://feeds.megaphone.fm/uncivil                                                                                                                                | Ended 2018                                                                                                                                                                                 |
| 13  | The Habitat                                         | Lynn Levy · Gimlet                                              | 2018               | Episode 1: This Is the Way Up [feed]                                                                                                              | https://feeds.megaphone.fm/thehabitat-spot                                                                                                                        | Limited, complete (7 eps)                                                                                                                                                                  |
| 14  | Containers                                          | Alexis Madrigal · Fusion                                        | 2017               | Episode 1: Welcome to Global Capitalism [feed]                                                                                                    | https://feeds.megaphone.fm/PPY8156500299                                                                                                                          | Limited, complete (8 eps)                                                                                                                                                                  |
| 15  | Floodlines                                          | Vann R. Newkirk II · The Atlantic                               | 2020               | "Richard" (ep 1) [feed]                                                                                                                           | https://feeds.megaphone.fm/floodlines                                                                                                                             | Limited, complete (+ later promos)                                                                                                                                                         |
| 16  | Spectacular Failures                                | Lauren Ober · APM                                               | 2019–2021          | "MoviePass begins with plenty of drama" [feed]                                                                                                    | https://feeds.publicradio.org/public_feeds/spectacular-failures                                                                                                   | Ended                                                                                                                                                                                      |
| 17  | Believed                                            | Kate Wells, Lindsey Smith · NPR / Michigan Radio                | 2018               | The Good Guy; Finale: The Reckoning [feed]                                                                                                        | https://feeds.npr.org/510326/podcast.xml                                                                                                                          | Limited, complete                                                                                                                                                                          |
| 18  | Man in the Window                                   | Paige St. John · LA Times / Wondery                             | 2019–2020          | "Phantom in the Fog \| 1" [feed]                                                                                                                  | https://feeds.simplecast.com/rbsNcYty                                                                                                                             | Limited, complete                                                                                                                                                                          |
| 19  | Atlanta Monster                                     | Payne Lindsey · Tenderfoot / iHeart                             | 2018               | "Boogeyman [1]" [feed]                                                                                                                            | https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/c87d032f-eef9-4503-b3fd-ae2e01547101/9dbbaaec-9950-4aa4-9958-ae2e0154710f/podcast.rss | Ended S1; bonus 2025                                                                                                                                                                       |
| 20  | Finding Fred                                        | Carvell Wallace · iHeart / Fatherly                             | 2019               | "A Genius of Empathy" [feed]                                                                                                                      | https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/586d072d-9415-44e6-b35e-ae320005b7ed/30116cde-c4da-4232-8908-ae320005b817/podcast.rss | Limited, complete                                                                                                                                                                          |
| 21  | Dolly Parton's America                              | Jad Abumrad · WNYC / OSM Audio                                  | 2019               | "The Only One For Me, Jolene"; "Sad Ass Songs" [feed]                                                                                             | https://feeds.simplecast.com/kZ0W9vjc                                                                                                                             | Limited, complete                                                                                                                                                                          |
| 22  | The Butterfly Effect + The Last Days of August      | Jon Ronson · Audible (now public)                               | 2017, 2019         | Butterfly Effect Ep. 1: A Nondescript Building in Montreal [feed]                                                                                 | https://rss.libsyn.com/shows/102191/destinations/541929.xml                                                                                                       | Both limited series complete in one shared feed (16 items)                                                                                                                                 |
| 23  | Things Fell Apart                                   | Jon Ronson · BBC Radio 4                                        | 2022–2024          | "1000 Dolls" [feed]                                                                                                                               | https://podcasts.files.bbci.co.uk/m002j8rl.rss                                                                                                                    | Last item 2024-07; **ended vs dormant uncertain**                                                                                                                                          |
| 24  | Have You Heard George's Podcast?                    | George the Poet · BBC Sounds                                    | 2019–2023          | "A Grenfell Story" [feed]                                                                                                                         | https://podcasts.files.bbci.co.uk/p07915kd.rss                                                                                                                    | Last item 2023-12-22; **likely ended (uncertain)**                                                                                                                                         |
| 25  | Thinking Sideways                                   | Joe Cabello, Devin Fraser, Steve Fullmer · Independent → iHeart | 2013–2020          | Taman Shud; Dyatlov Pass Incident; Max Headroom broadcast signal intrusion [feed]                                                                 | https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/806e45b0-7b80-468c-b407-ae5a000e65ad/88fc57e7-e403-44e1-b018-ae5a000e65ce/podcast.rss | Ended 2020. **Apple now lists this feed as "CrimeOnline Presents: Coming Soon"**, but the 298 original items are intact; show metadata may be wrong                                        |
| 26  | Presidential                                        | Lillian Cunningham · Washington Post                            | 2016               | George Washington; Abraham Lincoln: His hand and his pen [feed]                                                                                   | http://podcast.posttv.com/itunes-5682a6c9e4b0d623714f2a3b.xml                                                                                                     | Limited (44 presidents); 2024 bonuses and promos since                                                                                                                                     |
| 27  | Constitutional                                      | Lillian Cunningham · Washington Post                            | 2017               | "Framed" [feed]                                                                                                                                   | http://podcast.posttv.com/itunes-5951e18ce4b056ae8fa8e4b2.xml                                                                                                     | Limited, complete                                                                                                                                                                          |
| 28  | West Cork                                           | Sam Bungey, Jennifer Forde · Audible → yarn fm/Acast            | 2018 (public 2021) | "A Good Suspect" [feed]                                                                                                                           | https://feeds.acast.com/public/shows/620c6279-d89b-4719-947d-a5f4b47b44eb                                                                                         | Limited, complete. Originally Audible-exclusive; all items re-dated 2021-03-29                                                                                                             |
| 29  | Missing & Murdered (Alberta Williams; Finding Cleo) | Connie Walker · CBC                                             | 2016–2018          | S2 Episode 10: Cleo's letters [feed]                                                                                                              | https://www.cbc.ca/podcasting/includes/missing.xml                                                                                                                | Ended. **S1 Ep 1 appears missing** (oldest item is S1 Ep 2)                                                                                                                                |
| 30  | Gladiator: Aaron Hernandez & Football Inc.          | Boston Globe Spotlight · Boston Globe / Wondery (now Audible)   | 2018               | "Hail Mary \| 1" [feed]                                                                                                                           | https://rss.art19.com/gladiator-aaron-hernandez-and-football-inc                                                                                                  | Limited, complete                                                                                                                                                                          |
| 31  | Note to Self                                        | Manoush Zomorodi · WNYC                                         | 2013–2019          | Bored and Brilliant challenge series (2015); Infomagical (2016) [feed]                                                                            | https://feeds.simplecast.com/DM6Z9TeF                                                                                                                             | Ended 2019-10-14                                                                                                                                                                           |
| 32  | Undiscovered                                        | Elah Feder, Annie Minoff · Science Friday / WNYC                | 2017–2019          | "Boss Hua and the Black Box" [feed]                                                                                                               | https://feeds.simplecast.com/6VBaBewk                                                                                                                             | Ended 2019                                                                                                                                                                                 |
| 33  | How to Save a Planet                                | Alex Blumberg, Ayana Elizabeth Johnson · Gimlet                 | 2020–2022          | "How Screwed Are We?" [feed]                                                                                                                      | https://feeds.megaphone.fm/howtosaveaplanet-spot                                                                                                                  | Ended 2022-10 (Spotify cut, [Siècle Digital](https://siecledigital.fr/2022/10/07/spotify-supprime-11-podcasts-originaux/))                                                                 |
| 34  | Flash Forward                                       | Rose Eveleth · Independent                                      | 2015–2022          | "A Womb Away From Home" (ep 1) [feed]                                                                                                             | https://feeds.transistor.fm/flash-forward                                                                                                                         | Last real ep 2022-12; **likely ended (uncertain)**                                                                                                                                         |
| 35  | Here Be Monsters                                    | Jeff Emtman · Independent / KCRW                                | 2012–2025          | "HBM001: Prisoner's Cinema" [feed]                                                                                                                | https://www.hbmpodcast.com/podcast?format=rss                                                                                                                     | Newest "HBM159: Final Haircuts" 2025-02; **status uncertain**; 155/185 items have audio                                                                                                    |
| 36  | Benjamen Walker's Theory of Everything              | Benjamen Walker · Radiotopia                                    | 2013–2024          | "The Clouds" (3-part) [feed]                                                                                                                      | https://feeds.feedburner.com/TOE                                                                                                                                  | Last item 2024-12-17; **dormant, uncertain**                                                                                                                                               |
| 37  | Love + Radio                                        | Nick van der Kolk · Radiotopia → Luminary → Daylight            | 2005–?             | "Jack and Ellen"; "The Wisdom of Jay Thunderbolt" [feed]                                                                                          | https://feeds.megaphone.fm/QCD1749110814                                                                                                                          | **Uncertain**: 2026 items are only cross-promos; [TheTVDB lists it as "Continuing"](https://thetvdb.com/series/love-and-radio-podcast). Luminary-era S8 (2019) episodes may be missing     |

### B. Fiction / audio drama

| #   | Show                         | Creator(s) · Network                                         | Years     | Start episode(s) [feed]                      | Feed URL                                                                  | Status                                                                                                       |
| --- | ---------------------------- | ------------------------------------------------------------ | --------- | -------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 38  | Limetown                     | Zack Akers, Skip Bronkie · Two-Up                            | 2015–2018 | Episode 1: What We Know                      | https://feeds.megaphone.fm/PPY5621646923                                  | Ended ("S2 Episode 5: Limetown (Finale)" 2018-12-17)                                                         |
| 39  | The Black Tapes              | Paul Bae, Terry Miles · Pacific Northwest Stories            | 2015–2020 | Episode 101 – A Tale of Two Tapes Part I     | https://rss.libsyn.com/shows/67700/destinations/276638.xml                | Last real ep "306 – Into the Black" 2020-01-12; promos since                                                 |
| 40  | Tanis                        | Terry Miles · PNWS / Public Radio Alliance                   | 2015–2021 | Episode 101: Seeking Tanis, Runner Available | https://rss.libsyn.com/shows/73178/destinations/316385.xml                | **Dormant/likely ended (uncertain)**                                                                         |
| 41  | Rabbits                      | Terry Miles · PNWS / Public Radio Alliance                   | 2017–2022 | Episode 101: Game On                         | https://rss.libsyn.com/shows/94480/destinations/479849.xml                | S2 ended 2022-03; **uncertain**                                                                              |
| 42  | Sandra                       | Kevin Moffett, Matthew Derby · Gimlet                        | 2018      | 1. Hope is a Mistake                         | https://feeds.megaphone.fm/sandra-spot                                    | Limited, complete                                                                                            |
| 43  | The Two Princes              | Kevin Christopher Snipes · Gimlet / Spotify                  | 2019–2020 | S1 Ep1: Once Upon a Time                     | https://feeds.megaphone.fm/tp-spot                                        | Ended after S3                                                                                               |
| 44  | Motherhacker                 | Gimlet                                                       | 2019–2021 | 01. ROBOCALLS                                | https://feeds.megaphone.fm/mh-spot                                        | Ended after S2                                                                                               |
| 45  | Alice Isn't Dead             | Joseph Fink · Night Vale Presents                            | 2016–2018 | Part 1, Chapter 1: Omelet                    | https://feeds.megaphone.fm/SBP8990444845                                  | Ended 2018; feed carries Night Vale promos                                                                   |
| 46  | Wolf 359                     | Gabriel Urbina · Kinda Evil Genius                           | 2014–2017 | Episode 1: Succulent Rat-Killing Tar         | https://feeds.megaphone.fm/wolf359radio                                   | Ended; promos since                                                                                          |
| 47  | Archive 81                   | Marc Sollinger, Daniel Powell · Dead Signals                 | 2016–2019 | 01 – A Body In A New Place                   | https://rss.libsyn.com/shows/124004/destinations/733937.xml               | Ended; promos since                                                                                          |
| 48  | The Magnus Archives          | Jonathan Sims · Rusty Quill                                  | 2016–2021 | MAG 0.1 Seed / MAG 1                         | https://feeds.acast.com/public/shows/b6085bcd-3542-4a43-b6a8-021e3fd251b8 | Ended 2021, but **same feed now carries sequel _The Magnus Protocol_** (active 2026). Filter by "MAG" prefix |
| 49  | The Message / LifeAfter      | Mac Rogers et al. · GE Podcast Theater / Panoply             | 2015–2016 | The Message Ep. 1                            | https://feeds.megaphone.fm/MEGDEMO3576588821                              | Complete, both series in one feed                                                                            |
| 50  | The Shadows                  | Kaitlin Prest · CBC                                          | 2018      | Episode 1: Romantic                          | https://www.cbc.ca/podcasting/includes/theshadows.xml                     | Limited, complete                                                                                            |
| 51  | The Polybius Conspiracy      | Jon Frechette, Todd Luoto · Radiotopia (orig.) / independent | 2017      | Episode One: The Player                      | https://feeds.transistor.fm/the-polybius-conspiracy                       | Complete; re-uploaded with items dated 2022-08-18                                                            |
| 52  | The Thrilling Adventure Hour | Ben Acker, Ben Blacker · Nerdist / WorkJuice                 | 2011–2015 | TAH #3 Jefferson Reid, Ace American          | https://feeds.acast.com/public/shows/6414da1f9a87fc0011e7a8ee             | Original run ended; **feed re-releasing archive episodes in 2026** (verify before treating as dead)          |
| 53  | Dead Eyes                    | Connor Ratliff · Headgum                                     | 2020–2022 | 01 – He's Having Second Thoughts; 31 – Tom   | https://rss.pdrl.fm/88c334/rss.art19.com/dead-eyes                        | Ended ("31 – Tom" 2022-03; live special 2023)                                                                |

### C. Comedy

| #   | Show                 | Host(s) · Network                            | Years     | Best / starter eps [feed]                                     | Feed URL                                                                 | Status                                        |
| --- | -------------------- | -------------------------------------------- | --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| 54  | Analyze Phish        | Harris Wittels, Scott Aukerman · Earwolf     | 2011–2014 | Phish 101; Hollywood Bowl                                     | https://feeds.simplecast.com/8KEG8Ogf                                    | Ended (10 eps); Wittels died 2015 [unsourced] |
| 55  | Spontaneanation      | Paul F. Tompkins · Earwolf → indie           | 2015–2019 | "A Denny's Parking Lot" (ep 1)                                | https://rss.libsyn.com/shows/593520/destinations/5158160.xml             | Last ep 2019-01-21                            |
| 56  | Harmontown           | Dan Harmon, Jeff Davis · Feral Audio / indie | 2012–2019 | "Achieve Weightlessness" (ep 1); "Harmontown Reunion!" (2021) | https://feeds.megaphone.fm/harmontown                                    | Ended 2019                                    |
| 57  | 2 Dope Queens        | Phoebe Robinson, Jessica Williams · WNYC     | 2016–2018 | "Who Dis?"; "Best of: Becoming Michelle Obama"                | https://feeds.simplecast.com/0gOGlZsI                                    | Ended                                         |
| 58  | Sooo Many White Guys | Phoebe Robinson · WNYC                       | 2016–2019 | "Phoebe and Lizzo Get Lit"                                    | https://feeds.simplecast.com/SMV_Gckn                                    | Ended                                         |
| 59  | Bodega Boys          | Desus Nice, The Kid Mero · Red Bull / indie  | 2015–2021 | "Episode 1 WE GOT WINGS"                                      | https://feeds.soundcloud.com/users/soundcloud:users:169774121/sounds.rss | Ended 2021-11-15                              |

### D. Interview / culture

| #   | Show                                    | Host(s) · Network                                       | Years     | Best eps                                                                                                                                                                                                                            | Feed URL                                                                                                                                                          | Status                                                                                                                                                                                                   |
| --- | --------------------------------------- | ------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 60  | WTF with Marc Maron                     | Marc Maron · indie / Acast                              | 2009–2025 | Ep 613 President Barack Obama (2015); Ep 1686 Barack Obama (series finale, 2025-10-13) ([NPR](https://www.npr.org/2025/10/13/nx-s1-5573479/obama-marc-maron-wtf-podcast-last)); Robin Williams (2010, rebroadcast as Ep 926) [feed] | https://feeds.acast.com/public/shows/62a222737c02140013aa4c03                                                                                                     | **Ended 2025-10-13** ([AV Club](https://www.avclub.com/barack-obama-wtf-with-marc-maron-final-episode)). **Public feed starts at Ep 501 (2014)**; Eps 1–500 not public (likely paid archive, unverified) |
| 61  | Longform                                | Aaron Lammer, Max Linsky, Evan Ratliff · Longform / Vox | 2012–2024 | Ep 1 Matthieu Aikins; Ep 3 David Grann; Ep 585 John Jeremiah Sullivan (final) [feed]                                                                                                                                                | https://feeds.megaphone.fm/VMP6079657536                                                                                                                          | Ended 2024-06-26 (653 items)                                                                                                                                                                             |
| 62  | Call Your Girlfriend                    | Ann Friedman, Aminatou Sow · indie / Stitcher           | 2014–2022 | "Pilot: Say My Name"; "Farewell" [feed]                                                                                                                                                                                             | https://www.omnycontent.com/d/playlist/2a15ad0f-779b-4334-bfba-af1d00e28029/d729c59d-9a7c-4e3a-8e0d-af1d00e50f2d/8884db02-3309-4a58-9b6a-af1d00e50f44/podcast.rss | Ended 2022-02-11                                                                                                                                                                                         |
| 63  | Another Round                           | Heben Nigatu, Tracy Clayton · BuzzFeed                  | 2015–2017 | Ep 28 "Madam Secretary, What's Good?" (with Hillary Clinton) [feed]                                                                                                                                                                 | https://anchor.fm/s/97d9ed0/podcast/rss                                                                                                                           | Ended 2017-12                                                                                                                                                                                            |
| 64  | Nancy                                   | Kathy Tu, Tobin Low · WNYC                              | 2017–2020 | "Hello, Hello"; "Nancy Was Here" (finale) [feed]                                                                                                                                                                                    | https://feeds.simplecast.com/6bO7pkNF                                                                                                                             | Ended 2020-06-29                                                                                                                                                                                         |
| 65  | The Nod                                 | Brittany Luse, Eric Eddings · Gimlet (later Spotify)    | 2017–2021 | "Greetings, My Brothas" [feed]                                                                                                                                                                                                      | https://feeds.megaphone.fm/thenod                                                                                                                                 | Ended (145 items)                                                                                                                                                                                        |
| 66  | Brought to You By… (fka Household Name) | Dan Bobkoff · Business Insider                          | 2018–2020 | "1: TGI Fridays: The Tinder of the 1960s" [feed]                                                                                                                                                                                    | https://rss.art19.com/household-name                                                                                                                              | Ended 2020-12-09                                                                                                                                                                                         |
| 67  | The Mortified Podcast                   | David Nadelberg et al. · Radiotopia                     | 2015–2024 | "01 Tom: My Funny Valentine" [feed]                                                                                                                                                                                                 | https://feeds.feedburner.com/MortifiedPod                                                                                                                         | Last items Dec 2024; **likely ended (uncertain)**                                                                                                                                                        |

### E. History / tech / sports

| #   | Show                | Host(s) · Network                                | Years     | Best eps [feed]                                          | Feed URL                                                 | Status                                                                                             |
| --- | ------------------- | ------------------------------------------------ | --------- | -------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 68  | The History of Rome | Mike Duncan · indie                              | 2007–2012 | "001- In the Beginning"; "003a- The Seven Kings of Rome" | https://rss.libsyn.com/shows/17332/destinations/5627.xml | Complete (193 items); some early numbers re-dated 2010                                             |
| 69  | Hypercritical       | John Siracusa, Dan Benjamin · 5by5               | 2011–2012 | "1: Dream Crusher"; "100: Metacritical" (finale)         | https://feeds.fireside.fm/hypercritical/rss              | Ended (100 eps)                                                                                    |
| 70  | Debug               | Guy English, Rene Ritchie · iMore / Relay        | 2012–2016 | "1: Loren Brichter and Letterpress"                      | https://relay.fm/debug/feed                              | Ended 2016-12                                                                                      |
| 71  | Ctrl-Walt-Delete    | Walt Mossberg, Nilay Patel · The Verge           | 2015–2017 | "Walt and Nilay sign off" (2017-06-13)                   | https://feeds.megaphone.fm/ctrl-walt-delete              | Ended 2017 (Mossberg retired)                                                                      |
| 72  | Exponent            | Ben Thompson, James Allworth · Stratechery       | 2014–2022 | "Episode 001 – The Garbage Truck Song"                   | https://exponent.fm/feed/                                | Last ep 2022-12; **dormant, uncertain**                                                            |
| 73  | Back to Work        | Merlin Mann, Dan Benjamin · 5by5                 | 2011–2024 | "Episode 1: Alligator in the Bathroom"                   | https://feeds.fireside.fm/backtowork/rss                 | Last ep 2024-04; **uncertain**                                                                     |
| 74  | Under the Radar     | Marco Arment, David Smith · Relay                | 2015–2025 | "1: Adapting to the Market"; "331: Reflection"           | https://relay.fm/radar/feed                              | Last ep 2025-11-06; **likely ended, unconfirmed**                                                  |
| 75  | Hello Internet      | CGP Grey, Brady Haran · indie                    | 2014–2020 | "H.I. #136: Dog Bingo" (last)                            | http://www.hellointernet.fm/podcast?format=rss           | **Indefinite hiatus since 2020-02, not formally ended.** Feed holds only last 100 eps (#50 onward) |
| 76  | Hang Up and Listen  | Stefan Fatsis, Josh Levin, Joel Anderson · Slate | 2008–2026 | "Hanging Up and Listening" (2026-04-14)                  | https://my.slate.com/podcasts/feeds/hang-up/             | Final-sounding episode 2026-04-14; **ended per title, no announcement found**                      |

### Catalog caveats for the data model

- **Promo drops.** Dead feeds get "Introducing…" items for years: Reply All 2026-03, Wind of Change 2026-03, Limetown 2021, Black Tapes/Tanis 2021–2023. Skip items whose titles start with "Introducing", "Presenting", "Listen Now" or "You Might Also Like", and items with `itunes:episodeType` of trailer or bonus.
- **Re-uploads scramble dates.** Dirty John, West Cork, Polybius and The History of Rome are affected. Order by episode or season number or the parsed title number.
- **Shared feeds.** Magnus Archives/Protocol, Butterfly Effect/Last Days of August and The Message/LifeAfter each need per-show filters.
- **Missing episodes.** WTF (1–500), Hello Internet (1–49), Missing & Murdered (S1E1) and Reply All (Bon Appétit episodes) are incomplete. Store an explicit GUID allowlist per show rather than "play the whole feed".
- **Thin evidence.** Critic consensus was not found for most picks, and "why beloved" lines lack award citations.

### Unavailable, paywalled, revived or excluded

**No public RSS.** These have Apple pages but `feedUrl: null` in the iTunes Search API on 2026-10-20, which suggests they are Spotify-only (not verified on Spotify):

- StartUp (Apple id 913805339)
- Homecoming (1170934381)
- Without Fail (1437293054)
- Mogul (1247146656)
- The Clearing (1471432747, Pineapple Street/Gimlet)

Context: Spotify "shut off the RSS feeds for many of its acquired and licensed podcasts" ([Simon Owens](https://simonowens.substack.com:443/p/is-spotifys-podcast-exclusivity-strategy)).

**NYT paywall.** Archives went subscriber-only from about October 2024 ([Inside Radio](https://www.insideradio.com/free/new-york-times-to-put-podcast-archives-behind-new-paywall-new-episodes-will-stay-free/article_d7df0382-7c46-11ef-9c40-13c869002acd.html); [Axios](https://www.axios.com/2024/09/24/new-york-times-audio-subscriptions-apple-spotify)). Public feeds checked 2026-10-20 carry only a few items:

- Caliphate: 2 items, https://feeds.simplecast.com/Kaj9iZFl. **Recommend excluding**: NYT retracted its core claims in 2020 (not re-verified).
- 1619: 3 items, https://feeds.simplecast.com/M4uRd8jQ
- Rabbit Hole: 3 items, https://feeds.simplecast.com/rRMR9QHI
- Nice White Parents: intro + Ep 1, https://feeds.simplecast.com/B07_EAQq
- Still Processing: intro + Eps 1–2, https://feeds.simplecast.com/YXhATe6k
- Modern Love: 3 items.

S-Town is still complete despite being Serial/NYT.

**Not found or not usable:**

- Professor Blastoff: no Apple match.
- The B.S. Report and Grantland podcasts: no Apple listing.
- Joe Frank Podcast: the listed feed returns **HTTP 404**.
- The Ricky Gervais Show: an anchor.fm feed started in 2024, officialness uncertain. **Don't use without verifying rights.**
- Jalen & Jacoby: 1 trailer item only.
- The Teacher's Pet: pulled in Australia in 2019 for legal reasons (not re-verified). **Exclude for legal sensitivity.**

**Revived (exclude):**

- Heavyweight: Pushkin/iHeart since 2025, item 2026-10-15 ([Podnews](https://podnews.net/press-release/heavyweight-pushkin); [WNYC](https://wnyc.org/story/the-return-of-heavyweight/)).
- In the Dark: The New Yorker, item 2026-10-13 ([Wikipedia](<https://en.wikipedia.org/wiki/In_the_Dark_(podcast)>)).
- Hello From the Magic Tavern: Season 6 in October 2026.
- More Perfect: through 2025-11.
- Bear Brook: S3 trailer 2026-09.
- Who Charted?, Superego, The Bright Sessions, Mission to Zyxx, Hunting Warhead, U Talkin' U2 To Me?, Love Me.

**Still active (exclude; each has a feed item dated Sep–Oct 2026):** Serial, Embedded, Slow Burn, Revisionist History, You Must Remember This, The Memory Palace, Song Exploder, Here's the Thing, The Truth, Lore, The Bugle, The Dollop, Comedy Bang Bang, 99% Invisible, Welcome to Night Vale, Twenty Thousand Hertz, Criminal, Ear Hustle, Science Vs, The Heart, Answer Me This, Hollywood Handbook, Dr. Death, Up and Vanished, 30 for 30 Podcasts, Analog(ue).

**Unclear:**

- Revolutions: its ended-vs-active state is unclear.
- Dear Sugars: running reruns, so uncertain.

**Product decision pending:** Serial S1 and Slow Burn S1 could be offered as complete-season entries even though their franchises continue.
