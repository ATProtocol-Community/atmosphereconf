/**
 * Map from badge definition URI to a short display label for the pill.
 * Add entries here as new badge types are created.
 */
const BADGE_SHORT_NAMES: Record<string, string> = {
  "at://did:plc:r2vpg2iszskbkegoldmqa322/community.lexicon.badge.definition/i1oZsZlPLWqt0":
    "Attendee",
};

export function getBadgeShortName(
  badgeDefinitionUri: string | undefined,
): string {
  if (!badgeDefinitionUri) return "Attendee";
  return BADGE_SHORT_NAMES[badgeDefinitionUri] ?? "Attendee";
}
