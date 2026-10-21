# deadpods.com

Great podcasts that have ended, and their best episodes. Tap once and it keeps playing.

- Hand-picked list of shows that aren't making new episodes, with their best episodes.
- One-tap "radio" that shuffles across shows and moves to the next episode on its own.
- The player keeps going while you browse, shows lock-screen controls, and remembers where you left off.
- Shareable links to an episode, optionally at a timestamp (`?t=12m34s`).
- Audio always streams from each show's original feed. Nothing is re-hosted.

## How it works

```
content/shows.json  ──npm run snapshot──▶  src/lib/data/snapshot.json  ──npm run build──▶  build/ (static site)
 (curated list)        fetches each RSS feed,     (audio URLs, durations,                  every page prerendered
                       finds the picked episodes   artwork)
```

- **`content/shows.json`**: the curated list. Each show has a feed URL, a short blurb, and its picked episodes (matched by part of the episode title). Later, a Google Sheet sync will generate this file.
- **`scripts/snapshot.mjs`**: fetches the feeds and resolves picks to playable audio. If a feed is down, it keeps that show's last good data. It reports picks it couldn't match.
- **`src/lib/player/player.svelte.ts`**: the single audio player. It lives outside the pages, so playback survives navigation.

Built with SvelteKit 3 (static adapter), Svelte 5 and TypeScript.

## Development

Requires Node 22.17+ (`.nvmrc` pins 24): run `nvm use` first.

```sh
npm install
npm run dev          # local dev server
npm run snapshot     # re-fetch feeds after editing content/shows.json
npm run build        # static site in build/
npm run preview      # serve the build locally

npm run check        # type check
npm run lint         # prettier + eslint
npm test             # unit tests
npm run test:e2e     # browser tests (streams real audio, needs network)
```

## Roadmap

See `reports/Deadpods web app build skills.md` for the full research and plan. Next up:

1. Google Sheet → `content/shows.json` sync on an hourly GitHub Actions schedule (commit only when changed).
2. Deploy (Cloudflare or GitHub Pages).
3. Weekly check for audio links that have died, with Internet Archive fallbacks.
4. Share-preview images per episode, more shows from the catalog.
5. Community submissions.

## License

Code: GPL-3.0. Original blurbs and episode notes: CC BY 4.0. Show names, artwork and audio belong to their creators.
