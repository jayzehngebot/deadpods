import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			paths: { origin: 'https://deadpods.com' }
		})
	],
	// Workaround: Rolldown's tsconfig lookup fails on its own virtual runtime
	// ("Could not resolve 'node:module' in \0rolldown/runtime.js") when Vite
	// pre-bundles SSR deps. Deps don't need tsconfig, so turn it off there.
	ssr: {
		optimizeDeps: { rolldownOptions: { tsconfig: false } }
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
