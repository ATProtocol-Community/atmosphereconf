// Creates the tables the site writes to. Safe to re-run.
//
//   npm run db:init   (reads .env; variables already set in the shell win)
import { createClient } from "@libsql/client";

const url = process.env.LIBSQL_URL;
if (!url) {
	console.error("Set LIBSQL_URL (and LIBSQL_AUTH_TOKEN if the server needs one).");
	process.exit(1);
}

const db = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });

await db.execute(`
	CREATE TABLE IF NOT EXISTS news_subscribers (
		email TEXT PRIMARY KEY COLLATE NOCASE,
		-- Empty for signups from the main page, which don't log in.
		did TEXT,
		handle TEXT,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

console.log(`news_subscribers is ready on ${new URL(url).host || url}.`);
db.close();
