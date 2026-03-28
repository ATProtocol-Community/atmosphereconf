import { getLiveCollection } from "astro:content";
import { getPdsAgent } from "@fujocoded/authproto/helpers";
import { IdResolver } from "@atproto/identity";
import {
  getExistingBadgeAward as getExistingBadgeAwardFromPds,
} from "@fujocoded/atproto-badge";
import { EVENTS_OWNER_DID_OR_HANDLE } from "astro:env/server";
import { getPrimaryBadge, badges } from "@/config/badges";
import type { BadgeDefinition } from "@/config/badges";

const REMOTE_RELEASE_TITLE = "Remote Attendee";

const resolver = new IdResolver();

export function getBadgeDefinitionRef() {
  const badge = getPrimaryBadge();
  if (!badge || !badge.uri || !badge.cid) return null;
  return { uri: badge.uri, cid: badge.cid };
}

/**
 * Return the correct badge definition based on the attendee's ticket release title.
 */
export function getBadgeForRelease(releaseTitle: string): BadgeDefinition | null {
  if (releaseTitle === REMOTE_RELEASE_TITLE) {
    return badges.find((b) => b.remote) ?? null;
  }
  return badges.find((b) => !b.remote) ?? null;
}

/**
 * Resolve the organizer's DID from a DID or handle.
 */
export async function getOrganizerDid(): Promise<string> {
  const identifier = EVENTS_OWNER_DID_OR_HANDLE;
  if (identifier.startsWith("did:")) {
    return identifier;
  }
  const resolved = await resolver.handle.resolve(identifier);
  if (!resolved) throw new Error(`Could not resolve handle: ${identifier}`);
  return resolved;
}

/**
 * Check if a handle is a ticket holder. Returns the release title if found, null otherwise.
 */
export async function getTicketRelease(handle: string): Promise<string | null> {
  const { entries, error } = await getLiveCollection("titoHandles");
  if (error) throw error;
  const normalized = handle.trim().replace(/^@/, "").toLowerCase();
  const entry = entries?.find(
    (e) => e.data.handle.trim().replace(/^@/, "").toLowerCase() === normalized,
  );
  return entry?.data.releaseTitle ?? null;
}

/**
 * Check if a DID already has a badge award for any configured badge definition.
 */
export async function getExistingBadgeAward(
  did: string,
): Promise<{ uri: string } | null> {
  if (badges.length === 0) return null;

  const agent = await getPdsAgent({ didOrHandle: did });
  if (!agent) return null;

  try {
    for (const badge of badges) {
      const result = await getExistingBadgeAwardFromPds({
        agent,
        did,
        badgeDefinitionUri: badge.uri,
      });
      if (result) return { uri: result.uri };
    }
    return null;
  } catch {
    throw new Error("Failed to check existing badge awards");
  }
}
