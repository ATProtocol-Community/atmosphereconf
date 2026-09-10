// The `interestfor` polyfill is a plain side-effecting script with no types.
declare module "interestfor";

// `interestfor` is newer than Astro's bundled HTML attribute types.
declare namespace astroHTML.JSX {
	interface HTMLAttributes {
		interestfor?: string;
	}
}
