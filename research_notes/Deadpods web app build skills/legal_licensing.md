# Legal & Licensing Issues for deadpods.com (curating + playing third-party podcast episodes)

_Research notes, compiled 2026-10-20. Not legal advice. These notes summarize what sources and precedent say. US focus, with brief EU notes. Items marked "(background knowledge, not re-verified this session)" come from well-known precedent that I did not fetch a source for during this session; a report writer should treat them as lower confidence or verify them._

**Risk ladder (summary, inferred from findings below):**

| Technical choice                                                    | US risk                              | Notes                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain link to publisher page / Apple / Spotify                      | Very low                             | Linking isn't display/performance under any circuit test found                                                                                                    |
| Official embed widget (Spotify/Apple/YouTube/host player iframe)    | Low                                  | Platform ToS often license embeds (Richardson, 2d Cir. 2026)                                                                                                      |
| Hotlink: own `<audio>` player pointing at publisher's enclosure URL | Low–moderate                         | Publisher's server transmits; protected under 9th Cir. server test and 5th Cir. "transmit" test; 2d Cir. open; matches industry norm                              |
| Proxy/cache/re-encode the audio through own server                  | Moderate–high (legal + reputational) | Luminary/Stitcher backlash; breaks publisher download stats; falls outside both appellate tests                                                                   |
| Rehost/mirror/archive audio when original disappears                | High without permission              | Reproduction + public performance; Hachette v. IA shows archival/nonprofit framing isn't a fair-use shield; DMCA 512(c) doesn't protect operator-uploaded content |
| Rehost with written creator permission or CC license                | Low                                  | Follow license terms (attribution, NC if ads, ND = no edits)                                                                                                      |

---

## 1. Linking vs embedding vs hotlinking vs rehosting under US copyright law

### Takeaway

Plain linking is safe. Playing the publisher's own enclosure URL in your player (hotlinking/inline linking) is protected in the 9th Circuit by the _Perfect 10_ server test. The 5th Circuit (Aug 2026) reached the same result under a new "transmit" test, while the 2nd Circuit and SDNY courts are open or hostile to the server test. Rehosting or proxying the audio loses all of these protections, because you would be the one making copies and transmitting them.

### Cited Findings

