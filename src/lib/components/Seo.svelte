<script lang="ts">
	import { page } from '$app/state';
	import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '#lib/site.js';

	interface Props {
		title?: string;
		description?: string;
		image?: string | null;
		type?: 'website' | 'music.song' | 'article';
		audio?: string | null;
		jsonLd?: Record<string, unknown> | null;
	}

	let {
		title,
		description = SITE_DESCRIPTION,
		image = null,
		type = 'website',
		audio = null,
		jsonLd = null
	}: Props = $props();

	const fullTitle = $derived(
		title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — great podcasts that have ended`
	);
	const canonical = $derived(absoluteUrl(page.url.pathname));
	// Escape "<" so episode text can't close the script tag.
	const ld = $derived(jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null);
	const ldTag = $derived(ld ? `<script type="application/ld+json">${ld}</` + `script>` : null);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={title ?? SITE_NAME} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content={type} />
	{#if image}
		<meta property="og:image" content={image} />
		<meta name="twitter:card" content="summary_large_image" />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	{#if audio}
		<meta property="og:audio" content={audio} />
		<meta property="og:audio:type" content="audio/mpeg" />
	{/if}
	{#if ldTag}
		<!-- JSON-LD we generate ourselves, with "<" escaped. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html ldTag}
	{/if}
</svelte:head>
