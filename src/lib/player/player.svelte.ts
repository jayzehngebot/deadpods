// The one audio player for the whole site.
//
// It lives in a module (not a component), so it survives page navigation:
// SvelteKit swaps pages inside the layout while this element keeps playing.
//
// Browser rules shape the design:
// - Audio can only start from a user tap, so play() must be called
//   synchronously inside click handlers. We never autoplay on page load.
// - We reuse one <audio> element. iOS "unlocks" an element after the first tap,
//   and swapping its src on `ended` lets the next episode start on its own.
// - We never set crossOrigin or route audio through Web Audio: third-party
//   podcast hosts don't send CORS headers, and either would break playback.

import type { Track } from '../types.js';

export type PlayMode = 'single' | 'list' | 'radio';

const STORAGE_KEY = 'deadpods:player';
const RATES = [1, 1.25, 1.5, 1.75, 2, 0.75];
const TAP_MESSAGE = 'Tap play to start listening.';

interface Saved {
	queue: Track[];
	index: number;
	time: number;
	mode: PlayMode;
	rate: number;
}

class Player {
	queue = $state<Track[]>([]);
	index = $state(0);
	mode = $state<PlayMode>('single');
	playing = $state(false);
	loading = $state(false);
	currentTime = $state(0);
	duration = $state(0);
	rate = $state(1);
	/** Short status line shown in the player (and announced to screen readers). */
	message = $state('');
	/** True once the bar should be visible (something was played or restored). */
	active = $state(false);

	track = $derived<Track | null>(this.queue[this.index] ?? null);
	hasNext = $derived(this.index < this.queue.length - 1);

	#audio: HTMLAudioElement | null = null;
	#usingFallback = false;
	#pendingSeek: number | null = null;
	#errorStreak = 0;
	#lastSave = 0;
	#messageTimer: ReturnType<typeof setTimeout> | undefined;
	/** Set when restored from storage: the src isn't loaded until the user taps play. */
	#needsLoad = false;

	get #el(): HTMLAudioElement {
		if (!this.#audio) this.#audio = this.#create();
		return this.#audio;
	}

	#create(): HTMLAudioElement {
		const a = new Audio();
		a.preload = 'metadata';
		a.addEventListener('play', () => (this.playing = true));
		a.addEventListener('pause', () => {
			this.playing = false;
			this.#save(true);
		});
		a.addEventListener('waiting', () => (this.loading = true));
		a.addEventListener('playing', () => {
			this.loading = false;
			this.#errorStreak = 0;
			if (this.message === TAP_MESSAGE) this.#notify('');
		});
		a.addEventListener('loadedmetadata', () => {
			this.duration = Number.isFinite(a.duration) ? a.duration : (this.track?.durationSec ?? 0);
			if (this.#pendingSeek != null) {
				a.currentTime = Math.min(this.#pendingSeek, Math.max(0, this.duration - 1));
				this.#pendingSeek = null;
			}
			this.#updatePosition();
		});
		a.addEventListener('timeupdate', () => {
			this.currentTime = a.currentTime;
			this.#save();
		});
		a.addEventListener('ratechange', () => this.#updatePosition());
		a.addEventListener('ended', () => this.#onEnded());
		a.addEventListener('error', () => this.#onError());
		this.#setupMediaSession();
		return a;
	}

	// ---- Public controls (call these from click handlers) ----

	/** Replace the queue and start playing. */
	playQueue(tracks: Track[], startIndex = 0, opts: { mode?: PlayMode; startAt?: number } = {}) {
		if (!tracks.length) return;
		this.queue = tracks;
		this.index = Math.min(Math.max(0, startIndex), tracks.length - 1);
		this.mode = opts.mode ?? (tracks.length > 1 ? 'list' : 'single');
		this.#errorStreak = 0;
		this.#notify('');
		this.#load(opts.startAt ?? 0);
	}

	isCurrent(trackId: string): boolean {
		return this.track?.id === trackId;
	}

	toggle() {
		if (!this.track) return;
		if (this.playing) this.#el.pause();
		else this.resume();
	}

	resume() {
		if (!this.track) return;
		if (this.#needsLoad) {
			this.#load(this.currentTime);
			return;
		}
		this.#start();
	}

	pause() {
		this.#audio?.pause();
	}

	next() {
		if (!this.hasNext) {
			this.pause();
			return;
		}
		this.index += 1;
		this.#load(0);
	}

	previous() {
		if (this.currentTime > 5 || this.index === 0) {
			this.seek(0);
			return;
		}
		this.index -= 1;
		this.#load(0);
	}

	seek(seconds: number) {
		const t = Math.max(0, Math.min(seconds, this.duration || seconds));
		this.currentTime = t;
		if (this.#needsLoad || !this.#audio?.src) {
			this.#pendingSeek = t;
			return;
		}
		this.#el.currentTime = t;
		this.#updatePosition();
	}

	skip(delta: number) {
		this.seek(this.currentTime + delta);
	}

	cycleRate() {
		const i = RATES.indexOf(this.rate);
		this.setRate(RATES[(i + 1) % RATES.length]);
	}

	setRate(rate: number) {
		this.rate = rate;
		if (this.#audio) {
			this.#audio.playbackRate = rate;
			this.#audio.defaultPlaybackRate = rate;
		}
		this.#save(true);
	}

	/** Restore the last session (paused). Call once in the browser. */
	restore() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as Saved;
			if (!saved.queue?.length) return;
			this.queue = saved.queue;
			this.index = Math.min(saved.index ?? 0, saved.queue.length - 1);
			this.mode = saved.mode ?? 'single';
			this.rate = saved.rate ?? 1;
			this.currentTime = saved.time ?? 0;
			this.duration = this.track?.durationSec ?? 0;
			this.#needsLoad = true;
			this.active = true;
		} catch {
			// Storage blocked or corrupted: start fresh.
		}
	}

	// ---- Internals ----

	#load(startAt: number) {
		const track = this.track;
		if (!track) return;
		const a = this.#el;
		this.#usingFallback = false;
		this.#needsLoad = false;
		this.#pendingSeek = startAt > 0 ? startAt : null;
		this.currentTime = startAt;
		this.duration = track.durationSec ?? 0;
		this.active = true;
		a.src = track.audioUrl;
		a.playbackRate = this.rate;
		a.defaultPlaybackRate = this.rate;
		this.#updateMetadata();
		this.#start();
		this.#save(true);
	}

