import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { BadgeCertificate } from "./BadgeCertificate";
import { getBadgeShortName, isRemoteBadge, connectionBadges } from "@/config/badges";
import type { BadgeAwardInfo } from "@/lib/profile";
import "./badge-styles.css";

function ConnectionTier1Icon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor">
        <path d="M12.31 8.05a1 1 0 1 1-2 0a1 1 0 0 1 2 0m8.43 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2m-6.986.45h4.492a2.25 2.25 0 0 0-2.252-2.24a2.24 2.24 0 0 0-2.24 2.24"/>
        <path d="m1.642 12.907l2.478 2.478l-1.568 1.568a1 1 0 0 0-.292.707c0 7.602 6.157 13.76 13.76 13.76c7.55 0 13.681-6.09 13.759-13.623a1 1 0 0 0-.282-.854l-1.563-1.563l2.473-2.473c1.417-1.418.417-3.857-1.597-3.857h-3.805C24.51 4.521 20.683 1 16.03 1a9.024 9.024 0 0 0-8.978 8.05H3.24c-2.015 0-3.015 2.44-1.598 3.857M7 11.05v1.916l-.23-.23l-1.235 1.235l-2.478-2.478a.24.24 0 0 1-.074-.132a.3.3 0 0 1 .02-.15a.3.3 0 0 1 .091-.12a.24.24 0 0 1 .146-.041zm-2.734 7.017l1.918-1.917l.626-.538l.19.19v.043l3.116 3.192l.064-.062l.04.04l2.606-2.607l3.199-3.104l5.168 5.084l.627.626l.005-.005l.045.044l1.254-1.327l2.115-2.114l.696.598l1.838 1.838C27.564 24.36 22.38 29.42 16.02 29.42c-6.362 0-11.54-5.044-11.754-11.353m24.726-6.574l-2.472 2.473l-1.24-1.24l-.22.22V11.05h3.75c.07 0 .114.02.145.041c.035.026.07.066.092.12a.3.3 0 0 1 .019.15a.24.24 0 0 1-.073.132m-5.942 3.4l-1.07 1.133l-.16.16l-5.8-5.8l-4.598 4.597l-1.22 1.185L9 14.966v-4.957A7.023 7.023 0 0 1 16.03 3c3.755 0 6.824 2.948 7.02 6.67z"/>
      </g>
    </svg>
  );
}

function ConnectionTier2Icon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="m21.78 11.88l-2-2.5A1 1 0 0 0 19 9h-6V3a1 1 0 0 0-2 0v1H5a1 1 0 0 0-.78.38l-2 2.5a1 1 0 0 0 0 1.24l2 2.5A1 1 0 0 0 5 11h6v9H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-4h6a1 1 0 0 0 .78-.38l2-2.5a1 1 0 0 0 0-1.24M11 9H5.48l-1.2-1.5L5.48 6H11Zm7.52 5H13v-3h5.52l1.2 1.5Z"/>
    </svg>
  );
}

function ConnectionTier3Icon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M404.7 79.78h-2.8c-7.5.26-15.8 1.73-24.8 4.3c-18 5.16-38.4 14.56-59.3 25.78c-41.9 22.4-85.8 52-121.5 68.6c-26.4 12.4-59.3 20.4-89.8 27.5s-58.95 13.4-74.36 20.6c-7.13 3.4-10.9 6.9-12.71 9.9c-1.8 2.9-2.1 5.2-1.44 8.4c1.32 6.4 8.57 15.4 18.49 21.9l3.29 2.1c162.63-2.3 289.43-13.7 387.73-52.6c2.1-17.6 6.7-34.7 16.5-48.5v-.1l.1-.1c24.5-32.2 8.9-72.58-22.4-84.89c-5-1.95-10.7-2.91-17-2.93zm21.9 185.12c-44.2 25.1-103.8 37-169.2 41.2c-68.7 4.4-143.7.1-213.52-7.8l1.89 14c31.19 3.2 98.53 11.8 172.83 11.5c77.2-.3 159.6-11.3 208.6-46.2c-.2-4.1-.4-8.3-.6-12.7m7.1 30.2c-46.9 31.5-113.8 42.9-179.9 45.8c44.7 39 89.3 55.1 127.3 59.1c45.2 4.8 81.5-8.7 94.8-19.8c13-10.8 17.5-19.5 18.3-26.2c.7-6.8-2-13.3-8.2-20.5c-11.3-13.4-33.5-26.4-52.3-38.4"/>
    </svg>
  );
}

function ConnectionTier4Icon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M19.53 3.06L10.59 12h9.94c2.02-2.52 1.97-6.1-.23-8.3c-.24-.24-.5-.45-.77-.64m-1.95-.88c-2.09-.51-4.45.1-6.16 1.81L5.99 9.42c-1.71 1.7-2.31 4.07-1.81 6.16zM5.06 17.53L2.29 20.3l1.41 1.41l2.77-2.77c1 .7 2.19 1.06 3.4 1.06c1.67 0 3.39-.67 4.71-1.98l4.01-4.01H8.58l-3.53 3.53Z"/>
    </svg>
  );
}

function ConnectionTier5Icon({ size = 12 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M370.019 18.023c-2.843-.035-5.859.197-9.075.73c-81.664 13.54-38.657 142.295-36.095 217.397c-84.163-16.327-168.007 121.048-289.118 152.787c58.086 52.473 206.05 89.6 331.739 11.85c39.804-24.622 45.26-92.014 34.343-165.049c-6.703-44.845-71.755-133.176-10.269-141.266l.611-.504c12.884-10.608 16.606-23.842 22.522-37.699l1.699-3.976c-11.688-16.016-23.17-33.986-46.357-34.27m5.08 19.625a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9m52.703 34.172c-3.28 8.167-7.411 17.45-14.612 26.293c21.035 7.63 41.929 3.078 63.079-.863c-15.515-9.272-32.003-18.195-48.467-25.43m-89.608 181.053c19.109 25.924 21.374 53.965 11.637 78.183s-30.345 44.797-55.67 60.49c-50.65 31.389-121.288 44.45-170.553 17.11l8.735-15.738c40.364 22.4 106.342 11.833 152.338-16.67c22.997-14.252 40.72-32.684 48.449-51.906s6.596-39.053-9.426-60.79zM273.28 456.322a333 333 0 0 1-19.095 3.232l-3.508 16.426h-13.084l3.508-14.842a400 400 0 0 1-18.852 1.506l-7.408 31.336h95.79v-18h-41.548z"/>
    </svg>
  );
}

/** Map connection badge URI → icon component.
 * connectionBadges is sorted highest-threshold-first,
 * icons are numbered highest-tier-first to match. */
const connectionIconMap = new Map<string, React.FC<{ size?: number }>>();
{
  const icons = [ConnectionTier5Icon, ConnectionTier4Icon, ConnectionTier3Icon, ConnectionTier2Icon, ConnectionTier1Icon];
  connectionBadges.forEach((b, i) => {
    connectionIconMap.set(b.uri, icons[i]);
  });
}

function getConnectionIcon(uri: string | undefined): React.FC<{ size?: number }> | null {
  if (!uri) return null;
  return connectionIconMap.get(uri) ?? null;
}

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
            {(() => {
              const ConnIcon = getConnectionIcon(badgeAward?.badgeDefinitionUri);
              if (ConnIcon) return <ConnIcon size={12} />;
              if (isRemoteBadge(badgeAward?.badgeDefinitionUri)) return <RemoteIcon size={12} />;
              return <GooseIcon size={12} />;
            })()}
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
