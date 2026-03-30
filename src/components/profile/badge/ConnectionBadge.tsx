import { useState } from "react";
import { actions } from "astro:actions";
import {
  connectionBadges,
  getConnectionBadgeForCount,
} from "@/config/badges";
import type { BadgeAwardInfo } from "@/lib/profile";

// Icons per tier (lowest → highest threshold)
function Tier1Icon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor">
        <path d="M12.31 8.05a1 1 0 1 1-2 0a1 1 0 0 1 2 0m8.43 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2m-6.986.45h4.492a2.25 2.25 0 0 0-2.252-2.24a2.24 2.24 0 0 0-2.24 2.24"/>
        <path d="m1.642 12.907l2.478 2.478l-1.568 1.568a1 1 0 0 0-.292.707c0 7.602 6.157 13.76 13.76 13.76c7.55 0 13.681-6.09 13.759-13.623a1 1 0 0 0-.282-.854l-1.563-1.563l2.473-2.473c1.417-1.418.417-3.857-1.597-3.857h-3.805C24.51 4.521 20.683 1 16.03 1a9.024 9.024 0 0 0-8.978 8.05H3.24c-2.015 0-3.015 2.44-1.598 3.857M7 11.05v1.916l-.23-.23l-1.235 1.235l-2.478-2.478a.24.24 0 0 1-.074-.132a.3.3 0 0 1 .02-.15a.3.3 0 0 1 .091-.12a.24.24 0 0 1 .146-.041zm-2.734 7.017l1.918-1.917l.626-.538l.19.19v.043l3.116 3.192l.064-.062l.04.04l2.606-2.607l3.199-3.104l5.168 5.084l.627.626l.005-.005l.045.044l1.254-1.327l2.115-2.114l.696.598l1.838 1.838C27.564 24.36 22.38 29.42 16.02 29.42c-6.362 0-11.54-5.044-11.754-11.353m24.726-6.574l-2.472 2.473l-1.24-1.24l-.22.22V11.05h3.75c.07 0 .114.02.145.041c.035.026.07.066.092.12a.3.3 0 0 1 .019.15a.24.24 0 0 1-.073.132m-5.942 3.4l-1.07 1.133l-.16.16l-5.8-5.8l-4.598 4.597l-1.22 1.185L9 14.966v-4.957A7.023 7.023 0 0 1 16.03 3c3.755 0 6.824 2.948 7.02 6.67z"/>
      </g>
    </svg>
  );
}

function Tier2Icon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="m21.78 11.88l-2-2.5A1 1 0 0 0 19 9h-6V3a1 1 0 0 0-2 0v1H5a1 1 0 0 0-.78.38l-2 2.5a1 1 0 0 0 0 1.24l2 2.5A1 1 0 0 0 5 11h6v9H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-4h6a1 1 0 0 0 .78-.38l2-2.5a1 1 0 0 0 0-1.24M11 9H5.48l-1.2-1.5L5.48 6H11Zm7.52 5H13v-3h5.52l1.2 1.5Z"/>
    </svg>
  );
}

function Tier3Icon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M404.7 79.78h-2.8c-7.5.26-15.8 1.73-24.8 4.3c-18 5.16-38.4 14.56-59.3 25.78c-41.9 22.4-85.8 52-121.5 68.6c-26.4 12.4-59.3 20.4-89.8 27.5s-58.95 13.4-74.36 20.6c-7.13 3.4-10.9 6.9-12.71 9.9c-1.8 2.9-2.1 5.2-1.44 8.4c1.32 6.4 8.57 15.4 18.49 21.9l3.29 2.1c162.63-2.3 289.43-13.7 387.73-52.6c2.1-17.6 6.7-34.7 16.5-48.5v-.1l.1-.1c24.5-32.2 8.9-72.58-22.4-84.89c-5-1.95-10.7-2.91-17-2.93zm21.9 185.12c-44.2 25.1-103.8 37-169.2 41.2c-68.7 4.4-143.7.1-213.52-7.8l1.89 14c31.19 3.2 98.53 11.8 172.83 11.5c77.2-.3 159.6-11.3 208.6-46.2c-.2-4.1-.4-8.3-.6-12.7m7.1 30.2c-46.9 31.5-113.8 42.9-179.9 45.8c44.7 39 89.3 55.1 127.3 59.1c45.2 4.8 81.5-8.7 94.8-19.8c13-10.8 17.5-19.5 18.3-26.2c.7-6.8-2-13.3-8.2-20.5c-11.3-13.4-33.5-26.4-52.3-38.4"/>
    </svg>
  );
}

function Tier4Icon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M19.53 3.06L10.59 12h9.94c2.02-2.52 1.97-6.1-.23-8.3c-.24-.24-.5-.45-.77-.64m-1.95-.88c-2.09-.51-4.45.1-6.16 1.81L5.99 9.42c-1.71 1.7-2.31 4.07-1.81 6.16zM5.06 17.53L2.29 20.3l1.41 1.41l2.77-2.77c1 .7 2.19 1.06 3.4 1.06c1.67 0 3.39-.67 4.71-1.98l4.01-4.01H8.58l-3.53 3.53Z"/>
    </svg>
  );
}

