// Pure helpers for turning podcast RSS items into playable episodes.
// No imports here: this file is loaded directly by Node in scripts/snapshot.mjs.

/** Lowercase, drop punctuation, collapse spaces. */
export function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[’']/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function slugify(text: string): string {
	return normalizeTitle(text).replace(/ /g, '-').slice(0, 80).replace(/-+$/, '');
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if `pick` appears in `title` as whole words ("Chapter I" won't match "Chapter II"). */
export function titleMatches(title: string, pick: string): boolean {
	const t = normalizeTitle(title);
	const p = normalizeTitle(pick);
	if (!p) return false;
	return new RegExp(`(^| )${escapeRegExp(p)}( |$)`).test(t);
}

const PROMO_PREFIXES = [
	'introducing',
	'presenting',
	'listen now',
	'you might also like',
	'new show',
	'announcing',
	'sneak peek'
];

/** Dead feeds keep getting ads for other shows. Spot them so they never play. */
export function isPromo(title: string, episodeType?: string): boolean {
	if (episodeType && /^(trailer|bonus)$/i.test(episodeType)) return true;
	const t = normalizeTitle(title);
	return PROMO_PREFIXES.some((p) => t.startsWith(p));
}

const REBROADCAST = /\b(re ?broadcast|rerun|encore|replay|best of)\b/;

/** Re-runs of an episode share its title; prefer the original. */
export function isRebroadcast(title: string): boolean {
	return REBROADCAST.test(normalizeTitle(title));
}

/** itunes:duration can be seconds ("3600"), "MM:SS" or "HH:MM:SS". */
export function parseDuration(value: unknown): number | null {
	if (value == null) return null;
	const s = String(value).trim();
	if (!s) return null;
	if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
	const parts = s.split(':').map(Number);
	if (parts.some((n) => Number.isNaN(n))) return null;
	return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// Tracking/analytics prefixes that wrap the real audio URL. Some (like Chartable)
// belong to services that have shut down, so we keep a de-prefixed fallback.
const PREFIX_PATTERNS: RegExp[] = [
	/^https?:\/\/chrt\.fm\/track\/[^/]+\//i,
	/^https?:\/\/(dts|www)\.podtrac\.com\/(pts\/)?redirect\.(mp3|m4a|aac)\//i,
	/^https?:\/\/play\.podtrac\.com\/[^/]+\//i,
	/^https?:\/\/pdst\.fm\/e\//i,
	/^https?:\/\/op3\.dev\/e(,[^/]*)?\//i,
	/^https?:\/\/pfx\.vpixl\.com\/[^/]+\//i,
	/^https?:\/\/mgln\.ai\/e\/[^/]+\//i,
	/^https?:\/\/verifi\.podscribe\.com\/rss\/p\//i,
	/^https?:\/\/arttrk\.com\/p\/[^/]+\//i,
	/^https?:\/\/prfx\.byspotify\.com\/e\//i,
	/^https?:\/\/pscrb\.fm\/rss\/p\//i,
	/^https?:\/\/claritaspod\.com\/measure\//i,
	/^https?:\/\/podcorn\.com\/[^/]+\/[^/]+\//i
];

/** Strip tracking prefixes (they can stack). Returns null if nothing was stripped. */
export function deprefix(url: string): string | null {
	let current = url;
	let changed = true;
	let stripped = false;
	while (changed) {
		changed = false;
		for (const re of PREFIX_PATTERNS) {
			if (re.test(current)) {
				current = current.replace(re, '');
				if (!/^https?:\/\//i.test(current)) current = 'https://' + current;
				changed = true;
				stripped = true;
			}
		}
	}
	return stripped ? current : null;
}
