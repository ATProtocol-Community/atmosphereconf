import type { APIContext } from "astro";
import type { Client } from "@atproto/lex";
import { clientFor } from "../lib/records";
import { hasDatabase, saveNewsSubscriber } from "../lib/db";
import { newsSignup, PUBLICATION } from "./settings";
import { isEmail, ensurePublicationSubscription } from "./leaflet";

import { returnTo, unavailable } from "../lib/responses";

const SESSION_KEY = "postcardSubscription";

// Leaflet only adds an email to the list after mailing it a code, so every
// email signup finishes there, even when we keep a copy of the address.
export const leafletStepUrl = newsSignup.url;

// Every failure sends the visitor back to the form to try again.
export type SignupFailure =
	| { kind: "sign-in"; detail?: string }
	| { kind: "subscribe" }
	| { kind: "bad-email" };

export type SignupReceipt = { kind: "subscribed"; already: boolean };

/** What the signup postcard shows. */
export type SignupCard = { kind: "form"; failure?: SignupFailure } | SignupReceipt;

export type NewsOutcome =
	// The visitor still has to confirm through Leaflet.
	| { kind: "leaflet-step"; email: string }
	| { kind: "failed"; reason: "no-email" | "bad-email" };

declare global {
	namespace App {
		interface SessionData {
			postcardSubscription: SignupCard;
		}
	}
}

/** Subscribes the account unless it already is, and says which it was. */
export const ensureSubscription = (client: Client) =>
	ensurePublicationSubscription(client, PUBLICATION);

/**
 * Keeps a copy of the email when there's a database, then hands the visitor
 * Leaflet's step to actually get on the list.
 */
export const signUpForNews = async (subscriber: {
	email: string;
	did?: string;
	handle?: string;
}): Promise<NewsOutcome> => {
	const { email } = subscriber;
	if (!isEmail(email)) return { kind: "failed", reason: "bad-email" };
	if (hasDatabase) {
		try {
			await saveNewsSubscriber(subscriber);
		} catch (error) {
			console.error("Saving news subscriber failed", error);
		}
	}
	return { kind: "leaflet-step", email };
};

/**
 * The signup postcard's state: the outcome of a signup that just redirected
 * back here, shown once, or the plain form.
 */
export const signupCard = async ({
	session,
	locals,
}: Pick<APIContext, "session" | "locals">): Promise<SignupCard> => {
	const { authproto } = locals;
	if (authproto?.errorCode || authproto?.errorDescription) {
		session?.delete(SESSION_KEY);
		return {
			kind: "form",
			failure: { kind: "sign-in", detail: authproto.errorDescription },
		};
	}
	const card = await session?.get(SESSION_KEY);
	if (!card) return { kind: "form" };
	session?.delete(SESSION_KEY);
	return card;
};

export const doSubscription = async (
	session: APIContext["session"],
	locals: App.Locals,
) => {
	if (!session) return unavailable("Subscriptions");

	const finish = (card: SignupCard) => {
		session.set(SESSION_KEY, card, { ttl: 600 });
		return returnTo("/");
	};
	const fail = (failure: SignupFailure) => finish({ kind: "form", failure });
	const user = locals.loggedInUser;
	if (!user || locals.authproto?.errorCode || locals.authproto?.errorDescription) {
		return fail({ kind: "sign-in" });
	}
	const client = clientFor(locals);
	if (!client) return fail({ kind: "sign-in" });
	let result: "new" | "existing";
	try {
		result = await ensureSubscription(client);
	} catch {
		// Can't tell whether the lookup or the create failed, so the message
		// covers both.
		return fail({ kind: "subscribe" });
	}
	return finish({ kind: "subscribed", already: result === "existing" });
};

/**
 * Saves an email from the main page's postcard form, then sends the visitor
 * on to Leaflet's code step. Only reachable when the site has a database;
 * otherwise the form goes straight to Leaflet.
 */
export const doEmailSubscription = async (
	session: APIContext["session"],
	formData: FormData,
) => {
	if (!session) return unavailable("Subscriptions");
	const submitted = formData.get("email");
	const news = await signUpForNews({
		email: typeof submitted === "string" ? submitted.trim() : "",
	});
	switch (news.kind) {
		case "failed":
			session.set(
				SESSION_KEY,
				{ kind: "form", failure: { kind: "bad-email" } },
				{ ttl: 600 },
			);
			return returnTo("/");
		case "leaflet-step":
			return returnTo(leafletStepUrl(news.email));
	}
};