- **Perfect 10 v. Amazon (9th Cir. 2007) server test:** a site that embeds or inline-links content doesn't "display" it under the Copyright Act. Only the site that hosts the file and serves it from its own server displays it and can be directly liable. — [Davis Wright Tremaine](https://dwt.com/insights/2023/08/server-test-instagram-case-ninth-circuit); [Venable](https://www.venable.com/insights/publications/2023/07/embedded-instagram-content-passes-the-server)
- **Hunley v. Instagram (9th Cir. July 17, 2023, No. 22-15293)** reaffirmed the server test. Embedding sites weren't direct infringers because the "embedding website does not store a copy of the underlying image." The court declined to narrow _Perfect 10_, so Instagram couldn't be secondarily liable either. — [Loeb & Loeb](https://www.loeb.com/en/insights/publications/2023/07/hunley-v-instagram-llc); [DWT](https://dwt.com/insights/2023/08/server-test-instagram-case-ninth-circuit)
- **Goldman v. Breitbart (S.D.N.Y. 2018)** declined to adopt the server test and found an embedded tweet infringing. **Nicklen v. Sinclair (S.D.N.Y. 2021, Judge Rakoff)** went further, holding the server rule "is contrary to the text and legislative history of the Copyright Act" and would "make[] the display right merely a subset of the reproduction right." — [Proskauer New Media & Technology Law Blog, Sept 18, 2026](https://www.proskauer.com/insights/get-pdf/30263)
- **UrbanImage Media v. iHeartMedia (W.D. Tex., July 2025)** rejected the server test, reasoning that "display" means showing a copy. — [Mass Law Blog](https://masslawblog.com/copyright/is-embedding-someone-elses-image-copyright-infringement-the-fifth-circuit-may-finally-tell-us/)
- **Richardson v. Townsquare Media (2d Cir. Apr. 23, 2026, No. 25-291):** the court expressly declined to adopt or resolve the server test, because the defendant assumed embedding was actionable. Holdings:
  - Republishing a whole video could be a "plausible market substitute," so dismissal on fair use was improper.
  - Prominent screenshots weren't de minimis.
  - Embedding a YouTube video was licensed under YouTube's ToS, which "unambiguously" give users a license to other users' content for embeds.
  - X/Twitter's ToS are platform-centric. In _Lynk Media_ (S.D.N.Y. 2025) a license defense failed for embedded Twitter videos.
  - Sources: [Proskauer](https://newmedialaw.proskauer.com/2026/05/05/second-circuit-sidesteps-server-test-in-embedded-video-copyright-ruling-highlighting-how-platform-terms-matter/); [Stanford Fair Use Project](https://fairuse.stanford.edu/case/richardson-v-townsquare-media-inc/)
- **Emmerich Newspapers v. Particle Media (5th Cir. Aug. 27, 2026, No. 25-60550)** was the first circuit to reject the server test, calling it on "weak statutory footing." It still held that NewsBreak's in-app "Framed View" of live publisher pages didn't directly infringe. Its reasoning:
  - It adopted a "transmit requirement" that asks two questions: where did the transmission originate, and was it permitted by an authorized source?
  - "Connecting does not equate to displaying." "One cannot transmit content it does not have."
  - It gave a switchboard-operator analogy.
  - **Limits:** the holding applies where (1) the copy is transmitted by the copyright owner or another authorized source, (2) the embedding site only makes an embedding request, and (3) the source can technically permit or reject the request.
  - The framed view sat alongside NewsBreak's own ads, and that did not change the direct-infringement outcome.
  - The case was remanded. Secondary liability and other claims remain open.
  - Source: [Proskauer, Sept 18, 2026](https://www.proskauer.com/insights/get-pdf/30263)
- Commentators say the circuit split may push the issue to the Supreme Court. I found no cert grant. — [Mass Law Blog](https://masslawblog.com/copyright/is-embedding-someone-elses-image-copyright-infringement-the-fifth-circuit-may-finally-tell-us/)
- **EU (background knowledge, not re-verified this session):**
  - CJEU _Svensson_ (2014) and _BestWater_ (2014): linking or framing freely available content isn't a "communication to a new public."
  - _GS Media_ (2016): linking to content you know is infringing, or linking for profit where knowledge is presumed, can infringe.
  - _VG Bild-Kunst_ (2021): framing that circumvents technical anti-framing measures infringes.

### Inferences

- Podcast audio involves the **public performance** right, not just display. The Copyright Act defines performing "publicly" to include transmitting, so the _Emmerich_ "transmit" logic maps naturally onto audio streamed from the publisher's server. _Perfect 10_ and _Hunley_ addressed display only, so applying them to audio performance is by analogy.
- An HTML `<audio src="publisher-enclosure.mp3">` player matches the _Emmerich_ fact pattern closely:
  - The publisher's host transmits the file.
  - It counts the download.
  - It can block the request, for example with referrer checks or by removing the file.
- **Avoid features that turn deadpods into the transmitter:** server-side proxying (including proxying to fix CORS or mixed content), caching, transcoding, stitching ads into the audio, or downloading files to generate waveforms. Each of these probably moves you outside both appellate tests.
- **US jurisdiction matters.** Outside the 5th and 9th Circuits, e.g. if a plaintiff sues in SDNY, the outcome for hotlinking is less certain. Practical exposure is low because hotlinking full episodes is the universal practice of podcast apps.
- **Best mitigations:**
  - Prominently attribute each episode and link to the original publisher.
  - Keep the original enclosure URL, including tracking prefixes like Podtrac or Chartable, so publisher analytics and dynamically inserted ads keep working.
  - Honor removal requests quickly.

### Gaps

- No US case squarely addresses a third-party web player streaming a podcast enclosure URL.
- The Emmerich opinion text wasn't read directly, only Proskauer's summary of it. A rehearing or cert petition status was not found.

---

## 2. Do podcast RSS feeds carry an implied license? How apps operate, and notable disputes

### Takeaway

There's no court ruling on this. Industry practice, including Apple, Spotify's pass-through, Pocket Casts, Overcast, and Podcast Index, rests on a widely accepted "unwritten contract":

- A public RSS feed implies permission to index the show, display its feed metadata unaltered, and stream audio from the publisher's host.
- It does not imply permission to rehost, cache, re-encode, alter, insert ads into, or paywall the audio.

Disputes like Luminary (2019), Stitcher's caching, and the CBC threats (2016) show where publishers draw that line.

### Cited Findings

- **Podnews editor James Cridland's "unwritten contract"** (first published Nov 23, 2021, updated Feb 18, 2026; opinion piece) argues that apps work like search engines and that "the publication of an open RSS feed is implicit approval."
  - **Apps may:** list feeds, show titles, descriptions, and images _exactly as supplied_, stream audio from the publisher's host so publishers keep download analytics, and run app-level display ads or paid memberships that don't gate specific shows.
  - **Apps must not:** rehost, cache, or proxy audio; re-encode; insert ads or cut content; charge or paywall without consent; alter metadata (including truncating descriptions); or index private feeds.
  - Source: [Podnews](https://podnews.net/article/the-unwritten-contract)
- **Examples in that article:**
  - Luminary's proxy server led to industry backlash and lost shows.
  - Stitcher cached and re-encoded audio, and shows were pulled until it stopped.
  - Spotify launched with caching, then made "pass-through" deals with big hosts.
  - Podcast Addict auto-added chapter images, some of them pornographic.
  - Source: [Podnews](https://podnews.net/article/the-unwritten-contract)
- **Luminary, April 2019:**
  - It cached third-party MP3s on its servers (per Federico Viticci).
  - It stripped show-notes links, which removed sponsor links and promo codes; Luminary cited "security concerns."
  - Joe Rogan's team cited the lack of a license agreement. Barstool, PodcastOne, Stitcher, and PRX pulled shows.
  - Marco Arment argued the economy runs on download counts, so rehosting requires opt-in.
  - Luminary fixed the proxy but kept the show-notes link removal.
  - Sources: [Nieman Lab](https://www.niemanlab.org/2019/04/what-does-luminarys-very-bad-week-tell-us-about-podcasters-collective-power/); [Nieman Lab follow-up](https://www.niemanlab.org/2019/04/luminary-says-its-not-copying-your-podcast-files-and-its-no-longer-screwing-with-your-stats-but-it-is-killing-all-your-show-notes-links-on-purpose/); [Michael Tsai](https://mjtsai.com/blog/2019/04/25/luminary-proxying-podcasts-without-asking)
- **CBC/Radio-Canada, 2016:** sent legal letters to podcast app makers, citing terms of use that barred commercial use of its podcasts and RSS feeds without a licence. Critics framed this as a campaign against its own RSS feed. — [Boing Boing](https://boingboing.net/2016/11/08/cbc-threatens-podcast-app-make.html); [Techdirt](https://archive.techdirt.com/articles/20161108/09455835992/cbc-threatens-podcast-apps-letting-people-listen-to-cbc-podcasts.shtml); [Podnews](https://podnews.net/article/radio-canada-versus-open-podcasting)
- **Directory takedown:** a podcast directory rejected a DMCA-style takedown. It argued that a public syndication feed exists for the purpose of linking, and disputed a lawyer's claim that Apple Podcasts was the "only authorised host." — summarized in search results pointing to [Podnews](https://podnews.net/article/radio-canada-versus-open-podcasting)
- **Podcast Index:** describes itself as an open index meant to "preserve, protect, and extend the open, independent podcasting ecosystem." Secondary descriptions say the core index is free for any use via the API and as a downloadable sqlite dump. — [Simon Frey link summary](https://simon-frey.com/links/category/entrepreneurship/podcast-index); [podcast-index-api README](https://cdn.jsdelivr.net/npm/podcast-index-api@2.0.0/README.md). (The official terms page returned 403 and was not read.)

### Inferences

- Implied license law generally turns on the licensor's conduct. Publishing an RSS feed _for_ syndication to apps is strong evidence of consent to normal app behavior. An implied license may not extend to uses publishers have publicly objected to, and it can probably be revoked by an explicit objection.
- **Practical rule for deadpods:** behave like a well-behaved podcast app.
  - Use the original enclosure URL.
  - Show unaltered feed metadata where you show feed data.
  - Keep show-notes links.
  - Don't put audio behind a paywall.
  - Remove a show promptly if the publisher asks.
  - Respect `<itunes:block>`, `<podcast:block>` (Podcasting 2.0), and private/locked feeds (`<podcast:locked>` signals owner intent about _imports_ to hosts, not playback).
- A dead show's feed may be gone while its MP3s still resolve. The implied-license argument is weaker when the publisher has stopped publishing the feed, but hotlinking still leaves the publisher's server in control of transmission.

### Gaps

- No US court decision on implied licenses from podcast RSS was found.
- Overcast and Pocket Casts public legal statements weren't located. That these apps stream from the original URLs is industry knowledge, not a fetched source.
- The official Podcast Index terms text wasn't accessible (HTTP 403).

---

## 3. Rehosting/archiving dead podcasts: Internet Archive, DMCA §512, permission, Creative Commons

### Takeaway

Mirroring copyrighted audio without permission is the highest-risk choice.

- Internet Archive's losses and settlements show that "archival" or "nonprofit" framing doesn't guarantee fair use.
- DMCA §512(c) safe harbor protects only material stored _at the direction of users_, not files the operator chooses to copy.
- Safer routes are: (a) link to Wayback Machine or Internet Archive copies, (b) rehost only with written permission or a CC license that fits your use, and (c) register a DMCA agent anyway if you accept community submissions.

### Cited Findings

- **Hachette v. Internet Archive (2d Cir. Sept. 4, 2024):**
  - Affirmed that the Archive's controlled digital lending of full scanned books wasn't fair use, even with one-to-one owned-to-loaned lending.
  - Format-shifting wasn't transformative.
  - The panel rejected the finding that IA's use was commercial. Even as a nonprofit, IA lost.
  - Commentators read the ruling as narrow: it focused on books that publishers offered as licensed ebooks.
  - Sources: [Authors Alliance](https://www.authorsalliance.org/2024/09/05/hachette-v-internet-archive-update-second-circuit-court-of-appeals-rules-against-internet-archive/); [Venable](https://www.venable.com/insights/publications/2024/09/second-circuit-holds-that-the-internet-archive); [Ropes & Gray](https://ropesgray.com/en/insights/alerts/2024/11/controlled-digital-lending-after-hachette-book-group-inc-v-internet-archive)
- **UMG/Sony v. Internet Archive ("Great 78 Project"):**
  - Labels sued in 2023 over digitized 78-rpm records from the 1890s to 1950s, seeking up to $621M.
  - IA argued fair use.
  - The parties reached a confidential settlement in mid-September 2025, and the case was dismissed without prejudice.
  - Sources: [Digital Music News](https://www.digitalmusicnews.com/2025/09/16/great-78-project-lawsuit-settlement/); [Music Business Worldwide](https://www.musicbusinessworldwide.com/labels-settle-copyright-lawsuit-against-internet-archive-over-streaming-of-vintage-vinyl-records); [Bloomberg Law](https://news.bloomberglaw.com/ip-law/record-labels-internet-archive-settle-copyright-suit-over-78s)
- **DMCA designated agent:**
  - Must be designated through the Copyright Office's electronic system.
  - Must be renewed every 3 years. An expired designation drops out of the directory.
  - Reported fee: $6 per designation, amendment, or renewal, down from $105 under the pre-2016 paper system. The fee is from 2016–2019 coverage, so verify the current amount on copyright.gov.
  - Sources: [Copyright Office renewal tutorial](https://www.copyright.gov/dmca-directory/transcripts/renew.pdf); [Library of Congress Copyright blog](https://blogs.loc.gov/copyright/2019/10/it-may-be-time-to-renew-your-dmca-agent-registration/); [Perkins Coie](https://www.perkinscoie.com/en/news-insights/deadline-approaching-for-refiling-designated-agent-information.html)
- **17 U.S.C. §512(c) requirements:**
  - Material must be stored "at the direction of a user."
  - No actual or red-flag knowledge of infringement.
  - No financial benefit directly attributable to infringement where you have the right and ability to control it.
  - Expeditious removal on notice.
  - A designated agent registered with the Copyright Office.
  - Source: [17 U.S.C. §512 (Cornell LII)](https://www.law.cornell.edu/uscode/text/17/512)
- **Other §512 provisions:**
  - §512(d) covers "information location tools" (links and directories), with similar notice-and-takedown conditions.
  - §512(i) requires a repeat-infringer policy that is reasonably implemented.
  - Source: [17 U.S.C. §512 (Cornell LII)](https://www.law.cornell.edu/uscode/text/17/512)
- **Podnews/Cridland:** rehosting and caching break publishers' download analytics, and are the core reason for publisher backlash (Luminary, Stitcher). — [Podnews](https://podnews.net/article/the-unwritten-contract)

### Inferences

- **If deadpods itself mirrors audio,** §512(c) won't apply, because the operator is the uploader. That means direct liability for reproduction and public performance.
- **Fair use for a dead podcast** (§107) is uncertain:
  - Factor 4 is weaker if there's no market, since the show is ended and maybe unavailable.
  - Factor 1 is weak, because a full-copy replay isn't transformative (_Hachette_; _Richardson_'s "market substitute" reasoning).
  - Factor 3 cuts against copying whole episodes.
- **Statutory damages** run up to $150k per work for willful infringement, and are available only if the work was registered. Most podcasts aren't registered, but network shows may be. (Statutory figure: [17 U.S.C. §504 (Cornell LII)](https://www.law.cornell.edu/uscode/text/17/504).)
- **Recommended tiers:**
  1. **Default:** hotlink the live enclosure. If the original is dead, link to a Wayback Machine or archive.org copy rather than re-serving it, and mark it "unavailable."
  2. **Permission-based archive:**
     - Get written, non-exclusive permission from the rights holder, e.g. a simple email grant covering streaming and hosting, revocable on notice.
     - Rights in network shows may belong to the network, not the hosts.
     - Episodes may also contain licensed music or clips the creator can't sublicense.
  3. **CC-licensed shows:**
     - Check the `<podcast:license>` tag (Podcasting 2.0) or the show's website.
     - CC BY or BY-SA can be rehosted with attribution.
     - NC ("NonCommercial") licenses make ad-supported rehosting risky.
     - ND forbids edits such as trimming or remixing.
  4. **If adding community uploads or submissions,** register a DMCA agent ($6 reported), publish a DMCA/takedown page and repeat-infringer policy, and remove content quickly on notice.
- **Even without hosting audio,** registering an agent is cheap insurance for user-submitted text, images, and links (covered by §512(c) and §512(d)).

### Gaps

- No case found on archiving defunct podcasts specifically.
- The Internet Archive's own podcast-archiving policy wasn't reviewed.
- The current DMCA agent fee wasn't confirmed on a 2026 copyright.gov page.

---

## 4. Show artwork, descriptions, and show names

### Takeaway

- Cover art thumbnails shown with a link and attribution are low risk. They are standard app and directory practice and are supported by thumbnail fair-use precedent in the 9th Circuit.
- Copying full feed descriptions verbatim is accepted directory behavior under the unwritten contract, but original blurbs are safer and better.
- Using show names to identify shows is nominative use under trademark law. Avoid implying endorsement or using logos as your own branding.

### Cited Findings

- Podnews' "unwritten contract" says apps may display titles, descriptions, and images _exactly as supplied in the feed_ and must not alter them, e.g. by truncating descriptions or changing titles or images. — [Podnews](https://podnews.net/article/the-unwritten-contract)
- **Apple Search API terms:** artwork obtained through Apple's API counts as "promo content." It must be used "only to promote store content and not for entertainment purposes," next to a "Listen on/Download on" badge that links to Apple, and removed on Apple's request. — [Apple Performance Partners Search API](https://performance-partners.apple.com/search-api)
- **Spotify Developer Policy** (effective May 15, 2025): Spotify metadata and cover art may only be used together with the underlying Spotify content, and must be accompanied by Spotify branding. — [Spotify Developer Policy](https://developer.spotify.com/policy/); [Spotify design guidelines](https://developer.spotify.com/documentation/general/design-and-branding/)
- **Richardson (2d Cir. 2026):** prominent screenshots used as headline images were _not_ de minimis at the pleading stage. Large hero use of others' imagery carries more risk than small thumbnails. — [Proskauer](https://newmedialaw.proskauer.com/2026/05/05/second-circuit-sidesteps-server-test-in-embedded-video-copyright-ruling-highlighting-how-platform-terms-matter/)
- **Background knowledge, not re-verified this session:**
  - _Kelly v. Arriba Soft_ (9th Cir. 2003) and _Perfect 10 v. Amazon_ (9th Cir. 2007) held that search-engine thumbnails were fair use as transformative indexing.
  - Trademark nominative fair use (_New Kids on the Block v. News America_, 9th Cir. 1992) allows using a mark to refer to the trademarked product, if you use only as much as needed and imply no sponsorship.

### Inferences

- **Artwork:**
  - Get art from the RSS feed (`<itunes:image>`), not from the Apple or Spotify APIs, to avoid API promo-only restrictions.
  - Display it at thumbnail or card size, linked to the show and attributed.
  - If you cache or resize art locally for performance, that is technically a reproduction. It's widely done by apps, but hotlinking or a pass-through image CDN keeps you closer to the _Perfect 10_ posture. This is a minor risk.
- **Descriptions:**
  - Original curator blurbs and "why it's great" writing are your own copyrightable content and the site's core value. They carry no licensing risk.
  - Quote feed descriptions only as feed metadata, verbatim and attributed.
  - Don't scrape full episode transcripts or long show-note text.
- **Show names:** use plain text names.
  - Avoid logos as decoration.
  - Add a disclaimer such as "deadpods is not affiliated with the shows listed; all trademarks and artwork belong to their owners."
  - Don't use show names in a way that implies partnership, such as in ad targeting or the domain/branding of pages.

### Gaps

- No podcast-specific cover-art case was found.
- Thumbnail precedent was not re-fetched this session.

---

## 5. Third-party API terms (Apple, Listen Notes, Podcast Index, Spotify)

### Takeaway

- **Apple's Search API** is fine for lookup (finding feed URLs, IDs) and rate-limited to about 20 calls per minute. Its media and artwork are promo-only and must sit next to an Apple badge.
- **Listen Notes' free and PRO tiers** forbid server-side caching or storage (except IDs and pub dates) and require a "Powered by Listen Notes" logo. That conflicts with a static Astro build that bakes data into pages.
- **Podcast Index** is the most permissive ("free for any use").
- **Spotify's** developer terms are restrictive and Spotify-content-centric.

### Cited Findings

- **Apple Search API:**
  - Allowed for search fields and ID lookups.
  - Promo content (previews, art) is "only to promote store content and not for entertainment purposes," only on pages promoting that content, and must sit near a badge linking to the store.
  - Previews must be streamed, not cached.
  - About 20 calls per minute (subject to change). Heavy users should use the Enterprise Partner Feed (EPF).
  - Large sites are encouraged to cache search and lookup responses.
  - Promo content must be removed on Apple's request.
  - Source: [Apple Performance Partners](https://performance-partners.apple.com/search-api); [API docs](https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api/)
- **Listen Notes API terms:**
  - Display a "Powered by Listen Notes" logo on pages showing its data.
  - Must not "pre-fetch, cache, index, or store any content on the server side" except podcast or episode `id` and `pub_date`. Enterprise plans may store data; PRO plans may not.
  - No circumventing limits or creating multiple free accounts.
  - Source: [Listen Notes API Terms](https://www.listennotes.com/api/terms/)
- **Podcast Index:** core index free "for any use," with an API key and secret and a custom User-Agent required. The full database can be downloaded as sqlite3. — [podcast-index-api README](https://cdn.jsdelivr.net/npm/podcast-index-api@2.0.0/README.md); [Simon Frey summary](https://simon-frey.com/links/category/entrepreneurship/podcast-index) (official terms page returned 403)
- **Spotify Developer Policy and Terms v10** (effective May 15, 2025):
  - Metadata and cover art may only be used together with the underlying Spotify content.
  - Spotify branding is required alongside Spotify metadata.
  - Several app categories are banned, including non-interactive webcasting.
  - Sources: [Spotify Developer Policy](https://developer.spotify.com/policy/); [Developer Terms](https://developer.spotify.com/developer-terms-of-use/); [Design guidelines](https://developer.spotify.com/design/)

### Inferences

- **For a static Astro site:**
  - Use the Podcast Index (or the raw RSS feeds themselves) as the data backbone.
  - Use the Apple Search/Lookup API only at build time to find feed URLs and Apple IDs for "Listen on Apple Podcasts" links. Feed URLs are facts, and badge links satisfy the spirit of Apple's terms.
  - Avoid storing Listen Notes data in build output unless you're on the Enterprise tier.
  - Use Spotify only for official embeds or links, not as a metadata source.
- **Data from RSS feeds directly** isn't governed by any API terms, only by copyright and implied-license norms (see sections 2 and 4).

### Gaps

- The official Podcast Index terms text wasn't read.
- Full Apple Search API legal terms beyond the overview page weren't found.
- Spotify's embed ToS weren't reviewed separately.

---

## 6. Running ads alongside third-party audio

### Takeaway

Ads don't change whether hotlinking is a "display" or "transmission." _Emmerich_ found no direct infringement even though NewsBreak's framed view ran alongside its own ads. Ads do matter in three ways:

1. They weigh against you on fair-use factor 1, which matters for rehosting and artwork.
2. They can matter for §512 "financial benefit" and for EU _GS Media_ knowledge presumptions.
3. They break NonCommercial CC licenses.

The podcast industry norm accepts app-level display ads but not ads inserted into or gating episodes.

### Cited Findings

- _Emmerich_: NewsBreak displayed framed publisher pages "alongside NewsBreak's ads and other elements," and the court still held there was no direct infringement under the transmit test. — [Proskauer](https://www.proskauer.com/insights/get-pdf/30263)
- Podnews' unwritten contract: apps may earn revenue through app-level display ads or paid memberships that don't gate a specific show. Inserting ads into audio and paywalling shows are out of bounds. — [Podnews](https://podnews.net/article/the-unwritten-contract)
- _Hachette_: the panel treated commerciality as relevant to factor 1 but declined to call IA's donation-seeking "commercial." Monetization is weighed, but it isn't dispositive. — [Authors Alliance](https://www.authorsalliance.org/2024/09/05/hachette-v-internet-archive-update-second-circuit-court-of-appeals-rules-against-internet-archive/)
- §512(c)(1)(B) excludes safe harbor where the provider receives a financial benefit directly attributable to infringing activity it has the right and ability to control. — [17 U.S.C. §512](https://www.law.cornell.edu/uscode/text/17/512)
- CBC's 2016 objection was specifically to _commercial_ use of its feeds without a licence. — [Boing Boing](https://boingboing.net/2016/11/08/cbc-threatens-podcast-app-make.html)

### Inferences

- **Low-risk ad model:** site-level display ads or sponsorships placed around curation content. No pre-roll ads before third-party episodes, and no ads overlaid on the player.
- **Higher-risk models:** pre-roll before a publisher's episode (resembles inserting ads into audio), or gating episodes behind membership.
- **Reputational risk is likely bigger than legal risk** for a hobby site. Publishers objected to Luminary on grounds of commercial free-riding plus lost analytics and sponsor links.
- **Ad-tech scripts** bring cookie and consent obligations (see section 8).

### Gaps

- No case found where ads near hotlinked audio changed the liability outcome.

---

## 7. GPL-3.0 implications, dependency compatibility, AGPL vs GPL vs MIT, separating code and content licenses

### Takeaway

- GPL-3.0 covers the site's source code, not the curated content or the third-party podcasts it plays.
- MIT and Apache-2.0 dependencies are compatible with GPL-3.0.
- GPL's copyleft triggers only on _distribution_. Running the site as a public web service is not distribution, so it doesn't force anyone to share modified server code. Only AGPL-3.0 closes that gap.
- Content and data should carry a separate license, e.g. CC BY 4.0 for original blurbs and curated lists, with third-party artwork and descriptions explicitly excluded.

### Cited Findings (background knowledge from GNU's FAQ and license list, not re-fetched this session; URLs are canonical)

- GNU lists the Expat/MIT license and Apache License 2.0 as GPL-compatible. Apache-2.0 is compatible with GPLv3 but not GPLv2. — [GNU license list](https://www.gnu.org/licenses/license-list.html)
- GPL's requirements apply when you "convey" (distribute) the software. Running a modified program on a server for users, without distributing it, doesn't require releasing source. The GNU AGPL was created to require source availability for network users. — [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html); [Why the Affero GPL](https://www.gnu.org/licenses/why-affero-gpl.html)
- **Client-side JavaScript is different.** JS sent to browsers _is_ distributed, so GPL obligations apply to the shipped JS bundle. — [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html)
- The GPL FAQ says the output of a program isn't covered by the program's license unless the output contains parts of the program. Site content isn't GPL'd just because the generator is. — [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html)
- GNU recommends against using GPL for non-software works, and suggests CC licenses for content in some contexts. — [GNU license list](https://www.gnu.org/licenses/license-list.html)

### Inferences

- **For deadpods (Astro static site):**
  - GPL-3.0 means anyone who forks and redistributes the code must keep it GPL. Astro's static output is HTML, CSS, and JS shipped to browsers, so the shipped JS is technically "conveyed."
  - In practice: keep the LICENSE file, and consider adding a source link in the footer, which also satisfies AGPL-style expectations.
- **License choice:**
  - **MIT:** maximum reuse, no copyleft.
  - **GPL-3.0:** copyleft for forks that are distributed.
  - **AGPL-3.0:** copyleft even for hosted forks. This matters if someone runs a modified deadpods with server code (SSR, API routes). For a pure static site, AGPL adds little over GPL.
  - The code is mostly the owner's, so relicensing remains possible while there are no outside contributors. Once you accept contributions, relicensing needs their consent or a CLA/DCO strategy.
- **Content licensing:**
  - Add `CONTENT_LICENSE` or a footer note, e.g.: "Code: GPL-3.0. Original text and curated data (lists, blurbs, rankings): CC BY 4.0 (or CC BY-SA 4.0). Podcast audio, artwork, titles, and descriptions belong to their respective owners and are not licensed by deadpods."
  - This prevents accidentally claiming to license third-party material under GPL or CC.
  - If the curated dataset (JSON/YAML of shows and episodes) lives in the repo, mark it as covered by the content license.
- **Dependencies:** check that npm dependencies aren't GPL-incompatible, e.g. SSPL, "Commons Clause," or some font licenses. Fonts under the SIL OFL are fine to bundle.

### Gaps

- GNU FAQ entries were not re-fetched this session. Exact FAQ wording should be verified.

---

## 8. Privacy law basics: analytics, cookies, GDPR/CCPA, submissions

### Takeaway

- **US:** a hobby site almost certainly falls below CCPA/CPRA thresholds, but should still post a short privacy policy. California's CalOPPA requires a privacy policy for commercial sites collecting PII from California residents (background knowledge).
- **EU:** if EU visitors are served, GDPR applies to any personal data (emails, IPs). ePrivacy Art. 5(3) requires consent for non-essential cookies or device storage.
- **Cookieless analytics:** tools like Plausible, Fathom, or self-hosted GoatCounter/Umami can avoid a banner. Vendors dispute whether hashed-IP methods are fully exempt, and regulator guidance wasn't located.

### Cited Findings

- **Two-part EU test:**
  - ePrivacy Art. 5(3) asks whether you stored or read anything on the user's device.
  - GDPR asks whether you processed personal data.
  - A banner-free tool must pass both.
  - Source: [Sealmetrics analysis](https://sealmetrics.com/blog/gdpr-eprivacy-analytics-legal-assessment.md) (competitor vendor; treat with caution)
- **Plausible's position:** it uses no cookies or persistent identifiers, counts unique visitors with a random daily-rotating salt, and claims no banner is required in most jurisdictions, including under GDPR and CCPA. — [Plausible](https://plausible.io/cookieless-web-analytics)
- **Counterpoint:** competitor Sealmetrics argues Plausible's hashed-IP approach "may require consent in strict interpretations of GDPR." — [Sealmetrics](https://sealmetrics.com/blog/gdpr-eprivacy-analytics-legal-assessment.md)
- **CCPA/CPRA thresholds** (from California AG; background knowledge, verify on the page): a for-profit business doing business in California qualifies if it meets any of these:
  - Annual gross revenue above about $25M (inflation-adjusted).
  - Buys, sells, or shares the personal information of 100,000 or more consumers or households.
  - Derives 50% or more of revenue from selling or sharing personal information.
  - Source: [California AG CCPA page](https://oag.ca.gov/privacy/ccpa)

### Inferences

- **Submissions:**
  - Collect the minimum: show and episode suggestion plus an optional email.
  - State the purpose ("only to follow up on your submission"), retention, and a deletion contact.
  - **GDPR lawful basis:** consent or legitimate interest.
  - Don't add submitters to a newsletter without opt-in. CAN-SPAM applies to commercial emails in the US; GDPR/PECR rules apply in the EU and UK.
  - Use a processor with a DPA (e.g., Netlify Forms or Formspree) or store in GitHub Issues. Note GitHub Issues makes submissions public.
- **Third-party embeds and players:**
  - Spotify, Apple, and YouTube embeds set cookies themselves, which would bring back the need for a banner.
  - A plain `<audio>` element pointing at publisher enclosures doesn't set deadpods cookies. It does reveal the listener's IP to the publisher's host and its tracking-prefix services (Podtrac, Chartable successors, etc.).
  - **Mitigation:** disclose this in the privacy policy, and/or use click-to-load ("play loads audio from the publisher's server").
- **Ads:** ad networks (AdSense, etc.) use cookies, so you'd need a consent banner in the EU and UK, plus a "Do Not Sell/Share" link if CCPA ever applied. Self-sold sponsorships with no tracking avoid this.
- **Fonts:** self-host fonts rather than loading Google Fonts from Google's servers. A German court (LG München, 2022; background knowledge) found dynamic Google Fonts loading transmitted IPs without consent.

### Gaps

- No EDPB or national DPA (CNIL, ICO) guidance on cookieless analytics was fetched. CNIL publishes a consent-exemption list for audience measurement that should be checked.
- The CCPA threshold page wasn't fetched this session.
- The status of a 2026 US federal privacy law wasn't checked.
