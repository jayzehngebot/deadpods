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
	<a class="back" href={resolve('/')}>Shows</a><span class="here"> / {show.title}</span>
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
	/* Phones: app-style show screen. */
	@media (max-width: 640px) {
		.crumbs {
			margin-bottom: 8px;
		}
		.here {
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
		.head {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 14px;
			margin-bottom: 24px;
		}
		.head img {
			width: min(180px, 48vw);
			height: auto;
			aspect-ratio: 1;
			box-shadow: 0 12px 32px rgb(0 0 0 / 0.45);
		}
		h1 {
			font-size: 1.6rem;
			margin-bottom: 0.25em;
		}
		.meta {
			font-size: 0.9rem;
		}
		.tags {
			justify-content: center;
		}
		.blurb {
			font-size: 0.95rem;
			margin-bottom: 16px;
		}
		.episodes {
			gap: 0;
			border-top: 1px solid var(--border);
		}
		.episodes li {
			padding: 14px 0;
			background: none;
			border: none;
			border-bottom: 1px solid var(--border);
			border-radius: 0;
			gap: 14px;
		}
		h3 {
			font-size: 1rem;
		}
		h3 a {
			text-decoration: none;
		}
		.episodes p {
			font-size: 0.9rem;
		}
	}
</style>
