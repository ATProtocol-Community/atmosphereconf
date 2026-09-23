import { Client } from "@atproto/lex";

// authproto's OAuth session is already a lex Agent, so record calls go
// straight to the user's PDS as them.
export const clientFor = (locals: App.Locals) =>
	locals.loggedInClient ? new Client(locals.loggedInClient) : undefined;

export const rkeyOf = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);
