/**
 * What the RSVP postcard reports once a visitor submits; the closing
 * follow-up sentence lives in RsvpReceipt. Each outcome sits next to its
 * words, and the switches below stop compiling if an outcome is added
 * without any.
 */
import type { RsvpFailure, RsvpReceipt } from "./server";
import { signInFailed } from "../lib/sign-in";
import { newsLine } from "../publication-signup/server";
import type { Line } from "../postcard/Confirmation.astro";
import { htmlEscape as html } from "escape-goat";

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

const standardLine = (standard: "subscribed" | "failed"): Line => {
	switch (standard) {
		case "subscribed":
			return {
				words: html`We also subscribed you via <strong>Standard.site</strong>.
					Way to go!`,
				tone: "done",
			};
		case "failed":
			return {
				words: html`We couldn't set up your Standard.site subscription.`,
				tone: "failed",
			};
	}
};

export const rsvpReceipt = (receipt: RsvpReceipt): Line[] => [
	{ words: html`RSVP'd as <strong>@${receipt.handle}</strong>.`, tone: "done" },
	...(receipt.standard ? [standardLine(receipt.standard)] : []),
	...(receipt.news ? [newsLine(receipt.news)] : []),
];
