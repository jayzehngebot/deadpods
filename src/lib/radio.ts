import type { Track } from './types.js';

/** Small deterministic PRNG so a radio "seed" always gives the same order. */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Shuffles tracks for radio mode. The same seed gives the same order, and the
 * same show never plays twice in a row when it can be avoided.
 */
export function buildRadio(tracks: Track[], seed: number): Track[] {
	const rand = mulberry32(seed);
	const pool = [...tracks];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	const out: Track[] = [];
	while (pool.length) {
		const last = out.at(-1)?.showSlug;
		const idx = pool.findIndex((t) => t.showSlug !== last);
		out.push(pool.splice(idx === -1 ? 0 : idx, 1)[0]);
	}
	return out;
}

export function randomSeed(): number {
	return Math.floor(Math.random() * 1_000_000);
}
