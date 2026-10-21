<script lang="ts">
	// Full-screen player for phones. Opened from the mini player with shallow
	// routing (page.state.nowPlaying), so the back gesture closes it.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { player } from '#lib/player/player.svelte.js';
	import { formatTime, spokenTime } from '#lib/time.js';

	let closeButton = $state<HTMLButtonElement | null>(null);
	let dragging = $state<number | null>(null);

	const track = $derived(player.track);
	const open = $derived(Boolean(page.state.nowPlaying) && track !== null);
	const shown = $derived(dragging ?? player.currentTime);
	const total = $derived(player.duration || track?.durationSec || 0);

	function close() {
		history.back();
	}

	// While open: focus the close button, stop the page behind from scrolling,
	// and hand focus back to whatever opened it.
	$effect(() => {
		if (!open) return;
		const opener = document.activeElement as HTMLElement | null;
		closeButton?.focus();
		const root = document.documentElement;
		const before = root.style.overflow;
		root.style.overflow = 'hidden';
		return () => {
			root.style.overflow = before;
			opener?.focus();
		};
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close();
	}}
/>

{#if open && track}
	<div class="np" role="dialog" aria-modal="true" aria-label="Now playing">
		<div class="top">
			<button
				type="button"
				class="ctl"
				aria-label="Close player"
				bind:this={closeButton}
				onclick={close}
			>
				<Icon name="chevron-down" size={30} />
			</button>
			<span class="label muted">{player.mode === 'radio' ? 'deadpods radio' : 'Now playing'}</span>
			<span class="ctl" aria-hidden="true"></span>
		</div>

		<div class="art">
			{#if track.artwork}
				<img src={track.artwork} alt="" width="600" height="600" />
			{/if}
		</div>

		<div class="meta">
			<a
				class="title"
				href={resolve('/[show]/[episode]', { show: track.showSlug, episode: track.episodeSlug })}
				>{track.title}</a
			>
			<span class="show muted">{track.showTitle}</span>
		</div>

		<div class="seek">
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
			<div class="times" aria-hidden="true">
				<span>{formatTime(shown)}</span>
				<span>-{formatTime(Math.max(0, total - shown))}</span>
			</div>
		</div>

		<div class="row">
			<button
				type="button"
				class="ctl big"
				aria-label="Back 15 seconds"
				onclick={() => player.skip(-15)}
			>
				<Icon name="back15" size={36} />
			</button>
			<button
				type="button"
				class="ctl play"
				aria-label={player.playing ? 'Pause' : 'Play'}
				onclick={() => player.toggle()}
			>
				{#if player.loading && player.playing}
					<Icon name="spinner" size={36} />
				{:else}
					<Icon name={player.playing ? 'pause' : 'play'} size={36} />
				{/if}
			</button>
			<button
				type="button"
				class="ctl big"
				aria-label="Forward 30 seconds"
				onclick={() => player.skip(30)}
			>
				<Icon name="fwd30" size={36} />
			</button>
		</div>

		<div class="row">
			<button type="button" class="ctl" aria-label="Previous" onclick={() => player.previous()}>
				<Icon name="prev" size={24} />
			</button>
			<button
				type="button"
				class="ctl rate"
				aria-label={`Playback speed ${player.rate}x`}
				onclick={() => player.cycleRate()}
			>
				{player.rate}×
			</button>
			<button
				type="button"
				class="ctl"
				aria-label="Next episode"
				disabled={!player.hasNext}
				onclick={() => player.next()}
			>
				<Icon name="next" size={24} />
			</button>
		</div>

		<!-- The player bar's status region already announces this to screen readers. -->
		<p class="message" aria-hidden="true">{player.message}</p>
	</div>
{/if}

<style>
	.np {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: calc(8px + env(safe-area-inset-top, 0px)) 24px
			calc(24px + env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
		overscroll-behavior: contain;
		background: linear-gradient(var(--surface-2), var(--bg) 60%);
		animation: rise 0.22s ease-out;
	}
	@keyframes rise {
		from {
			transform: translateY(12%);
			opacity: 0;
		}
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.label {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.art {
		flex: none;
		display: flex;
		justify-content: center;
		/* Spare height goes around the artwork, so the controls sit low like an app. */
		margin-block: auto;
	}
	.art img {
		/* Square, and small enough on short screens to keep the controls in view. */
		width: min(100%, 40dvh);
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 14px;
		box-shadow: 0 18px 50px rgb(0 0 0 / 0.5);
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.title {
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.25;
		color: var(--text);
		text-decoration: none;
	}
	.seek input {
		width: 100%;
		accent-color: var(--accent);
		height: 28px;
		margin: 0;
	}
	.times {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-around;
	}
	.ctl {
		display: grid;
		place-items: center;
		min-width: 48px;
		height: 48px;
		border: none;
		background: none;
		border-radius: 50%;
		color: var(--text);
	}
	.ctl:disabled {
		opacity: 0.4;
	}
	.big {
		width: 64px;
		height: 64px;
	}
	.play {
		width: 80px;
		height: 80px;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.rate {
		font-weight: 700;
		border-radius: 999px;
		padding-inline: 12px;
	}
	.message {
		margin: 0;
		min-height: 1.3em;
		text-align: center;
		font-size: 0.85rem;
		color: var(--accent-strong);
	}
</style>
