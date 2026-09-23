import type { APIRoute } from "astro";

import { doEmailSubscription, doSubscription } from "../components/lib/subscribe";
import { hasDatabase } from "../components/lib/db";

export const GET: APIRoute = ({ session, locals }) =>
	doSubscription(session, locals);

// Email signups from the main page, when there's a database to put them in.
export const POST: APIRoute = async ({ request, session }) =>
	hasDatabase
		? doEmailSubscription(session, await request.formData())
		: new Response(null, { status: 404 });
