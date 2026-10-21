# Data pipeline (Google Sheets → Astro), hourly regeneration, hosting & devops for deadpods.com

Context: Astro 4 static site, README plan "once an hour fetch Google Sheets data, generate page, serve". Date of research: 2026-10-20. Research budget was ~18 tool calls, so some items below are marked [unverified / from background knowledge] and need checking before anyone relies on them.

## Astro version status & migrating from Astro 4

### Takeaway

Astro is now on the 7.x line (7.1 shipped July 2026). Astro 6 (March 2026) removed legacy content collections, so every collection now has to go through the Content Layer API with explicit loaders. The repo is on Astro 4, so it has to go 4→5→6→7. Because the site is early-stage, it is probably simpler to re-scaffold on the current major than to step through each migration.

### Cited Findings

- Astro 6 released March 10, 2026. Legacy content collections are fully removed, and all collections must use the Content Layer API — [Strapi blog: Astro 6 is here](https://strapi.io/blog/astro-6-is-here-what-changed-and-how-we-updated-our-strapi-5-and-astro-starter); [releases.sh summary](https://releases.sh/release/rel_Cqdx9dg1EcrVmsPcNqVm_-astro-6-content-layer-required-node-18-20-dropped)
- Content Layer was experimental in Astro 4.14 and became stable in Astro 5 — [Astro 4.14 blog](https://astro.build/blog/astro-4140/); [Peerlist: what's new in Astro 5](https://peerlist.io/blog/engineering/whats-new-with-astro-5)
- The v6 upgrade guide says to upgrade to v5 first if you're coming from an older version. v6 breaking changes include:
  - Node 22.12.0+ required (18 and 20 dropped).
  - Zod 4: import from `astro/zod`; `z.string().email()` becomes `z.email()`; `message` becomes `error`; `.default()` values must match the output type.
  - Collections need `src/content.config.ts` plus a loader, with no `type` field.
  - `getEntryBySlug`/`getDataEntryById` are replaced by `getEntry()`; use `id` instead of `slug`; `render(entry)` instead of `entry.render()`.
  - `Astro.glob()` removed (use `import.meta.glob()`).
  - `<ViewTransitions />` removed (use `<ClientRouter />`).
  - `import.meta.env` values are always inlined and no longer coerced.
  - Scripts and styles render in the order they are defined.
  - The image service crops by default and never upscales.
  - `.cjs` config files removed.
  - Source: [Astro docs: Upgrade to v6](https://docs.astro.build/en/guides/upgrade-to/v6/)
- A migration writeup reported that the Zod 3→4 switch broke at least one custom loader — [Strapi blog](https://strapi.io/blog/astro-6-is-here-what-changed-and-how-we-updated-our-strapi-5-and-astro-starter)
- Astro 7.1 was released July 16, 2026. It adds `--ignore-lock` (Astro 7 introduced a dev-server lockfile), a `format` option for `paginate()`, CSP directives, and experimental `collectionStorage`, which splits collection data into roughly 10 MB chunks — [Astro 7.1 blog](https://astro.build/blog/astro-710)
- Loader API version notes: object loaders since 5.0.0, `renderMarkdown()` since 5.9.0, `createSchema()` since 6.0.0, `deferRender` since 7.1.0 — [Astro Content Loader API reference](https://docs.astro.build/en/reference/content-loader-reference/)
- Live content collections, which fetch at runtime (request time) instead of build time, became experimental in Astro 5.10. The 2025 year-in-review said they would be on by default in v6 — [Astro: Live Content Collections deep dive](https://astro.build/blog/live-content-collections-deep-dive/); [Astro 2025 year in review](https://astro.build/blog/year-in-review-2025)

### Inferences

- deadpods has almost no code, so `npm create astro@latest` on 7.x and porting the pages is probably less work than three sequential migrations.
- Pin Node 22 LTS or newer in CI (`.nvmrc` / `engines`).
- Write any custom loader schema in Zod 4 syntax from the start.

### Gaps

- I couldn't confirm the Astro 7.0 release date or its breaking changes (Node minimum, whether live collections are stable or still behind a flag in 7). Check the docs for the v7 upgrade guide.
- I didn't check whether `output: 'hybrid'` removal (an Astro 5 change) affects anything. It doesn't matter for a pure static build.

## Ways to read a Google Sheet (API v4, publish-to-web/gviz, Apps Script, libraries)

### Takeaway

At one fetch per hour, rate limits don't matter. The real choice is between auth simplicity and data exposure:

- **Sheets API v4 with an API key**, on a sheet shared "anyone with link can view": simple, documented, returns JSON, free.
- **Service account**: keeps the sheet private, but you have to manage a JSON key secret in CI.
- **Publish-to-web CSV / gviz endpoints**: need no credentials, but they are undocumented as an API, have opaque server-side caching, and expose the data publicly.

### Cited Findings

- Sheets API v4 quotas:
  - 300 read requests per minute per project, and 60 read requests per minute per user per project; both refill every minute.
  - Going over returns HTTP 429; the docs recommend exponential backoff.
  - A batch request counts as one request.
  - Requests that take longer than 180 s time out.
  - There is no hard size limit, but a 2 MB maximum payload is recommended.
  - Source: [Google Sheets API usage limits](https://developers.google.com/workspace/sheets/api/limits)
- Cost: the same page says all standard use is free, and adds that "charges for exceeding quota limits are planned for later in 2026", billed to your Google Cloud account. Watch this, although an hourly cron is nowhere near the quota — [Google Sheets API usage limits](https://developers.google.com/workspace/sheets/api/limits)
- Publish-to-web CSV and gviz:
  - Community reports say Google applies "very annoying server-side caching" to published sheets. A workaround is cache-busting by changing the request (padding extra columns).
  - Recommended settings: publish a single sheet as CSV and enable "automatically republish when changes are made".
  - Source: [Observable notebook on live sheet loading](https://observablehq.com/d/1dcb1c1e430e8ca9)
- A user reported that the gviz `.../gviz/tq?tqx=out:csv` URL seemed faster than the published CSV link, but it requires the whole document to be web-accessible — [Observable forum](https://talk.observablehq.com/t/d3-csv-and-duckdb-caching-remote-files/10343)
- An alternative is the `/export?format=csv&gid=<gid>` URL, with optional `&range=` — [Erik Tuck notes on Google Sheets](https://publish.obsidian.md/eriktuck/base/Google+Sheets/Google+Sheets)
- I found no official Google documentation of cache TTLs for publish-to-web or gviz responses — [search summary; Observable sources above](https://observablehq.com/d/1dcb1c1e430e8ca9)

### Inferences

Endpoint shapes, from background knowledge [unverified this session]:

- API key: `GET https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{TabName}!A1:Z?key={API_KEY}` returns `{ values: [[header...],[row...]] }`. The sheet must be viewable by anyone with the link. Restrict the key in Cloud Console to the Sheets API (and to referrers or IPs if possible).
- Service account: share the sheet with `xxx@project.iam.gserviceaccount.com` as Viewer, and store the JSON key as a CI secret (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`, minding `\n` escaping in env vars). This keeps the sheet private.
- `values:batchGet` fetches several tabs (podcasts, episodes) in one request, which counts as one quota hit.
- Publish-to-web CSV: `https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pub?gid={GID}&single=true&output=csv`. gviz: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TabName}`. gviz JSON output (`tqx=out:json`) is wrapped in a JS callback and has to be stripped before parsing.

Libraries, from background knowledge [unverified versions]:

- `googleapis` (official, heavy).
- `google-spreadsheet` (theoroch; friendlier row objects; v4+ uses `google-auth-library` JWT for service accounts and supports API-key read-only access).
- `papaparse` for CSV with `header: true`.
- For a single values call, plain `fetch` with zero dependencies is enough.

Apps Script web app (`doGet` returning `ContentService` JSON):

- Gives a custom JSON shape without GCP setup.
- Downsides: redirect hops to `script.googleusercontent.com`, cold-start latency, per-user execution quotas, and the deployment-versioning dance.
- I didn't verify this in a source this session, so treat it as background knowledge.

Recommendation for deadpods: Sheets API v4 with an API key on a link-viewable sheet. The content is public podcast data anyway. Wrap the fetch in a custom Astro loader that validates with Zod and fails the build loudly on bad rows. Switch to a service account if the sheet holds private notes.

Gotchas:

- Sheet cells come back as strings, so coerce numbers, booleans and dates in Zod (`z.coerce.number()`, etc.).
- Editors renaming header columns will break mapping, so validate headers.
- Empty trailing cells are omitted from rows in the API v4 `values` array.

### Gaps

- I didn't verify the current `google-spreadsheet` major version or API-key support in 2026.
- I didn't find official docs for Apps Script quotas.
- I didn't find an official TTL for published CSV caching.

## Astro Content Layer: is there a Google Sheets loader? How to write a custom one

### Takeaway

Astro ships no remote loaders, and I found no maintained, official-listed Google Sheets loader. A roughly 30-line inline object loader with a Zod schema is the standard approach. Build-time loaders only refresh on rebuild, which fits the hourly-rebuild plan.

### Cited Findings

- Astro ships `glob()` and `file()` only. There are no prebuilt loaders for remote content, so you use a custom loader or a community package — [Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/); [Strapi blog](https://strapi.io/blog/astro-6-is-here-what-changed-and-how-we-updated-our-strapi-5-and-astro-starter)
- A loader can be:
  - an async function returning an array or object of entries (simplest), or
  - an object `{ name, load(ctx), schema? }`. `ctx` provides `store` (get/set/has/delete/clear/keys/values/entries), `meta` (collection-scoped key-value store that persists between builds, e.g. for sync tokens or last-modified times), `logger`, `parseData()` (schema validation), `generateDigest()` (lets the store skip unchanged entries), `config`, `renderMarkdown()`, `watcher` (dev only), `refreshContextData`, and `collection`.
  - A schema set in the collection config overrides the loader's schema. `createSchema()` (6.0+) handles schemas generated at build time.
  - Source: [Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)
- Official example pattern, adapted to Sheets:
  ```ts
  // src/content.config.ts
  import { defineCollection } from 'astro:content';
  import type { Loader } from 'astro/loaders';
  import { z } from 'astro/zod';
  const podcasts = defineCollection({
  	loader: {
  		name: 'gsheets-podcasts',
  		load: async ({ store, meta, logger, parseData, generateDigest }) => {
  			const url = `https://sheets.googleapis.com/v4/spreadsheets/${import.meta.env.SHEET_ID}/values/Podcasts!A1:Z?key=${import.meta.env.GOOGLE_API_KEY}`;
  			const { values } = await (await fetch(url)).json();
  			const [header, ...rows] = values;
  			store.clear();
  			for (const r of rows) {
  				const obj = Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']));
  				const data = await parseData({ id: obj.slug, data: obj });
  				store.set({ id: obj.slug, data, digest: generateDigest(data) });
  			}
  			meta.set('lastSync', new Date().toISOString());
  			logger.info(`Loaded ${rows.length} podcasts`);
  		},
  		schema: z.object({
  			slug: z.string(),
  			title: z.string(),
  			feedUrl: z.url(),
  			endedYear: z.coerce.number().optional()
  		})
  	} satisfies Loader
  });
  export const collections = { podcasts };
  ```
  Structure from [Astro docs example](https://docs.astro.build/en/reference/content-loader-reference/); the Sheets URL and fields are illustrative.
- A 2026 iThome article: build-time loaders only read the source during sync or build, so sheet edits reach the static site only after a rebuild (webhook or CI). Sheets suits small tables with fixed fields — [iThome](https://ithelp.ithome.com.tw/articles/10409247)
- Live collections (runtime loaders) are the alternative if you want per-request freshness with SSR — [Astro Live Content Collections deep dive](https://astro.build/blog/live-content-collections-deep-dive/)

### Inferences

- Model the data as two collections, `podcasts` and `episodes`, from two tabs. Use `reference('podcasts')` in the episode schema for relational integrity.
- `generateDigest` and `meta` give a natural "skip unchanged" hook, but on CI each build starts fresh unless `.astro/` or `node_modules/.astro` data-store caching is persisted between runs [unverified]. That's why a hash check outside Astro (next section) is more practical.

### Gaps

- I didn't search npm or GitHub exhaustively for community Sheets loaders (e.g. "astro-loader-google-sheets"); the search engine returned none.

## Hourly regeneration options: simplest/cheapest, and rebuilding only when data changes

### Takeaway

Simplest and free: a GitHub Actions `schedule` cron (hourly) that fetches the sheet and hashes it. If the hash changed, it builds and deploys (or calls a host's deploy hook). Vercel Hobby cron can't run hourly. Netlify's credit-based free plan charges about 15 credits per production deploy, so 24 deploys a day would blow the 300-credit budget, and you need hash-gating there. Cloudflare Workers cron (5 per account on free) can trigger a deploy hook, or the site can be SSR'd with edge caching.

### Cited Findings

- GitHub Actions `schedule`:
  - Minimum interval is every 5 minutes.
  - Runs can be delayed under high load.
  - Runs only on the default branch.
  - In public repos, scheduled workflows are auto-disabled after 60 days without repository activity.
  - Source: [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- Vercel cron:
  - Hobby is limited to once per day, with ±59 min precision. Expressions like `0 * * * *` fail deployment with "Hobby accounts are limited to daily cron jobs."
  - Pro allows once per minute. 100 cron jobs per project on all plans.
  - Source: [Vercel Cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- Vercel deploy hooks and deployment caps:
  - 5 deploy hooks per project on Hobby, triggerable up to 60 times per hour per project.
  - Hobby: 100 deployments/day, 100 builds/hour, 45 min build time per deployment, 1 concurrent build.
  - Source: [Vercel Limits](https://vercel.com/docs/limits)
  - So hourly hook-triggered rebuilds (24/day) from an external cron fit Hobby.
- Netlify free plan:
  - 300 credits per month. Production deploys cost 15 credits each, bandwidth 20 credits/GB, web requests 2 credits per 10k.
  - Personal is $9/month (1,000 credits); Pro is $20/month (3,000 credits).
  - Source: [Netlify pricing](https://www.netlify.com/pricing/)
  - Arithmetic: 24 deploys/day × 30 = 720 deploys = 10,800 credits, far over 300. Even about 20 deploys a month uses the whole free allowance. The pricing page didn't say what happens on overage.
- Cloudflare Workers cron triggers: configured in `wrangler.jsonc` as `{"triggers":{"crons":["0 * * * *"]}}` (UTC) with an `async scheduled(controller, env, ctx)` handler. Schedule changes take up to 15 min to apply — [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- Workers free plan: 100,000 requests/day (Error 1027 over that), 10 ms CPU per invocation (HTTP and cron), 5 cron triggers per account, 50 subrequests per invocation — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Cloudflare Pages free plan: 500 builds/month, 1 concurrent build, 20 min build timeout, 20,000 files, 25 MiB per file. For scale, Cloudflare points to Workers Static Assets — [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
  - Hourly builds = about 720/month, which exceeds 500, so you need hash-gating or a build in GitHub Actions plus `wrangler deploy` (direct upload, which doesn't use Pages builds [unverified that direct uploads don't count toward the build quota]).

### Inferences

Recommended pipeline: GitHub Actions cron → fetch + hash → build on runner → deploy (Cloudflare `wrangler deploy` / Pages direct upload, Netlify CLI deploy, or GitHub Pages). Sketch:

```yaml
on:
  schedule: [{ cron: '7 * * * *' }]   # off the top of the hour to reduce queue delays
  workflow_dispatch:
  push: { branches: [main] }
jobs:
  check:
    runs-on: ubuntu-latest
    outputs: { changed: ${{ steps.h.outputs.changed }} }
    steps:
      - id: h
        run: |
          curl -s "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID/values:batchGet?ranges=Podcasts&ranges=Episodes&key=$KEY" > data.json
          echo "hash=$(sha256sum data.json | cut -d' ' -f1)" >> $GITHUB_OUTPUT
      # compare against previous hash via actions/cache or a committed data-hash file / repo variable
```

- Hash storage options:
  1. `actions/cache` keyed by hash (restore-only lookup).
  2. Commit `data/snapshot.json` to the repo when it changes. This gives git history of content edits (a free audit log and rollback), and the commit itself counts as repo activity, which avoids the 60-day auto-disable while edits keep happening.
  3. Store the hash as a repo variable via `gh variable set`.
- Option 2 also makes the build deterministic: Astro reads the committed JSON with the `file()` loader, so the build never hits Google. Sheet outages then can't break deploys, and every content change is reviewable. Strongly recommended.
- Comparing the platforms:
  - GitHub Pages + Actions is the zero-cost, zero-vendor option.
  - Cloudflare gives the most generous static bandwidth [see hosting section].
  - Vercel is fine only if the hourly trigger is external.
  - Netlify's credit model makes frequent deploys costly.
- SSR alternative: run Astro SSR (adapter) with `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` and fetch the sheet per cache miss. Fresh within an hour with no rebuilds, but it adds function invocations, cold starts, and a runtime dependency on Google. Vercel's Astro adapter also supports ISR-style caching [not verified this session]. That's overkill for data that changes a few times a week.
- Workers 10 ms CPU on free could be tight for SSR rendering plus JSON parsing, but fine for a cron that just POSTs a deploy hook.

### Gaps

- I didn't fetch Netlify scheduled functions docs or the build-hook overage policy.
- I didn't verify the Vercel Astro adapter's ISR config in 2026.
- I didn't verify whether Cloudflare Pages direct uploads count toward the 500 builds.

## Alternatives to Sheets and when to switch

### Takeaway

Sheets is fine for a single curator editing a small, fixed-field table. The strongest alternative for this project is **git-based YAML/JSON/Markdown in the repo**: Astro `file()`/`glob()` loaders, PR review, with Keystatic or Decap as an optional editing UI. Switch when you need contributor submissions with review, rich text per episode, or the sheet outgrows simple tabs.

### Cited Findings

- iThome (2026): Sheets suits small tables with fixed fields; a static site needs a rebuild on change — [iThome](https://ithelp.ithome.com.tw/articles/10409247)
- Astro's built-in `glob()` and `file()` loaders handle local Markdown/YAML/JSON natively — [Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)

### Inferences

Background knowledge, not source-verified this session:

- **Airtable**: real typed fields and attachments, but a tight free tier and API rate limits (about 5 req/s per base).
- **Notion**: community Astro loaders exist (e.g. `notion-astro-loader`); a nice editor, but the API is slow and paginated.
- **Supabase**: Postgres, overkill unless there's user-generated data such as votes or submissions.
- **Keystatic**: git-backed, local or GitHub mode, first-class Astro integration.
- **Decap CMS** (formerly Netlify CMS): git-backed, needs an OAuth backend.

Git-based fits a GPL open-source project: community can PR new dead podcasts, no secrets are needed in CI, builds are deterministic, and the hourly cron becomes unnecessary because each merge triggers a deploy.

Hybrid: keep Sheets as the editing UI, but snapshot to `data/*.json` in git via the Action (see previous section). You get Sheets ergonomics with git durability.

### Gaps

- I didn't verify current Airtable, Notion or Supabase free-tier numbers or the status of their Astro loaders in 2026.

## Hosting comparison for Astro (free tiers, 2026)

### Takeaway

For a pure static site:

- **Cloudflare (Workers Static Assets / Pages)** and **GitHub Pages** are the cheapest and most generous.
- **Vercel Hobby** is generous (100 GB transfer) but non-commercial only, and has no hourly cron.
- **Netlify's** 2025+ credit model (300 credits) makes frequent deploys and bandwidth relatively expensive on free.

### Cited Findings

- Vercel Hobby:
  - Monthly allotments: 100 GB Fast Data Transfer, 1M function invocations, 10 GB Fast Origin Transfer, 4 h Active CPU, 360 GB-hrs provisioned memory, 5K image transformations.
  - Restricted to non-commercial personal use. Ads, affiliate-primary sites and paid work are commercial; donations are not.
  - Source: [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
  - Also 100 deployments/day, 45 min per build, 100 MB static file upload via CLI on Hobby — [Vercel Limits](https://vercel.com/docs/limits)
- Netlify Free: 300 credits/month, 15 credits per production deploy, 20 credits/GB bandwidth (so about 15 GB if spent only on bandwidth), 2 credits per 10k web requests. Personal $9/mo, Pro $20/mo — [Netlify pricing](https://www.netlify.com/pricing/)
- Cloudflare Pages Free: 500 builds/month, 1 concurrent, 20 min timeout, 20k files, 25 MiB per file, 100 custom domains per project — [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- Cloudflare Workers Free: 100k requests/day, 10 ms CPU, 5 crons, 20,000 static asset files per version — [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

### Inferences

- Background knowledge, unverified this session: Cloudflare static asset requests are free and unlimited and don't count against the Worker request quota. GitHub Pages has a soft 100 GB/month bandwidth limit, a 1 GB site size, a soft limit of 10 builds/hour (doesn't apply to Actions-based deploys), and terms disallowing primarily commercial use.
- Audio files: deadpods should link or stream from the original podcast enclosure URLs (RSS `<enclosure>`), not re-host. Bandwidth then stays trivial on any host, and copyright and hosting-cost risk is avoided.
- Ranking for deadpods: Cloudflare (static assets + optional cron Worker) ≈ GitHub Pages > Vercel Hobby (non-commercial caveat) > Netlify free.

### Gaps

- I didn't fetch the GitHub Pages limits page or confirm the Cloudflare static-asset free/unlimited claim.
- The Netlify overage behaviour (pause vs bill) wasn't stated on the pricing page.

## Privacy-friendly analytics, including audio-play events

### Takeaway

- **Umami Cloud** has a free Hobby tier (100K events/mo) with custom events, and it's MIT and self-hostable.
- **Plausible**: polished, paid only (about $9/€9 per month starter, 30-day trial).
- **GoatCounter**: minimal, free/donation-supported.
- **Cloudflare Web Analytics**: free, but no custom events [unverified].

Audio plays are tracked by firing a custom event from the `<audio>` `play` handler.

### Cited Findings

- Umami Cloud: Hobby free (100K events/mo, 3 sites); Pro $20/mo (1M events, 20 sites); custom events supported; MIT-licensed — [solodevstack: Umami vs Plausible](https://solodevstack.com/blog/umami-vs-plausible-solo-developers); [vemetric: Plausible vs Umami](https://vemetric.com/blog/plausible-vs-umami)
- Plausible: cloud from about $9/mo (one source says €9/mo for 10k pageviews, 1 site), 30-day trial then paid, custom events API — [databuddy 2026 guide](https://www.databuddy.cc/blog/plausible-vs-matomo-vs-privacy-first-analytics-2026); [solodevstack](https://solodevstack.com/blog/umami-vs-plausible-solo-developers)
- GoatCounter: sources conflict on whether a hosted service exists. One says self-host only; another says it's a free, donation-supported hosted service. Both agree it supports events — [dasroot 2026](https://dasroot.net/posts/2026/03/privacy-preserving-analytics-plausible-umami-goatcounter/); [wmtips](https://www.wmtips.com/technologies/compare/goatcounter-vs-umami/). From background knowledge, goatcounter.com does offer free hosting for non-commercial use.
- All of the above figures come from third-party comparison posts, not vendor pricing pages, so verify them.

### Inferences

Event snippets, from background knowledge of each library's API:

```js
audio.addEventListener('play', () => {
	window.umami?.track('play', { podcast, episode }); // Umami
	window.plausible?.('Play', { props: { podcast, episode } }); // Plausible
	window.goatcounter?.count({ path: `play/${podcast}/${episode}`, event: true }); // GoatCounter
});
```

- Throttle events to one per episode per page load (resume after pause shouldn't double count), and optionally add a "listened 30s" event via `timeupdate`.
- Fathom: paid only (about $15/mo historically) [unverified].
- Cloudflare Web Analytics: free, cookieless beacon, pageviews and Web Vitals only, no custom events [unverified].
- Pick for deadpods: Umami Cloud free, or GoatCounter for minimalism. Both are cookieless, so no consent banner is needed in most cases.

### Gaps

- I didn't fetch the official pricing pages for Plausible, Fathom or GoatCounter, or the Cloudflare Web Analytics docs.

## CI basics: build/check/lint, Lighthouse CI, link checking

### Takeaway

One GitHub Actions workflow on push/PR is enough: Node 22+, `npm ci`, `astro check`, lint/format, `astro build`, then link-check `dist/` and run Lighthouse CI against the built output. Reuse the same workflow for the cron-triggered content rebuild.

### Cited Findings

- Astro 6+ requires Node 22.12.0+, so CI must use `actions/setup-node` with node 22 or 24 — [Astro v6 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v6/)
- Scheduled workflows run only on the default branch and auto-disable after 60 days of inactivity in public repos — [GitHub Docs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)

### Inferences

Background knowledge, tool names and usage not verified this session:

- `astro check` needs `@astrojs/check` and `typescript`.
- Lint/format: ESLint with `eslint-plugin-astro`, or Biome; Prettier with `prettier-plugin-astro`.
- Link checking:
  - `lycheeverse/lychee-action` on `./dist/**/*.html`, with `--offline` for internal links only.
  - Run external-link checks (podcast enclosure and feed URLs, which rot because the shows have ended) on a weekly schedule, and have them open an issue rather than fail the build. Dead-podcast audio URLs disappearing is a real content risk for this site.
- Lighthouse CI: `treosh/lighthouse-ci-action` or `@lhci/cli autorun` with `staticDistDir: ./dist` and assertions on performance and accessibility budgets.
- Add `concurrency: { group: deploy, cancel-in-progress: true }` so cron runs and pushes don't race.
- Keep secrets (`GOOGLE_API_KEY`, `SHEET_ID`, the deploy token) in repository secrets. Fork PRs don't get secrets, so PR builds should use the committed `data/snapshot.json` rather than live Sheets.

### Gaps

- I didn't verify current major versions of lychee-action, lighthouse-ci-action or `@astrojs/check` in 2026.
