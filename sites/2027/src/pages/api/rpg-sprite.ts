import type { APIRoute } from "astro";

const HANDLE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const DID = /^did:plc:[a-z0-9]+$/;
const TIMEOUT_MS = 3_000;
const emptyResponse = () => Response.json({ did: null, pds: null });

const fetchJson = async (url: string) => {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) return;
	return response.json();
};

export const GET: APIRoute = async ({ url }) => {
	const handle = (url.searchParams.get("handle") ?? "")
		.trim()
		.replace(/^@/, "");
	if (!HANDLE.test(handle)) return emptyResponse();

	try {
		const identity = await fetchJson(
			`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
		);
		if (!DID.test(identity?.did ?? "")) return emptyResponse();

		const document = await fetchJson(`https://plc.directory/${identity.did}`);
		const pds = document?.service?.find(
			(service: { id?: string; type?: string; serviceEndpoint?: string }) =>
				service.id === "#atproto_pds" &&
				service.type === "AtprotoPersonalDataServer" &&
				typeof service.serviceEndpoint === "string",
		)?.serviceEndpoint;
		if (typeof pds !== "string" || new URL(pds).protocol !== "https:") {
			return emptyResponse();
		}

		return Response.json({ did: identity.did, pds });
	} catch {
		return emptyResponse();
	}
};