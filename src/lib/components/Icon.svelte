<script lang="ts">
	type Name =
		| 'play'
		| 'pause'
		| 'next'
		| 'prev'
		| 'back15'
		| 'fwd30'
		| 'share'
		| 'radio'
		| 'spinner'
		| 'chevron-down';
	let { name, size = 24 }: { name: Name; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	aria-hidden="true"
	focusable="false"
	class:spin={name === 'spinner'}
>
	{#if name === 'play'}
		<path
			d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"
		/>
	{:else if name === 'pause'}
		<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
	{:else if name === 'next'}
		<path
			d="M5 6.1v11.8a.8.8 0 0 0 1.2.7L15 12.7a.8.8 0 0 0 0-1.4L6.2 5.4a.8.8 0 0 0-1.2.7zM16.5 5H19v14h-2.5z"
		/>
	{:else if name === 'prev'}
		<path
			d="M19 6.1v11.8a.8.8 0 0 1-1.2.7L9 12.7a.8.8 0 0 1 0-1.4l8.8-5.9a.8.8 0 0 1 1.2.7zM5 5h2.5v14H5z"
		/>
	{:else if name === 'back15'}
		<path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
		<text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle">15</text>
	{:else if name === 'fwd30'}
		<path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" />
		<text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle">30</text>
	{:else if name === 'share'}
		<path
			d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z"
		/>
	{:else if name === 'radio'}
		<path
			d="M20 6H8.3l8.3-3.4-.7-1.8L3.2 6A2 2 0 0 0 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM7 20a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm13-8h-2v-2h-2v2H4V8h16z"
		/>
	{:else if name === 'spinner'}
		<path d="M12 2a10 10 0 1 0 10 10h-2.5A7.5 7.5 0 1 1 12 4.5z" />
	{:else if name === 'chevron-down'}
		<path
			d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4z"
		/>
	{/if}
</svg>

<style>
	svg {
		flex: none;
	}
	.spin {
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