function Tier5Icon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M370.019 18.023c-2.843-.035-5.859.197-9.075.73c-81.664 13.54-38.657 142.295-36.095 217.397c-84.163-16.327-168.007 121.048-289.118 152.787c58.086 52.473 206.05 89.6 331.739 11.85c39.804-24.622 45.26-92.014 34.343-165.049c-6.703-44.845-71.755-133.176-10.269-141.266l.611-.504c12.884-10.608 16.606-23.842 22.522-37.699l1.699-3.976c-11.688-16.016-23.17-33.986-46.357-34.27m5.08 19.625a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9m52.703 34.172c-3.28 8.167-7.411 17.45-14.612 26.293c21.035 7.63 41.929 3.078 63.079-.863c-15.515-9.272-32.003-18.195-48.467-25.43m-89.608 181.053c19.109 25.924 21.374 53.965 11.637 78.183s-30.345 44.797-55.67 60.49c-50.65 31.389-121.288 44.45-170.553 17.11l8.735-15.738c40.364 22.4 106.342 11.833 152.338-16.67c22.997-14.252 40.72-32.684 48.449-51.906s6.596-39.053-9.426-60.79zM273.28 456.322a333 333 0 0 1-19.095 3.232l-3.508 16.426h-13.084l3.508-14.842a400 400 0 0 1-18.852 1.506l-7.408 31.336h95.79v-18h-41.548z"/>
    </svg>
  );
}

// Tiers displayed lowest → highest. Each has styles and icon.
const TIER_DISPLAY = [
  {
    threshold: 1,
    Icon: Tier1Icon,
    bg: "bg-blue-100 dark:bg-blue-950/50",
    text: "text-blue-500 dark:text-blue-400",
  },
  {
    threshold: 25,
    Icon: Tier2Icon,
    bg: "bg-blue-200 dark:bg-blue-900/50",
    text: "text-blue-600 dark:text-blue-300",
  },
  {
    threshold: 50,
    Icon: Tier3Icon,
    bg: "bg-blue-300 dark:bg-blue-800/50",
    text: "text-blue-700 dark:text-blue-200",
  },
  {
    threshold: 75,
    Icon: Tier4Icon,
    bg: "bg-blue-500 dark:bg-blue-700/50",
    text: "text-blue-50 dark:text-blue-100",
  },
  {
    threshold: 100,
    Icon: Tier5Icon,
    bg: "bg-blue-800 dark:bg-blue-600/50",
    text: "text-blue-50 dark:text-blue-50",
  },
];

// Reverse-lookup: find the tier display config matching a badge URI
function getTierIndexByUri(uri: string): number {
  const badge = connectionBadges.find((b) => b.uri === uri);
  if (!badge) return -1;
  return TIER_DISPLAY.findIndex((t) => t.threshold === badge.threshold);
}

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
  const [claimedAward, setClaimedAward] = useState<BadgeAwardInfo | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAward = connectionBadgeAward ?? claimedAward;
  const claimedTierIndex = displayAward?.badgeDefinitionUri
    ? getTierIndexByUri(displayAward.badgeDefinitionUri)
    : -1;

  // What tier can they claim? (highest they qualify for)
  const qualifiedBadge = getConnectionBadgeForCount(connectionCount);
  const qualifiedTierIndex = qualifiedBadge
    ? TIER_DISPLAY.findIndex((t) => t.threshold === qualifiedBadge.threshold)
    : -1;

  // Can claim if: own profile, no existing badge, and qualifies for something
  const canClaim = isOwnProfile && !displayAward && qualifiedTierIndex >= 0;

  // connectionBadges is sorted highest-first; reverse for display (lowest-first)
  const tiersLowestFirst = [...connectionBadges].reverse();

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const { data, error: actionError } = await actions.claimConnectionBadge();
      if (actionError) {
        setError(actionError.message);
        return;
      }
      if (data) {
        setClaimedAward({
          uri: data.uri,
          badgeDefinitionUri: data.badgeDefinitionUri,
          issuedAt: new Date().toISOString(),
          pdsUrl: undefined,
          badgeName: undefined,
          badgeDescription: undefined,
        });
      }
    } catch {
      setError("Failed to claim badge");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground text-xs tracking-wide uppercase">
        Connections
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tiersLowestFirst.map((badge, i) => {
          const tier = TIER_DISPLAY[i];
          if (!tier) return null;
          const { Icon } = tier;

          const isClaimed = i === claimedTierIndex;
          const isClaimTarget = canClaim && i === qualifiedTierIndex;

          return (
            <div key={badge.uri} className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide ${tier.bg} ${tier.text} ${isClaimed ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}`}
                title={`${badge.shortName} — ${badge.threshold}+ connections`}
              >
                <Icon size={14} />
                {badge.shortName}
              </span>
              {isClaimTarget && (
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claiming}
                  className="rounded bg-blue-500 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {claiming ? "..." : "Claim"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <span className="text-[10px] text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
