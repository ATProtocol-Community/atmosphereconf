import { event } from "../data/event";
import { assets, colors, skyGradient } from "./assets";
import { box, image } from "./elements";

const addressLine = (text: string) =>
	box(
		{
			padding: "14px 0 10px",
			borderBottom: `2px solid ${colors.line}`,
			fontSize: 26,
			fontWeight: 500,
		},
		text,
	);

export const homeImage = () =>
	box(
		{
			position: "relative",
			width: 1200,
			height: 630,
			background: "#e3d9c9",
			color: colors.navy,
			fontFamily: "Stack Sans Text",
		},
		box(
			{
				position: "absolute",
				left: 40,
				top: 36,
				width: 1120,
				height: 558,
				padding: 28,
				gap: 28,
				background: colors.cream,
				borderRadius: 10,
				boxShadow: "0 18px 40px -12px rgba(0, 25, 65, 0.35)",
			},
			box(
				{
					position: "relative",
					width: 560,
					height: 502,
					flexShrink: 0,
					overflow: "hidden",
					borderRadius: 6,
					backgroundImage: skyGradient,
				},
				box(
					{
						position: "absolute",
						left: 36,
						top: 34,
						color: "#ffffff",
						fontSize: 20,
						fontWeight: 600,
						letterSpacing: 3,
						textTransform: "uppercase",
					},
					"Greetings from",
				),
				image(assets.logo, 488, 138, {
					position: "absolute",
					left: 36,
					top: 76,
				}),
				image(assets.canal, 640, 199, {
					position: "absolute",
					left: -40,
					top: 303,
				}),
			),
			box(
				{
					position: "relative",
					flexGrow: 1,
					flexDirection: "column",
					padding: "8px 4px 4px 28px",
					borderLeft: `2px solid ${colors.line}`,
				},
				image(assets.stamp, 132, 170, {
					position: "absolute",
					right: 0,
					top: 0,
					transform: "rotate(4deg)",
				}),
				image(assets.postmark, 220, 110, {
					position: "absolute",
					right: 70,
					top: 96,
					opacity: 0.85,
					transform: "rotate(-10deg)",
				}),
				box(
					{
						width: 250,
						fontFamily: "Boldonse",
						fontSize: 24,
						lineHeight: 1.7,
						textTransform: "uppercase",
					},
					"Wish you were here",
				),
				box(
					{ marginTop: "auto", flexDirection: "column" },
					addressLine("Building for a new internet"),
					addressLine(event.venue),
					addressLine(`${event.firstDay} to ${event.lastDay} ${event.year}`),
					box(
						{
							paddingTop: 14,
							fontSize: 22,
							fontWeight: 700,
							color: colors.azure,
						},
						"atmosphereconf.org",
					),
				),
			),
		),
	);
