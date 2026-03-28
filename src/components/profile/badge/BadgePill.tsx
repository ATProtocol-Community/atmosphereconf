import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { BadgeCertificate } from "./BadgeCertificate";
import { getBadgeShortName, isRemoteBadge } from "@/config/badges";
import type { BadgeAwardInfo } from "@/lib/profile";
import "./badge-styles.css";

function RemoteIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.626 1.105a.625.625 0 1 1 .8-.96A7.13 7.13 0 0 1 14 5.636a7.13 7.13 0 0 1-2.575 5.492a.625.625 0 0 1-.8-.961a5.88 5.88 0 0 0 2.125-4.53a5.88 5.88 0 0 0-2.124-4.532M8.677 2.781a.625.625 0 0 1 .634-1.077a4.56 4.56 0 0 1 2.25 3.933A4.56 4.56 0 0 1 9.31 9.57a.625.625 0 1 1-.634-1.077a3.31 3.31 0 0 0 1.634-2.856A3.31 3.31 0 0 0 8.677 2.78M9 5.637a2 2 0 1 0-2.625 1.9v5.838a.625.625 0 1 0 1.25 0V7.537A2 2 0 0 0 9 5.637M5.544 1.926a.625.625 0 0 0-.856-.222A4.56 4.56 0 0 0 2.44 5.637A4.56 4.56 0 0 0 4.69 9.57a.625.625 0 1 0 .635-1.077A3.31 3.31 0 0 1 3.69 5.637c0-1.216.655-2.279 1.633-2.856a.625.625 0 0 0 .222-.855m-2.17-.82a.625.625 0 1 0-.8-.961A7.13 7.13 0 0 0 0 5.636a7.13 7.13 0 0 0 2.575 5.492a.625.625 0 0 0 .8-.961a5.88 5.88 0 0 1-2.125-4.53c0-1.823.826-3.451 2.124-4.532"
        clipRule="evenodd"
      />
    </svg>
  );
}

function GooseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M370.019 18.023c-2.843-.035-5.859.197-9.075.73c-81.664 13.54-38.657 142.295-36.095 217.397c-84.163-16.327-168.007 121.048-289.118 152.787c58.086 52.473 206.05 89.6 331.739 11.85c39.804-24.622 45.26-92.014 34.343-165.049c-6.703-44.845-71.755-133.176-10.269-141.266l.611-.504c12.884-10.608 16.606-23.842 22.522-37.699l1.699-3.976c-11.688-16.016-23.17-33.986-46.357-34.27m5.08 19.625a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9m52.703 34.172c-3.28 8.167-7.411 17.45-14.612 26.293c21.035 7.63 41.929 3.078 63.079-.863c-15.515-9.272-32.003-18.195-48.467-25.43m-89.608 181.053c19.109 25.924 21.374 53.965 11.637 78.183s-30.345 44.797-55.67 60.49c-50.65 31.389-121.288 44.45-170.553 17.11l8.735-15.738c40.364 22.4 106.342 11.833 152.338-16.67c22.997-14.252 40.72-32.684 48.449-51.906s6.596-39.053-9.426-60.79zM273.28 456.322a333 333 0 0 1-19.095 3.232l-3.508 16.426h-13.084l3.508-14.842a400 400 0 0 1-18.852 1.506l-7.408 31.336h95.79v-18h-41.548z"
      />
    </svg>
  );
}

interface BadgePillProps {
  did: string;
  handle: string;
  badgeAward: BadgeAwardInfo | null;
  canUnclaim: boolean;
  celebrating?: boolean;
  onUnclaimed?: () => void;
}

const VERIFY_KEY_PREFIX = "badge-verified:";

export function BadgePill({
  did,
  handle,
  badgeAward,
  canUnclaim,
  celebrating = false,
  onUnclaimed,
}: BadgePillProps) {
  const [verified, setVerified] = useState(() => {
    try {
      return sessionStorage.getItem(VERIFY_KEY_PREFIX + did) !== null;
    } catch {
      return false;
    }
  });

  const [open, setOpen] = useState(false);

  const handleVerified = () => {
    setVerified(true);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="badge-pill-wrap relative inline-flex w-fit items-center" onClick={(e) => e.stopPropagation()}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`badge-btn${verified ? " badge-btn-verified" : open ? "" : " badge-btn-unverified"} inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-stone-950 cursor-pointer dark:text-amber-100${celebrating ? " badge-btn-celebrate" : ""}`}
          >
            {celebrating && <span className="badge-claim-shine" />}
            {verified && <span className="badge-verified-shine" />}
            {isRemoteBadge(badgeAward?.badgeDefinitionUri) ? (
              <RemoteIcon size={12} />
            ) : (
              <GooseIcon size={12} />
            )}
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
            onUnclaimed={onUnclaimed}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
