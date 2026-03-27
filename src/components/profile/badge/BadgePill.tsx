import { useState } from "react";
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

const VERIFY_KEY_PREFIX = "badge-verified:";

export function BadgePill({
  did,
  handle,
  badgeAward,
  canUnclaim,
  celebrating = false,
}: BadgePillProps) {
  const [verified, setVerified] = useState(() => {
    try {
      return sessionStorage.getItem(VERIFY_KEY_PREFIX + did) !== null;
    } catch {
      return false;
    }
  });

  const handleVerified = () => {
    setVerified(true);
  };

  return (
    <Popover.Root>
      <div className="badge-pill-wrap relative inline-flex w-fit items-center" onClick={(e) => e.stopPropagation()}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`badge-btn${verified ? " badge-btn-verified" : ""} inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-stone-950 cursor-pointer dark:text-amber-100${celebrating ? " badge-btn-celebrate" : ""}`}
          >
            {celebrating && <span className="badge-claim-shine" />}
            {verified && <span className="badge-verified-shine" />}
            <Star
              aria-hidden="true"
              size={12}
              fill="currentColor"
              stroke="none"
            />
            {getBadgeShortName(badgeAward?.badgeDefinitionUri)}
          </button>
        </Popover.Trigger>
        {verified && (
          <>
            {/* top-left — big, floats high */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "8%",
                  "--sparkle-y": "-8px",
                  "--sparkle-delay": "0.3s",
                  "--sparkle-dur": "2.8s",
                  "--sparkle-size": "7px",
                  "--drift-dur": "5.5s",
                  "--drift-delay": "0s",
                } as React.CSSProperties
              }
            />
            {/* top-right — small, close to edge */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "85%",
                  "--sparkle-y": "-1px",
                  "--sparkle-delay": "2s",
                  "--sparkle-dur": "3.2s",
                  "--sparkle-size": "4px",
                  "--drift-dur": "7.3s",
                  "--drift-delay": "2.1s",
                } as React.CSSProperties
              }
            />
            {/* left-center — medium */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "-2px",
                  "--sparkle-y": "55%",
                  "--sparkle-delay": "3.8s",
                  "--sparkle-dur": "2.4s",
                  "--sparkle-size": "5px",
                  "--drift-dur": "8.7s",
                  "--drift-delay": "4.3s",
                } as React.CSSProperties
              }
            />
            {/* right-center — big */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "calc(100%)",
                  "--sparkle-y": "35%",
                  "--sparkle-delay": "5.5s",
                  "--sparkle-dur": "2.6s",
                  "--sparkle-size": "8px",
                  "--drift-dur": "6.1s",
                  "--drift-delay": "1.4s",
                } as React.CSSProperties
              }
            />
            {/* bottom-center — small, hangs below */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "50%",
                  "--sparkle-y": "calc(100% + 4px)",
                  "--sparkle-delay": "1.6s",
                  "--sparkle-dur": "3.6s",
                  "--sparkle-size": "4px",
                  "--drift-dur": "9.2s",
                  "--drift-delay": "3.6s",
                } as React.CSSProperties
              }
            />
            {/* top-center — tiny, way above */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "45%",
                  "--sparkle-y": "-12px",
                  "--sparkle-delay": "1.2s",
                  "--sparkle-dur": "3.4s",
                  "--sparkle-size": "3px",
                  "--drift-dur": "7.8s",
                  "--drift-delay": "0.6s",
                } as React.CSSProperties
              }
            />
            {/* bottom-left — tiny, hugs edge */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "20%",
                  "--sparkle-y": "calc(100% + 1px)",
                  "--sparkle-delay": "4.8s",
                  "--sparkle-dur": "2.2s",
                  "--sparkle-size": "3px",
                  "--drift-dur": "6.4s",
                  "--drift-delay": "3.2s",
                } as React.CSSProperties
              }
            />
            {/* bottom-right — tiny, floats well below */}
            <span
              className="badge-sparkle"
              style={
                {
                  "--sparkle-x": "70%",
                  "--sparkle-y": "calc(100% + 10px)",
                  "--sparkle-delay": "8.3s",
                  "--sparkle-dur": "4.1s",
                  "--sparkle-size": "3px",
                  "--drift-dur": "8.2s",
                  "--drift-delay": "5.1s",
                } as React.CSSProperties
              }
            />
          </>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={12}
          className="badge-popup z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <BadgeCertificate
            did={did}
            handle={handle}
            badgeAward={badgeAward}
            canUnclaim={canUnclaim}
            onVerified={handleVerified}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
