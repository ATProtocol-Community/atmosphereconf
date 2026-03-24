import { getLiveCollection } from "astro:content";
import { getPdsAgent } from "@fujocoded/authproto/helpers";
import { IdResolver } from "@atproto/identity";
import {
  getExistingBadgeAward as getExistingBadgeAwardFromPds,
} from "@fujocoded/atproto-badge";
import {
  EVENTS_OWNER_DID_OR_HANDLE,
  BADGE_DEFINITION_URI,
  BADGE_DEFINITION_CID,
} from "astro:env/server";

const resolver = new IdResolver();

export function getBadgeDefinitionRef() {
  if (!BADGE_DEFINITION_URI || !BADGE_DEFINITION_CID) return null;
  return { uri: BADGE_DEFINITION_URI, cid: BADGE_DEFINITION_CID };
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
 * Check if a handle is a ticket holder by querying the Tito live collection.
 */
export async function isTicketHolder(handle: string): Promise<boolean> {
  const { entries, error } = await getLiveCollection("titoHandles");
  if (error) throw error;
  const normalized = handle.trim().replace(/^@/, "").toLowerCase();
  return entries.some(
    (e) => e.data.handle.trim().replace(/^@/, "").toLowerCase() === normalized,
  );
}

/**
 * Check if a DID already has a badge award for our badge definition.
 */
export async function getExistingBadgeAward(
  did: string,
): Promise<{ uri: string } | null> {
  const badgeRef = getBadgeDefinitionRef();
  if (!badgeRef) return null;

  const agent = await getPdsAgent({ didOrHandle: did });
  if (!agent) return null;

  try {
    const result = await getExistingBadgeAwardFromPds({
      agent,
      did,
      badgeDefinitionUri: badgeRef.uri,
    });
    return result ? { uri: result.uri } : null;
  } catch {
    throw new Error("Failed to check existing badge awards");
  }
}
