import { createClient, type Client } from "@libsql/client";
import { LIBSQL_AUTH_TOKEN, LIBSQL_URL } from "astro:env/server";

export const hasDatabase = !!LIBSQL_URL;

let db: Client | undefined;

const getDb = () =>
(db ??= createClient({
	url: LIBSQL_URL!,
	authToken: LIBSQL_AUTH_TOKEN,
}));

// Signups from the main page have no account, so a later email-only signup
// must not wipe the DID and handle an RSVP already recorded.
export const saveNewsSubscriber = async ({
	email,
	did = null,
	handle = null,
}: {
	email: string;
	did?: string | null;
	handle?: string | null;
}) => {
	await getDb().execute({
		sql: `INSERT INTO news_subscribers (email, did, handle)
			VALUES (:email, :did, :handle)
			ON CONFLICT (email) DO UPDATE SET
				did = COALESCE(excluded.did, did),
				handle = COALESCE(excluded.handle, handle)`,
		args: { email, did, handle },
	});
};
