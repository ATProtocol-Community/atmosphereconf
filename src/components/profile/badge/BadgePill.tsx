import * as Popover from "@radix-ui/react-popover";
import { Star } from "lucide-react";
import { BadgeCertificate } from "./BadgeCertificate";
import { getBadgeShortName } from "@/lib/badge-names";
import type { BadgeAwardInfo } from "@/lib/profile";
import "./badge-styles.css";

interface BadgePillProps {
  did: string;
  handle: string;
  badgeAward: BadgeAwardInfo | null;
  canUnclaim: boolean;
  celebrating?: boolean;
}

export function BadgePill({
  did,
  handle,
  badgeAward,
  canUnclaim,
  celebrating = false,
}: BadgePillProps) {
  return (
    <Popover.Root>
      <div className="inline-flex items-center">
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`badge-btn inline-flex items-center gap-1.5 rounded-md border border-amber-700/20 px-3 py-1.5 text-xs font-bold text-amber-900 cursor-pointer dark:border-amber-400/20 dark:text-amber-200${celebrating ? " badge-btn-celebrate" : ""}`}
          >
            {celebrating && <span className="badge-claim-shine" />}
            <Star
              aria-hidden="true"
              size={12}
              fill="currentColor"
              stroke="none"
            />
            {getBadgeShortName(badgeAward?.badgeDefinitionUri)}
          </button>
        </Popover.Trigger>
        {celebrating && (
          <span className="badge-welcome ml-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            Welcome to the flock!
          </span>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={12}
          className="badge-popup z-50"
        >
          <BadgeCertificate
            did={did}
            handle={handle}
            badgeAward={badgeAward}
            canUnclaim={canUnclaim}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
