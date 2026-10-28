/** @type {import("prettier").Config} */
export default {
	plugins: ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
	overrides: [
		{
			files: "*.astro",
			options: {
				parser: "astro",
			},
		},
		{
			files: "sites/2026/**",
			options: { tailwindStylesheet: "./sites/2026/src/styles/global.css" },
		},
		{
			files: "sites/2027/**",
			options: { tailwindStylesheet: "./sites/2027/src/styles/global.css" },
		},
	],
};
