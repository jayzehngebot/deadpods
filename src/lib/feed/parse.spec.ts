import { describe, expect, it } from 'vitest';
import {
	deprefix,
	isPromo,
	isRebroadcast,
	normalizeTitle,
	parseDuration,
	slugify,
	titleMatches
} from './parse.js';

describe('titleMatches', () => {
	it('matches whole words, ignoring case and punctuation', () => {
		expect(titleMatches('Case #3 Belt Buckle', 'belt buckle')).toBe(true);
		expect(titleMatches('The Only One For Me, Jolene', 'Jolene')).toBe(true);
	});
	it('does not let "Chapter I" match "Chapter II"', () => {
		expect(titleMatches('Chapter II', 'Chapter I')).toBe(false);
		expect(titleMatches('Chapter I', 'Chapter I')).toBe(true);
	});
	it('ignores empty picks', () => {
		expect(titleMatches('Anything', '  ')).toBe(false);
	});
});

describe('isPromo / isRebroadcast', () => {
	it('flags promo drops and trailers', () => {
		expect(isPromo('Introducing: Some Other Show')).toBe(true);
		expect(isPromo('Episode 1', 'trailer')).toBe(true);
		expect(isPromo('#102 Long Distance', 'full')).toBe(false);
	});
	it('flags reruns', () => {
		expect(isRebroadcast('Re-Broadcast: Long Distance')).toBe(true);
		expect(isRebroadcast('#102 Long Distance')).toBe(false);
	});
});

describe('parseDuration', () => {
	it('handles seconds, MM:SS and HH:MM:SS', () => {
		expect(parseDuration('3033')).toBe(3033);
		expect(parseDuration('50:33')).toBe(3033);
		expect(parseDuration('1:00:01')).toBe(3601);
		expect(parseDuration('')).toBeNull();
		expect(parseDuration('abc')).toBeNull();
	});
});

describe('deprefix', () => {
	it('strips stacked tracking prefixes', () => {
		expect(deprefix('https://chrt.fm/track/15E3G4/traffic.megaphone.fm/GLT1.mp3?updated=1')).toBe(
			'https://traffic.megaphone.fm/GLT1.mp3?updated=1'
		);
		expect(
			deprefix(
				'https://prfx.byspotify.com/e/play.podtrac.com/npr-510307/npr.simplecastaudio.com/a/b.mp3'
			)
		).toBe('https://npr.simplecastaudio.com/a/b.mp3');
	});
	it('returns null when there is nothing to strip', () => {
		expect(deprefix('https://traffic.megaphone.fm/GLT1.mp3')).toBeNull();
	});
});

describe('slugify', () => {
	it('makes URL-safe slugs', () => {
		expect(slugify('Case #3 Belt Buckle')).toBe('case-3-belt-buckle');
		expect(normalizeTitle('Dolly Parton’s America')).toBe('dolly partons america');
	});
});
