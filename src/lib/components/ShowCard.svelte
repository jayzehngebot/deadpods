<script lang="ts">
	import { resolve } from '$app/paths';
	import PlayButton from './PlayButton.svelte';
	import { showTracks } from '#lib/data/index.js';
	import type { Show } from '#lib/types.js';

	let { show }: { show: Show } = $props();
	const tracks = $derived(showTracks(show));
</script>

<li class="card">
	{#if show.artwork}
		<img src={show.artwork} alt="" width="320" height="320" loading="lazy" decoding="async" />
	{/if}
	<div class="body">
		<h3><a href={resolve('/[show]', { show: show.slug })}>{show.title}</a></h3>
		<p class="meta muted">{show.network} · {show.years}</p>
		<p class="blurb">{show.blurb}</p>
	</div>
	<div class="actions">
		<PlayButton {tracks} mode="list" label="Play best of" />
		<span class="muted count"
			>{show.episodes.length} pick{show.episodes.length === 1 ? '' : 's'}</span
		>
	</div>
</li>

<style>
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.card:hover,
	.card:focus-within {
		border-color: var(--accent);
	}
	img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		background: var(--surface-2);
	}
	.body {
		padding: 14px 16px 4px;
		flex: 1;
	}
	h3 {
		font-size: 1.15rem;
		margin-bottom: 0.2em;
	}
	h3 a {
		color: var(--text);
		text-decoration: none;
	}
	/* Make the whole card clickable via the title link, without nesting links. */
	h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.meta {
		margin: 0 0 0.5em;
		font-size: 0.875rem;
	}
	.blurb {
		margin: 0;
		font-size: 0.95rem;
	}
	.actions {
		position: relative; /* above the card-wide link */
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px 16px;
	}
	.count {
		font-size: 0.85rem;
	}
</style>
