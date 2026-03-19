import { AtpAgent, RichText as RichTextAPI } from "@atproto/api";
import type { AppBskyFeedDefs } from "@atproto/api";

// --- Constants ---

const BSKY_PUBLIC_API = "https://public.api.bsky.app";
const PAGE_SIZE = 20;

export const FEED_URI =
  "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/app.bsky.feed.generator/atmosphereconf";

export const FEED_URL =
  "https://bsky.app/profile/atmosphereconf.org/feed/atmosphereconf;

// --- Types ---

export interface RichTextSegment {
  text: string;
  link?: string;
  tag?: string;
}

export interface SerializedPost {
  uri: string;
  authorDid: string;
  authorHandle: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  text: string;
  segments: RichTextSegment[];
  createdAt: string;
  embed?: AppBskyFeedDefs.PostView["embed"];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  repostedBy?: string;
}

export interface FeedPage {
  posts: SerializedPost[];
  cursor?: string;
}

// --- Functions ---

export function getBlobCDNUrl(
  did: string,
  blob: { $type: "blob"; ref: { $link: string } },
  type: "webp" | "jpeg" = "webp",
): string {
  return `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${blob.ref.$link}@${type}`;
}

export function parseRichText(
  text: string,
  facets?: unknown[],
): RichTextSegment[] {
  const rt = new RichTextAPI({
    text,
    facets: facets as RichTextAPI["facets"],
  });
  const segments: RichTextSegment[] = [];
  for (const segment of rt.segments()) {
    if (segment.isLink()) {
      segments.push({ text: segment.text, link: segment.link?.uri });
    } else if (segment.isMention()) {
      segments.push({
        text: segment.text,
        link: `https://bsky.app/profile/${segment.mention?.did}`,
      });
    } else if (segment.isTag()) {
      segments.push({ text: segment.text, tag: segment.tag?.tag });
    } else {
      segments.push({ text: segment.text });
    }
  }
  return segments;
}

function serializePost(
  post: AppBskyFeedDefs.PostView,
  reason?: AppBskyFeedDefs.FeedViewPost["reason"],
): SerializedPost {
  const record = post.record as {
    text: string;
    facets?: unknown[];
    createdAt: string;
  };

  return {
    uri: post.uri,
    authorDid: post.author.did,
    authorHandle: post.author.handle,
    authorDisplayName: post.author.displayName,
    authorAvatar: post.author.avatar,
    text: record.text,
    segments: parseRichText(record.text, record.facets),
    createdAt: record.createdAt,
    embed: post.embed ? JSON.parse(JSON.stringify(post.embed)) : undefined,
    likeCount: post.likeCount ?? 0,
    repostCount: post.repostCount ?? 0,
    replyCount: post.replyCount ?? 0,
    repostedBy:
      reason?.$type === "app.bsky.feed.defs#reasonRepost"
        ? (reason as AppBskyFeedDefs.ReasonRepost).by.displayName ||
          (reason as AppBskyFeedDefs.ReasonRepost).by.handle
        : undefined,
  };
}

export async function fetchAuthorFeedPage(
  actor: string,
  cursor?: string,
): Promise<FeedPage> {
  const agent = new AtpAgent({ service: BSKY_PUBLIC_API });
  const res = await agent.app.bsky.feed.getAuthorFeed({
    actor,
    limit: PAGE_SIZE,
    cursor,
  });

  return {
    posts: res.data.feed.map((item) => serializePost(item.post, item.reason)),
    cursor: res.data.cursor,
  };
}

export async function fetchFeedPage(cursor?: string): Promise<FeedPage> {
  const agent = new AtpAgent({ service: BSKY_PUBLIC_API });
  const res = await agent.app.bsky.feed.getFeed({
    feed: FEED_URI,
    limit: PAGE_SIZE,
    cursor,
  });

  return {
    posts: res.data.feed.map((item) => serializePost(item.post, item.reason)),
    cursor: res.data.cursor,
  };
}
