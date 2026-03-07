import { getBlobCDNUrl } from "./bsky";

export type LoadedProfile = {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl: string | undefined;
  description: string | undefined;
  pronouns: string | null | undefined;
  website: string | null | undefined;
  homeTown: { name?: string | null; value?: string } | null | undefined;
  interests: readonly string[] | null | undefined;
  germMessageMeUrl: string | null | undefined;
  collections: string[];
};

function getRecord(pds: string, did: string, collection: string, rkey = "self") {
  return fetch(
    `${pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${collection}&rkey=${rkey}`,
  ).then((r) => (r.ok ? r.json().then((d: { value: unknown }) => d.value) : null));
}

export async function loadProfile(
  identifier: string,
): Promise<LoadedProfile | null> {
  // Resolve identifier (handle or DID) → did, pds, handle
  let identity: { did: string; pds: string; handle: string } | null = null;
  try {
    const response = await fetch(
      `https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`,
    );
    if (response.ok) {
      const data = await response.json();
      if (data.did && data.pds && data.handle)
        identity = { did: data.did, pds: data.pds, handle: data.handle };
    }
  } catch (e) {
    // identity stays null
  }

  if (!identity) return null;

  const { did, pds, handle } = identity;

  const [bskyProfile, collections, confProfile, germDeclaration] =
    await Promise.allSettled([
      getRecord(pds, did, "app.bsky.actor.profile"),
      fetch(`${pds}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`)
        .then((r) => (r.ok ? r.json().then((d: { collections: string[] }) => d.collections) : [])),
      getRecord(pds, did, "org.atmosphereconf.profile"),
      getRecord(pds, did, "com.germnetwork.declaration"),
    ]);

  const bsky = bskyProfile.status === "fulfilled" ? bskyProfile.value as any : null;
  const conf = confProfile.status === "fulfilled" ? confProfile.value as any : null;
  const germ = germDeclaration.status === "fulfilled" ? germDeclaration.value as any : null;

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
    pronouns: bsky?.pronouns ?? null,
    website: bsky?.website ?? null,
    homeTown: conf?.homeTown ?? null,
    interests: conf?.interests ?? null,
    germMessageMeUrl: germ?.messageMe?.messageMeUrl ?? null,
    collections:
      collections.status === "fulfilled" ? (collections.value as string[] ?? []) : [],
  };
}
