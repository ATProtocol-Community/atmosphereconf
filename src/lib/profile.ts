import { AtpBaseClient, RichText as RichTextAPI, AtpAgent } from "@atproto/api";
import { lexToJson } from "@atproto/lexicon";
import { getPdsAgent } from "@fujocoded/authproto/helpers";
import { getBlobCDNUrl, parseRichText } from "./bsky";
import type { RichTextSegment } from "./bsky";
import { BADGE_COLLECTION } from "@fujocoded/atproto-badge";
import { badges } from "@/config/badges";
import type { BadgeDefinition } from "@/config/badges";

type AvatarBlob = {
  $type: "blob";
  ref: { $link: string };
  mimeType: string;
  size: number;
};

export type BadgeAwardInfo = {
  uri: string;
  badgeDefinitionUri: string | undefined;
  issuedAt: string | undefined;
  pdsUrl: string | undefined;
  badgeName: string | undefined;
  badgeDescription: string | undefined;
};

export type LoadedProfile = {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl: string | undefined;
  description: string | undefined;
  bio: string | undefined;
  pronouns: string | null | undefined;
  website: string | null | undefined;
  homeTown: { name?: string | null; value?: string } | null | undefined;
  interests: readonly string[] | null | undefined;
  germMessageMeUrl: string | null | undefined;
  bskyDisplayName?: string;
  bskyAvatarUrl?: string;
  bskyBannerUrl?: string;
  bskyDescription?: string;
  bskyDescriptionSegments?: RichTextSegment[];
  collections: string[];
  confAvatarBlob: AvatarBlob | null;
  badgeAward: BadgeAwardInfo | null;
};

const publicAgent = new AtpAgent({ service: "https://public.api.bsky.app" });

async function detectDescriptionFacets(
  description?: string,
): Promise<RichTextSegment[] | undefined> {
  if (!description) return undefined;
  try {
    const rt = new RichTextAPI({ text: description });
    await rt.detectFacets(publicAgent);
    return parseRichText(description, rt.facets as unknown[] | undefined);
  } catch {
    return parseRichText(description);
  }
}

