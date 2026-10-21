<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import { player } from '#lib/player/player.svelte.js';
	import { formatTime, spokenTime } from '#lib/time.js';

	let bar = $state<HTMLElement | null>(null);
	let dragging = $state<number | null>(null);

	const track = $derived(player.track);
	const shown = $derived(dragging ?? player.currentTime);
	const total = $derived(player.duration || track?.durationSec || 0);

	// Reserve space at the bottom of the page so the bar never covers content.
	$effect(() => {
		const h = player.active && bar ? bar.offsetHeight : 0;
		document.documentElement.style.setProperty('--player-h', `${h}px`);
	});

	function onKeydown(e: KeyboardEvent) {
		// Space toggles playback unless the user is typing or on a control.
		if (e.key !== ' ' || !player.track) return;
		const el = e.target as HTMLElement;
		if (el.closest('input, textarea, select, button, a, [contenteditable]')) return;
		e.preventDefault();
		player.toggle();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if player.active && track}
	<section class="bar" aria-label="Audio player" bind:this={bar}>
		<div class="inner wrap">
			<a
				class="now"
				href={resolve('/[show]/[episode]', { show: track.showSlug, episode: track.episodeSlug })}
			>
				{#if track.artwork}
					<img src={track.artwork} alt="" width="48" height="48" loading="lazy" />
				{/if}
				<span class="text">
					<span class="title">{track.title}</span>
					<span class="show muted">
						{track.showTitle}{#if player.mode === 'radio'}&nbsp;· <span class="live">Radio</span
							>{/if}
					</span>
				</span>
			</a>

			<div class="controls">
				<button
					type="button"
					class="ctl hide-sm"
					aria-label="Previous"
					onclick={() => player.previous()}
				>
					<Icon name="prev" size={20} />
				</button>
				<button
					type="button"
					class="ctl"
					aria-label="Back 15 seconds"
					onclick={() => player.skip(-15)}
				>
					<Icon name="back15" />
				</button>
				<button
					type="button"
					class="ctl main"
					aria-label={player.playing ? 'Pause' : 'Play'}
					onclick={() => player.toggle()}
				>
					{#if player.loading && player.playing}
						<Icon name="spinner" size={26} />
					{:else}
						<Icon name={player.playing ? 'pause' : 'play'} size={26} />
					{/if}
				</button>
				<button
					type="button"
					class="ctl"
					aria-label="Forward 30 seconds"
					onclick={() => player.skip(30)}
				>
					<Icon name="fwd30" />
				</button>
				<button
					type="button"
					class="ctl"
					aria-label="Next episode"
					disabled={!player.hasNext}
					onclick={() => player.next()}
				>
					<Icon name="next" size={20} />
				</button>
				<button
					type="button"
					class="ctl rate"
					aria-label={`Playback speed ${player.rate}x`}
					onclick={() => player.cycleRate()}
				>
					{player.rate}×
				</button>
			</div>

			<div class="seek">
				<span class="time" aria-hidden="true">{formatTime(shown)}</span>
				<input
					type="range"
					min="0"
					max={Math.max(1, Math.floor(total))}
					step="1"
					value={Math.floor(shown)}
					aria-label="Seek"
					aria-valuetext={`${spokenTime(shown)} of ${spokenTime(total)}`}
					oninput={(e) => (dragging = Number(e.currentTarget.value))}
					onchange={(e) => {
						player.seek(Number(e.currentTarget.value));
						dragging = null;
					}}
				/>
				<span class="time" aria-hidden="true">{formatTime(total)}</span>
			</div>
		</div>
		<p class="message" role="status" aria-live="polite">{player.message}</p>
	</section>
{/if}

<style>
	.bar {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		backdrop-filter: blur(10px);
		border-top: 1px solid var(--border);
		padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
	}
	.inner {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'now controls' 'seek seek';
		gap: 6px 16px;
		align-items: center;
	}
	.now {
		grid-area: now;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		color: var(--text);
		text-decoration: none;
	}
	.now img {
		border-radius: 6px;
		flex: none;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.title,
	.show {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.title {
		font-weight: 600;
	}
	.show {
		font-size: 0.875rem;
	}
	.live {
		color: var(--accent);
	}
	.controls {
		grid-area: controls;
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.ctl {
		display: grid;
		place-items: center;
		min-width: 44px;
		height: 44px;
		border: none;
		background: none;
		border-radius: 50%;
		color: var(--text);
	}
	.ctl:hover:not(:disabled) {
		background: var(--surface-2);
	}
	.ctl:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.ctl.main {
		width: 52px;
		height: 52px;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.ctl.main:hover {
		background: var(--accent-strong);
	}
	.rate {
		font-size: 0.85rem;
		font-weight: 700;
		border-radius: 999px;
		padding-inline: 8px;
	}
	.seek {
		grid-area: seek;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.seek input {
		flex: 1;
		accent-color: var(--accent);
		height: 24px;
	}
	.time {
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
		min-width: 3.5em;
		text-align: center;
	}
	.message {
		margin: 0;
		text-align: center;
		font-size: 0.85rem;
		color: var(--accent-strong);
	}
	.message:empty {
		/* Keep the live region in the page so screen readers hear updates. */
		height: 0;
		overflow: hidden;
	}
	@media (max-width: 640px) {
		.inner {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'now' 'seek' 'controls';
		}
		.controls {
			justify-content: center;
		}
		.hide-sm {
			display: none;
		}
	}
</style>
