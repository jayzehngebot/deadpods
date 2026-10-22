<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import PlayButton from '#lib/components/PlayButton.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { showTracks } from '#lib/data/index.js';
	import { player } from '#lib/player/player.svelte.js';
	import { SITE_URL } from '#lib/site.js';
	import { durationLabel, formatTime, parseTimeParam } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const show = $derived(data.show);
	const episode = $derived(data.episode);
	const tracks = $derived(showTracks(show));
	const index = $derived(show.episodes.findIndex((e) => e.slug === episode.slug));
	const trackId = $derived(`${show.slug}/${episode.slug}`);
	const meta = $derived(
		[
			durationLabel(episode.durationSec),
			episode.pubDate &&
				new Date(episode.pubDate).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					timeZone: 'UTC'
				})
		]
			.filter(Boolean)
			.join(' · ')
	);
	const pageUrl = $derived(`${SITE_URL}/${show.slug}/${episode.slug}/`);

	/** Start time from a shared link (?t=12m34s). Read in the browser only. */
	let sharedStart = $state<number | null>(null);
	let includeTime = $state(true);
	let shareStatus = $state('');

	onMount(() => {
		sharedStart = parseTimeParam(new URL(location.href).searchParams.get('t'));
	});

	const shareTime = $derived(player.isCurrent(trackId) ? Math.floor(player.currentTime) : 0);
	const shareUrl = $derived(includeTime && shareTime > 0 ? `${pageUrl}?t=${shareTime}` : pageUrl);

	async function share() {
		const title = `${episode.title} — ${show.title}`;
		try {
			if (navigator.share) {
				await navigator.share({ title, url: shareUrl });
				return;
			}
			await navigator.clipboard.writeText(shareUrl);
			shareStatus = 'Link copied.';
		} catch (err) {
			if ((err as DOMException).name !== 'AbortError') shareStatus = `Copy this link: ${shareUrl}`;
		}
	}

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'PodcastEpisode',
		name: episode.title,
		url: pageUrl,
		description: episode.note || undefined,
		datePublished: episode.pubDate ?? undefined,
		timeRequired: episode.durationSec ? `PT${Math.round(episode.durationSec / 60)}M` : undefined,
		associatedMedia: { '@type': 'MediaObject', contentUrl: episode.audioUrl },
		partOfSeries: { '@type': 'PodcastSeries', name: show.title, url: `${SITE_URL}/${show.slug}/` }
	});
</script>

<Seo
	title={`${episode.title} — ${show.title}`}
	description={episode.note || show.blurb}
	image={episode.image ?? show.artwork}
	type="music.song"
	audio={episode.audioUrl}
	{jsonLd}
/>

<nav class="crumbs muted" aria-label="Breadcrumb">
	<span class="root"><a href={resolve('/')}>Shows</a> / </span><a
		class="back"
		href={resolve('/[show]', { show: show.slug })}>{show.title}</a
	>
</nav>

<article class="episode">
	{#if episode.image ?? show.artwork}
		<img src={episode.image ?? show.artwork} alt="" width="280" height="280" />
	{/if}
	<div>
		<p class="show muted">{show.title} · {show.network}</p>
		<h1>{episode.title}</h1>
		{#if episode.note}<p class="note">{episode.note}</p>{/if}
		<p class="muted">
			{meta}
		</p>

		<div class="actions">
			{#if sharedStart}
				<PlayButton
					{tracks}
					{index}
					mode="list"
					startAt={sharedStart}
					variant="primary"
					label={`Play from ${formatTime(sharedStart)}`}
				/>
				<PlayButton {tracks} {index} mode="list" startAt={0} label="From the start" />
			{:else}
				<PlayButton {tracks} {index} mode="list" variant="primary" />
			{/if}
			<button type="button" class="btn" onclick={share}>
				<Icon name="share" size={18} /> Share
			</button>
		</div>
		{#if shareTime > 0}
			<label class="muted small at">
				<input type="checkbox" bind:checked={includeTime} /> Share at {formatTime(shareTime)}
			</label>
		{/if}
		<p class="muted small" role="status" aria-live="polite">{shareStatus}</p>
	</div>
</article>

<p class="more">
	<a href={resolve('/[show]', { show: show.slug })}>More from {show.title} →</a>
</p>

<style>
	.crumbs {
		font-size: 0.9rem;
		margin-bottom: 16px;
	}
	.episode {
		display: flex;
		gap: 32px;
		align-items: flex-start;
	}
	img {
		width: 280px;
		height: 280px;
		object-fit: cover;
		border-radius: var(--radius);
		flex: none;
	}
	.show {
		margin: 0 0 6px;
	}
	h1 {
		font-size: clamp(1.8rem, 5vw, 2.8rem);
		letter-spacing: -0.02em;
	}
	.note {
		font-size: 1.15rem;
		max-width: 34em;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin: 20px 0 8px;
	}
	.at {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 32px;
	}
	.small {
		font-size: 0.875rem;
	}
	.more {
		margin-top: 40px;
	}
	/* Phones: app-style episode screen. */
	@media (max-width: 640px) {
		.crumbs {
			margin-bottom: 8px;
		}
		.root {
			display: none;
		}
		.back {
			display: inline-flex;
			align-items: center;
			min-height: 44px;
			text-decoration: none;
			font-weight: 600;
		}
		.back::before {
			content: '\2039';
			font-size: 1.6em;
			line-height: 1;
			margin-right: 6px;
		}
		.episode {
			flex-direction: column;
			gap: 16px;
		}
		img {
			align-self: center;
			width: min(190px, 50vw);
			height: auto;
			aspect-ratio: 1;
			box-shadow: 0 12px 32px rgb(0 0 0 / 0.45);
		}
		.show {
			font-size: 0.9rem;
		}
		h1 {
			font-size: 1.45rem;
			margin-bottom: 0.35em;
		}
		.note {
			font-size: 1rem;
			margin: 0 0 6px;
		}
		.actions {
			margin-top: 14px;
		}
		.actions :global(.btn-primary) {
			flex: 1;
			justify-content: center;
		}
		.more {
			margin-top: 28px;
		}
	}
</style>
