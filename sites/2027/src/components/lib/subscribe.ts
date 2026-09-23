import type { APIContext } from "astro";
import { type Client, currentDatetimeString } from "@atproto/lex";
import { site } from "../../lexicons/index.js";
import { clientFor } from "./records";
import { isEmail, saveNewsSubscriber } from "./db";

const subscription = site.standard.graph.subscription;
export const PUBLICATION =
	"at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i";
const SESSION_KEY = "postcardSubscription";
// Every failure sends the visitor back to the form to try again.
export type SignupFailure =
	| { kind: "sign-in"; detail?: string }
	| { kind: "check" }
	| { kind: "subscribe" }
	| { kind: "bad-email" }
	| { kind: "save-email" };

/** What the signup postcard shows. */
export type SignupCard =
	| { kind: "form"; failure?: SignupFailure }
	| { kind: "subscribed"; via: "email" }
	| { kind: "subscribed"; via: "atmosphere"; already: boolean };

declare global {
	namespace App {
		interface SessionData {
			postcardSubscription: SignupCard;
		}
	}
}

export const findSubscriptions = async (client: Client) => {
	const found: { uri: string }[] = [];
	for await (const record of client.listAll(subscription)) {
		if (record.valid && record.value.publication === PUBLICATION) {
			found.push(record);
		}
	}
	return found;
};

const createSubscription = async (client: Client) => {
	const { uri } = await client.create(subscription, {
		publication: PUBLICATION,
		createdAt: currentDatetimeString(),
	});
	return uri;
};

export const ensureSubscription = async (client: Client) => {
	const [existing] = await findSubscriptions(client);
	if (!existing) await createSubscription(client);
};

const returnToPostcard = () =>
	new Response(null, {
		status: 303,
		headers: {
			Location: "/",
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
		},
	});

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
	if (!session) {
		return new Response("Subscriptions are temporarily unavailable. Please try again.", {
			status: 503,
			headers: { "Cache-Control": "no-store" },
		});
	}

	const finish = (card: SignupCard) => {
		session.set(SESSION_KEY, card, { ttl: 600 });
		return returnToPostcard();
	};
	const fail = (failure: SignupFailure) => finish({ kind: "form", failure });
	const user = locals.loggedInUser;
	if (!user || locals.authproto?.errorCode || locals.authproto?.errorDescription) {
		return fail({ kind: "sign-in" });
	}
	const client = clientFor(locals);
	if (!client) return fail({ kind: "sign-in" });
	let existing: { uri: string } | undefined;
	try {
		[existing] = await findSubscriptions(client);
	} catch {
		return fail({ kind: "check" });
	}
	if (!existing) {
		try {
			await createSubscription(client);
		} catch {
			return fail({ kind: "subscribe" });
		}
	}
	return finish({ kind: "subscribed", via: "atmosphere", already: !!existing });
};

/**
 * Saves an email from the main page's postcard form. Only reachable when the
 * site has a database; otherwise the form posts straight to Leaflet.
 */
export const doEmailSubscription = async (
	session: APIContext["session"],
	formData: FormData,
) => {
	if (!session) {
		return new Response("Subscriptions are temporarily unavailable. Please try again.", {
			status: 503,
			headers: { "Cache-Control": "no-store" },
		});
	}
	const submitted = formData.get("email");
	const email = typeof submitted === "string" ? submitted.trim() : "";
	if (!isEmail(email)) {
		session.set(
			SESSION_KEY,
			{ kind: "form", failure: { kind: "bad-email" } },
			{ ttl: 600 },
		);
		return returnToPostcard();
	}
	try {
		await saveNewsSubscriber({ email });
	} catch (error) {
		console.error("Saving news subscriber failed", error);
		session.set(
			SESSION_KEY,
			{ kind: "form", failure: { kind: "save-email" } },
			{ ttl: 600 },
		);
		return returnToPostcard();
	}
	session.set(
		SESSION_KEY,
		{ kind: "subscribed", via: "email" },
		{ ttl: 600 },
	);
	return returnToPostcard();
};
