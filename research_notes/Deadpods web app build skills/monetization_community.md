# Monetization & Community Submissions/Moderation for deadpods.com

Scope: an early-stage hobby static site (Astro + GitHub + Google Sheets backend) curating ended podcasts with playable best episodes. Bias: low cost, low maintenance, solo dev. Researched Oct 2026. About 16 tool calls, so some areas (Carbon Ads, voting-system examples, newsletter pricing details) are thinner than others. They are flagged under Gaps.

## Monetization: ad networks, affiliates, donations, V4V, and realistic revenue

### Takeaway

At hobby-site traffic (a few thousand to tens of thousands of pageviews a month), display ads pay almost nothing and the curated networks (EthicalAds, Carbon) are either out of reach or aimed at developer audiences. The realistic stack is: affiliate links that fit the content (Bookshop.org/Audible for books and audiobooks by hosts), a zero-fee tip jar (Ko-fi), and possibly one direct sponsor later. Value4Value Lightning boosts fit the Podcasting 2.0 theme well but mainly pay _podcasters_. Since these shows are dead, that money would probably go to deadpods only as a novelty.

### Cited Findings

**Display ads**

- EthicalAds requires "at least 50,000 pageviews per month." It may make exceptions for fast-growing, high-quality, relevant sites — [EthicalAds Publisher FAQ](https://www.ethicalads.io/publishers/faq/)
- EthicalAds publishers generally see about $2.50 per 1,000 pageviews when most traffic is from the EU or North America. Other regions earn less. Its calculator says most publishers earn $2.25–$2.75 CPM and receive 70% of what advertisers pay — [EthicalAds FAQ](https://www.ethicalads.io/publishers/faq/); [EthicalAds Revenue Calculator](https://www.ethicalads.io/publishers/calculator/)
- EthicalAds privacy: targeting uses crawled page content "without using any personal data or tracking." Geo-targeting is country-level by IP, and "IP addresses are not stored." The ad client is open source. Its audience and advertisers are developer-focused (topic pages for Python, data science, web devs) — [EthicalAds FAQ](https://www.ethicalads.io/publishers/faq/); [EthicalAds topics](https://www.ethicalads.io/publishers/topics/python/)
- EthicalAds payout minimum is $50, paid via PayPal, Open Collective, GitHub Sponsors, or Stripe bank transfer. It serves unpaid ads before a publisher is approved — [EthicalAds Publisher's Guide](https://www.ethicalads.io/publisher-guide/) (via search summary)
- Carbon Ads (run by BuySellAds) is invite-only. Publishers are "hand-picked" for content quality and audience engagement, with a developer/designer focus ("350+ curated sites" on the homepage; an older media kit says 900). There is no published traffic minimum — [Carbon Ads](https://carbonads.net/); [Carbon Ads media kit](https://www.buysellads.com/hubfs/Carbon%20Ads%20Media%20Kit.pdf); [Carbon placement policy](https://www.carbonads.net/placement-policy)
- For comparison, premium networks Mediavine and Raptive require roughly 50,000 sessions a month and 25,000 pageviews a month respectively (third-party 2026 guide) — [Panstag 2026 switch guide](https://www.panstag.com/2026/07/when-to-move-adsense-to-premium-ad-network.html)
- AdSense RPM figures are unreliable and conflicting in third-party sources. One guide cites an average RPM of about $2.34. A single blog reports 30–90% RPM drops for small publishers since January 2026, which I could not verify — [weforads benchmarks 2026](https://weforads.com/blog/ad-revenue-benchmarks-2026/); [Panstag RPM drop](https://www.panstag.com/2026/08/adsense-rpm-dropped-small-blogger-fix.html)

**Affiliates**

- Bookshop.org pays non-bookstore affiliates a 10% commission on books bought through their links, with a 48-hour referral window. A matching amount goes to independent bookstores — [Bookshop.org support](https://support.bookshop.org/en/support/solutions/articles/65000191390-can-you-explain-bookshop-org-s-affiliate-program-); [uppromote listing](https://uppromote.com/affiliate-directory/bookshop/)
- Bookshop.org minimum payout is $10, paid monthly (third-party only, unconfirmed) — [uppromote](https://uppromote.com/affiliate-directory/bookshop/)
- Audible's US affiliate program runs through Amazon Associates. Audible's page lists $5 per free-trial signup and $10 per paid membership, with promos up to 4×. Amazon's own commission table lists different bounties ($20 Standard monthly, $25 Premium Plus annual, $10 Premium Plus monthly), so the sources conflict. In the UK and Canada the program runs via Awin — [Audible affiliates](https://www.audible.com/ep/affiliates); [Amazon Associates commission statement](https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ/)

**Donations / tips**

- Ko-fi: 0% platform fee on donations on the free plan. Sources disagree on whether there is a 5% fee on shop sales. Ko-fi Gold (0% on everything) is quoted at $8 or $12 a month by different sources. Buy Me a Coffee takes a flat 5%. Both pass through roughly 2.9% + $0.30 in Stripe/PayPal fees (third-party comparisons) — [Dodo Payments](https://dodopayments.com/blogs/ko-fi-alternatives); [Schoolmaker BMC pricing](https://schoolmaker.com/blog/buy-me-a-coffee-pricing); [talks.co](https://talks.co/p/kofi-vs-buy-me-a-coffee/)

**Podcasting 2.0 / Value4Value**

- V4V uses the `<podcast:value>` RSS tag. Listeners can send boosts (one-off payments), boostagrams (a boost with a message), or streaming sats per minute over Lightning, with fees under $0.01 and confirmation in seconds. Apps that support it include Fountain, Castamatic, Podcast Guru, and Podverse. Alby provides browser and wallet integration — [Alby blog](https://blog.getalby.com/getting-started-with-podcasting-2-0-using-anchor-and-alby); [Alby/Castamatic](https://blog.getalby.com/alby-partnership-announcement-accelerating-podcasting-2-0-with-castamatic); [Juraj Bednar](https://juraj.bednar.io/en/blog-en/2024/10/23/how-i-save-my-time-and-attention-with-value4value-podcasts/)
- Adam Curry claims more than 500,000 podcasts use V4V. This is self-reported by the movement's promoter — [Adam Curry Substack](https://adamcurry.substack.com/p/revolutionizing-media)
- Jupiter Broadcasting's boost page is a working example of a website-side "boost" guide. It recommends Strike in the US and BlueWallet elsewhere — [Jupiter Broadcasting boost](https://jupiterbroadcasting.com/boost/)

**Newsletter monetization**

- Buttondown's paid tiers are about $9, $29, $79, and $139 a month (GetApp). Its own promotional comparison puts 5,000 subscribers at $29 a month versus Kit's $143. I couldn't confirm the exact free-tier subscriber cap — [GetApp Buttondown](https://www.getapp.com/marketing-software/a/buttondown/); [Buttondown vs Kit](https://buttondown.com/alternatives/convertkit)

### Inferences

- Rough math: at 10k pageviews a month, even an EthicalAds-level $2.50 RPM gives about $25 a month, and deadpods would not qualify for EthicalAds anyway (traffic under 50k, non-dev audience). AdSense would earn similar or lower amounts. It would also add third-party cookies, a consent banner (GDPR), and slower page loads (CLS/JS weight) to a fast static site. Recommendation: skip display ads until traffic is meaningfully over 50k pageviews a month.
- The best-fit affiliate links are contextual: "books by this host" (Bookshop.org, 10%, with an indie-friendly story that suits the brand) and "audiobook/Audible narrated by host." Amazon Associates also requires qualifying sales within an initial window to keep the account (from background knowledge, not verified here; check the Associates operating agreement). Bookshop.org is lower friction.
- Donations: a Ko-fi link in the footer and on the about page costs nothing. GitHub Sponsors suits only a dev audience. Patreon or Open Collective is overkill for a solo hobby site.
- Sponsorships: a single "this month's dead-pod list is supported by X" slot, sold directly or through the BuySellAds marketplace, will likely beat network ads once a newsletter exists. Podcast networks and audio apps are natural sponsors.
- V4V: a "boost this show" feature mostly makes sense if a dead podcast's feed still has a `<podcast:value>` block. deadpods could instead accept Lightning tips for itself via an Alby/Lightning address. It's on-theme but likely low revenue.
- Realistic expectation for a niche curation site: about $0–50 a month in year one. Most value comes from newsletter growth that enables a direct sponsor later.

### Gaps

- No verified Carbon Ads traffic threshold or typical RPM. No 2026 BuySellAds marketplace minimums found.
- No authoritative 2026 AdSense RPM for entertainment/podcast niches. Third-party figures conflict.
- Buttondown free-tier cap and Ghost(Pro) 2026 pricing not verified. Patreon, Open Collective, and GitHub Sponsors fees not researched.
- No indie-hacker revenue reports specific to podcast-curation sites found.

## Community submissions into Google Sheets (forms + spam protection)

### Takeaway

The lowest-effort route is Tally (free, unlimited submissions, native Google Sheets integration, embeddable) or a plain Google Form. For a custom-styled form in Astro, a Google Apps Script `doPost` web app that verifies a Cloudflare Turnstile token before calling `appendRow` keeps everything free and inside the existing Sheets backend.

### Cited Findings

- Tally's free plan includes unlimited forms and submissions (within fair use) plus Google Sheets, Notion, Airtable, and webhook integrations. Pro is about $24–29 a month. One third-party page claims a 10-response limit, which contradicts Tally's own pages — [Tally pricing](https://www.tally.so/pricing); [Tally llms.txt](https://tally.so/llms.txt); [Supademo (conflicting)](https://supademo.com/product-demo/tally)
- Apps Script pattern: deploy as a web app with "Execute as: Me" and "Who has access: Anyone." This lets anyone POST data without being able to view the sheet. `doPost(e)` reads `e.parameter.<name>` and calls `appendRow`. Form field names must match. Code changes need a new deployment version — [dev.to: forms for static sites with Google Sheets](https://dev.to/bs_tales/tutorial-add-forms-to-static-sites-with-google-sheets-1c3a); [dev.to: HTML form to Sheets](https://dev.to/allenarduino/how-to-connect-your-html-form-to-google-sheets-without-a-backend-31bo); [thebricks guide](https://thebricks.com/resources/guide-how-to-send-html-form-data-to-google-sheets)
- A vendor article warns of CORS problems when posting to Apps Script from another origin. This is unverified and the source is promotional — [thebricks](https://www.thebricks.com/resources/guide-how-to-connect-html-form-to-google-sheets)
- Cloudflare Turnstile tokens must be verified server-side by POSTing secret + token (+ optional IP) to `https://challenges.cloudflare.com/turnstile/v0/siteverify`. The widget submits the token as the `cf-turnstile-response` form field. The response includes `success` and `error-codes` (e.g. duplicate or expired token). Cloudflare also has a Pages Functions Turnstile plugin — [Cloudflare Pages Turnstile plugin](https://developers.cloudflare.com/pages/functions/plugins/turnstile/); [react-turnstile server validation](https://mintlify.com/marsidev/react-turnstile/guides/server-validation)

### Inferences

- Apps Script + Turnstile flow: Astro form → `fetch(APPS_SCRIPT_URL, {method:'POST', body: new URLSearchParams(formData)})`. A form-urlencoded body is a "simple request," so it avoids a CORS preflight. The Apps Script response may still not be readable cross-origin, so treat it as fire-and-forget or use `mode:'no-cors'`. In `doPost`, `UrlFetchApp.fetch` posts to siteverify, and the script appends the row only if `success` is true. Store the Turnstile secret in Script Properties, not in code. (Design inference; test it.)
- Add a hidden honeypot field (reject the submission if it's filled) and a minimum-time-on-page check. These are free and catch most dumb bots. Apps Script has no built-in rate limiting. `CacheService` keyed by a hash of a field could throttle repeats.
- In the Apps Script editor, "Manage deployments → edit → new version" can keep the same `/exec` URL. The tutorials' claim that you need a new URL each time reflects creating new deployments. (From background knowledge; verify.)
- Alternatives: Formspree, Netlify Forms (only if hosted on Netlify), and Web3Forms all have free tiers but need Zapier/webhooks to reach Sheets. A Cloudflare Pages Function or Worker is a good middle layer if hosting on Cloudflare: verify Turnstile, then write to the Sheets API or D1. Free tiers were not verified in this research.

### Gaps

- Formspree, Netlify Forms, and hCaptcha free-tier limits not fetched this round.
- No official Google doc on Apps Script web-app quotas or CORS behavior was retrieved.

## Moderation workflow (sheet "approved" column, GitHub issue forms, comments)

### Takeaway

Keep moderation inside the tools already in use. Submissions land in a "Submissions" tab with a `status` column (pending/approved/rejected). Approved rows are copied to the published tab, and the Astro build reads only approved rows. For contributors comfortable with GitHub, an issue form is a free, structured, spam-resistant second channel. giscus (GitHub Discussions-backed) gives per-page comments with no backend.

### Cited Findings

- GitHub issue forms are YAML files in `.github/ISSUE_TEMPLATE/`. They require `name`, `description`, and `body`, with optional `labels`, `title`, `assignees`, `type`, and `projects`. Field types include `markdown`, `input`, `textarea`, `dropdown`, `checkboxes`, and `upload`. GitHub labels the feature "public preview" — [GitHub Docs: issue form syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)

### Inferences

- Sheet workflow: `Submissions` (raw, written by the form) → moderator sets `status=approved` via a data-validation dropdown → a `FILTER(Submissions!A:Z, Submissions!status="approved")` view, or an Apps Script trigger, feeds the `Published` tab → Astro fetches the published CSV/JSON at build time. The site rebuilds via a GitHub Actions schedule, or an Apps Script `onEdit` trigger can hit a deploy hook (Netlify, Vercel, or a Cloudflare Pages deploy hook URL).
- Dedup by normalizing the podcast name or feed URL. Cross-checking the Podcast Index API to confirm a feed is real and inactive would help but is optional.
- GitHub flow: issue form "Suggest a dead podcast" with fields for show name, RSS/Apple URL, last-episode date, best episodes, and why. It auto-labels `submission`. A GitHub Action could parse the issue and open a PR that adds a row to a data file. This is more engineering, so use it only if data moves from Sheets to the repo. Requiring a GitHub account limits reach to technical users but nearly eliminates spam.
- giscus maps pages to GitHub Discussions threads. Commenters need GitHub accounts, so it suits a dev audience more than general podcast fans. (Background knowledge; giscus docs not fetched.)

### Gaps

- giscus docs and setup, and the GitHub Discussions category-form feature, not fetched.
- Deploy-hook availability per host not verified.

## Voting / ranking "best episodes" without heavy backend; when to add auth

### Takeaway

Anonymous upvotes are easy to build with a Cloudflare Worker + D1 (free tier: 5M row reads and 100k row writes per day, 5 GB). But anonymous votes are trivially gameable, so treat them as a soft "listener favorites" signal and keep curator picks as the canonical "best episodes." Add auth (magic links via Supabase Auth or similar) only if votes start to matter or are being abused.

### Cited Findings

- Cloudflare D1 Workers Free plan: 5 million rows read per day, 100,000 rows written per day, 5 GB storage. Limits reset at 00:00 UTC. Once a limit is exceeded, D1 returns errors until the reset — [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### Inferences

- Minimal design: `POST /vote {episode_id}` → Worker verifies a Turnstile token (invisible mode) → `INSERT OR IGNORE INTO votes(episode_id, voter_hash, day)` where `voter_hash = sha256(ip + user_agent + daily_salt)`. This allows one vote per voter per episode per day without storing raw IPs. `GET /votes?ids=...` returns counts, cached at the edge. The static site renders curator ranking at build time and fetches live counts client-side.
- Abuse mitigation: Turnstile, a per-IP rate limit (Cloudflare rate-limiting rules or a KV counter), a daily-salted hash, anomaly checks (spikes on one episode), and time-decay or Wilson-score ranking so a burst can't dominate. KV is eventually consistent and poor for counters, so D1 or Durable Objects fit better.
- Alternatives: Supabase (Postgres + RLS + anon key) or Firebase/Firestore. Both have free tiers but need RLS or security rules done carefully to stop direct writes. Free-tier specifics were not verified this round.
- When auth is needed: per-user lists, editable submissions, or contested leaderboards. Cheapest options are Supabase Auth magic links, or Auth.js / Better Auth (Lucia was deprecated as a library in 2025 and turned into learning material — background knowledge, not verified here). Clerk is turnkey but adds vendor lock-in.

### Gaps

- Workers free request limit, KV limits, and Supabase/Firebase free-tier quotas not fetched.
- No concrete examples found of small curation sites running anonymous voting and reporting abuse rates.

## Community building and acquisition channels

### Takeaway

The demand is real and recurring. "Best podcasts that ended" and "finished series" threads come up regularly on Reddit, and big platforms have "completed series" collections. That makes Reddit threads, a small newsletter, and a Bluesky/Mastodon account the cheapest acquisition channels. Discord is probably premature for a solo hobby site.

### Cited Findings

- Reddit users regularly recommend completed shows (e.g. Hunting Warhead praised as "the best done podcast," Parkdale Haunting "nicely tied up," questions like "Best podcast after finishing Serial?"). These are aggregated anecdotes — [GummySearch Reddit podcasts](https://gummysearch.com/tools/best-products/best-podcasts); [Daily Dot](https://dailydot.com/these-podcasts-were-so-good-internet-users-couldnt-stop-listening)
- Existing "finished podcast" discovery exists: "The End" (finished audio fiction), Podchaser's "completed series" filters, Spotify's "Completed Series" section, and Apple Podcasts' "Finished Series" collection (per search summary of a content index) — [podcastvideos.com index](https://www.podcastvideos.com/end-to-end-podcast-series-binges.md)
- Buttondown is a low-cost, indie-friendly newsletter option (paid tiers from about $9 a month) — [GetApp](https://www.getapp.com/marketing-software/a/buttondown/)

### Inferences

- Positioning against competitors: platform collections are editorial and limited, and Podchaser filters by status but not quality. deadpods' differentiator is curated _best episodes_ playable in-browser. Lead with that in Reddit replies (r/podcasts, r/podcast, genre subs like r/audiodrama and r/TrueCrimePodcasts). Be a helpful commenter rather than a self-promoter, since subreddit self-promo rules apply.
- A weekly or monthly "Dead Pod of the Week" newsletter (Buttondown) works three ways: retention, a sponsor slot, and a cross-post source for Bluesky/Mastodon. Astro can generate an RSS feed for the newsletter to auto-ingest.
- Tag still-active hosts of dead shows on Bluesky or Mastodon when featuring them. Hosts often reshare, which is high-leverage acquisition.

### Gaps

- No data on Bluesky vs Mastodon reach for podcast audiences. No subreddit self-promotion rules fetched.

## Examples of similar curated community sites and how they handle contributions

### Takeaway

I found few directly comparable "ended podcast" community sites. The nearest analogs are platform collections and "The End" (audio fiction). The common pattern among GitHub-native curation projects ("awesome lists") is suggestion via issue or PR plus maintainer review, which matches the moderation workflow above.

### Cited Findings

- "The End" caters to listeners who want fully finished audio fiction series. Podchaser offers completed-series filters. Spotify and Apple run completed/finished collections — [podcastvideos.com index](https://www.podcastvideos.com/end-to-end-podcast-series-binges.md)
- Listen Notes hosts user-created "curated podcast" lists (e.g. "The seven video podcasts that are actually worth watching"), showing a user-generated list model — [Listen Notes curated list](https://www.listennotes.com/curated-podcasts/the-seven-video-podcasts-that-are-2X7HBrLvntE)

### Inferences

- The model worth borrowing: maintainer-curated core plus open suggestions (form or issue) and transparent criteria (e.g. "ended ≥1 year, ≥N episodes, back catalog still available"). Publishing the criteria reduces moderation arguments and low-quality submissions.

### Gaps

- Contribution policies for The End, Podchaser, and Listen Notes were not fetched. I found no sources describing how comparable niche curation sites moderate at scale.
