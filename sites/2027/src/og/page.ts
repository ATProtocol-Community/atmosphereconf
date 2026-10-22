import { event } from "../data/event";
import { assets, colors } from "./assets";
import { box, image, svgDataUri, type OgStyle } from "./elements";
import type { OgPage } from "./pages";

const label: OgStyle = {
	fontSize: 13,
	fontWeight: 700,
	letterSpacing: 2.3,
	textTransform: "uppercase",
	color: colors.steel,
};

const field = (name: string, value: string) =>
	box(
		{ flexDirection: "column", gap: 4 },
		box(label, name),
		box({ fontSize: 22, fontWeight: 700 }, value),
	);

const barcode = (text: string, width: number, height: number) => {
	const bars: string[] = [];
	let x = 0;
	for (const code of [...text].map((char) => char.charCodeAt(0))) {
		for (let bit = 0; bit < 7 && x < width; bit++) {
			const bar = code & (1 << bit) ? 3 : 1;
			bars.push(`<rect x="${x}" width="${bar}" height="${height}"/>`);
			x += bar + 2 + ((code >> bit) % 2);
		}
	}
	return svgDataUri(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${x} ${height}" preserveAspectRatio="none" fill="${colors.navy}">${bars.join("")}</svg>`,
	);
};

const notch = (edge: "top" | "bottom") =>
	box({
		position: "absolute",
		left: -22,
		[edge]: -48,
		width: 40,
		height: 40,
		borderRadius: 20,
		background: colors.azure,
	});

export const pageImage = (page: OgPage) =>
	box(
		{
			position: "relative",
			width: 1200,
			height: 630,
			padding: "70px 60px",
			overflow: "hidden",
			background: colors.azure,
			color: colors.navy,
			fontFamily: "Stack Sans Text",
		},
		image(assets.puffyCloud, 460, 200, {
			position: "absolute",
			left: -120,
			top: 440,
			opacity: 0.25,
		}),
		image(assets.longCloud, 520, 192, {
			position: "absolute",
			left: 820,
			top: -110,
			opacity: 0.25,
		}),
		box(
			{ flexGrow: 1, background: colors.cream, borderRadius: 28 },
			box(
				{ flexGrow: 1, flexDirection: "column", padding: "40px 48px" },
				box(
					{ alignItems: "center", gap: 14 },
					image(assets.heartNavy, 54, 34),
					box(
						{
							fontSize: 18,
							fontWeight: 700,
							letterSpacing: 2.5,
							textTransform: "uppercase",
						},
						`AtmosphereConf ${event.year}`,
					),
					box(
						{ ...label, marginLeft: "auto", fontSize: 16, fontWeight: 600 },
						"Boarding pass",
					),
				),
				box(
					{
						marginTop: 40,
						fontFamily: "Boldonse",
						fontSize: 48,
						lineHeight: 1.45,
						textTransform: "uppercase",
					},
					page.title,
				),
				box(
					{
						marginTop: 14,
						maxWidth: 620,
						fontSize: 22,
						lineHeight: 1.45,
						color: colors.slate,
					},
					page.description,
				),
				box(
					{ marginTop: "auto", gap: 56 },
					field("Gate", page.path),
					field("Departs", `${event.firstDay} ${event.year}`),
					field("Class", page.seat),
				),
			),
			box(
				{
					position: "relative",
					width: 0,
					margin: "26px 0",
					borderLeft: `3px dashed ${colors.line}`,
				},
				notch("top"),
				notch("bottom"),
			),
			box(
				{
					width: 300,
					flexDirection: "column",
					alignItems: "flex-start",
					padding: "40px 36px",
				},
				box(label, "Destination"),
				box(
					{
						marginTop: 10,
						fontFamily: "Boldonse",
						fontSize: 58,
						lineHeight: 1.5,
						color: colors.orange,
					},
					event.venueCode,
				),
				box(
					{ fontSize: 20, fontWeight: 600 },
					`${event.firstDay} to ${event.lastDay}`,
				),
				image(barcode(page.path, 228, 70), 228, 70, { marginTop: "auto" }),
			),
		),
	);
