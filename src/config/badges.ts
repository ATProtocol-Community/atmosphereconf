export type BadgeDefinition = {
  uri: string;
  cid: string;
  shortName: string;
  remote: boolean;
};

export type ConnectionBadgeDefinition = {
  uri: string;
  cid: string;
  shortName: string;
  threshold: number;
};

export const badges: BadgeDefinition[] = [
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mhrjpchjiq2l",
    cid: "bafyreiakanlyj3ctebwvfq4ysrzuzq4wltbynzdwt72vzrcejb4gux4tiy",
    shortName: "Attendee",
    remote: false,
  },
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mi5bvnvroe2x",
    cid: "bafyreib6jwshqlxib6vtj34i4nk5p4oq44dhvtdy6p774cvwyfhrli4jxm",
    shortName: "Remote",
    remote: true,
  },
];

// Connection badges — sorted highest threshold first.
export const connectionBadges: ConnectionBadgeDefinition[] = [
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mibdghsicw2y",
    cid: "bafyreifnj2crev7e2opl7357obyzj6a3tehgay37g5p4isbqeiopqkuxxq",
    shortName: "Grand Goose Ambassador",
    threshold: 100,
  },
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mibdepi65a2h",
    cid: "bafyreicojyz4watt3e7rpzl6qffilhzflzpfcvpdsj4ig2jmqunchdoutm",
    shortName: "Head Honk-o",
    threshold: 75,
  },
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mibdbosli42x",
    cid: "bafyreiadf73bhu65qjqj33fxqppyaqz5nhytcij54r4aqc7oqye5pbnnia",
    shortName: "Honk Captain",
    threshold: 50,
  },
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mibcvr5uj72b",
    cid: "bafyreidnomhgfu46iriqg5b4oxthfyyqqywx5np55fl7hfeqaaquoseh6e",
    shortName: "Flock Leader",
    threshold: 25,
  },
  {
    uri: "at://did:plc:3xewinw4wtimo2lqfy5fm5sw/community.lexicon.badge.definition/3mibcroivtt2o",
    cid: "bafyreibavfz3itcqbioaderem4p4yq7h4di7u5dfyhyz4ziv7olnjcby5a",
    shortName: "Part of the Flock",
    threshold: 1,
  },
];

/**
 * Get the highest connection badge definition earned for a given count.
 */
export function getConnectionBadgeForCount(
  count: number,
): ConnectionBadgeDefinition | null {
  for (const badge of connectionBadges) {
    if (count >= badge.threshold) return badge;
  }
  return null;
}

export function isConnectionBadge(uri: string | undefined): boolean {
  if (!uri) return false;
  return connectionBadges.some((b) => b.uri === uri);
}

export function getPrimaryBadge(): BadgeDefinition | null {
  return badges[0] ?? null;
}

export function getBadgeByUri(
  uri: string,
): BadgeDefinition | ConnectionBadgeDefinition | undefined {
  return (
    badges.find((b) => b.uri === uri) ??
    connectionBadges.find((b) => b.uri === uri)
  );
}

/** All badge URIs (attendee + connection) for matching award records. */
export function getAllBadgeUris(): Set<string> {
  return new Set([
    ...badges.map((b) => b.uri),
    ...connectionBadges.map((b) => b.uri),
  ]);
}

export function isRemoteBadge(uri: string | undefined): boolean {
  if (!uri) return false;
  const badge = badges.find((b) => b.uri === uri);
  return badge?.remote ?? false;
}

export function getBadgeShortName(uri: string | undefined): string {
  if (!uri) return "Attendee";
  return getBadgeByUri(uri)?.shortName ?? "Attendee";
}