export async function loadProfile(
  identifier: string,
): Promise<LoadedProfile | null> {
  let agent: AtpBaseClient;
  let did: string, handle: string;
  let pdsUrl: string | undefined;

  // Try Microcosm first for fast identity resolution, fall back to getPdsAgent
  try {
    const res = await fetch(
      `https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`,
    );
    if (!res.ok) throw new Error("Microcosm unavailable");
    const data = await res.json();
    if (!data.did || !data.pds || !data.handle)
      throw new Error("Incomplete identity data");
    did = data.did;
    handle = data.handle;
    pdsUrl = data.pds;
    agent = new AtpBaseClient(data.pds);
  } catch {
    const fallback = await getPdsAgent({ didOrHandle: identifier });
    if (!fallback) return null;
    try {
      const { data } = await fallback.com.atproto.repo.describeRepo({
        repo: identifier,
      });
      did = data.did;
      handle = data.handle;
      pdsUrl = fallback.serviceUrl?.toString();
    } catch {
      return null;
    }
    agent = fallback;
  }
  const [describeResult, bskyResult, confResult, germResult, badgeResult] =
    await Promise.allSettled([
      agent.com.atproto.repo.describeRepo({ repo: did }),
      agent.com.atproto.repo.getRecord({
        repo: did,
        collection: "app.bsky.actor.profile",
        rkey: "self",
      }),
      agent.com.atproto.repo.getRecord({
        repo: did,
        collection: "org.atmosphereconf.profile",
        rkey: "self",
      }),
      agent.com.atproto.repo.getRecord({
        repo: did,
        collection: "com.germnetwork.declaration",
        rkey: "self",
      }),
      agent.com.atproto.repo.listRecords({
        repo: did,
        collection: BADGE_COLLECTION,
        limit: 100,
      }),
    ]);
  const collections =
    describeResult.status === "fulfilled"
      ? describeResult.value.data.collections
      : [];

  const bsky =
    bskyResult.status === "fulfilled"
      ? (lexToJson(bskyResult.value.data.value) as any)
      : null;
  const conf =
    confResult.status === "fulfilled"
      ? (lexToJson(confResult.value.data.value) as any)
      : null;
  const germ =
    germResult.status === "fulfilled"
      ? (lexToJson(germResult.value.data.value) as any)
      : null;

  const bskyAvatarUrl = bsky?.avatar
    ? getBlobCDNUrl(did, bsky.avatar)
    : undefined;

  const avatarUrl = conf?.avatar
    ? getBlobCDNUrl(did, conf.avatar)
    : bskyAvatarUrl;

  // Extract badge award if one matches any configured badge definition
  let badgeAward: BadgeAwardInfo | null = null;
  const badgeUris = new Set(badges.map((b) => b.uri));
  if (badgeResult.status === "fulfilled" && badgeUris.size > 0) {
    for (const rec of badgeResult.value.data.records) {
      const value = rec.value as Record<string, unknown>;
      const badge = value.badge as { uri?: string } | undefined;
      if (badge?.uri && badgeUris.has(badge.uri)) {
        const matchedUri = badge.uri;
        // Build direct PDS link: parse at:// URI into xrpc getRecord URL
        let directPdsUrl: string | undefined;
        if (pdsUrl) {
          const atMatch = rec.uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
          if (atMatch) {
            const base = pdsUrl.replace(/\/$/, "");
            directPdsUrl = `${base}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(atMatch[1])}&collection=${encodeURIComponent(atMatch[2])}&rkey=${encodeURIComponent(atMatch[3])}`;
          }
        }
        // Fetch badge definition for name + description
        let badgeName: string | undefined;
        let badgeDescription: string | undefined;
        const defMatch = matchedUri.match(
          /^at:\/\/([^/]+)\/([^/]+)\/(.+)$/,
        );
        if (defMatch) {
          try {
            const defAgent = await getPdsAgent({
              didOrHandle: defMatch[1],
            });
            if (defAgent) {
              const { data: defData } =
                await defAgent.com.atproto.repo.getRecord({
                  repo: defMatch[1],
                  collection: defMatch[2],
                  rkey: defMatch[3],
                });
              const defVal = defData.value as Record<string, unknown>;
              badgeName =
                typeof defVal.name === "string" ? defVal.name : undefined;
              badgeDescription =
                typeof defVal.description === "string"
                  ? defVal.description
                  : undefined;
            }
          } catch {
            // non-critical — fall back to generic text
          }
        }

        badgeAward = {
          uri: rec.uri,
          badgeDefinitionUri: matchedUri,
          issuedAt: typeof value.issued === "string" ? value.issued : undefined,
          pdsUrl: directPdsUrl,
          badgeName,
          badgeDescription,
        };
        break;
      }
    }
  }

  return {
    did,
    handle,
    displayName: conf?.displayName ?? bsky?.displayName ?? handle,
    avatarUrl,
    description: conf?.description ?? bsky?.description ?? undefined,
    bio: conf?.bio ?? undefined,
    pronouns: conf?.pronouns ?? bsky?.pronouns ?? null,
    website: conf?.website ?? bsky?.website ?? null,
    homeTown: conf?.homeTown ?? null,
    interests: conf?.interests ?? null,
    germMessageMeUrl: germ?.messageMe?.messageMeUrl ?? null,
    bskyDisplayName: bsky?.displayName ?? undefined,
    bskyAvatarUrl,
    bskyBannerUrl: bsky?.banner ? getBlobCDNUrl(did, bsky.banner) : undefined,
    bskyDescription: bsky?.description ?? undefined,
    bskyDescriptionSegments: await detectDescriptionFacets(bsky?.description),
    collections,
    confAvatarBlob: conf?.avatar ?? null,
    badgeAward,
  };
}
