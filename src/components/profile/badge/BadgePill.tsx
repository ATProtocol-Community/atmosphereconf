import { useState, useRef, useEffect } from "react";
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
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popupOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setPopupOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopupOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [popupOpen]);

  return (
    <div className="relative" ref={popupRef}>
      {/* Badge pill button */}
      <button
        type="button"
        onClick={() => setPopupOpen((v) => !v)}
        aria-expanded={popupOpen}
        className={`badge-btn inline-flex items-center gap-1.5 rounded-md border border-amber-700/20 px-3 py-1.5 text-xs font-bold text-amber-900 cursor-pointer dark:border-amber-400/20 dark:text-amber-200${celebrating ? " badge-btn-celebrate" : ""}`}
      >
        {celebrating && <span className="badge-claim-shine" />}
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {getBadgeShortName(badgeAward?.badgeDefinitionUri)}
      </button>
      {celebrating && (
        <span className="badge-welcome ml-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          Welcome to the flock!
        </span>
      )}

      {/* Popup with certificate */}
      {popupOpen && (
        <BadgeCertificate
          did={did}
          handle={handle}
          badgeAward={badgeAward}
          canUnclaim={canUnclaim}
        />
      )}
    </div>
  );
}
