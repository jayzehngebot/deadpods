<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo title="Not found" />

<section class="err">
	<h1>{page.status === 404 ? 'This one is really dead.' : 'Something went wrong.'}</h1>
	<p class="muted">{page.error?.message}</p>
	<p><a class="btn" href={resolve('/')}>Back to the shows</a></p>
</section>

<style>
	.err {
		text-align: center;
		padding: 80px 0;
	}
</style>
