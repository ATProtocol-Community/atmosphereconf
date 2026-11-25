// The `interestfor` polyfill is a plain side-effecting script with no types.
declare module "interestfor";

// `interestfor` is newer than Astro's bundled HTML attribute types.
declare namespace astroHTML.JSX {
	interface HTMLAttributes {
		interestfor?: string;
	}
}

// Tito's widget API (https://ti.to/docs/api/widget): a global function that
// queues calls in `q` until tito.js loads.
interface Window {
	tito: ((...args: unknown[]) => void) & { q?: unknown[][] };
}
