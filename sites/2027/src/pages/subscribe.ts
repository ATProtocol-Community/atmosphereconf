import type { APIRoute } from "astro";

import { doSubscription } from "../components/lib/subscribe";

export const GET: APIRoute = ({ session, locals }) =>
	doSubscription(session, locals);
