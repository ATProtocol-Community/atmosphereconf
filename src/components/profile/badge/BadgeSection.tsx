import { useState, useRef, useEffect } from "react";
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
  const [justClaimed, setJustClaimed] = useState(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(reloadTimerRef.current), []);

  const handleClaimed = () => {
    setJustClaimed(true);
    reloadTimerRef.current = setTimeout(() => window.location.reload(), 1500);
  };

  if (badgeAward || justClaimed) {
    return (
      <BadgePill
        did={did}
        handle={handle}
        badgeAward={badgeAward}
        canUnclaim={isOwnProfile}
        celebrating={justClaimed}
      />
    );
  }

  if (isOwnProfile && isTicketHolder) {
    return <BadgeClaim onSuccess={handleClaimed} />;
  }

  return null;
}
