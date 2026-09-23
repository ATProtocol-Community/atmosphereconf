import type { APIContext } from "astro";
import type { Client } from "@atproto/lex";
import { com, community } from "../../lexicons/index.js";
import { clientFor } from "./records";
import { ensureSubscription, removeSubscriptions } from "./subscribe";
import { hasDatabase, isEmail, saveNewsSubscriber } from "./db";

const rsvp = community.lexicon.calendar.rsvp;
// Placeholder until the AtmosphereConf 2027 event record is published. Swap
// both values for the real event's strongRef.
const EVENT = {
	uri: "at://did:plc:lehcqqkwzcwvjvw66uthu5oq/community.lexicon.calendar.event/atmosphereconf2027",
	cid: "bafyreigwhmc4gfdaypya4ufsqigaf7gitcwgmx2sybitmc6uw5z44rtamm",
} as const;
// Every scope here must also be declared in astro.config.mjs, or authproto
// silently drops it from the login request.
export const RSVP_SCOPES = {
	rsvp: `repo:${rsvp.$nsid}?action=create`,
	subscribe: "repo:site.standard.graph.subscription?action=create",
	unsubscribe: "repo:site.standard.graph.subscription?action=delete",
	email: "account:email",
};
const REQUEST_KEY = "rsvpRequest";
const LOGIN_ERROR = "Sign-in could not be completed. Try your handle again.";

type RsvpRequest = {
	intent: "confirm" | "subscribe" | "unsubscribe";
	handle: string;
	standard: boolean;
	news: boolean;
	alternateEmail?: string;
};

export type RsvpResult =
	| {
			kind: "confirmed";
			handle: string;
			subscription: "subscribed" | "removed" | "none";
			newsEmail?: string;
			// "leaflet" means the visitor still has to confirm through Leaflet.
			newsVia?: "database" | "leaflet";
			notice?: string;
	  }
	| { kind: "error"; message: string };

declare global {
	namespace App {
		interface SessionData {
			rsvpRequest: RsvpRequest;
		}
	}
}

type RsvpContext = Pick<
	APIContext,
	"session" | "locals" | "redirect" | "rewrite" | "request" | "url"
>;

const isIntent = (value: unknown): value is RsvpRequest["intent"] =>
	value === "confirm" || value === "subscribe" || value === "unsubscribe";

export const readRsvpRequest = (
	formData: FormData,
	fallbackHandle: string,
): RsvpRequest | undefined => {
	const intent = formData.get("intent");
	const submittedHandle = formData.get("handle");
	const handle = (
		typeof submittedHandle === "string" ? submittedHandle : fallbackHandle
	)
		.trim()
		.replace(/^@/, "");
	if (!isIntent(intent) || !handle) return;
	const news = formData.get("subscribeNews") === "yes";
	const alternateEmail = formData.get("alternateEmail");
	return {
		intent,
		handle,
		standard: formData.get("standardOnly") === "yes",
		news,
		...(news && typeof alternateEmail === "string" && alternateEmail.trim()
			? { alternateEmail: alternateEmail.trim() }
			: {}),
	};
};

// Ask only for what this request needs, so someone RSVPing without news never
// sees an email permission prompt.
const scopesFor = (request: RsvpRequest) => {
	if (request.intent === "unsubscribe") return [RSVP_SCOPES.unsubscribe];
	if (request.intent === "subscribe") {
		return [RSVP_SCOPES.subscribe, RSVP_SCOPES.unsubscribe];
	}
	return [
		RSVP_SCOPES.rsvp,
		...(request.standard ? [RSVP_SCOPES.subscribe, RSVP_SCOPES.unsubscribe] : []),
		...(request.news && !request.alternateEmail ? [RSVP_SCOPES.email] : []),
	];
};

/**
 * Parks the request in the session and signs the user in with the scopes it
 * needs. OAuth comes back to /rsvp, where `takeRsvpResult` finishes the job.
 */
