import { getPdsAgent } from "@fujocoded/authproto/helpers";

const CONNECTION_COLLECTION = "at.youandme.connection";
const MICROCOSM_BACKLINKS_URL =
  "https://constellation.microcosm.blue/xrpc/blue.microcosm.links.getBacklinks";

// Conference date range for filtering outgoing connections
const CONF_START = new Date("2026-03-25T00:00:00Z");
const CONF_END = new Date("2026-04-02T00:00:00Z"); // April 1 inclusive

type BacklinkRecord = {
  did: string;
  collection: string;
  rkey: string;
};

type BacklinksResponse = {
  total: number;
  records: BacklinkRecord[];
  cursor: string | null;
};

type PdsConnectionRecord = {
  uri: string;
  cid: string;
  value: {
    $type: string;
    subject: string;
    createdAt: string;
  };
};

type PdsListResponse = {
  records: PdsConnectionRecord[];
  cursor?: string;
};

export type ConnectionBadgeTier = {
  threshold: number;
  label: string;
};

export const CONNECTION_BADGE_TIERS: ConnectionBadgeTier[] = [
  { threshold: 100, label: "Superconnector" },
  { threshold: 75, label: "Hub" },
  { threshold: 50, label: "Networker" },
  { threshold: 10, label: "Connected" },
];

/**
 * Get the highest badge tier earned for a given connection count.
 */
export function getConnectionBadgeTier(
  count: number,
): ConnectionBadgeTier | null {
  for (const tier of CONNECTION_BADGE_TIERS) {
    if (count >= tier.threshold) return tier;
  }
  return null;
}

function isWithinConfDates(createdAt: string): boolean {
  const date = new Date(createdAt);
  return date >= CONF_START && date < CONF_END;
}

/**
 * Fetch outgoing connections from a user's PDS (people they added).
 * Only counts records with createdAt within the conference date range.
 * Paginates through all records.
 */
async function fetchOutgoingConnections(did: string): Promise<string[]> {
  const agent = await getPdsAgent({ didOrHandle: did });
  if (!agent) return [];

  const subjects: string[] = [];
  let cursor: string | undefined;

  do {
    const { data } = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: CONNECTION_COLLECTION,
      limit: 100,
      cursor,
    });
    const response = data as PdsListResponse;
    for (const rec of response.records) {
      if (rec.value?.subject && isWithinConfDates(rec.value.createdAt)) {
        subjects.push(rec.value.subject);
      }
    }
    cursor = response.cursor;
  } while (cursor);

  return subjects;
}

/**
 * Fetch incoming connections from Microcosm backlinks (people who added them).
 * No date filtering — backlinks API doesn't include createdAt, and
 * the connection feature is conference-scoped so these are assumed valid.
 * Paginates through all records.
 */
async function fetchIncomingConnections(did: string): Promise<string[]> {
  const dids: string[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({
      subject: did,
      source: `${CONNECTION_COLLECTION}:subject`,
      did: "",
      limit: "100",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${MICROCOSM_BACKLINKS_URL}?${params}`);
    if (!res.ok) break;

    const data: BacklinksResponse = await res.json();
    for (const rec of data.records) {
      dids.push(rec.did);
    }
    cursor = data.cursor;
  } while (cursor);

  return dids;
}

/**
 * Fetch all connections for a user (both outgoing and incoming),
 * deduplicate by DID, and return the unique count.
 * Outgoing connections are date-filtered to the conference period.
 * Incoming connections (backlinks) are counted as-is.
 */
export async function getConnectionCount(did: string): Promise<number> {
  const [outgoing, incoming] = await Promise.all([
    fetchOutgoingConnections(did),
    fetchIncomingConnections(did),
  ]);

  const uniqueDids = new Set([...outgoing, ...incoming]);
  // Remove self if present
  uniqueDids.delete(did);
  return uniqueDids.size;
}
