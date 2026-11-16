export interface OgPage {
	title: string;
	description: string;
	path: string;
	seat: string;
}

export const ogPages = {
	attend: {
		title: "Attend",
		description:
			"Four days around King’s Day. When to arrive, what’s on, and handy info for your stay.",
		path: "/attend",
		seat: "Attendee",
	},
	speak: {
		title: "Call for presentations",
		description:
			"Four themes, two formats, two rounds of review. Round 1 closes 30 November 2026.",
		path: "/speak",
		seat: "Speaker",
	},
	rsvp: {
		title: "RSVP",
		description: "Count yourself in for AtmosphereConf 2027.",
		path: "/rsvp",
		seat: "Attendee",
	},
	signup: {
		title: "Back at it",
		description:
			"AtmosphereConf #3. Spring 2027. Somewhere in the Netherlands (and online).",
		path: "/signup",
		seat: "Attendee",
	},
	postcard: {
		title: "Send a postcard",
		description: "Build a postcard and invite someone to AtmosphereConf 2027.",
		path: "/postcard",
		seat: "Sender",
	},
	science: {
		title: "ATScience × IOSP 2027",
		description: "ATScience and IOSP team up for a two-day side event at AtmosphereConf 2027. Join researchers, citizen scientists, developers, and funders to shape the future of science.",
		path: "/science",
		seat: "Attendee",
	},
} satisfies Record<string, OgPage>;

export type OgImage = "home" | keyof typeof ogPages;

export const ogImages: OgImage[] = [
	"home",
	...(Object.keys(ogPages) as (keyof typeof ogPages)[]),
];

export const ogImageUrl = (
	image: OgImage,
	{ site, url }: { site?: URL; url: URL },
) =>
	new URL(
		`/og/${image}.png`,
		import.meta.env.DEV ? url : (site ?? url),
	).toString();