	#start() {
		const a = this.#el;
		this.loading = true;
		a.play().catch((err: DOMException) => {
			this.loading = false;
			if (err.name === 'NotAllowedError') {
				// The browser wants a direct tap first. The play button will work.
				this.playing = false;
				this.#notify(TAP_MESSAGE, 0);
			}
			// Other rejections (AbortError when switching episodes, NotSupportedError
			// for broken audio) are handled by the element's `error` event instead,
			// so a single failure isn't handled twice.
		});
	}

	#onEnded() {
		this.#clearProgress();
		if (this.mode !== 'single' && this.hasNext) this.next();
		else this.playing = false;
	}

	#onError() {
		const track = this.track;
		if (!track || !this.#audio?.src) return;
		// First try the same audio without tracking prefixes (some trackers have shut down).
		if (!this.#usingFallback && track.fallbackUrl) {
			this.#usingFallback = true;
			const resumeAt = this.currentTime;
			this.#pendingSeek = resumeAt > 0 ? resumeAt : null;
			this.#el.src = track.fallbackUrl;
			this.#start();
			return;
		}
		this.loading = false;
		this.playing = false;
		this.#errorStreak += 1;
		if (this.mode !== 'single' && this.hasNext && this.#errorStreak < this.queue.length) {
			this.index += 1;
			this.#load(0);
			this.#notify(`Couldn't play “${track.title}”. Skipped to the next one.`);
		} else {
			this.#notify(`Couldn't play “${track.title}”. The audio may have moved or been removed.`, 0);
		}
	}

	/** Show a status line. It clears itself after `ms` (0 keeps it until replaced). */
	#notify(text: string, ms = 8000) {
		clearTimeout(this.#messageTimer);
		this.message = text;
		if (text && ms) this.#messageTimer = setTimeout(() => (this.message = ''), ms);
	}

	#save(force = false) {
		if (typeof localStorage === 'undefined' || !this.queue.length) return;
		const now = Date.now();
		if (!force && now - this.#lastSave < 5000) return;
		this.#lastSave = now;
		const saved: Saved = {
			queue: this.queue,
			index: this.index,
			time: this.currentTime,
			mode: this.mode,
			rate: this.rate
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		} catch {
			// Storage full or blocked; resume just won't work.
		}
	}

	#clearProgress() {
		this.currentTime = 0;
		this.#save(true);
	}

	// ---- Lock screen / headphone controls ----

	#setupMediaSession() {
		if (!('mediaSession' in navigator)) return;
		const ms = navigator.mediaSession;
		const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
			['play', () => this.resume()],
			['pause', () => this.pause()],
			['seekbackward', (d) => this.skip(-(d.seekOffset ?? 15))],
			['seekforward', (d) => this.skip(d.seekOffset ?? 30)],
			['seekto', (d) => d.seekTime != null && this.seek(d.seekTime)],
			['previoustrack', () => this.previous()],
			['nexttrack', () => this.next()]
		];
		for (const [action, handler] of handlers) {
			try {
				ms.setActionHandler(action, handler);
			} catch {
				// Action not supported in this browser.
			}
		}
	}

	#updateMetadata() {
		const t = this.track;
		if (!t || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
		navigator.mediaSession.metadata = new MediaMetadata({
			title: t.title,
			artist: t.showTitle,
			album: 'deadpods',
			artwork: t.artwork ? [{ src: t.artwork, sizes: '1400x1400' }] : []
		});
	}

	#updatePosition() {
		const a = this.#audio;
		if (!a || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
		if (!Number.isFinite(a.duration) || a.duration <= 0) return;
		try {
			navigator.mediaSession.setPositionState({
				duration: a.duration,
				playbackRate: a.playbackRate || 1,
				position: Math.min(a.currentTime, a.duration)
			});
		} catch {
			// Some browsers throw on edge values; position is cosmetic.
		}
	}
}

export const player = new Player();
