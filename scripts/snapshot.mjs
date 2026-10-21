#!/usr/bin/env node
// Reads content/shows.json, fetches each show's RSS feed, resolves the picked
// episodes to playable audio URLs, and writes src/lib/data/snapshot.json.
//
// If a feed can't be fetched, the show's entry from the previous snapshot is
// kept, so one dead feed never breaks the site.

import { readFile, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import {
	deprefix,
	isPromo,
	isRebroadcast,
	parseDuration,
	slugify,
	titleMatches
} from '../src/lib/feed/parse.ts';

const ROOT = new URL('..', import.meta.url);
const CONTENT = new URL('content/shows.json', ROOT);
const OUT = new URL('src/lib/data/snapshot.json', ROOT);
const UA = 'deadpods-snapshot/0.1 (+https://deadpods.com)';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	isArray: (name) => name === 'item'
});

const text = (v) =>
	(v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v)).trim();
const strip = (html) =>
	html
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

async function fetchFeed(url) {
	const res = await fetch(url, {
		headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml' },
		redirect: 'follow',
		signal: AbortSignal.timeout(30_000)
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return parser.parse(await res.text());
}

function toItem(raw) {
	const enclosure = raw.enclosure ?? {};
	return {
		title: text(raw.title),
		guid: text(raw.guid) || text(enclosure['@_url']),
		audioUrl: enclosure['@_url'] ?? '',
		type: text(raw['itunes:episodeType']),
		duration: parseDuration(text(raw['itunes:duration'])),
		pubDate: raw.pubDate ? new Date(text(raw.pubDate)).toISOString() : null,
		image: raw['itunes:image']?.['@_href'] ?? null
	};
}

function choose(items, pick) {
	if (pick.guid) return items.find((i) => i.guid === pick.guid) ?? null;
	const matches = items.filter(
		(i) => titleMatches(i.title, pick.title) && !isPromo(i.title, i.type)
	);
	if (!matches.length) return null;
	const originals = matches.filter((i) => !isRebroadcast(i.title));
	const pool = originals.length ? originals : matches;
	// Oldest first: re-uploads and reruns come later.
	return pool.sort((a, b) => (a.pubDate ?? '').localeCompare(b.pubDate ?? ''))[0];
}

async function main() {
	const { shows } = JSON.parse(await readFile(CONTENT, 'utf8'));
	let previous = { shows: [] };
	try {
		previous = JSON.parse(await readFile(OUT, 'utf8'));
	} catch {
		// first run
	}

	const out = [];
	const problems = [];

	for (const show of shows) {
		process.stdout.write(`${show.title} … `);
		let channel;
		try {
			channel = (await fetchFeed(show.feedUrl)).rss?.channel;
			if (!channel) throw new Error('not an RSS feed');
		} catch (err) {
			const old = previous.shows.find((s) => s.slug === show.slug);
			problems.push(
				`${show.title}: feed failed (${err.message})${old ? ', kept previous snapshot' : ', SKIPPED'}`
			);
			console.log('FAILED');
			if (old) out.push(old);
			continue;
		}

		const items = (channel.item ?? []).map(toItem).filter((i) => i.audioUrl);
		const artwork = channel['itunes:image']?.['@_href'] ?? channel.image?.url ?? null;
		const usedSlugs = new Set();
		const episodes = [];

		for (const pick of show.picks) {
			const item = choose(items, pick);
			if (!item) {
				const near = items
					.filter((i) => normalizeIncludesAny(i.title, pick.title))
					.slice(0, 3)
					.map((i) => `"${i.title}"`)
					.join(', ');
				problems.push(
					`${show.title}: no episode matches "${pick.title}"${near ? ` (similar: ${near})` : ''}`
				);
				continue;
			}
			let slug = slugify(item.title) || 'episode';
			while (usedSlugs.has(slug)) slug += '-2';
			usedSlugs.add(slug);
			episodes.push({
				slug,
				showSlug: show.slug,
				title: item.title,
				note: pick.note ?? '',
				guid: item.guid,
				audioUrl: item.audioUrl,
				fallbackUrl: deprefix(item.audioUrl),
				durationSec: item.duration,
				pubDate: item.pubDate,
				image: item.image && item.image !== artwork ? item.image : null
			});
		}

		console.log(`${episodes.length}/${show.picks.length} episodes`);
		const meta = { ...show };
		delete meta.picks;
		out.push({
			...meta,
			link: text(channel.link) || null,
			blurb: show.blurb || strip(text(channel.description)).slice(0, 280),
			artwork,
			episodes
		});
	}

	const snapshot = { generatedAt: new Date().toISOString(), shows: out };
	await writeFile(OUT, JSON.stringify(snapshot, null, '\t') + '\n');
	console.log(
		`\nWrote ${out.length} shows, ${out.reduce((n, s) => n + s.episodes.length, 0)} episodes.`
	);
	if (problems.length) {
		console.log('\nProblems:\n- ' + problems.join('\n- '));
		process.exitCode = 1;
	}
}

function normalizeIncludesAny(title, pick) {
	const words = pick
		.toLowerCase()
		.split(/\W+/)
		.filter((w) => w.length > 3);
	const t = title.toLowerCase();
	return words.some((w) => t.includes(w));
}

await main();
