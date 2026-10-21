# Sharing, Discovery/SEO, Structured Data, Accessibility & Performance for deadpods.com (as of Oct 2026)

Context checked in repo: `package.json` pins `astro ^4.12.0`; `astro.config.mjs` is empty (no `site`, no integrations); `src/layouts/Layout.astro` has placeholder `<meta name="description" content="Astro description">`, no OG/Twitter tags, no canonical; `index.astro` links a Card directly to gimletmedia.com (an external page, not a deadpods page). Astro docs now show a v7 upgrade guide, so the project is likely 2–3 majors behind.

## URL / information architecture (per-show & per-episode pages, slugs, ?t= timestamps, canonical)

### Takeaway

Give every show and every curated episode its own static, permanent, human-readable URL on deadpods.com (e.g. `/shows/mystery-show/` and `/shows/mystery-show/case-3-belt-buckle/`). That URL is the share unit, the OG/JSON-LD subject, and the canonical. Treat `?t=` as a client-side playback hint that never changes the canonical.

### Cited Findings

- `og:url` is "the canonical URL used as the object's permanent ID" and is one of four required OG properties (with og:title, og:type and og:image) — [ogp.me](https://ogp.me/)
- Astro prerenders static pages at build time, which is the model this site uses (images are transformed "at build time for prerendered pages") — [Astro Images guide](https://docs.astro.build/en/guides/images/)

### Inferences

- Suggested IA:
  - `/` holds the curated list.
  - `/shows/[show-slug]/` holds the show page: editorial blurb, years active, why it ended, and a list of best episodes.
  - `/shows/[show-slug]/[episode-slug]/` holds the episode page with the player, an editorial note on why this episode, and a link to the original.
  - Optionally add `/lists/[slug]/` for themed collections and `/embed/[show]/[episode]/` for the iframe player.
  - Generate all of these with `getStaticPaths()` from an Astro content collection (one YAML/MD file per show, with episodes nested inside).
- Slugs: lowercase kebab-case, ASCII. Freeze a slug once published, since links get shared. If you rename one, keep a redirect (Astro `redirects` in the config, or host-level `_redirects`).
- Timestamps: support `?t=754` and `?t=12m34s` (YouTube convention). An `<audio>` island reads `URLSearchParams` on load and sets `currentTime` on `loadedmetadata`. For a JS-free fallback, add a Media Fragment on the src (`episode.mp3#t=754`). The canonical stays `https://deadpods.com/shows/x/y/` with no query. Add a "Copy link at current time" button that writes `?t=`.
- Set `site: 'https://deadpods.com'` in `astro.config.mjs`. Both `@astrojs/sitemap` and absolute OG URLs depend on it (`new URL(Astro.url.pathname, Astro.site)`).
- Pick one trailing-slash policy (`trailingSlash: 'always'` or `'never'`) so canonicals match the URLs that are actually served.

### Gaps

- No primary source fetched on how Google treats `?t=` variants. Self-referencing canonicals are standard practice, but I did not verify that against Search Central in this session.

## Open Graph / Twitter-X cards for audio; how Slack, iMessage, Discord, Bluesky and Mastodon unfurl; oEmbed

### Takeaway

Ship a solid baseline on every page: `og:title`, `og:type`, `og:image` (1200×630), `og:url` and `og:description`, plus `twitter:card=summary_large_image`. Add `og:audio`, `og:audio:secure_url` and `og:audio:type` on episode pages as a bonus. Inline playback via X's `twitter:player` needs X's approval and is a poor bet for a small site. oEmbed adds embeds in tools that support it (Slack, WordPress, Notion-type tools). Mastodon does not show rich iframe embeds.

### Cited Findings

- OG required properties: og:title, og:type, og:image, og:url. Audio structured properties are `og:audio`, `og:audio:secure_url` (HTTPS alternate) and `og:audio:type` (MIME, e.g. audio/mpeg); width and height don't apply to audio. Object types include `music.song`, `music.playlist`, `video.episode`, `article` and `website`. There is no podcast type — [ogp.me](https://ogp.me/)
- X Player Card (current docs page excerpt): the card must work in every X client (iOS, Android, web, mobile web) or it won't be approved; the iframe and all assets in the meta tags must use HTTPS — [developer.x.com Player Card](https://developer.x.com/en/docs/x-for-websites/cards/overview/player-card) (search snippet; the page returned HTTP 402 when fetched)
- Archived Player Card rules: content over 10 seconds must not autoplay; stop, pause and play controls are required; Player Cards are "reserved for linear audio and video consumption only" — [Wayback 2014 dev.twitter.com](https://web-wp.archive.org/web/20140816143100/https:/dev.twitter.com/docs/cards/types/player-card)
- Required tags are `twitter:card=player` plus `twitter:player`. X must approve (whitelist) the domain, and the validator first shows the site isn't whitelisted — [Current.org "How to make tweets talk"](https://current.org/2017/12/how-to-make-tweets-talk)
- Slack: the user agent is `Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)`. It reads oEmbed, Twitter Card and Open Graph tags, and if they point at image, video or audio files it fetches those too to validate them. It uses HTTP Range requests and caches results globally for about 30 minutes. The priority order isn't documented — [api.slack.com/robots](https://api.slack.com/robots)
- Mastodon: preview cards come from OpenGraph. Card `type` can be link, photo, video or rich, but `rich` (iframe oEmbed) is "Not currently accepted, so won't show up in practice." Cards have a `blurhash` placeholder and an `authors` array (4.3.0+) — [Mastodon PreviewCard docs](https://docs.joinmastodon.org/entities/PreviewCard/)
- oEmbed: discovery uses `<link rel="alternate" type="application/json+oembed" href="...">` or an HTTP Link header. Every response needs `type` and `version` ("1.0"). The `rich` and `video` types require `html`, `width` and `height`. Consumers should iframe the HTML from a different domain. `maxwidth` and `maxheight` must be respected — [oembed.com](https://oembed.com/)

### Inferences

- Recommended `<head>` for an episode page (in the Layout component, driven by props):
  ```html
  <link rel="canonical" href="https://deadpods.com/shows/mystery-show/case-3-belt-buckle/" />
  <meta property="og:type" content="music.song" />
  <!-- or "article"/"website"; no podcast type exists -->
  <meta property="og:site_name" content="deadpods" />
  <meta property="og:title" content="Case 3: Belt Buckle — Mystery Show" />
  <meta property="og:description" content="(editorial one-liner)" />
  <meta property="og:url" content="https://deadpods.com/shows/mystery-show/case-3-belt-buckle/" />
  <meta property="og:image" content="https://deadpods.com/og/mystery-show/case-3-belt-buckle.png" />
  <meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="..." />
  <meta property="og:audio" content="https://.../episode.mp3" />
  <meta property="og:audio:secure_url" content="https://.../episode.mp3" />
  <meta property="og:audio:type" content="audio/mpeg" />
  <meta name="twitter:card" content="summary_large_image" />
  <link
  	rel="alternate"
  	type="application/json+oembed"
  	href="https://deadpods.com/oembed/mystery-show/case-3-belt-buckle.json"
  />
  ```
  Many teams use `og:type=article` or `website` because `music.song` makes some parsers expect music metadata. Either is valid.
- The following are from general knowledge and were not verified this session (flag them for the writer):
  - iMessage (LinkPresentation) and Discord build cards from OG tags plus `theme-color`.
  - Discord shows inline players only for its own allowlisted providers.
  - Bluesky cards are built by the posting client, which fetches OG tags through Bluesky's "cardyb" service at post time. The card is frozen into the post record, so it does not refresh later.
  - Because of that last point, the OG image must be correct before anyone shares the link.
- A static site can serve oEmbed without a server. Prebuild one JSON file per episode (an Astro endpoint `src/pages/oembed/[...slug].json.ts`) and point the discovery link at it. The trade-off is that `maxwidth` can't be honored dynamically.
- Skip `twitter:player`. It needs X approval, has to work in every client, and gets little reach. `summary_large_image` plus a good OG image is the high-value path.

### Gaps

- I couldn't fetch the current X Player Card doc text (HTTP 402) and couldn't confirm whether X still processes Player Card approvals in 2026.
- Bluesky docs fetch returned empty (the domain redirected to bsky.network), so the Bluesky behavior above is unverified.
- No primary iMessage or Discord documentation found.

## Dynamic OG images in Astro at build time (Satori + resvg, astro-og-canvas, @vercel/og)

### Takeaway

Generate one 1200×630 PNG per show and per episode at build time with a static endpoint. Use `astro-og-canvas` (CanvasKit, simplest, supports a background image and logo) or Satori + `@resvg/resvg-js` (JSX-style layout, best for compositing show artwork with the title). `@vercel/og` is mainly for Vercel or edge runtime use and isn't needed for a static build.

### Cited Findings

- astro-og-canvas:
  - Install with `npm i astro-og-canvas` (pnpm users must also add `canvaskit-wasm`).
  - Create `src/pages/open-graph/[...route].ts` and export `getStaticPaths` and `GET` from `await OGImageRoute({ pages, getImageOptions })`. `pages` can come from a content collection.
  - Options: `title`, `description`, `logo {path,size}`, `bgImage {path, fit: cover|contain|none|fill, position}`, `bgGradient`, `border`, `padding` (default 60), `fonts` (URLs or local paths), `dir`, `cacheDir`. The example output is PNG.
  - Source: [astro-og-canvas README](https://github.com/delucis/astro-og-canvas/blob/latest/packages/astro-og-canvas/README.md)

### Inferences

- Satori pattern (general knowledge, not fetched): in `src/pages/og/[...slug].png.ts`, call `satori(jsxObject, {width:1200,height:630,fonts:[{name,data:ArrayBuffer}]})`, which returns an SVG string. Pass it to `new Resvg(svg).render().asPng()` and return `new Response(png, {headers:{'Content-Type':'image/png'}})`.
  - Satori needs TTF/OTF/WOFF fonts loaded as ArrayBuffers (not WOFF2) and supports a flexbox subset of CSS.
  - Artwork must be embedded as a data URI or fetched as an absolute URL.
  - Download and cache show artwork locally at build time so builds stay deterministic.
- Per-episode design: show artwork square on the left (about 630px), with episode title, show name, "years active" and the deadpods wordmark on the right, on a dark background. Avoid text smaller than about 40px, since thumbnails render small on mobile.
- Respect artwork rights. Cover art is the show's IP. Using it as a thumbnail that identifies and links to the show is common practice, but it isn't legally settled (see the RSS legal section).

### Gaps

- I didn't fetch current Satori or @vercel/og docs for 2026 versions or for compatibility with Astro 5–7.

## Structured data: PodcastSeries / PodcastEpisode / AudioObject / ItemList; Google support; JSON-LD in Astro

### Takeaway

Google no longer lists a Podcast rich result. Its Search gallery has no podcast feature, and Google Podcasts shut down in 2024 in favor of YouTube Music. Still add schema.org JSON-LD (`PodcastSeries`, `PodcastEpisode` with an `associatedMedia` AudioObject, `ItemList` for curated lists, `BreadcrumbList`) for general understanding, other engines and AI crawlers. Of these, only Breadcrumb (and possibly Article) can produce a Google rich result.

### Cited Findings

- The Google Search structured-data gallery currently lists: Article, Breadcrumb, Carousel (only with Recipe, Course list, Restaurant or Movie), Course list, Dataset, Discussion forum, Education Q&A, Employer aggregate rating, Event, Image metadata, Job posting, Local business, Math solver, Movie, Organization, Product, Profile page, Q&A, Recipe, Review snippet, Software app, Speakable, Subscription/paywalled content, Vacation rental and Video. **Podcast is not listed.** — [Google Search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
- Google announced in Sept 2023 that it would discontinue Google Podcasts in 2024, with YouTube Music as its single podcast app. US users had to migrate by April 2, 2024. Users can add RSS shows in YouTube Music, and podcasters could upload RSS feeds to YouTube by Feb 2024 — [TechCrunch](https://techcrunch.com/2024/03/29/google-pushes-podcasts-users-in-u-s-to-move-to-youtube-music-by-april-2/); [9to5Google](https://9to5google.com/2023/09/26/google-podcasts-youtube-music/)
- Google keeps retiring rich results:
  - FAQ rich results were retired May 7, 2026.
  - Seven types were announced for retirement in June 2025 (Book Actions, Course Info, Claim Review, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing).
  - Retired markup can still help Google understand pages.
  - Sources: [TechWyse](https://www.techwyse.com/news/ai-search/google-faq-rich-results-deprecated-2026); [Search Engine Land](https://searchengineland.com/google-drops-reporting-on-several-structured-data-types-461744); [Search Engine Journal](https://www.searchenginejournal.com/google-drops-search-console-reporting-for-six-structured-data-types/555560/)

### Inferences

- Episode page JSON-LD (the schema.org types exist; property choice is based on general knowledge of schema.org):
  ```json
  {
  	"@context": "https://schema.org",
  	"@type": "PodcastEpisode",
  	"url": "https://deadpods.com/shows/mystery-show/case-3-belt-buckle/",
  	"name": "Case 3: Belt Buckle",
  	"episodeNumber": 3,
  	"datePublished": "2015-06-...",
  	"description": "(deadpods editorial blurb)",
  	"timeRequired": "PT45M",
  	"associatedMedia": {
  		"@type": "AudioObject",
  		"contentUrl": "https://.../ep.mp3",
  		"encodingFormat": "audio/mpeg",
  		"duration": "PT45M"
  	},
  	"partOfSeries": {
  		"@type": "PodcastSeries",
  		"name": "Mystery Show",
  		"url": "https://deadpods.com/shows/mystery-show/",
  		"webFeed": "https://original-feed.xml"
  	}
  }
  ```
  - Home and list pages: an `ItemList` of `ListItem` entries with `position` and `url` pointing to show pages.
  - Show pages: a `PodcastSeries` with `webFeed`, `author`, `startDate` and `endDate`. Note that `endDate` on CreativeWorkSeries fits a "dead" podcast well.
  - Add `BreadcrumbList` everywhere (Home › Show › Episode), which is still a supported Google rich result.
- In Astro: `<script type="application/ld+json" set:html={JSON.stringify(data)} />` in the head slot. Escape `</` in strings, or use a small helper such as the `astro-seo-schema` or `schema-dts` types. This was not verified this session.
- Validate with the Schema Markup Validator (validator.schema.org). Google's Rich Results Test will report nothing for podcast types.
- Don't optimize for a podcast SERP feature that no longer exists. Video podcasts on YouTube now dominate Google's podcast surfaces, so linking each show's YouTube or YouTube Music presence (`sameAs`) is a reasonable add.

### Gaps

- I found no official Google statement on retiring the podcast structured-data doc (the old page was `developers.google.com/search/docs/.../podcast`). I only confirmed its absence from the current gallery.
- No source found on YouTube Music indexing third-party web pages.

## Should deadpods publish its own RSS/OPML meta-feed? Legal and technical

### Takeaway

Yes, but as a pointer feed, not a re-host. The Podcasting 2.0 namespace defines list feeds (`<podcast:medium>podcastL</podcast:medium>` or `mixed`) made of `<podcast:remoteItem feedGuid itemGuid>` references, which is exactly a "best episodes" playlist. App support is still limited, though, so a pragmatic version also offers per-show OPML and possibly a classic RSS feed whose enclosures point at the original publisher URLs. Never copy or re-host the MP3s.

### Cited Findings

- `podcast:medium` has list variants (`podcastL`, `musicL`, etc.). A list feed "is intended to exclusively contain one or more remoteItem's." `mixed` covers remote items of different medium types — [podcast-namespace medium.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/medium.md)
- `<podcast:remoteItem>` attributes:
  - Parents: `<channel>`, `<podcast:podroll>`, `valueTimeSplit`, `publisher`.
  - `feedGuid` is required (the remote feed's `podcast:guid`).
  - Optional: `feedUrl` (fallback), `itemGuid` (a specific episode's `<guid>`), `medium` and `title`.
  - The spec's own example is a playlist feed of remote items.
  - Source: [remote-item.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/remote-item.md)
- Legal landscape:
  - Courts haven't clearly settled whether republishing RSS infringes copyright — [Aaron Hall](https://aaronhall.com/are-rss-feeds-copyrighted-2/)
  - In 2016 CBC sent letters to podcast app makers claiming that ingesting its public feeds was infringing commercial use. Michael Geist found that unconvincing — [MobileSyrup](https://mobilesyrup.com/2016/11/10/cbc-explains-why-it-wants-to-withhold-podcast-distribution-from-certain-third-party-apps/); [Boing Boing](https://boingboing.net/2016/11/08/cbc-threatens-podcast-app-make.html)
  - The Luminary controversy was over serving open-feed audio via its own CDN/proxy, which hid download stats from publishers. Luminary said it was pass-through — [Reclaim The Net](https://reclaimthenet.org/podcast-app-luminary-copyright-cdn)
  - "Podjacking" means copying MP3s and re-publishing a feed as your own — [David Herron](https://archive.davidherron.com/davidherron.com/blog/2014-02-07/podjacking-podcasting-and-microformat-danger.html)

### Inferences

- Lowest-risk rules:
  - Link or play the original enclosure URL directly from the publisher's host, so the publisher's analytics and dynamic ad insertion still count the listen.
  - Attribute the show and link to its official feed and site.
  - Write your own descriptions.
  - Honor takedown requests.
  - No proxying, caching or transcoding of audio.
- Dead podcasts carry specific risk: hosts lapse, feeds vanish, or a network moves the back catalog behind a paywall (Spotify/Gimlet-style). Store the original feed URL and `podcast:guid`, and run a build-time link checker for dead enclosures (HEAD requests). Prefer Internet Archive copies only where the license allows.
- Meta-feed options, in order of effort:
  1. An OPML file listing the original feeds of all curated shows. Trivial, and apps import it.
  2. A `podcastL` remoteItem feed (future-facing; few apps resolve it today).
  3. A standard RSS 2.0 "best of" feed with `<enclosure>` pointing to the original URLs, `<guid isPermaLink="false">` reused from the source, and clear attribution in each item. This works in every app now, but it is the most "republishing-like." Consider asking networks for permission, or limit it to shows whose feeds are still public.
- An Astro endpoint `src/pages/feed.xml.ts` (or `@astrojs/rss`) can emit any of these at build time.

### Gaps

- I couldn't load podcastindex.org (403) to check which apps support `podcastL` or remoteItem playlist feeds in 2026.
- No legal case law found on curated pointer feeds specifically. This needs a lawyer's view.

## SEO for curated lists: sitemap, content depth, avoiding thin/duplicate content

### Takeaway

The site's SEO value is its editorial layer. Every show and episode page needs original writing: why it's great, context, why it ended, who it's for. Don't paste publisher descriptions, which already exist on many aggregator pages and add nothing. Use `@astrojs/sitemap` together with the `site` config.

### Cited Findings

- Google's retirements show that schema alone isn't an SEO strategy; rich results keep shrinking — [Search Engine Land](https://searchengineland.com/google-drops-reporting-on-several-structured-data-types-461744)

### Inferences

- `npx astro add sitemap` produces `sitemap-index.xml`. Reference it in `public/robots.txt` (`Sitemap: https://deadpods.com/sitemap-index.xml`). Requires `site` (general Astro knowledge).
- Thin-content avoidance:
  - At least about 150–300 words of original blurb per show.
  - At least 1–3 sentences per episode of "why this one."
  - Quote publisher descriptions only briefly and marked as a quote.
  - Don't create pages for episodes you haven't curated.
- Internal linking: show ↔ episodes ↔ related dead shows by genre, network or era. Add "If you liked X" links. These help users and crawlers.
- Each page needs a unique `<title>` ("Case 3: Belt Buckle — Mystery Show | deadpods") and a unique meta description. Fix the current placeholder "Astro description."
- Link out to the original show and network. Outbound links are fine and show the site is a curator.
- Transcripts (see the accessibility section) also add indexable text, with permission or via publisher-provided `podcast:transcript`.

### Gaps

- I didn't fetch Google's helpful-content and site-reputation-abuse guidance this session.

## Embeds: an embeddable iframe player for bloggers

### Takeaway

Build a minimal standalone page at `/embed/[show]/[episode]/` with `<audio controls>`, artwork, title and a "via deadpods" link. Expose it through a copyable `<iframe>` snippet and an oEmbed discovery link. Mastodon won't render it, but Slack, WordPress and similar consumers can.

### Cited Findings

- oEmbed `rich` and `video` responses carry `html` plus `width`/`height`. Consumers should sandbox third-party HTML in a cross-domain iframe — [oembed.com](https://oembed.com/)
- The archived X Player Card policy required no autoplay over 10s and explicit play/pause/stop controls, which is a good baseline for any embed — [Wayback dev.twitter.com](https://web-wp.archive.org/web/20140816143100/https:/dev.twitter.com/docs/cards/types/player-card)

### Inferences

- Snippet:
  ```html
  <iframe
  	src="https://deadpods.com/embed/mystery-show/case-3-belt-buckle/"
  	width="100%"
  	height="152"
  	title="Mystery Show — Case 3: Belt Buckle (deadpods player)"
  	loading="lazy"
  	allow="autoplay"
  	style="border:0;border-radius:12px"
  ></iframe>
  ```
- The embed page should:
  - Use no layout chrome and tiny CSS, have no JS beyond optional `?t=`, and send `Content-Security-Policy: frame-ancestors *`.
  - Not set `X-Frame-Options` on `/embed/*`, but keep it on other pages.
  - Use `<meta name="robots" content="noindex">` with a canonical to the main episode page to avoid duplicate content.
- A WordPress auto-embed would need oEmbed provider allowlisting in core, so in practice bloggers paste the iframe.

### Gaps

- No current source checked on WordPress or Notion oEmbed allowlist policies.

## Accessibility: WCAG 2.2 AA checklist, contrast in the current theme, transcripts

### Takeaway

WCAG 2.2 AA is the target. The current starter theme mostly passes for body text: white on #13151a is 18.3:1, and the cards' 80%-white on #23262d is about 10.2:1. The purple accent `rgb(136,58,234)` (#883aea) fails as text color: 3.34:1 on #13151a and 2.77:1 on the card background, below the 4.5:1 needed for normal text. The gradient `text-gradient` h1 needs checking at the white/purple ends. Use native `<audio controls>` or a fully labeled custom player, link transcripts, and meet the 24×24px target size.

### Cited Findings

- New in WCAG 2.2, A and AA:
  - 2.4.11 Focus Not Obscured (Minimum), AA
  - 2.5.7 Dragging Movements, AA (relevant to a seek scrubber, which needs a click or keyboard alternative)
  - 2.5.8 Target Size (Minimum), AA: 24×24 CSS px or enough spacing
  - 3.2.6 Consistent Help, A
  - 3.3.7 Redundant Entry, A
  - 3.3.8 Accessible Authentication (Minimum), AA
  - 4.1.1 Parsing is obsolete and removed
  - Source: [W3C What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- Contrast ratios I computed with the WCAG relative-luminance formula from the repo's CSS values (`Layout.astro` and `Card.astro`):
  - White on #13151a: 18.26:1
  - White at opacity 0.8 on #23262d (≈#d3d4d5): 10.2:1
  - #883aea on #13151a: 3.34:1
  - #883aea on #23262d: 2.77:1
  - #e0ccfa (accent-light, the hover h2 color) on #23262d: 10.23:1
  - Method per WCAG 1.4.3 (4.5:1 normal text, 3:1 large text and UI components); ratios computed locally, no URL.

### Inferences

- Checklist for this site:
  - **1.1.1:** alt text on artwork ("Mystery Show cover art"). Use empty alt when the title is adjacent and the image is decorative.
  - **1.2.1 (A):** audio-only prerecorded content needs a text alternative (a transcript). Since deadpods doesn't own the audio, link a publisher transcript (`podcast:transcript`) where one exists, and label where none exists. Full compliance may not be achievable for third-party audio.
  - **1.3.1:** semantic headings (h1 show/episode, h2 sections), `<ol>` for ranked lists (already used), landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`).
  - **1.4.3 / 1.4.11:** the accent purple must reach ≥3:1 for UI (borders, focus rings) and ≥4.5:1 for text. Lighten it to about #a77bf3 or use accent-light for text, and recheck with a contrast tool.
  - **1.4.4 / 1.4.10:** reflow at 320px. Note `main { width: 800px; max-width: calc(100% - 2rem) }` is fine.
  - **1.4.12:** text spacing.
  - **2.1.1:** player fully keyboard operable. Native `<audio controls>` gives this for free. Custom players need `<button>`s with `aria-label`/`aria-pressed`, and a seek `<input type="range">` with `aria-valuetext` of "12 minutes 34 seconds."
  - **2.2.2 / 1.4.2:** no autoplay. If audio ever plays more than 3s automatically, a pause control is required.
  - **2.4.1:** skip link. **2.4.2:** unique titles. **2.4.4:** descriptive link text, not "→ here." The card arrow `<span>&rarr;</span>` should be `aria-hidden="true"`.
  - **2.4.7 / 2.4.11:** visible focus. The starter has no explicit focus styles beyond `:focus-within` on cards, so add `:focus-visible { outline: 2px solid <≥3:1 color>; outline-offset: 2px }` and make sure a sticky player bar doesn't cover focused items.
  - **2.5.8:** player and share buttons at least 24px, preferably 44px.
  - **3.1.1:** `lang="en"` (present).
  - **4.1.2:** name, role and value for custom controls.
  - **Motion:** honor `prefers-reduced-motion` for card transitions.
- Background-clip gradient text (`-webkit-text-fill-color: transparent`) can vanish in Windows forced-colors mode. Add `@media (forced-colors: active) { .text-gradient { -webkit-text-fill-color: CanvasText; background: none } }`.
- The card currently applies `opacity: 0.8` to the whole link. It passes, but setting color directly is cleaner.

### Gaps

- I didn't compute contrast at every point of the `--accent-gradient` text (it runs from purple to white). The purple start (#883aea on #13151a, 3.34:1) passes only the large-text threshold (h1 at 4rem counts as large text). That is acceptable for the h1, but verify it if the gradient is reused at smaller sizes.

## Performance: islands, zero-JS default, astro:assets with remote images, CWV targets, fonts

### Takeaway

Astro's default of static HTML with zero JS is ideal. The only island should be the player (and maybe a share button), hydrated with `client:visible` or `client:idle`. Optimize remote artwork at build time with `<Image>`/`<Picture>` after authorizing the hosts in `image.remotePatterns`. Targets at the 75th percentile: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

### Cited Findings

- Core Web Vitals "good" thresholds are LCP ≤ 2.5s, INP ≤ 200ms and CLS ≤ 0.1, measured at the 75th percentile by mobile and desktop. INP became stable in 2024 and replaced FID — [web.dev Web Vitals](https://web.dev/articles/vitals)
- Astro images:
  - Remote sources must be authorized via `image.domains` or `image.remotePatterns` (e.g. `[{protocol:'https'}]`), otherwise they are "displayed with no processing."
  - Prerendered pages transform at build time, and remote images are cached per Cache-Control. ETag/Last-Modified revalidation arrived in 5.1.0.
  - `layout` (`constrained`, `full-width`, etc.) auto-generates srcset/sizes (5.10.0+). `image.responsiveStyles` defaults to false.
  - `<Picture formats={['avif','webp']}>`.
  - The docs list a v7 upgrade guide.
  - Source: [Astro Images guide](https://docs.astro.build/en/guides/images/)

### Inferences

- The repo is on Astro ^4.12. Upgrade before building features, since responsive images, the Fonts API and content layer improvements landed in v5+. Run `npx @astrojs/upgrade`.
- Podcast artwork is often 3000×3000 JPEG at 1–5 MB. Always pass it through `<Image width={300} ...>` or `<Picture>`, which takes it to about 20–40 KB AVIF/WebP.
  - On episode pages, give the hero artwork `loading="eager"` and `fetchpriority="high"` (it is the LCP candidate). Lazy-load list thumbnails.
  - Always set explicit width and height to protect CLS.
  - Better still, download artwork into `src/assets/` at content-ingest time so builds don't depend on flaky hosts, which matters for dead shows.
- Audio: `<audio preload="none">` (or `metadata`) so pages don't start downloading MP3s.
- Fonts: system-ui (already used) is the fastest choice and costs zero bytes. If you add a display font, self-host one WOFF2 subset with `font-display: swap` and preload it, or use Astro's Fonts API in newer versions (unverified).
- Hosting: any static CDN (Cloudflare Pages, Netlify, GitHub Pages) serves HTML at the edge. Expect Lighthouse scores of 95–100 when no third-party scripts are added. Analytics should be lightweight (Plausible, GoatCounter or Cloudflare Web Analytics).

### Gaps

- Astro v6/v7 feature specifics (Fonts API stability, default image behavior changes) were not verified this session.

## Social/viral mechanics: share buttons vs Web Share API, quote cards

### Takeaway

Use one "Share" button. It calls `navigator.share()` where available (mostly mobile) and falls back to "Copy link," optionally with "Copy link at 12:34." Avoid third-party share widgets, which add tracking and weight. Rely on great OG images; they're the real share asset. Quote cards can be generated at build time like OG images.

### Cited Findings

- `navigator.share()`:
  - Requires a secure context (HTTPS), transient user activation (a click) and the `web-share` Permissions Policy.
  - Data must include at least one of url, text, title or files.
  - It has "Limited availability," not Baseline.
  - `AbortError` means the user canceled and should be treated as non-fatal. Other errors are NotAllowedError, TypeError, InvalidStateError and DataError.
  - `navigator.canShare({files})` checks whether files can be shared.
  - Source: [MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)

### Inferences

- Tiny island (about 0.5 KB vanilla `<script>` in an Astro component, no framework):
  ```js
  btn.onclick = async () => {
  	const url = withTime ? `${canonical}?t=${Math.floor(audio.currentTime)}` : canonical;
  	if (navigator.share) {
  		try {
  			await navigator.share({ title, text: `Listen: ${title}`, url });
  			return;
  		} catch (e) {
  			if (e.name === 'AbortError') return;
  		}
  	}
  	await navigator.clipboard.writeText(url);
  	status.textContent = 'Link copied'; // aria-live="polite"
  };
  ```
  Announce "Link copied" through an `aria-live` region for accessibility.
- Optional intent links that need no JS or SDK: `https://bsky.app/intent/compose?text=`, `https://x.com/intent/post?url=&text=`, Mastodon via a share-instance picker (e.g. the `s2f.kytta.dev` Share₂Fedi pattern), and `mailto:`. These URLs are general knowledge, not verified this session.
- Quote cards: a square 1080×1080 build-time image per episode, generated with the same Satori/og-canvas pipeline: artwork, a pull-quote from your editorial note, and "deadpods.com/…". Offer it as a downloadable PNG, or share it as a file via `navigator.share({files})` when `canShare` passes. Don't quote transcripts at length without permission.
- Make the URL itself memorable and short, e.g. `deadpods.com/mystery-show/belt-buckle`. A flatter IA without `/shows/` is a valid trade-off for shareability.

### Gaps

- I didn't verify Bluesky or X intent URL formats or Firefox desktop Web Share support in the 2026 compat table.
