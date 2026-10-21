<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import PlayerBar from '#lib/components/PlayerBar.svelte';
	import { player } from '#lib/player/player.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => player.restore());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#13151a" />
</svelte:head>

<a class="skip visually-hidden" href="#main">Skip to content</a>

<header class="wrap site-header">
	<a class="logo" href={resolve('/')}>dead<span class="text-gradient">pods</span></a>
	<nav aria-label="Main">
		<a href={resolve('/')}>Shows</a>
		<a href={resolve('/about')}>About</a>
	</nav>
</header>

<main id="main" class="wrap">
	{@render children()}
</main>

<footer class="wrap site-footer muted">
	<p>
		Audio plays straight from each show's original feed. deadpods doesn't host or change it.
		<a href={resolve('/about')}>More about deadpods</a>.
	</p>
</footer>

<!-- Lives in the layout, so playback continues while you browse. -->
<PlayerBar />

<style>
	.skip:focus {
		position: fixed !important;
		top: 8px;
		left: 8px;
		width: auto;
		height: auto;
		clip: auto;
		padding: 8px 12px;
		background: var(--accent);
		color: var(--accent-ink);
		z-index: 20;
		border-radius: 6px;
	}
	.site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-block: 18px;
	}
	.logo {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text);
		text-decoration: none;
		letter-spacing: -0.02em;
	}
	nav {
		display: flex;
		gap: 4px;
	}
	nav a {
		padding: 10px 12px;
		color: var(--muted);
		text-decoration: none;
		border-radius: 8px;
	}
	nav a:hover {
		color: var(--text);
		background: var(--surface);
	}
	main {
		min-height: 60vh;
	}
	.site-footer {
		padding-block: 48px 32px;
		font-size: 0.875rem;
	}
</style>
