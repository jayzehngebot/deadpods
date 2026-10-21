<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ShowCard from '#lib/components/ShowCard.svelte';
	import { allTracks, shows } from '#lib/data/index.js';
	import { player } from '#lib/player/player.svelte.js';
	import { buildRadio, randomSeed } from '#lib/radio.js';
	import { SITE_URL } from '#lib/site.js';

	const radioOn = $derived(player.mode === 'radio' && player.playing);

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
	<button type="button" class="tune-in" aria-pressed={radioOn} onclick={tuneIn}>
		<Icon name={radioOn ? 'pause' : 'radio'} size={28} />
		<span
			>{radioOn
				? 'Pause radio'
				: player.mode === 'radio' && player.track
					? 'Resume radio'
					: 'Tune in'}</span
		>
	</button>
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
</style>
