import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import boldonse from "./fonts/boldonse-400.ttf?inline";
import stackSans400 from "./fonts/stack-sans-text-400.ttf?inline";
import stackSans500 from "./fonts/stack-sans-text-500.ttf?inline";
import stackSans600 from "./fonts/stack-sans-text-600.ttf?inline";
import stackSans700 from "./fonts/stack-sans-text-700.ttf?inline";
import { homeImage } from "./home";
import { pageImage } from "./page";
import { ogPages, type OgImage } from "./pages";

const fontData = (dataUrl: string) =>
	Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");

const fonts = [
	{ name: "Boldonse", data: fontData(boldonse), weight: 400 as const },
	{
		name: "Stack Sans Text",
		data: fontData(stackSans400),
		weight: 400 as const,
	},
	{
		name: "Stack Sans Text",
		data: fontData(stackSans500),
		weight: 500 as const,
	},
	{
		name: "Stack Sans Text",
		data: fontData(stackSans600),
		weight: 600 as const,
	},
	{
		name: "Stack Sans Text",
		data: fontData(stackSans700),
		weight: 700 as const,
	},
];

export const renderOgImage = async (image: OgImage) => {
	const tree = image === "home" ? homeImage() : pageImage(ogPages[image]);
	const svg = await satori(tree as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts,
	});
	return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
		.render()
		.asPng();
};
