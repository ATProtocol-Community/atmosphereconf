import type { APIContext } from "astro";
import { type Client, currentDatetimeString } from "@atproto/lex";
import { site } from "../../lexicons/index.js";
import { clientFor, rkeyOf } from "./records";
import { isEmail, saveNewsSubscriber } from "./db";

const subscription = site.standard.graph.subscription;
export const PUBLICATION =
	"at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i";
const SESSION_KEY = "postcardSubscription";
const LOGIN_ERROR = "Sign-in could not be completed. Try your handle again.";

type SubscriptionResult =
	| { kind: "success"; message: string; recordUri?: string }
	| { kind: "error"; message: string };
declare global {
	namespace App {
		interface SessionData {
			postcardSubscription: SubscriptionResult;
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

export const removeSubscriptions = async (client: Client) => {
	for (const { uri } of await findSubscriptions(client)) {
		await client.delete(subscription, { rkey: rkeyOf(uri) });
	}
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

export async function takeSubscriptionResult(
	session: APIContext["session"],
	authproto: App.Locals["authproto"],
): Promise<SubscriptionResult | undefined> {
	if (authproto?.errorCode || authproto?.errorDescription) {
		session?.delete(SESSION_KEY);
		return {
			kind: "error",
			message: authproto.errorDescription ?? LOGIN_ERROR,
		};
	}
	const state = await session?.get(SESSION_KEY);
	if (!state) return;
	session?.delete(SESSION_KEY);
	return state;
}

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

	const fail = (message: string) => {
		session.set(SESSION_KEY, { kind: "error", message }, { ttl: 600 });
		return returnToPostcard();
	};
	const succeed = (recordUri: string, existing: boolean) => {
		session.set(
			SESSION_KEY,
			{
				kind: "success",
				message: existing
					? "Your Atmosphere account is already subscribed."
					: "Subscribed with your Atmosphere account. The next postcard knows where to find you.",
				recordUri,
			},
			{ ttl: 600 },
		);
		return returnToPostcard();
	};
	const user = locals.loggedInUser;
	if (!user || locals.authproto?.errorCode || locals.authproto?.errorDescription) {
		return fail(LOGIN_ERROR);
	}
	const client = clientFor(locals);
	if (!client) return fail(LOGIN_ERROR);
	let existing: { uri: string } | undefined;
	try {
		[existing] = await findSubscriptions(client);
	} catch {
		return fail("We couldn't check your subscriptions. Try your handle again.");
	}
	if (existing) return succeed(existing.uri, true);
	try {
		return succeed(await createSubscription(client), false);
	} catch {
		return fail("We couldn't confirm your subscription. Try your handle again.");
	}
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
			{ kind: "error", message: "That email address doesn't look right." },
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
			{ kind: "error", message: "We couldn't save your email. Please try again." },
			{ ttl: 600 },
		);
		return returnToPostcard();
	}
	session.set(
		SESSION_KEY,
		{ kind: "success", message: "You're on the list." },
		{ ttl: 600 },
	);
	return returnToPostcard();
};
