import { useState } from "react";
import { actions } from "astro:actions";
import { Loader2, Link } from "lucide-react";
import { BadgePill } from "./BadgePill";
import type { BadgeAwardInfo } from "@/lib/profile";
import { getConnectionBadgeForCount } from "@/config/badges";

interface ConnectionBadgeSectionProps {
  did: string;
  handle: string;
  connectionBadgeAward: BadgeAwardInfo | null;
  isOwnProfile: boolean;
  connectionCount: number;
}

export function ConnectionBadgeSection({
  did,
  handle,
  connectionBadgeAward,
  isOwnProfile,
  connectionCount,
}: ConnectionBadgeSectionProps) {
  const [claimedAward, setClaimedAward] = useState<BadgeAwardInfo | null>(
    null,
  );
  const [celebrating, setCelebrating] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAward = removed ? null : (connectionBadgeAward ?? claimedAward);

  const qualifiedBadge = getConnectionBadgeForCount(connectionCount);
  const canClaim = isOwnProfile && !displayAward && !!qualifiedBadge;

  const handleClaimed = (data: {
    uri: string;
    badgeDefinitionUri: string;
  }) => {
    setRemoved(false);
    setClaimedAward({
      uri: data.uri,
      badgeDefinitionUri: data.badgeDefinitionUri,
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

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const { data, error: actionError } =
        await actions.claimConnectionBadge();
      if (actionError) {
        setError(actionError.message);
        return;
      }
      if (data) {
        handleClaimed({
          uri: data.uri,
          badgeDefinitionUri: data.badgeDefinitionUri,
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (displayAward) {
    return (
      <BadgePill
        did={did}
        handle={handle}
        badgeAward={displayAward}
        canUnclaim={isOwnProfile}
        celebrating={celebrating}
        onUnclaimed={handleUnclaimed}
        unclaimAction={() => actions.unclaimConnectionBadge()}
        variant="connection"
      />
    );
  }

  if (canClaim) {
    return (
      <div>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded border-2 border-dashed border-blue-500/30 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:border-blue-500/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
        >
          {claiming ? (
            <>
              <Loader2 aria-hidden="true" size={12} className="animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Link aria-hidden="true" size={12} />
              Claim connections
            </>
          )}
        </button>
        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  return null;
}
