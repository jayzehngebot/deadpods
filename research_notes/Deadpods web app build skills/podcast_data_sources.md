# Podcast Data Sources, Parsing, and Preservation for Dead Podcasts (as of Oct 2026)

Note on method: some findings below come from live checks I ran on 2026-10-20 (curl against feeds, the Apple Lookup API and the Wayback CDX API). Those are cited to the URL I queried and marked "(live check 2026-10-20)".

## 1. RSS feed structure and JS/TS parsing libraries

### Takeaway

Use the RSS 2.0 `<enclosure>` (url/length/type), the item `<guid>` and a handful of `itunes:` tags (image, duration, episode/season, episodeType, type, complete, new-feed-url, block). Real dead-show feeds are often sparse and odd, so the parser has to be forgiving. For parsing, `fast-xml-parser` is very actively maintained. `rss-parser` has had no release since April 2023. `podcast-partytime` handles Podcasting 2.0 tags but has a tiny user base.

### Cited Findings

- **enclosure:** requires `url`, `length` (bytes) and `type` (MIME). Allowed types are audio/mpeg, audio/m4a, video/m4v and video/mp4. — [PSP-1 Podcast RSS Spec](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- Apple ignores duplicate enclosure URLs. Every episode needs a GUID that "never changes". Servers should support HTTP HEAD and byte-range requests. — [Apple Podcasts requirements](https://podcasters.apple.com/support/823-podcast-requirements)
- **itunes:image:** 1400×1400 to 3000×3000 px, JPEG or PNG, and the file extension must match the actual type. Channel art is RGB and episode art is sRGB. — [PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- **itunes:duration:** PSP-1 shows seconds (e.g. `1801`). In practice feeds also use HH:MM:SS, so parse both (inference; PSP-1 only gives the seconds example). — [PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- **itunes:episode / itunes:season:** non-zero integers. `itunes:episode` is required for serial shows. `itunes:episodeType` is full (default), trailer or bonus. `itunes:type` is episodic (default) or serial. — [PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- **itunes:complete:** marks a podcast as finished with no more episodes planned. Only "yes" is valid. **itunes:block** "yes" hides an episode. — [PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- **atom:link rel="self":** the declared canonical feed URL. PSP-1 lists it as a required channel element. — [PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- **itunes:new-feed-url:** not covered in the PSP-1 text I retrieved. See Gaps.
- **Real-world example, Mystery Show feed:**
  - Still live at `feeds.megaphone.fm/mysteryshow` (HTTP 200) with 7 items: the trailer from 2015-04-30 and Case #1–#6, the last dated 2015-07-31.
  - It has **no `itunes:complete` and no `podcast:` namespace**.
  - Enclosures have `length="0"`, and `itunes:duration` is in seconds (e.g. 4622).
  - Channel `<image>` is a megaphone.imgix.net URL with max-w=3000.
  - — [Mystery Show feed](https://feeds.megaphone.fm/mysteryshow) (live check 2026-10-20)
- **Legacy GUIDs:** Apple Lookup shows the Mystery Show episode GUIDs are legacy WNYC URLs such as `http://www.wnyc.org/story/case-6-kotter/`, carried over from the show's original hosting. — [iTunes Lookup](https://itunes.apple.com/lookup?id=952044185&entity=podcastEpisode&limit=3) (live check 2026-10-20)
- **npm status, 2026-10-20** — [npm registry](https://registry.npmjs.org/fast-xml-parser), [npm downloads API](https://api.npmjs.org/downloads/point/last-week/rss-parser,fast-xml-parser,podcast-partytime):

  | Package                                        | Latest version | Released                      | Weekly downloads |
  | ---------------------------------------------- | -------------- | ----------------------------- | ---------------- |
  | `rss-parser`                                   | 3.13.0         | 2023-04-11 (no release since) | ~527k            |
  | `fast-xml-parser`                              | 5.11.2         | 2026-09-29                    | ~47M             |
  | `podcast-partytime`                            | 5.0.0          | 2025-12-30                    | ~227             |
  | `podcast-index-api` (Podcast Index API client) | 2.0.0          | 2026-05-29                    | not checked      |

- **podcast-partytime:**
  - It was extracted from the Podcast Index aggregator. You fetch the XML yourself and call `pt.parseFeed(xml)`.
  - It reports supported Podcasting 2.0 phases in `pc20support`.
  - The README asks callers to set a proper User-Agent.
  - — [partytime GitHub](https://github.com/RyanHirsch/partytime)

### Inferences

- Use `fast-xml-parser` with attribute parsing enabled and a small hand-written mapper, which is best for long-term maintenance. Alternatively, use `podcast-partytime` to get P2.0 tags for free. `rss-parser` works, but it is effectively unmaintained and needs `customFields` for `podcast:*` tags.
- Never rely on `length`, `itunes:complete` or the GUID format on dead shows. Store everything as raw strings plus normalized fields, and key episodes by (feed identity + GUID), falling back to the enclosure URL.

### Gaps

- I couldn't retrieve Apple's official tag reference page (it renders with JS), so the `itunes:new-feed-url` semantics aren't sourced here. It is commonly understood to tell apps to move subscribers to a new feed URL; the feed should then 301-redirect.
- I didn't verify the `rss-parser` repo's open-issue status.

## 2. Podcasting 2.0 namespace: which tags matter for deadpods

### Takeaway

Podcasting 2.0 is the `xmlns:podcast="https://podcastindex.org/namespace/1.0"` namespace. The tags most useful to deadpods are `podcast:soundbite` (a ready-made "best moment" clip), `podcast:chapters`, `podcast:transcript`, `podcast:guid` (stable identity across feed moves), `podcast:updateFrequency complete="true"` (an "ended" signal) and `podcast:alternateEnclosure` (a fallback media source). Feeds from shows that died before about 2021 almost never contain any of these.

### Cited Findings

- The 1.0 spec is "considered locked" and the team prioritizes backward compatibility. Tags listed include guid, medium, transcript, chapters, soundbite, locked, alternateEnclosure (with source and integrity), remoteItem, person, season, episode, trailer, license, txt, podroll, publisher and updateFrequency. — [podcast-namespace 1.0](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md)
- **soundbite** (item, multiple):
  - Attributes are `startTime` and `duration`, with 15–120 s recommended. The node value is an optional title.
  - Intended for "episode previews, discoverability, audiogram generation, episode highlights", and it points into the item's enclosure.
  - — [soundbite.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/soundbite.md)
- **chapters** (item, single):
  - `url` plus `type`, with JSON preferred (`application/json+chapters`).
  - It's a separate file, so chapters can be edited after publishing without altering the audio.
  - — [chapters.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/chapters.md)
- **transcript** (item, multiple): `url`, `type` (text/plain, text/html, text/vtt, application/json, application/x-subrip), optional `language`, and `rel="captions"` for timed captions. — [transcript.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/transcript.md)
- **updateFrequency** (channel): the optional `complete` boolean means "the podcast has no intention to release further episodes". It also takes an `rrule` and `dtstart`. — [update-frequency.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/update-frequency.md)
- **podcast:guid** (channel):
  - A UUIDv5 of the feed URL with the scheme and trailing slashes stripped, using the namespace `ead4c236-bf58-58c6-a2c6-a6b28d128cb6`.
  - It is assigned once and should follow the show across feed URL changes.
  - All podcasts in the Podcast Index already have a GUID, but one present in the feed is canonical.
  - — [guid.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/guid.md)
- **locked:** "yes" means other hosting platforms should reject imports of the feed. It is about hosting migration, not playback. — [locked.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/locked.md)
- **alternateEnclosure** (item, multiple): holds one or more `podcast:source uri` entries (https, ipfs, torrent) plus an optional `podcast:integrity`. `default="true"` marks alternate transports for the same file as the enclosure. — [alternate-enclosure.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/alternate-enclosure.md)
- **medium:** podcast (default), music, video, film, audiobook, newsletter, blog, publisher, course, plus "L" list variants. — [medium.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/medium.md)
- **Podcast Index API exposure:** the API surfaces soundbites, persons, value and similar fields, e.g. the `episodes/byfeedid` examples that include `persons` and `value`. — [Podcast Index API spec, episodes/byfeedid](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/paths/episodes/byfeedid.yaml)

### Inferences

- Model "best moments" in the Google Sheet as editor-entered start/duration pairs that use the same shape as `podcast:soundbite`. Import feed soundbites when they exist, but expect editors to supply most of them.
- If deadpods ever generates its own feeds or mirror files, emitting `podcast:alternateEnclosure` with an archive.org `podcast:source` is the standards-compliant way to express a fallback.

### Gaps

- I didn't measure what share of feeds actually carry soundbite, chapters or transcript tags.

## 3. Metadata APIs: Podcast Index, Apple, Listen Notes, Spotify, Taddy

### Takeaway

Podcast Index is free (HMAC-style key auth), exposes dead-feed and crawl-health fields, and offers a free weekly SQLite dump, so it is the best fit. Apple's Search/Lookup API needs no key and is good for artwork and feed URL discovery, but it is rate-limited to about 20 calls per minute. Listen Notes' free and Pro tiers prohibit server-side caching, which is a poor fit for a static site. Spotify doesn't expose RSS or audio. Taddy is a GraphQL alternative with a 500 requests/month free tier.

### Cited Findings

- **Podcast Index auth:**
  - Every request needs the headers `User-Agent`, `X-Auth-Date`, `X-Auth-Key` and `Authorization`, where `Authorization = sha1(apiKey + apiSecret + unixTime)` as lowercase hex.
  - Keys are free at api.podcastindex.org.
  - The spec is MIT-licensed, and Node clients include `podcast-index-api` and `podcastdx-client`.
  - — [docs-api root.yaml](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/root.yaml), [Authorization scheme](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/securitySchemes/Authorization.yaml)
- **Podcast Index endpoints** include podcasts/byfeedurl, byfeedid, byguid, byitunesid, episodes/byfeedid (reverse-chronological, with `max`, `since`, `newest`, `fulltext` and `enclosure` parameters), episodes/byfeedurl, podcasts/dead, value/byfeedurl and recent/*. — [docs-api repo tree](https://github.com/Podcastindex-org/docs-api/tree/master/api_src/paths), [episodes/byfeedid](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/paths/episodes/byfeedid.yaml)
- **Feed health fields:**
  - `lastUpdateTime` is the channel pubDate "if it's sane", otherwise a heuristic.
  - `lastCrawlTime` is the last fetch attempt.
  - `lastGoodHttpStatusTime` is the last non-4xx/5xx fetch.
  - `newestItemPublishTime` (also spelled `newestItemPubdate` on some endpoints) is the newest episode's publish time.
  - `crawlErrors` counts 404/500/timeouts/bad encoding, and `episodeCount` is the number of episodes the index knows about.
  - — [lastUpdateTime](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/lastUpdateTime.yaml), [lastGoodHttpStatusTime](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/lastGoodHttpStatusTime.yaml), [newestItemPublishTime](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/newestItemPublishTime.yaml), [crawlErrors](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/crawlErrors.yaml)
- **Podcast Index ToS:**
  - Attribution as described in each API's docs.
  - No permanent copies of returned content and no scraping to build databases. Cached copies may be kept no longer than the cache headers allow.
  - No public display of returned content unless the content owner or the law permits it.
  - Credentials must not be embedded in open-source projects.
  - — [Podcast Index Terms of Service](https://raw.githubusercontent.com/Podcastindex-org/legal/main/TermsOfService.md)
- **Podcast Index SQLite dump:**
  - A free dump of every public feed is at `https://public.podcastindex.org/podcastindex_feeds.db.tgz`, roughly 1.8 GB compressed and about 5 GB unzipped.
  - The weekly cadence comes from secondary sources; I found no official page.
  - — [Podnews llms.txt](https://podnews.net/llms.txt), [James Cridland 2026](https://james.cridland.net/blog/2026/podcast-index-sql-data-mining/)
- **Apple Search/Lookup API:**
  - About 20 calls/minute ("subject to change"). The Enterprise Partner Feed is suggested for heavier use, and caching is recommended for large sites.
  - Podcast search uses `media=podcast` with entity podcast, podcastAuthor or podcastEpisode.
  - Promo-content terms require store badges and attribution, and say previews must be streamed, never cached; those rules are mainly about music previews.
  - — [Apple Search API](https://performance-partners.apple.com/search-api), [Apple iTunes Search API archive doc](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html)
- **Apple Lookup in practice:**
  - `lookup?id=952044185` returns `feedUrl`, `artworkUrl30/60/100/600` on mzstatic.com, `releaseDate` (last episode), `trackCount`, genre and artist.
  - Adding `&entity=podcastEpisode&limit=N` returns episodes with `episodeUrl` (the enclosure), `episodeGuid`, `trackTimeMillis` and `releaseDate`.
  - — [iTunes Lookup](https://itunes.apple.com/lookup?id=952044185&entity=podcastEpisode&limit=3) (live check 2026-10-20)
- **Listen Notes:**

  |                                | Free                               | Pro                                        | Enterprise   |
  | ------------------------------ | ---------------------------------- | ------------------------------------------ | ------------ |
  | Price                          | $0                                 | $200/mo base                               | custom       |
  | Requests                       | 150/month, suspended when exceeded | 5,000 included, then $1.60 per extra 1,000 | custom       |
  | Server-side caching            | not allowed                        | not allowed                                | allowed      |
  | "Powered by Listen Notes" logo | required                           | required                                   | not required |

  Free and Pro apps "must not pre-fetch, cache, index, or store any content on the server side"; IDs and publication dates are exempt. Paid bulk datasets are sold separately. — [Listen Notes API pricing](https://www.listennotes.com/api/pricing/)

- **Spotify:**
  - From 2024-11-27, new or development-mode Web API apps lost access to recommendations, audio features, 30-second previews in multi-get responses and similar features.
  - No podcast-specific changes were reported. The Web API doesn't provide RSS feed URLs or playable full audio for third-party players.
  - — [Spotify developer blog 2024-11-27](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- **Taddy:**
  - GraphQL at api.taddy.org with `X-USER-ID` and `X-API-KEY` headers.
  - Free tier is 500 requests/month. Pro is $75/mo for 100k requests and Business is $150/mo for 350k; a $250/mo plan for 1M requests also appears on the pricing page.
  - Free users get only transcripts that podcasts supply themselves.
  - — [Taddy developers](https://taddy.org/developers), [Taddy pricing (Notion)](https://taddy.notion.site/Pricing-06e890f8ccd04fea820e768ce51f50da), [Taddy blog comparison](https://taddy.org/blog/podcastindex-vs-taddy-podcast-api)

### Inferences

- Recommended pipeline:
  1. The Google Sheet holds an Apple ID or feed URL.
  2. The build script calls Apple Lookup to get the feed URL and artwork.
  3. The build script fetches the RSS directly as the primary source of truth.
  4. Podcast Index (byfeedurl/byitunesid plus episodes) fills in health fields and missing episodes for feeds that are already gone.
- Keep API keys in build-time env vars, never in client JS (Podcast Index ToS 4.2).
- The Podcast Index ToS "no permanent copies" and "public display" clauses sit uneasily with committing a JSON snapshot to the repo. Fetching the publisher's RSS directly and caching that is legally cleaner than caching API responses. Episode metadata is the publisher's content either way.

### Gaps

- I didn't find documented numeric rate limits for Podcast Index.
- I didn't verify Spotify Developer Terms clauses on podcast metadata display.

## 4. Detecting that a podcast is "dead" or ended

### Takeaway

No single signal is reliable, so combine several:

- an explicit flag (`itunes:complete=yes`, `podcast:updateFrequency complete="true"`)
- a staleness threshold on the newest episode date (Podcast Index `newestItemPublishTime`, Apple `releaseDate`)
- feed HTTP health (Podcast Index `lastGoodHttpStatusTime`, `crawlErrors`, `dead`)
- editorial judgment in the Sheet

### Cited Findings

- **Podcast Index `dead`:** "At some point, we give up trying to process a feed and mark it as dead. This is usually after 1000 errors without a successful pull/parse cycle. Once the feed is marked dead, we only check it once per month." — [dead.yaml](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/dead.yaml)
- **Lists of dead feeds:** `podcasts/dead` returns all feeds with dead == 1. A public CSV of dead feed IDs needs no auth: `https://public.podcastindex.org/podcastindex_dead_feeds.csv`. — [podcasts/dead](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/paths/podcasts/dead.yaml), [static dead feeds](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/paths/static/public/podcastindex_dead_feeds.yaml)
- Note that Podcast Index's `dead` means **the feed URL is broken**, not that the show ended. — inferred from the [dead.yaml](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/dead.yaml) definition
- **Explicit end flags:** `itunes:complete` "yes" means no future episodes ([PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)). `podcast:updateFrequency complete` is the P2.0 equivalent ([update-frequency.md](https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/docs/tags/update-frequency.md)).
- **Counterexample 1, Mystery Show:** canonically ended. No new episodes since 2015, and Gimlet said in Oct 2016 it would no longer produce the show. Yet the feed has no `itunes:complete`. — [Wikipedia: Mystery Show](https://en.wikipedia.org/wiki/Mystery_Show); [feed](https://feeds.megaphone.fm/mysteryshow) (live check 2026-10-20)
- **Counterexample 2, Reply All:** ended in 2022, but its feed still gets new items. Pubdates include 2024-12-05 and 2026-03-30 after the 2022 final episodes, and Apple `releaseDate` is 2024-12-05 with 214 tracks. — [Reply All feed](https://feeds.megaphone.fm/replyall), [iTunes Lookup](https://itunes.apple.com/lookup?id=941907967) (live check 2026-10-20)

### Inferences

- Suggested heuristic:
  - **Ended:** `complete` flag set, OR newest _full_ episode older than about 18–24 months.
  - **Feed dead:** feed returns 4xx/5xx/DNS failure, or Podcast Index `dead=1`.
- Treat "ended" and "feed dead" as separate states. Make the Sheet authoritative and use the heuristics only to flag rows for review.
- Ended shows keep receiving promo or "new show from the team" items, so "last pubDate" is noisy. Consider ignoring `episodeType=trailer|bonus` and very short items.

### Gaps

- I found no industry-standard staleness threshold. The 18–24 month figure is a suggestion, not sourced.

## 5. Link rot: networks shutting down or moving, and where Mystery Show stands

### Takeaway

Catalogs disappear for several reasons: a platform shuts down (Stitcher, 2023), a network goes exclusive (Gimlet/Parcast on Spotify, partially reversed in 2023), or a show gets new hosting (Heavyweight moved to Pushkin). Analytics prefix services can die too (Chartable, Dec 2024), and every prefixed enclosure then depends on that domain. As of Oct 2026 Mystery Show is still freely available via Gimlet's Megaphone RSS feed, now hosted on Spotify's infrastructure. Its audio plays, but it sits behind short-lived signed redirect URLs.

### Cited Findings

- **Mystery Show history:**
  - One season in 2015, named Apple's Best New Podcast of 2015.
  - Kine was let go from Gimlet in April 2016 and announced it in Oct 2016. Gimlet said it would stop producing the show and was "in discussions with Starlee" about independent production.
  - — [Wikipedia: Mystery Show](https://en.wikipedia.org/wiki/Mystery_Show)
- A blog claims Kine "never got her podcast back". It's a single unverified source. — [Flowship blog](https://www.flowship.io/blog/the-podcast-that-vanished-the-strange-disappearance-of-mystery-show)
- **Mystery Show current availability (live check 2026-10-20):**
  - The feed returns 200 with all 7 items. Apple lists it under artist "Gimlet" with feedUrl `feeds.megaphone.fm/mysteryshow`.
  - Enclosure `https://traffic.megaphone.fm/GLT9850047044.mp3?...` 302-redirects to `dcs-spotify.megaphone.fm/...` with a `key=` and an expiring `timetoken`, then serves 200 audio/mpeg with `Access-Control-Allow-Origin: *`.
  - — [feed](https://feeds.megaphone.fm/mysteryshow), [iTunes Lookup](https://itunes.apple.com/lookup?id=952044185)
- **Wayback Machine coverage of the Mystery Show feed:** snapshots go back to 2016-07-14, and the latest closest snapshot is 2026-10-17. — [Wayback availability API](https://archive.org/wayback/available?url=feeds.megaphone.fm/mysteryshow), [CDX API](http://web.archive.org/cdx/search/cdx?url=feeds.megaphone.fm/mysteryshow&limit=5&output=json) (live check 2026-10-20)
- **Gimlet and Spotify:**
  - Gimlet and Parcast shows were made Spotify-exclusive, and some lost up to 75% of their audience. — [Simon Owens](https://simonowens.substack.com:443/p/is-spotifys-podcast-exclusivity-strategy)
  - Spotify cancelled 11 Gimlet/Parcast originals in Oct 2022. — [Variety AU](https://au.variety.com/2022/digital/news/spotify-cancels-podcast-shows-layoffs-6203/)
  - It cut six more and merged Gimlet and Parcast into Spotify Studios in June 2023. — [Radio Ink](https://radioink.com/2023/06/07/six-podcasts-cut-at-spotify-after-layoffs/)
  - On 2023-04-18, Spotify began ending exclusivity for some Gimlet shows ("windowing"). — [Podnews](https://Podnews.net/update/spotify-relaxes-exclusives)
  - Science Vs was the first title made available on Apple and other apps (Apr 2023). — [Radio Ink](https://radioink.com/2023/04/19/paywall-coming-down-for-some-spotify-exclusives/)
- **Gimlet shows today (live check 2026-10-20):**
  - Reply All is on open RSS at feeds.megaphone.fm/replyall with 214 items.
  - Heavyweight is now published by Pushkin Industries via Omny, with 135 items.
  - — [iTunes Search: Reply All](https://itunes.apple.com/search?term=reply+all&media=podcast&limit=3), [iTunes Search: Heavyweight](https://itunes.apple.com/search?term=heavyweight+jonathan+goldstein&media=podcast&limit=2)
- **Stitcher:** the app and website shut down on 2023-08-29. SiriusXM continued hosting Stitcher content in the SiriusXM app. — [Mediaweek](https://www.mediaweek.com.au/siriusxm-announces-the-closure-of-podcast-listening-app-stitcher), [DesignRush](https://news.designrush.com/stitcher-shuts-down-after-15-years)
- **Chartable shutdown:**
  - Spotify sunset Chartable from 2024-12-12, and podcasters were told to remove `chrt.fm` prefixes.
  - Podnews warned prefixes "will stop working at some point in the future".
  - Megaphone-hosted shows "need do nothing".
  - SmartFeeds and SmartLinks also stopped working.
  - — [Podnews](https://podnews.net/update/chartable-final-switchoff), [RAIN News](https://rainnews.com/spotify-sunsets-podcast-attribution-pioneer-chartable/), [Transistor](https://support.transistor.fm/en/article/what-should-i-do-now-that-chartable-is-closing-s78p2g/)
- **Chartable prefix still live in 2026:** the Reply All feed still has `https://chrt.fm/track/15E3G4/traffic.megaphone.fm/...` enclosures, and chrt.fm still 302-redirects to Megaphone. — [Reply All feed](https://feeds.megaphone.fm/replyall) (live check 2026-10-20)
- **OP3:**
  - A free, open-source prefix analytics service that needs no signup.
  - The format is `https://op3.dev/e/<original URL without scheme>`.
  - It runs as a fast redirect on a global CDN.
  - — [op3.dev](https://op3.dev/)
- Live, op3.dev/e/traffic.megaphone.fm/... 302-redirects correctly. — (live check 2026-10-20)
- Other prefix providers include Podtrac, Podscribe and Podsights. — [RedCircle blog](https://redcircle.com/blog/whats-the-deal-with-chartable-prefix-urls/)

### Inferences

- Each prefix (podtrac, chrt.fm, op3, etc.) is another domain that can die. When a prefix service shuts down, stripping it to get the underlying host URL (`traffic.megaphone.fm/...`) is a valid fallback. Store both the raw enclosure and a "de-prefixed" enclosure.
- Never persist the final redirect target. Megaphone's `dcs-spotify` URLs carry an expiring `timetoken`. Store the canonical enclosure and let the browser follow redirects.
- Megaphone serves `Access-Control-Allow-Origin: *`, so an HTML5 `<audio>` element and even Web Audio and fetch range requests should work from deadpods.com. Other hosts may not send CORS headers, so stick to a plain `<audio src>`, which doesn't need CORS.
- Spotify-owned feeds (Gimlet, Parcast, Ringer) are the highest-risk group for future removal. Archive their feed XML now.

### Gaps

- I found no authoritative recent source on whether Kine owns or seeks Mystery Show rights.
- No complete list of Gimlet titles that are still RSS-available versus Spotify-only.
- No data on the fate of Stitcher-exclusive (Stitcher Premium) back catalogs.

## 6. Preservation mitigations and build-time snapshot strategy

### Takeaway

At build time, snapshot each feed's XML and normalized JSON into the repo or a cache. Ask the Wayback Machine to capture the feed (SPN2), and record Wayback/CDX URLs as fallbacks. Run a scheduled link-checker (HEAD or Range GET following redirects) that flags 404s and swaps to fallbacks: a de-prefixed URL, a Podcast Index-known URL, a Wayback `id_` URL, or an archive.org item. Rehosting audio raises copyright issues; linking to archives is safer.

### Cited Findings

- **Wayback availability API:** `https://archive.org/wayback/available?url=…` returns the closest snapshot. The CDX API `http://web.archive.org/cdx/search/cdx?url=…&output=json` lists every capture with status and digest. — [availability](https://archive.org/wayback/available?url=feeds.megaphone.fm/mysteryshow), [CDX](http://web.archive.org/cdx/search/cdx?url=feeds.megaphone.fm/mysteryshow&limit=5&output=json) (live check 2026-10-20)
- **Save Page Now 2:**
  - POST to `https://web.archive.org/save`, authenticated with archive.org S3 keys (preferred) or cookies.
  - The community-maintained SPN2 doc was last updated 2026-07-22.
  - — [SPN2 Public API Docs](https://docs.google.com/document/d/1Nsv52MvSjbLb2PCpHlat0gkzw0EvtSgpKHu4mk0MnrA/mobilebasic)
- **SPN2 limits (unofficial):** a third-party summary lists 12 concurrent and 100k daily captures for authenticated users and 10 captures per URL per day. I couldn't verify these against the official doc. — [wayback-submit skill page](https://skills.cat/skills/mearman/marketplace/wayback-submit)
- **Internet Archive podcast holdings:**
  - Jason Scott's 2005 "podcast core sample" holds about 14,000 episodes from 540 shows, all streamable and downloadable. — [Radio Survivor](https://www.radiosurvivor.com/?p=35889)
  - Individual shows such as Polygamer deposit their full archives. — [Polygamer](https://www.polygamer.net/tag/collection/)
  - Archive-It has captured some feeds, e.g. LOC podcasts 2007–2014. — [Archive-It](https://archive-it.org/collections/5026)
- **Other preservation projects:**
  - PodcastRE (university-run) holds links and metadata for 5M+ audio files from thousands of feeds. — [PodcastRE](https://podcastre.org/about)
  - "Preserve This Podcast" trained podcasters in self-archiving. — [SAA Archives AWARE](https://archivesaware.archivists.org/2022/02/02/placing-archival-skills-into-the-hands-of-individual-podcasters-interview-with-mary-kidd-on-preserve-this-podcast/)
- **Podcast Index as a fallback:**
  - Podcast Index keeps episode records for known feeds, and `episodes/byfeedid` with `enclosure=` looks up an episode by audio URL. — [episodes/byfeedid](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/paths/episodes/byfeedid.yaml)
  - It re-checks dead feeds monthly. — [dead.yaml](https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/components/properties/dead.yaml)
- **Hosting requirements that matter for link checks:** Apple requires hosts to support HEAD and byte-range requests. — [Apple requirements](https://podcasters.apple.com/support/823-podcast-requirements)

### Inferences

- **Snapshot design:**
  - Write `data/feeds/<slug>.xml` (raw) and `data/feeds/<slug>.json` (normalized) on each successful fetch.
  - If a fetch fails, build from the last good snapshot and mark it stale. The site never breaks because a feed vanished.
  - Commit snapshots to git, or store them in a CI cache or object storage, as an audit trail.
- **Per-episode record:** `{guid, title, pubDate, durationSec, enclosureRaw, enclosureDeprefixed, waybackUrl?, archiveOrgUrl?, lastCheckedAt, lastStatus}`.
- **Link checker:**
  - Run it on a schedule (e.g. a weekly GitHub Action).
  - Use `GET` with `Range: bytes=0-1` and follow redirects; some hosts mishandle HEAD.
  - Treat 200/206 as OK. Treat 404/410, DNS failure and HTML content-type as broken.
  - The Sheet or UI then picks the first working source in order: raw enclosure, then de-prefixed, then Wayback raw, then archive.org.
- **Wayback raw URLs:** `https://web.archive.org/web/<ts>id_/<original-mp3-url>` returns the original bytes without the Wayback banner, which suits an `<audio>` tag. This is common Wayback practice but isn't documented in the sources above.
- **Capture limits:** SPN2 can archive feed XML easily. Large MP3s behind expiring redirects may not capture well, so check the CDX for an existing capture before relying on one.
- **Rights:** uploading copyrighted audio to archive.org or self-hosting it is a rights question. Linking to existing public archives is lower-risk than rehosting.

### Gaps

- I didn't retrieve official SPN2 rate limits or confirm Wayback's success rate at capturing large podcast MP3s.
- I found no documented "Podcast Index archive of audio files"; the Index stores metadata, not audio, as far as the sources show.
- I didn't find details of any 2025–2026 podcast-specific Internet Archive initiative.

## 7. Artwork: sizes, hotlinking vs. caching through Astro

### Takeaway

Source art is typically 1400–3000 px square JPG or PNG. Apple Lookup gives convenient pre-sized mzstatic URLs (30/60/100/600 px). For a static Astro site, authorize the remote hosts and let `astro:assets` download and optimize at build. Persist the cache dir between CI builds and keep local copies of art for shows whose hosts may vanish.

### Cited Findings

- Spec: square, 1400 to 3000 px, JPEG or PNG, RGB. — [PSP-1](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification)
- **Apple Lookup artwork URLs:** `artworkUrl30/60/100/600` on is1-ssl.mzstatic.com. The size is encoded in the path (`.../600x600bb.jpg`), and the Mystery Show feed's own art is a megaphone.imgix.net URL with `max-w=3000`. — [iTunes Lookup](https://itunes.apple.com/lookup?id=952044185); [feed](https://feeds.megaphone.fm/mysteryshow) (live check 2026-10-20)
- **Astro remote images:**
  - `<Image />`, `<Picture />` and `getImage()` optimize remote images only from hosts allowed via `image.domains` or `image.remotePatterns`; others are shown unoptimized.
  - For prerendered pages, images are processed at build time.
  - Processed images are cached in `cacheDir` (default `./node_modules/.astro`). Remote images respect `Cache-Control`, and since v5.1.0 they are revalidated with ETag/Last-Modified.
  - — [Astro images guide](https://docs.astro.build/en/guides/images/)

### Inferences

- Allowlist `is1-ssl.mzstatic.com`, `*.mzstatic.com`, `megaphone.imgix.net` and common hosts (Art19, Omny, Libsyn, Simplecast). Alternatively, have the build script download artwork into `src/assets/art/<slug>.jpg` so it's imported locally and survives host death.
- Downloading locally is preferable for dead shows: the art is permanent and the build is deterministic.
- Hotlinking mzstatic is fast but couples the site to Apple's CDN and promo terms.
- Size the generated variants for actual use, e.g. 160/320/640 widths in webp/avif.

### Gaps

- I couldn't retrieve Apple's 2025-era artwork template pages for current specs; PSP-1 was used instead.
- I didn't confirm whether resizing mzstatic URLs by editing the path to arbitrary sizes is permitted under Apple's terms.
