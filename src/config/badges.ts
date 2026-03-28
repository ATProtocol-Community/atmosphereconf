export type BadgeDefinition = {
  uri: string;
  cid: string;
  shortName: string;
  remote: boolean;
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

export function getPrimaryBadge(): BadgeDefinition | null {
  return badges[0] ?? null;
}

export function getBadgeByUri(uri: string): BadgeDefinition | undefined {
  return badges.find((b) => b.uri === uri);
}

export function isRemoteBadge(uri: string | undefined): boolean {
  if (!uri) return false;
  return getBadgeByUri(uri)?.remote ?? false;
}

export function getBadgeShortName(uri: string | undefined): string {
  if (!uri) return "Attendee";
  return getBadgeByUri(uri)?.shortName ?? "Attendee";
}
