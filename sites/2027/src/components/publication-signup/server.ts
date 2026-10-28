import type { APIContext } from "astro";
import type { Client } from "@atproto/lex";
import { clientFor } from "../lib/records";
import { hasDatabase, saveNewsSubscriber } from "../lib/db";
import { newsSignup, PUBLICATION } from "./settings";
import { isEmail, ensurePublicationSubscription } from "./leaflet";
import { methodFor, type Method } from "./identifier";
import {
	park,
	showOnce,
	signInError,
	startSignIn,
	unpark,
	type SignInContext,
	type SignInFailure,
} from "../lib/sign-in";
import { unavailable } from "../lib/responses";
import type { Line } from "../postcard/Confirmation.astro";
import { htmlEscape as html } from "escape-goat";

export const SUBSCRIBE_SCOPE =
	"repo:site.standard.graph.subscription?action=create";

const REQUEST_KEY = "signupRequest";
const CARD_KEY = "signupCard";

// Leaflet only adds an email to the list after mailing it a code, so every
// email signup finishes there, even when we keep a copy of the address.
export const leafletStepUrl = newsSignup.url;

type SignupRequest = { handle: string };

// Every failure sends the visitor back to the form to try again.
export type SignupFailure =
	| SignInFailure
	| { kind: "missing" }
	| { kind: "subscribe" }
	| { kind: "bad-email" };

export type SignupReceipt = { kind: "subscribed"; already: boolean };

/** What the signup postcard shows. */
export type SignupCard =
	| { kind: "form"; failure?: SignupFailure }
	| SignupReceipt
	| {
			kind: "email-pending";
			news: Extract<NewsOutcome, { kind: "leaflet-step" }>;
	  };

export type NewsOutcome =
	// The visitor still has to confirm through Leaflet.
	| { kind: "leaflet-step"; email: string }
	| { kind: "failed"; reason: "no-email" | "bad-email" };

export const newsLine = (news: NewsOutcome): Line => {
	switch (news.kind) {
		case "leaflet-step":
			return {
				words: html`One more step: we'll send a code to
					<strong>${news.email}</strong>.`,
				tone: "todo",
				action: { label: "Send my code", href: leafletStepUrl(news.email) },
			};
		case "failed":
			switch (news.reason) {
				case "no-email":
					return {
						words: html`We couldn't read your account email, so email news isn't
						set up.`,
						tone: "failed",
					};
				case "bad-email":
					return {
						words: html`That email address doesn't look right, so email news
						isn't set up.`,
						tone: "failed",
					};
			}
	}
};

declare global {
	namespace App {
		interface SessionData {
			signupRequest: SignupRequest;
			signupCard: SignupCard;
		}
	}
}

type SignupContext = SignInContext & Pick<APIContext, "session">;

export type SignupPlace = { page: string; anchor?: string };

const landing = ({ page, anchor = "" }: SignupPlace) => `${page}${anchor}`;

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

const readMethod = (formData: FormData): Method | null => {
	const chosen = formData.get("method");
	return chosen === "email" || chosen === "handle" ? chosen : null;
};

/** Reads the form's one field as whichever kind of address it holds. */
const readIdentifier = (
	formData: FormData,
):
	| { kind: "missing" }
	| { kind: "email"; email: string }
	| { kind: "handle"; handle: string } => {
	const submitted = formData.get("identifier");
	const raw = typeof submitted === "string" ? submitted.trim() : "";
	if (!raw) return { kind: "missing" };
	if (methodFor(raw, readMethod(formData)) === "email") {
		return { kind: "email", email: raw };
	}
	return { kind: "handle", handle: raw.replace(/^@/, "") };
};

/**
 * An email gets a receipt linking to Leaflet's code step; a handle parks the request and
 * starts sign-in, which comes back here for `signupPage` to finish.
 */
const startSignup = async (
	context: SignupContext,
	formData: FormData,
	place: SignupPlace,
) => {
	const { session } = context;
	if (!session) return unavailable("Subscriptions");
	const fail = (failure: SignupFailure) =>
		showOnce(session, landing(place), CARD_KEY, { kind: "form", failure });
	const identifier = readIdentifier(formData);
	switch (identifier.kind) {
		case "missing":
			return fail({ kind: "missing" });
		case "handle":
			park(session, REQUEST_KEY, { handle: identifier.handle });
			return startSignIn(context, {
				handle: identifier.handle,
				scopes: [SUBSCRIBE_SCOPE],
				backTo: place.page,
			});
		case "email": {
			const news = await signUpForNews({ email: identifier.email });
			if (news.kind === "failed") return fail({ kind: "bad-email" });
			return showOnce(session, landing(place), CARD_KEY, {
				kind: "email-pending",
				news,
			});
		}
	}
};

const completeSignup = async (locals: App.Locals): Promise<SignupCard> => {
	const client = clientFor(locals);
	if (!client) return { kind: "form", failure: { kind: "sign-in" } };
	try {
		const result = await ensureSubscription(client);
		return { kind: "subscribed", already: result === "existing" };
	} catch {
		// Can't tell whether the lookup or the create failed, so the message
		// covers both.
		return { kind: "form", failure: { kind: "subscribe" } };
	}
};

/**
 * Runs the signup postcard: a submitted form starts the signup, and the
 * return trip from sign-in finishes it. Both redirect back here (returning
 * the Response to send) so the outcome shows once. Anything else is the
 * postcard to render.
 */
export const signupPage = async (
	context: SignupContext,
	place: SignupPlace = { page: "/signup" },
): Promise<Response | SignupCard> => {
	const { session, locals } = context;
	if (context.request.method === "POST") {
		return startSignup(context, await context.request.formData(), place);
	}
	const request = await unpark(session, REQUEST_KEY);
	const signIn = signInError(locals);
	if (signIn) return { kind: "form", failure: signIn };
	if (request && locals.loggedInUser) {
		if (!session) return unavailable("Subscriptions");
		return showOnce(
			session,
			landing(place),
			CARD_KEY,
			await completeSignup(locals),
		);
	}
	return (await unpark(session, CARD_KEY)) ?? { kind: "form" };
};
