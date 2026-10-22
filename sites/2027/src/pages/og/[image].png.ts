import type { APIRoute, GetStaticPaths } from "astro";
import { renderOgImage } from "../../og/render";
import { ogImages, type OgImage } from "../../og/pages";

export const prerender = true;

export const getStaticPaths = (() =>
	ogImages.map((image) => ({ params: { image } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const png = await renderOgImage(params.image as OgImage);
	return new Response(new Uint8Array(png), {
		headers: { "Content-Type": "image/png" },
	});
};
