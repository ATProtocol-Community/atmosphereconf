import { xrpcSafe } from "@atproto/lex";
import searchActorsTypeahead from "../../lexicons/app/bsky/actor/searchActorsTypeahead.js";

export type ActorSuggestion = {
	value: string;
	label?: string;
	sublabel?: string;
	avatar?: string;
};

export const searchActors = async (q: string): Promise<ActorSuggestion[]> => {
	const result = await xrpcSafe(
		"https://public.api.bsky.app",
		searchActorsTypeahead,
		{ params: { q, limit: 8 } },
	);
	if (!result.success) return [];
	return result.body.actors.map((a) => ({
		value: a.handle,
		label: a.displayName || a.handle,
		sublabel: `@${a.handle}`,
		avatar: a.avatar,
	}));
};
