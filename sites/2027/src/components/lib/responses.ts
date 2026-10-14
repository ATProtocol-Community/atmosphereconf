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
