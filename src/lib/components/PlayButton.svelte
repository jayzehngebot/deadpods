<script lang="ts">
	import Icon from './Icon.svelte';
	import { player, type PlayMode } from '#lib/player/player.svelte.js';
	import type { Track } from '#lib/types.js';

	interface Props {
		/** The queue this button plays. */
		tracks: Track[];
		/** Which track in `tracks` this button starts. */
		index?: number;
		mode?: PlayMode;
		startAt?: number;
		label?: string;
		variant?: 'primary' | 'plain' | 'icon';
	}

	let { tracks, index = 0, mode, startAt, label, variant = 'plain' }: Props = $props();

	const track = $derived(tracks[index]);
	const isCurrent = $derived(!!track && player.isCurrent(track.id));
	const isPlaying = $derived(isCurrent && player.playing);
	const text = $derived(isPlaying ? 'Pause' : (label ?? 'Play'));

	function onclick() {
		// Must call play synchronously from the tap so browsers allow audio.
		if (isCurrent && startAt == null) player.toggle();
		else player.playQueue(tracks, index, { mode, startAt });
	}
</script>

<button
	type="button"
	class={variant === 'icon' ? 'icon-btn' : variant === 'primary' ? 'btn btn-primary' : 'btn'}
	aria-label={variant === 'icon'
		? `${isPlaying ? 'Pause' : 'Play'} ${track?.title ?? ''}`
		: undefined}
	aria-pressed={variant === 'icon' ? isPlaying : undefined}
	{onclick}
>
	<Icon name={isPlaying ? 'pause' : 'play'} size={variant === 'icon' ? 22 : 18} />
	{#if variant !== 'icon'}<span>{text}</span>{/if}
</button>

<style>
	.icon-btn {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 50%;
		border: none;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.icon-btn:hover {
		background: var(--accent-strong);
	}
</style>
