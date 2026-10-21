import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';

// Workaround: when Vite pre-bundles deps for Node, Rolldown's automatic
// tsconfig lookup fails on its own virtual runtime module ("Could not resolve
// 'node:module' in \0rolldown/runtime.js"), crashing `vite dev` and Vitest.
// Deps don't need a tsconfig, so turn the lookup off for pre-bundling in every
// environment. This runs on the final config so Vitest's environments get it too.
function noTsconfigInDepPrebundle(): Plugin {
	return {
		name: 'deadpods:no-tsconfig-in-dep-prebundle',
		configResolved(config) {
			for (const env of Object.values(config.environments)) {
				env.optimizeDeps.rolldownOptions = { ...env.optimizeDeps.rolldownOptions, tsconfig: false };
			}
		}
	};
}

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// 404.html is served by Amplify for any path that isn't a real file
			// (see the "not found (404)" rewrite rule on the Amplify app).
			adapter: adapter({ fallback: '404.html' }),
			paths: { origin: 'https://deadpods.com' },
			// Content-Security-Policy as a <meta> tag on every page, with hashes
			// for SvelteKit's inline scripts. Audio and artwork come from each
			// show's own feed hosts, so media and images allow any https source.
			// Header-only rules (frame-ancestors etc.) live in customHttp.yml.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'https:', 'data:'],
					'media-src': ['self', 'https:'],
					'connect-src': ['self'],
					'font-src': ['self'],
					'manifest-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'upgrade-insecure-requests': true
				}
			}
		}),
		noTsconfigInDepPrebundle()
	],
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
