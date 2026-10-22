import { NEWS_URL, PUBLICATION } from "../publication-signup/settings";

export interface NewsPost {
	title: string;
	description?: string;
	url: string;
	publishedAt: Date;
	cover?: string;
}

interface DocumentValue {
	site?: unknown;
	title?: unknown;
	description?: unknown;
	path?: unknown;
	publishedAt?: unknown;
	coverImage?: { ref?: { $link?: unknown } };
}

interface ListRecordsPage {
	records?: { value?: DocumentValue }[];
	cursor?: string;
}

const PUBLISHER = PUBLICATION.split("/")[2] ?? "";
const POST_LIMIT = 5;
const PUBLISHED_AFTER = new Date("2026-09-10T00:00:00Z");
const PAGE_LIMIT = 3;
const FRESH_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const TIMEOUT_MS = 3000;

let cache: { posts: NewsPost[]; until: number } | undefined;
let pending: Promise<NewsPost[]> | undefined;

const getJson = async <T>(url: string): Promise<T> => {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`${response.status} from ${url}`);
	return response.json() as Promise<T>;
};

const pdsOf = async (did: string) => {
	const document = await getJson<{
		service?: { id?: string; serviceEndpoint?: string }[];
	}>(`https://plc.directory/${did}`);
	const pds = document.service?.find(
		(service) => service.id === "#atproto_pds",
	)?.serviceEndpoint;
	if (!pds) throw new Error(`No PDS listed for ${did}`);
	return pds;
};

const coverUrl = (cid: unknown) =>
	typeof cid === "string"
		? `https://cdn.bsky.app/img/feed_thumbnail/plain/${PUBLISHER}/${cid}@webp`
		: undefined;

const toPost = (value: DocumentValue | undefined): NewsPost | undefined => {
	if (
		!value ||
		value.site !== PUBLICATION ||
		typeof value.title !== "string" ||
		typeof value.path !== "string" ||
		typeof value.publishedAt !== "string"
	) {
		return;
	}
	const publishedAt = new Date(value.publishedAt);
	if (Number.isNaN(publishedAt.getTime())) return;
	const description =
		typeof value.description === "string" && value.description.trim()
			? value.description.trim()
			: undefined;
	return {
		title: value.title,
		description,
		url: new URL(value.path, NEWS_URL).toString(),
		publishedAt,
		cover: coverUrl(value.coverImage?.ref?.$link),
	};
};

const fetchNews = async () => {
	const pds = await pdsOf(PUBLISHER);
	const posts: NewsPost[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < PAGE_LIMIT; page++) {
		const query = new URLSearchParams({
			repo: PUBLISHER,
			collection: "site.standard.document",
			limit: "100",
		});
		if (cursor) query.set("cursor", cursor);
		const listing = await getJson<ListRecordsPage>(
			`${pds}/xrpc/com.atproto.repo.listRecords?${query}`,
		);
		for (const record of listing.records ?? []) {
			const post = toPost(record.value);
			if (post) posts.push(post);
		}
		cursor = listing.cursor;
		if (!cursor) break;
	}
	return posts
		.filter((post) => post.publishedAt >= PUBLISHED_AFTER)
		.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
		.slice(0, POST_LIMIT);
};

export const latestNews = async (): Promise<NewsPost[]> => {
	if (cache && Date.now() < cache.until) return cache.posts;
	pending ??= fetchNews()
		.then((posts) => {
			cache = { posts, until: Date.now() + FRESH_MS };
			return posts;
		})
		.catch((error) => {
			console.error("Fetching news from Leaflet failed", error);
			const posts = cache?.posts ?? [];
			cache = { posts, until: Date.now() + RETRY_MS };
			return posts;
		})
		.finally(() => {
			pending = undefined;
		});
	return pending;
};
