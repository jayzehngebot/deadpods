<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ShowCard from '#lib/components/ShowCard.svelte';
	import { allTracks, shows } from '#lib/data/index.js';
	import { player } from '#lib/player/player.svelte.js';
	import { buildRadio, randomSeed } from '#lib/radio.js';
	import { SITE_URL } from '#lib/site.js';

	const radioOn = $derived(player.mode === 'radio' && player.playing);
	/** The episode the radio is on, if the radio has been started. */
	const radioTrack = $derived(player.mode === 'radio' ? player.track : null);

	function tuneIn() {
		if (player.mode === 'radio' && player.track) {
			player.toggle();
			return;
		}
		// Called directly from the tap, so the browser allows audio.
		player.playQueue(buildRadio(allTracks, randomSeed()), 0, { mode: 'radio' });
	}

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Great podcasts that have ended',
		itemListElement: shows.map((s, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			url: `${SITE_URL}/${s.slug}/`,
			name: s.title
		}))
	};
</script>

<Seo {jsonLd} />

<section class="hero">
	<h1>Great podcasts that ended.<br /><span class="text-gradient">Still worth hearing.</span></h1>
	<p class="lede muted">
		The best episodes of shows that aren't making new ones, played straight from their original
		feeds. Tap once and it keeps going.
	</p>
	<!-- On phones this is a radio "station" card; on wider screens just the big button. -->
	<div class="station">
		<div class="station-art" aria-hidden="true">
			{#if radioTrack?.artwork}
				<img src={radioTrack.artwork} alt="" width="72" height="72" />
			{:else}
				<Icon name="radio" size={34} />
			{/if}
		</div>
		<div class="station-text">
			<p class="eyebrow" class:live={radioOn}>{radioOn ? 'On air' : 'deadpods radio'}</p>
			<p class="station-title">{radioTrack ? radioTrack.title : 'Great podcasts that ended.'}</p>
			<p class="station-sub muted">
				{radioTrack
					? radioTrack.showTitle
					: `${allTracks.length} episodes from ${shows.length} shows, shuffled`}
			</p>
		</div>
		<button type="button" class="tune-in" aria-pressed={radioOn} onclick={tuneIn}>
			<Icon name={radioOn ? 'pause' : 'radio'} size={28} />
			<span class="label"
				>{radioOn
					? 'Pause radio'
					: player.mode === 'radio' && player.track
						? 'Resume radio'
						: 'Tune in'}</span
			>
		</button>
	</div>
	<p class="hint muted">
		{allTracks.length} hand-picked episodes from {shows.length} shows, shuffled.
	</p>
</section>

<section aria-labelledby="shows-heading">
	<h2 id="shows-heading">The shows</h2>
	<ul class="grid" role="list">
		{#each shows as show (show.slug)}
			<ShowCard {show} />
		{/each}
	</ul>
</section>

<style>
	.hero {
		text-align: center;
		padding: 40px 0 56px;
	}
	h1 {
		font-size: clamp(2rem, 6vw, 3.5rem);
		letter-spacing: -0.03em;
	}
	.lede {
		max-width: 36em;
		margin: 0 auto 28px;
		font-size: 1.1rem;
	}
	.tune-in {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 18px 36px;
		font-size: 1.3rem;
		font-weight: 800;
		border: none;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-ink);
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.tune-in:hover {
		background: var(--accent-strong);
	}
	.hint {
		margin-top: 16px;
		font-size: 0.9rem;
	}
	h2 {
		font-size: 1.5rem;
	}
	.grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
		gap: 20px;
	}
	.station-art,
	.station-text {
		display: none;
	}
	/* Phones: an app screen, not a landing page. */
	@media (max-width: 640px) {
		.hero {
			text-align: left;
			padding: 4px 0 28px;
		}
		/* The station card says it all; keep the headline for screen readers and search. */
		h1 {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
		}
		.lede,
		.hint {
			display: none;
		}
		.station {
			display: grid;
			grid-template-columns: 72px minmax(0, 1fr) auto;
			align-items: center;
			gap: 14px;
			padding: 14px;
			border-radius: 16px;
			border: 1px solid var(--border);
			background: linear-gradient(
				135deg,
				color-mix(in srgb, var(--accent) 22%, var(--surface)),
				var(--surface) 70%
			);
		}
		.station-art {
			display: grid;
			place-items: center;
			width: 72px;
			height: 72px;
			border-radius: 10px;
			overflow: hidden;
			background: var(--surface-2);
			color: var(--accent);
		}
		.station-art img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		.station-text {
			display: block;
			min-width: 0;
		}
		.station-text p {
			margin: 0;
		}
		.eyebrow {
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--accent);
		}
		.eyebrow.live {
			color: var(--accent-strong);
		}
		.eyebrow.live::before {
			content: '';
			display: inline-block;
			width: 7px;
			height: 7px;
			margin-right: 6px;
			border-radius: 50%;
			background: currentColor;
			vertical-align: 1px;
		}
		.station-title {
			font-weight: 700;
			line-height: 1.25;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		.station-sub {
			font-size: 0.85rem;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.tune-in {
			display: grid;
			place-items: center;
			width: 56px;
			height: 56px;
			padding: 0;
			box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent);
		}
		.tune-in .label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
		}
		h2 {
			font-size: 1.25rem;
		}
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 20px 14px;
		}
	}
</style>
