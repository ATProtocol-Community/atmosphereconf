import { AtpBaseClient } from "@atproto/api";
import { lexToJson } from "@atproto/lexicon";
import { getPdsAgent } from "@fujocoded/authproto/helpers";
import { getBlobCDNUrl } from "./bsky";

type AvatarBlob = { $type: "blob"; ref: { $link: string }; mimeType: string; size: number };

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
  collections: string[];
  confAvatarBlob: AvatarBlob | null;
};

export async function loadProfile(identifier: string): Promise<LoadedProfile | null> {
  let agent: AtpBaseClient;
  let did: string, handle: string;

  // Try Microcosm first for fast identity resolution, fall back to getPdsAgent
  try {
    const res = await fetch(
      `https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`,
    );
    if (!res.ok) throw new Error("Microcosm unavailable");
    const data = await res.json();
    if (!data.did || !data.pds || !data.handle) throw new Error("Incomplete identity data");
    did = data.did;
    handle = data.handle;
    agent = new AtpBaseClient(data.pds);
  } catch {
    const fallback = await getPdsAgent({ didOrHandle: identifier });
    if (!fallback) return null;
    try {
      const { data } = await fallback.com.atproto.repo.describeRepo({ repo: identifier });
      did = data.did;
      handle = data.handle;
    } catch {
      return null;
    }
    agent = fallback;
  }
  const [describeResult, bskyResult, confResult, germResult] = await Promise.allSettled([
    agent.com.atproto.repo.describeRepo({ repo: did }),
    agent.com.atproto.repo.getRecord({ repo: did, collection: "app.bsky.actor.profile", rkey: "self" }),
    agent.com.atproto.repo.getRecord({ repo: did, collection: "org.atmosphereconf.profile", rkey: "self" }),
    agent.com.atproto.repo.getRecord({ repo: did, collection: "com.germnetwork.declaration", rkey: "self" }),
  ]);
  const collections = describeResult.status === "fulfilled" ? describeResult.value.data.collections : [];

  const bsky = bskyResult.status === "fulfilled" ? lexToJson(bskyResult.value.data.value) as any : null;
  const conf = confResult.status === "fulfilled" ? lexToJson(confResult.value.data.value) as any : null;
  const germ = germResult.status === "fulfilled" ? lexToJson(germResult.value.data.value) as any : null;

  const avatarUrl = conf?.avatar
    ? getBlobCDNUrl(did, conf.avatar)
    : bsky?.avatar
      ? getBlobCDNUrl(did, bsky.avatar)
      : undefined;

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
    collections,
    confAvatarBlob: conf?.avatar ?? null,
  };
}
