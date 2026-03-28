import { useState } from "react";
import { BadgePill } from "./BadgePill";
import { BadgeClaim } from "./BadgeClaim";
import type { BadgeAwardInfo } from "@/lib/profile";

interface BadgeSectionProps {
  did: string;
  handle: string;
  badgeAward: BadgeAwardInfo | null;
  isOwnProfile: boolean;
  isTicketHolder: boolean;
}

export function BadgeSection({
  did,
  handle,
  badgeAward,
  isOwnProfile,
  isTicketHolder,
}: BadgeSectionProps) {
  const [claimedAward, setClaimedAward] = useState<BadgeAwardInfo | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const [removed, setRemoved] = useState(false);
  const displayAward = removed ? null : (badgeAward ?? claimedAward);

  const handleClaimed = (result: { uri: string; badgeDefinitionUri: string }) => {
    setClaimedAward({
      uri: result.uri,
      badgeDefinitionUri: result.badgeDefinitionUri,
      issuedAt: new Date().toISOString(),
      pdsUrl: undefined,
      badgeName: undefined,
      badgeDescription: undefined,
    });
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 1200);
  };

  const handleUnclaimed = () => {
    setRemoved(true);
    setClaimedAward(null);
    setCelebrating(false);
  };

  if (displayAward) {
    return (
      <BadgePill
        did={did}
        handle={handle}
        badgeAward={displayAward}
        canUnclaim={isOwnProfile}
        celebrating={celebrating}
        onUnclaimed={handleUnclaimed}
      />
    );
  }

  if (isOwnProfile && isTicketHolder) {
    return <BadgeClaim onSuccess={handleClaimed} />;
  }

  return null;
}