export const startRsvp = async (context: RsvpContext, request: RsvpRequest) => {
	const { session, locals } = context;
	if (!session) {
		return new Response("RSVPs are temporarily unavailable. Please try again.", {
			status: 503,
			headers: { "Cache-Control": "no-store" },
		});
	}
	session.set(REQUEST_KEY, request, { ttl: 600 });
	const scopes = scopesFor(request);
	const user = locals.loggedInUser;
	if (
		user &&
		user.handle.toLowerCase() === request.handle.toLowerCase() &&
		scopes.every((scope) => user.scopes.includes(scope))
	) {
		return context.redirect("/rsvp", 303);
	}
	// Hand the same request to authproto's login route with the scopes filled
	// in server-side, rather than trusting scope fields from the form.
	const body = new URLSearchParams({
		"atproto-id": request.handle,
		redirect: "/rsvp",
	});
	for (const scope of ["atproto", ...scopes]) body.append("scope", scope);
	const headers = new Headers(context.request.headers);
	headers.delete("content-type");
	headers.delete("content-length");
	return context.rewrite(
		new Request(new URL("/oauth/login", context.url), {
			method: "POST",
			headers,
			body,
		}),
	);
};

const ensureRsvp = async (client: Client) => {
	for await (const record of client.listAll(rsvp)) {
		if (record.valid && record.value.subject.uri === EVENT.uri) return;
	}
	await client.create(rsvp, { subject: EVENT, status: rsvp.Going });
};

const readAccountEmail = async (client: Client) => {
	try {
		const { email } = await client.call(com.atproto.server.getSession);
		return email;
	} catch {
		return undefined;
	}
};

const completeRsvp = async (
	request: RsvpRequest,
	locals: App.Locals,
	user: NonNullable<App.Locals["loggedInUser"]>,
): Promise<RsvpResult> => {
	const client = clientFor(locals);
	if (!client) return { kind: "error", message: LOGIN_ERROR };
	if (request.intent === "confirm") {
		try {
			await ensureRsvp(client);
		} catch {
			return {
				kind: "error",
				message: "We couldn't save your RSVP. Try your handle again.",
			};
		}
	}

	const notices: string[] = [];
	let subscription: "subscribed" | "removed" | "none" = "none";
	try {
		if (request.intent === "unsubscribe") {
			await removeSubscriptions(client);
			subscription = "removed";
		} else if (request.intent === "subscribe" || request.standard) {
			await ensureSubscription(client);
			subscription = "subscribed";
		}
	} catch {
		notices.push(
			request.intent === "unsubscribe"
				? "We couldn't remove your Standard.site subscription."
				: "We couldn't set up your Standard.site subscription.",
		);
	}

	let newsEmail: string | undefined;
	let newsVia: "database" | "leaflet" | undefined;
	if (request.intent === "confirm" && request.news) {
		const email = request.alternateEmail ?? (await readAccountEmail(client));
		if (!email) {
			notices.push(
				"We couldn't read your account email, so email news isn't set up.",
			);
		} else if (!isEmail(email)) {
			notices.push(
				"That email address doesn't look right, so email news isn't set up.",
			);
		} else {
			newsEmail = email;
			newsVia = "leaflet";
			if (hasDatabase) {
				try {
					await saveNewsSubscriber({ email, did: user.did, handle: user.handle });
					newsVia = "database";
				} catch (error) {
					// Leaflet's step still gets them on a list.
					console.error("Saving news subscriber failed", error);
				}
			}
		}
	}

	return {
		kind: "confirmed",
		handle: user.handle,
		subscription,
		...(newsEmail ? { newsEmail, newsVia } : {}),
		...(notices.length > 0 ? { notice: notices.join(" ") } : {}),
	};
};

/**
 * Finishes a request parked by `startRsvp` once the user is signed in. Returns
 * nothing when there's no pending request and no login error to report.
 */
export const takeRsvpResult = async ({
	session,
	locals,
}: RsvpContext): Promise<RsvpResult | undefined> => {
	const request = await session?.get(REQUEST_KEY);
	if (locals.authproto?.errorCode || locals.authproto?.errorDescription) {
		session?.delete(REQUEST_KEY);
		return {
			kind: "error",
			message: locals.authproto.errorDescription ?? LOGIN_ERROR,
		};
	}
	if (!request || !locals.loggedInUser) return;
	session?.delete(REQUEST_KEY);
	return completeRsvp(request, locals, locals.loggedInUser);
};
