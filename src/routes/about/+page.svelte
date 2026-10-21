<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo title="About" description="What deadpods is, how it plays audio, and how to reach us." />

<article class="prose">
	<h1>About deadpods</h1>
	<p>
		Plenty of great podcasts have stopped making episodes. Their archives are still out there, but
		they're hard to find and easy to forget. deadpods is a hand-picked list of those shows and their
		best episodes, with a player that keeps going once you press play.
	</p>

	<h2>How the audio works</h2>
	<p>
		Every episode plays directly from the show's own public feed, the same way a podcast app does.
		deadpods doesn't copy, host, cut or add ads to anyone's audio, and the shows' publishers still
		see every play. If a publisher removes an episode, it disappears here too.
	</p>

	<h2>Rights and takedowns</h2>
	<p>
		Show names, artwork and audio belong to their creators. The short descriptions and episode notes
		on this site are original and licensed
		<a href="https://creativecommons.org/licenses/by/4.0/" rel="external license">CC BY 4.0</a>. The
		site's code is open source under the GPL-3.0.
	</p>
	<p>
		If you made one of these shows and want it changed or removed, open an issue on the project's
		GitHub repository and it will be handled promptly.
	</p>

	<h2>Privacy</h2>
	<p>
		deadpods sets no cookies. Your listening position is saved only in your own browser. When you
		play an episode, your browser connects to the show's audio host, which can see your IP address
		like any podcast app would.
	</p>
</article>

<style>
	.prose {
		max-width: 40em;
	}
	h1 {
		font-size: 2.5rem;
	}
	h2 {
		font-size: 1.3rem;
		margin-top: 1.6em;
	}
</style>
