import type { APIContext } from "astro";
import { getPdsAgent } from "@fujocoded/authproto/helpers";

const COLLECTION = "site.standard.graph.subscription";
const PUBLICATION =
	"at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i";
const SESSION_KEY = "postcardSubscription";
const LOGIN_ERROR = "Sign-in could not be completed. Try your handle again.";

type SubscriptionResult =
	| { kind: "success"; message: string; recordUri: string }
	| { kind: "error"; message: string };
declare global {
	namespace App {
		interface SessionData {
			postcardSubscription: SubscriptionResult;
		}
	}
}

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

	const matchesPublication = (value: unknown): boolean => {
		console.log(value)
		return typeof value === "object" &&
			value !== null &&
			"$type" in value &&
			value.$type === COLLECTION &&
			"publication" in value &&
			value.publication === PUBLICATION;
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
					: "Subscribed with your Atmosphere account.",
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
	const agent = await getPdsAgent({ loggedInUser: user });
	if (!agent) return fail(LOGIN_ERROR);
	const repo = user.did;
	try {
		let cursor: string | undefined;
		const seenCursors = new Set<string>();
		do {
			const { data } = await agent.com.atproto.repo.listRecords({
				repo,
				collection: COLLECTION,
				limit: 100,
				...(cursor ? { cursor } : {}),
			});
			const existing = data.records.find((record) =>
				matchesPublication(record.value) && record.uri.startsWith(`at://${repo}/${COLLECTION}/`),
			);
			if (existing) return succeed(existing.uri, true);
			cursor = data.cursor;
			if (cursor && seenCursors.has(cursor)) throw new Error("Repeated subscription cursor");
			if (cursor) seenCursors.add(cursor);
		} while (cursor);
	} catch {
		return fail("We couldn't check your subscriptions. Try your handle again.");
	}
	try {
		const { data } = await agent.com.atproto.repo.createRecord({
			repo,
			collection: COLLECTION,
			record: {
				$type: COLLECTION,
				publication: PUBLICATION,
				createdAt: new Date().toISOString(),
			},
		});
		return succeed(data.uri, false);
	} catch {
		return fail("We couldn't confirm your subscription. Try your handle again.");
	}
};
