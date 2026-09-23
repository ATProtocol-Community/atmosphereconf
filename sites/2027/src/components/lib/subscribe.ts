import type { APIContext } from "astro";
import { type Client, currentDatetimeString } from "@atproto/lex";
import { site } from "../../lexicons/index.js";
import { clientFor } from "./records";
import { hasDatabase, isEmail, saveNewsSubscriber } from "./db";

const subscription = site.standard.graph.subscription;
export const PUBLICATION =
	"at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i";
const SESSION_KEY = "postcardSubscription";

// Leaflet only adds an email to the list after mailing it a code, so when we
// can't keep an address ourselves, the visitor finishes signing up there.
export const LEAFLET_EMAIL_LOGIN = "https://leaflet.pub/api/auth/email-login";
// Leaflet double-decodes this, so it goes out encoded once already.
export const LEAFLET_ACTION = encodeURIComponent(
	JSON.stringify({ action: "subscribe", publication: PUBLICATION }),
);
export const NEWS_URL = "https://news.atmosphereconf.org";

export const leafletStepUrl = (email: string) =>
	`${LEAFLET_EMAIL_LOGIN}?${new URLSearchParams({
		email,
		action: LEAFLET_ACTION,
		redirect: NEWS_URL,
	})}`;

// Every failure sends the visitor back to the form to try again.
export type SignupFailure =
	| { kind: "sign-in"; detail?: string }
	| { kind: "subscribe" }
	| { kind: "bad-email" };

export type SignupReceipt =
	| { kind: "subscribed"; via: "email" }
	| { kind: "subscribed"; via: "atmosphere"; already: boolean };

/** What the signup postcard shows. */
export type SignupCard = { kind: "form"; failure?: SignupFailure } | SignupReceipt;

export type NewsOutcome =
	| { kind: "stored"; email: string }
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

/** Sent when there's no session to carry a signup or RSVP through sign-in. */
export const unavailable = (what: string) =>
	new Response(`${what} are temporarily unavailable. Please try again.`, {
		status: 503,
		headers: { "Cache-Control": "no-store" },
	});

/** Redirects back to a postcard page, which shows the outcome once. */
export const returnTo = (location: string) =>
	new Response(null, {
		status: 303,
		headers: {
			Location: location,
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
		},
	});

/** Subscribes the account unless it already is, and says which it was. */
export const ensureSubscription = async (
	client: Client,
): Promise<"new" | "existing"> => {
	for await (const record of client.listAll(subscription)) {
		if (record.valid && record.value.publication === PUBLICATION) {
			return "existing";
		}
	}
	await client.create(subscription, {
		publication: PUBLICATION,
		createdAt: currentDatetimeString(),
	});
	return "new";
};

/**
 * Puts an email on the news list. Without a database, or if saving fails,
 * the visitor still has Leaflet's step to get on it.
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
			return { kind: "stored", email };
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
	return finish({
		kind: "subscribed",
		via: "atmosphere",
		already: result === "existing",
	});
};

/**
 * Saves an email from the main page's postcard form. Only reachable when the
 * site has a database; otherwise the form posts straight to Leaflet.
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
		// Saving failed, so send them where the form goes without a database.
		case "leaflet-step":
			return returnTo(leafletStepUrl(news.email));
		case "stored":
			session.set(SESSION_KEY, { kind: "subscribed", via: "email" }, { ttl: 600 });
			return returnTo("/");
	}
};
