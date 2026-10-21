// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** The full-screen Now Playing view is open (phones). */
			nowPlaying?: boolean;
		}
		// interface Platform {}
	}
}

export {};
