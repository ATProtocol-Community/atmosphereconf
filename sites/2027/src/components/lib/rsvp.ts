import type { APIContext } from "astro";
import type { Client } from "@atproto/lex";
import { com, community } from "../../lexicons/index.js";
import { clientFor } from "./records";
import {
	ensureSubscription,
	type NewsOutcome,
	returnTo,
	signUpForNews,
	unavailable,
} from "./subscribe";

const rsvp = community.lexicon.calendar.rsvp;
const EVENT = {
	uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.calendar.event/3mw74r4r3gsej",
	cid: "bafyreihykrqz27n6uundgzqpt7rd3m5fbq2hprk53pbwbol5wuvommicbu",
} as const;
// Every scope here must also be declared in astro.config.mjs, or authproto
// silently drops it from the login request.
const RSVP_SCOPES = {
	rsvp: `repo:${rsvp.$nsid}?action=create`,
	subscribe: "repo:site.standard.graph.subscription?action=create",
	email: "account:email",
};
const REQUEST_KEY = "rsvpRequest";
const CARD_KEY = "rsvpCard";

type RsvpRequest = {
	handle: string;
	standard: boolean;
	news: boolean;
	alternateEmail?: string;
};

// Every failure sends the visitor back to the form to try again.
export type RsvpFailure =
	| { kind: "missing-handle" }
	| { kind: "sign-in"; detail?: string }
	| { kind: "save" };

/**
 * What the RSVP postcard shows. Once the RSVP is saved, the extras the
 * visitor asked for report their own outcomes; a failed extra doesn't undo
 * the RSVP.
 */
export type RsvpReceipt = {
	kind: "rsvped";
	handle: string;
	standard?: "subscribed" | "failed";
	news?: NewsOutcome;
};

export type RsvpCard =
	| { kind: "form"; handle: string; failure?: RsvpFailure }
	| RsvpReceipt;

declare global {
	namespace App {
		interface SessionData {
			rsvpRequest: RsvpRequest;
			rsvpCard: RsvpCard;
		}
	}
}

type RsvpContext = Pick<
	APIContext,
	"session" | "locals" | "redirect" | "rewrite" | "request" | "url"
>;

const readRsvpRequest = (
	formData: FormData,
	fallbackHandle: string,
): RsvpRequest | undefined => {
	const submittedHandle = formData.get("handle");
	const handle = (
		typeof submittedHandle === "string" ? submittedHandle : fallbackHandle
	)
		.trim()
		.replace(/^@/, "");
	if (!handle) return;
	const news = formData.get("subscribeNews") === "yes";
	const alternateEmail = formData.get("alternateEmail");
	return {
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
const scopesFor = (request: RsvpRequest) => [
	RSVP_SCOPES.rsvp,
	...(request.standard ? [RSVP_SCOPES.subscribe] : []),
	...(request.news && !request.alternateEmail ? [RSVP_SCOPES.email] : []),
];

/**
 * Parks the request in the session and signs the user in with the scopes it
 * needs. OAuth comes back to /rsvp, where `rsvpPage` finishes the job.
 */
const startRsvp = async (context: RsvpContext, request: RsvpRequest) => {
	const { session, locals } = context;
	if (!session) return unavailable("RSVPs");
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

const setUpNews = async (
	request: RsvpRequest,
	client: Client,
	user: NonNullable<App.Locals["loggedInUser"]>,
): Promise<NewsOutcome> => {
	const email = request.alternateEmail ?? (await readAccountEmail(client));
	if (!email) return { kind: "failed", reason: "no-email" };
	return signUpForNews({ email, did: user.did, handle: user.handle });
};

const completeRsvp = async (
	request: RsvpRequest,
	locals: App.Locals,
	user: NonNullable<App.Locals["loggedInUser"]>,
): Promise<RsvpCard> => {
	const client = clientFor(locals);
	if (!client) {
		return { kind: "form", handle: request.handle, failure: { kind: "sign-in" } };
	}
	try {
		await ensureRsvp(client);
	} catch {
		return { kind: "form", handle: request.handle, failure: { kind: "save" } };
	}

	const card: RsvpReceipt = { kind: "rsvped", handle: user.handle };
	if (request.standard) {
		try {
			await ensureSubscription(client);
			card.standard = "subscribed";
		} catch {
			card.standard = "failed";
		}
	}
	if (request.news) card.news = await setUpNews(request, client, user);
	return card;
};

/**
 * Runs the RSVP page: a submitted form starts sign-in, and the return trip
 * from sign-in finishes the RSVP. Both redirect back here (returning the
 * Response to send) so the outcome shows once and a refresh starts fresh.
 * Anything else is the postcard to render.
 */
export const rsvpPage = async (
	context: RsvpContext,
): Promise<Response | RsvpCard> => {
	const { session, locals } = context;
	const signedInHandle = locals.loggedInUser?.handle ?? "";
	const show = (card: RsvpCard) => {
		if (!session) return unavailable("RSVPs");
		session.set(CARD_KEY, card, { ttl: 600 });
		return returnTo("/rsvp");
	};
	if (context.request.method === "POST") {
		const request = readRsvpRequest(
			await context.request.formData(),
			signedInHandle,
		);
		if (request) return startRsvp(context, request);
		return show({
			kind: "form",
			handle: signedInHandle,
			failure: { kind: "missing-handle" },
		});
	}

	const request = await session?.get(REQUEST_KEY);
	if (locals.authproto?.errorCode || locals.authproto?.errorDescription) {
		session?.delete(REQUEST_KEY);
		return {
			kind: "form",
			handle: request?.handle ?? signedInHandle,
			failure: { kind: "sign-in", detail: locals.authproto.errorDescription },
		};
	}
	if (request && locals.loggedInUser) {
		session?.delete(REQUEST_KEY);
		return show(await completeRsvp(request, locals, locals.loggedInUser));
	}
	const card = await session?.get(CARD_KEY);
	if (!card) return { kind: "form", handle: signedInHandle };
	session?.delete(CARD_KEY);
	return card;
};
