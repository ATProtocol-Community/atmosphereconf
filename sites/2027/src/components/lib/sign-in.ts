/**
 * What the signup and RSVP forms share: both post to their own page, park
 * the request in the session, send the visitor through authproto's sign-in,
 * and finish the job when the page gets them back. The outcome is parked
 * too, so it shows once and a refresh starts fresh.
 */
import type { APIContext } from "astro";
import { returnTo } from "./responses";

export type SignInFailure = { kind: "sign-in"; detail?: string };

export const signInFailed = (detail?: string) =>
	detail ?? "Sign-in could not be completed. Try your handle again.";

/** The failure authproto left on the way back from sign-in, if any. */
export const signInError = (locals: App.Locals): SignInFailure | undefined => {
	const { authproto } = locals;
	if (!authproto?.errorCode && !authproto?.errorDescription) return;
	return { kind: "sign-in", detail: authproto.errorDescription };
};

type Session = NonNullable<APIContext["session"]>;
type SessionKey = keyof App.SessionData;
// A key with its own value type, as a pair the session's `set` accepts.
type Parked = {
	[K in SessionKey]: [key: K, value: App.SessionData[K]];
}[SessionKey];

/** Parks something for the page to pick up once; the ten minutes outlast sign-in. */
export const park = (session: Session, ...[key, value]: Parked) =>
	session.set(key, value, { ttl: 600 });

/** Reads what was parked under `key` and clears it. */
export const unpark = async <K extends SessionKey>(
	session: APIContext["session"],
	key: K,
) => {
	const value = await session?.get(key);
	if (value !== undefined) session?.delete(key);
	return value;
};

/** Parks a card for the page at `location` to show once, and sends the visitor there. */
export const showOnce = (
	session: Session,
	location: string,
	...card: Parked
) => {
	park(session, ...card);
	return returnTo(location);
};

export type SignInContext = Pick<
	APIContext,
	"locals" | "redirect" | "rewrite" | "request" | "url"
>;

/**
 * Signs the visitor in as `handle` with the scopes the job needs, coming
 * back to `backTo` where the page finishes it. Skipped when they're already
 * signed in that way. Every scope must also be declared in astro.config.mjs,
 * or authproto silently drops it from the login request.
 */
export const startSignIn = (
	context: SignInContext,
	{
		handle,
		scopes,
		backTo,
	}: { handle: string; scopes: string[]; backTo: string },
) => {
	const user = context.locals.loggedInUser;
	if (
		user &&
		user.handle.toLowerCase() === handle.toLowerCase() &&
		scopes.every((scope) => user.scopes.includes(scope))
	) {
		return context.redirect(backTo, 303);
	}
	// Hand the request to authproto's login route with the scopes filled in
	// server-side, rather than trusting scope fields from the form.
	const body = new URLSearchParams({ "atproto-id": handle, redirect: backTo });
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
