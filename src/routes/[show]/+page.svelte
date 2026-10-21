<script lang="ts">
	import { resolve } from '$app/paths';
	import PlayButton from '#lib/components/PlayButton.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { showTracks } from '#lib/data/index.js';
	import { SITE_URL } from '#lib/site.js';
	import { durationLabel } from '#lib/time.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const show = $derived(data.show);
	const tracks = $derived(showTracks(show));

	const statusLabel: Record<string, string> = {
		ended: 'Ended',
		complete: 'Complete series',
		hiatus: 'On hiatus',
		revived: 'Revived'
	};

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'PodcastSeries',
		name: show.title,
		url: `${SITE_URL}/${show.slug}/`,
		webFeed: show.feedUrl,
		image: show.artwork ?? undefined,
		description: show.blurb,
		author: { '@type': 'Person', name: show.hosts }
	});
</script>

<Seo title={show.title} description={show.blurb} image={show.artwork} {jsonLd} />

<nav class="crumbs muted" aria-label="Breadcrumb">
	<a href={resolve('/')}>Shows</a> / {show.title}
</nav>

<article>
	<header class="head">
		{#if show.artwork}
			<img src={show.artwork} alt="" width="220" height="220" />
		{/if}
		<div>
			<h1>{show.title}</h1>
			<p class="meta muted">
				{show.hosts} · {show.network} · {show.years}
			</p>
			<p class="tags">
				<span class="tag">{statusLabel[show.status] ?? show.status}</span>
				<span class="tag">{show.genre}</span>
			</p>
			<p class="blurb">{show.blurb}</p>
			<PlayButton {tracks} mode="list" variant="primary" label="Play the best of" />
		</div>
	</header>

	<section aria-labelledby="picks">
		<h2 id="picks">Best episodes</h2>
		<ol class="episodes" role="list">
			{#each show.episodes as ep, i (ep.slug)}
				<li>
					<PlayButton {tracks} index={i} mode="list" variant="icon" />
					<div>
						<h3>
							<a href={resolve('/[show]/[episode]', { show: show.slug, episode: ep.slug })}
								>{ep.title}</a
							>
						</h3>
						{#if ep.note}<p>{ep.note}</p>{/if}
						<p class="muted small">
							{[durationLabel(ep.durationSec), ep.pubDate && new Date(ep.pubDate).getUTCFullYear()]
								.filter(Boolean)
								.join(' · ')}
						</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<p class="muted small source">
		Audio streams from the show's <a href={show.feedUrl} rel="external nofollow">original feed</a
		>{#if show.link}
			· <a href={show.link} rel="external nofollow">Show website</a>{/if}
	</p>
</article>

<style>
	.crumbs {
		font-size: 0.9rem;
		margin-bottom: 16px;
	}
	.head {
		display: flex;
		gap: 28px;
		align-items: flex-start;
		margin-bottom: 40px;
	}
	.head img {
		border-radius: var(--radius);
		flex: none;
		width: 220px;
		height: 220px;
		object-fit: cover;
	}
	h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		letter-spacing: -0.02em;
	}
	.meta {
		margin: 0 0 8px;
	}
	.tags {
		display: flex;
		gap: 6px;
		margin: 0 0 12px;
	}
	.blurb {
		font-size: 1.1rem;
		max-width: 38em;
		margin: 0 0 20px;
	}
	.episodes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 12px;
	}
	.episodes li {
		display: flex;
		gap: 16px;
		align-items: flex-start;
		padding: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	h3 {
		font-size: 1.1rem;
		margin-bottom: 0.25em;
	}
	h3 a {
		color: var(--text);
	}
	.episodes p {
		margin: 0 0 4px;
	}
	.small {
		font-size: 0.875rem;
	}
	.source {
		margin-top: 28px;
	}
	@media (max-width: 640px) {
		.head {
			flex-direction: column;
		}
		.head img {
			width: 160px;
			height: 160px;
		}
	}
</style>
