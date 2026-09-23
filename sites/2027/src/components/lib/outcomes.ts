/**
 * Everything the signup and RSVP postcards say once a visitor submits. Each
 * outcome sits next to its words, and the switches below stop compiling if
 * an outcome is added without any.
 */
import type { RsvpFailure, RsvpReceipt } from "./rsvp";
import {
	leafletStepUrl,
	type NewsOutcome,
	type SignupFailure,
	type SignupReceipt,
} from "./subscribe";

/** An extra the RSVP form offers that the visitor can still add. */
export type Extra = "standard" | "news";

/**
 * A sentence, with the parts the postcard shows in bold, links, and buttons
 * that add an extra to the visitor's RSVP.
 */
export type Words = (
	| string
	| { strong: string }
	| { link: string; href: string }
	| { add: Extra; label: string }
)[];

/** One line of a receipt. */
export type Line = {
	words: Words;
	/**
	 * Done lines list what worked; a to-do still needs the visitor; failed
	 * is something asked for that didn't happen.
	 */
	tone: "done" | "todo" | "failed";
	/** The step a to-do needs. */
	action?: { label: string; href: string };
};

const signInFailed = (detail?: string) =>
	detail ?? "Sign-in could not be completed. Try your handle again.";

export const signupError = (failure: SignupFailure): string => {
	switch (failure.kind) {
		case "sign-in":
			return signInFailed(failure.detail);
		case "subscribe":
			return "We couldn't confirm your subscription. Try your handle again.";
		case "bad-email":
			return "That email address doesn't look right.";
	}
};

export const signupReceipt = (receipt: SignupReceipt): string => {
	if (receipt.via === "email") return "You're on the list.";
	return receipt.already
		? "Your Atmosphere account is already subscribed."
		: "Subscribed with your Atmosphere account! Our postcards will know where to find you.";
};

export const rsvpError = (failure: RsvpFailure): string => {
	switch (failure.kind) {
		case "sign-in":
			return signInFailed(failure.detail);
		case "missing-handle":
			return "Enter your Atmosphere handle to RSVP.";
		case "save":
			return "We couldn't save your RSVP. Try your handle again.";
	}
};

export const RSVP_TITLE = "Tot dan! What a beautiful beak-inning!";

const standardLine = (standard: "subscribed" | "failed"): Line => {
	switch (standard) {
		case "subscribed":
			return {
				words: ["We also subscribed you via ", { strong: "Standard.site" }, ". Way to go!"],
				tone: "done",
			};
		case "failed":
			return {
				words: ["We couldn't set up your Standard.site subscription."],
				tone: "failed",
			};
	}
};

const newsLine = (news: NewsOutcome): Line => {
	switch (news.kind) {
		case "stored":
			return {
				words: ["We'll send email news to ", { strong: news.email }, "."],
				tone: "done",
			};
		case "leaflet-step":
			return {
				words: [
					"One more step: we'll send a code to ",
					{ strong: news.email },
					".",
				],
				tone: "todo",
				action: { label: "Send my code", href: leafletStepUrl(news.email) },
			};
		case "failed":
			switch (news.reason) {
				case "no-email":
					return {
						words: [
							"We couldn't read your account email, so email news isn't set up.",
						],
						tone: "failed",
					};
				case "bad-email":
					return {
						words: [
							"That email address doesn't look right, so email news isn't set up.",
						],
						tone: "failed",
					};
			}
	}
};

export const rsvpReceipt = (receipt: RsvpReceipt): Line[] => [
	{ words: ["RSVP'd as ", { strong: `@${receipt.handle}` }, "."], tone: "done" },
	...(receipt.standard ? [standardLine(receipt.standard)] : []),
	...(receipt.news ? [newsLine(receipt.news)] : []),
];

const BLUESKY = "https://bsky.app/profile/did:plc:3xewinw4wtimo2lqfy5fm5sw";

/**
 * Closes every RSVP receipt: Bluesky, plus the extras the visitor didn't ask
 * for. Failed extras already have their own note.
 */
export const rsvpFollowUp = (receipt: RsvpReceipt): Words => {
	const offers: Words = [
		...(receipt.standard
			? []
			: [{ add: "standard" as const, label: "get updates via Standard.site" }]),
		...(receipt.news
			? []
			: [{ add: "news" as const, label: "get news by email" }]),
	];
	const bluesky = ["In the meantime, you can follow us on ", { link: "Bluesky", href: BLUESKY }];
	if (!offers.length) return [...bluesky, "."];
	return [
		...bluesky,
		", and if you haven't yet, ",
		...offers.flatMap((offer, index) => (index ? [" or ", offer] : [offer])),
		".",
	];
};
