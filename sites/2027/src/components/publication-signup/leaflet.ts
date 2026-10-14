import { type Client, currentDatetimeString } from "@atproto/lex";
import * as subscription from "../../lexicons/site/standard/graph/subscription.js";
import type { SignupFailure, SignupReceipt } from "./server";

/** A Leaflet email signup starts confirmation; it isn't a subscription receipt. */
export const createLeafletSignup = ({
	publication,
	redirect,
}: {
	publication: string;
	redirect: string;
}) => {
	const form: {
		action: string;
		method: "get";
		fields: { action: string; redirect: string };
	} = {
		action: "https://leaflet.pub/api/auth/email-login",
		method: "get",
		fields: {
			// Leaflet double-decodes the action, so encode it before form encoding.
			action: encodeURIComponent(JSON.stringify({ action: "subscribe", publication })),
			redirect,
		},
	};

	return {
		form,
		url: (email: string) =>
			`${form.action}?${new URLSearchParams({ email, ...form.fields })}`,
	};
};

// Match the site's existing browser hint without accepting obvious junk.
export const isEmail = (value: string) =>
	value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

export const signupReceipt = (receipt: SignupReceipt): string =>
	receipt.already
		? "Your Atmosphere account is already subscribed."
		: "Subscribed with your Atmosphere account! Our postcards will know where to find you.";

/** The caller supplies a client already authenticated with subscription write access. */
export const ensurePublicationSubscription = async (
	client: Client,
	publication: subscription.Main["publication"],
): Promise<"new" | "existing"> => {
	for await (const record of client.listAll(subscription)) {
		if (record.valid && record.value.publication === publication) {
			return "existing";
		}
	}
	await client.create(subscription, {
		publication,
		createdAt: currentDatetimeString(),
	});
	return "new";
};
