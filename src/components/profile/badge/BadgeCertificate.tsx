import { useState } from "react";
import { actions } from "astro:actions";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { BadgeAwardInfo } from "@/lib/profile";

interface BadgeCertificateProps {
  did: string;
  handle: string;
  badgeAward: BadgeAwardInfo | null;
  canUnclaim: boolean;
  onVerified?: () => void;
  onUnclaimed?: () => void;
  unclaimAction?: () => Promise<{ error?: { message: string } }>;
  variant?: "default" | "connection";
}

interface VerifyResult {
  verified: boolean;
  error?: string;
  issuerDid?: string;
  issuerHandle?: string;
  issuerDisplayName?: string;
}

const labelClass =
  "uppercase tracking-wider text-muted-foreground text-[11px]";

const VERIFY_KEY_PREFIX = "badge-verified:";

export function BadgeCertificate({
  did,
  handle,
  badgeAward,
  canUnclaim,
  onVerified,
  onUnclaimed,
  unclaimAction,
  variant = "default",
}: BadgeCertificateProps) {
  const isConnection = variant === "connection";
  const cacheKey = VERIFY_KEY_PREFIX + did + (badgeAward?.badgeDefinitionUri ? `:${badgeAward.badgeDefinitionUri}` : "");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [unclaiming, setUnclaiming] = useState(false);
  const [unclaimError, setUnclaimError] = useState<string | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await actions.verifyBadge({ did, badgeDefinitionUri: badgeAward?.badgeDefinitionUri });
      if (result.error) {
        setVerifyResult({ verified: false, error: result.error.message });
        return;
      }
      setVerifyResult(result.data);
      if (result.data.verified) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result.data));
        } catch {}
        onVerified?.();
      }
    } catch {
      setVerifyResult({ verified: false, error: "Verification failed" });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnclaim = async () => {
    setUnclaiming(true);
    setUnclaimError(null);
    try {
      const result = unclaimAction ? await unclaimAction() : await actions.unclaimBadge();
      if (result.error) {
        setUnclaimError(`Failed to remove badge: ${result.error.message}`);
        return;
      }
      try { sessionStorage.removeItem(cacheKey); } catch {}
      onUnclaimed?.();
    } catch {
      setUnclaimError("Failed to remove badge");
    } finally {
      setUnclaiming(false);
    }
  };

  return (
    <div className={`badge-certificate w-96 rounded font-mono${verifyResult?.verified ? " badge-certificate-verified" : ""}${isConnection ? " badge-certificate-connection" : ""}`}>
      {verifyResult?.verified && <div className="badge-cert-shine" />}
      {/* Certificate stamp */}
      <div className="badge-cert-seal">
        <svg
          viewBox="0 0 512 512"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M211 7.3C205 1 196-1.4 187.6.8s-14.9 8.9-17.1 17.3l-15.8 62.5l-62-17.5c-8.4-2.4-17.4 0-23.5 6.1s-8.5 15.1-6.1 23.5l17.5 62l-62.5 15.9c-8.4 2.1-15 8.7-17.3 17.1S1 205 7.3 211l46.2 45l-46.2 45c-6.3 6-8.7 15-6.5 23.4s8.9 14.9 17.3 17.1l62.5 15.8l-17.5 62c-2.4 8.4 0 17.4 6.1 23.5s15.1 8.5 23.5 6.1l62-17.5l15.8 62.5c2.1 8.4 8.7 15 17.1 17.3s17.3-.2 23.4-6.4l45-46.2l45 46.2c6.1 6.2 15 8.7 23.4 6.4s14.9-8.9 17.1-17.3l15.8-62.5l62 17.5c8.4 2.4 17.4 0 23.5-6.1s8.5-15.1 6.1-23.5l-17.5-62l62.5-15.8c8.4-2.1 15-8.7 17.3-17.1s-.2-17.4-6.4-23.4l-46.2-45l46.2-45c6.2-6.1 8.7-15 6.4-23.4s-8.9-14.9-17.3-17.1l-62.5-15.8l17.5-62c2.4-8.4 0-17.4-6.1-23.5s-15.1-8.5-23.5-6.1l-62 17.5l-15.9-62.5c-2.1-8.4-8.7-15-17.1-17.3S307 1 301 7.3l-45 46.2z" />
        </svg>
        {verifyResult?.verified && (
          <>
            <span className="badge-cert-seal-sparkle" style={{ "--sparkle-x": "90%", "--sparkle-y": "-10%", "--sparkle-delay": "0.5s", "--sparkle-dur": "2.2s", "--sparkle-size": "6px", "--drift-dur": "6.3s", "--drift-delay": "0s" } as React.CSSProperties} />
            <span className="badge-cert-seal-sparkle" style={{ "--sparkle-x": "-15%", "--sparkle-y": "50%", "--sparkle-delay": "1.8s", "--sparkle-dur": "2.8s", "--sparkle-size": "4px", "--drift-dur": "8.1s", "--drift-delay": "2.7s" } as React.CSSProperties} />
            <span className="badge-cert-seal-sparkle" style={{ "--sparkle-x": "50%", "--sparkle-y": "105%", "--sparkle-delay": "3.1s", "--sparkle-dur": "2s", "--sparkle-size": "5px", "--drift-dur": "7s", "--drift-delay": "4.5s" } as React.CSSProperties} />
            <span className="badge-cert-seal-sparkle" style={{ "--sparkle-x": "105%", "--sparkle-y": "60%", "--sparkle-delay": "4.8s", "--sparkle-dur": "3.2s", "--sparkle-size": "3px", "--drift-dur": "5.8s", "--drift-delay": "1.2s" } as React.CSSProperties} />
          </>
        )}
      </div>
      <div className="badge-cert-inner">
        {/* Header */}
        <div className="text-muted-foreground py-0.5 text-[13px] font-bold uppercase tracking-widest">
          // Certificate
        </div>
        <div className="border-border my-2 border-t" />

        {/* Single grid for all rows */}
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
          <span className={labelClass}>Subject</span>
          <span className={`font-bold ${isConnection ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"}`}>
            {badgeAward?.badgeName || (isConnection ? "Connection Badge" : "Attendee Badge")}
          </span>

          <span className={labelClass}>Issued&nbsp;to</span>
          <span className="text-card-foreground truncate">@{handle}</span>

          <span className={labelClass}>Issuer</span>
          <span className="text-foreground/80">ATmosphereConf</span>

          {badgeAward?.badgeDescription && (
            <>
              <span className={labelClass}>Note</span>
              <span className="text-muted-foreground">
                {badgeAward.badgeDescription}
              </span>
            </>
          )}

          {/* Divider spanning both columns */}
          <div className="border-border/60 col-span-2 my-0.5 border-t border-dashed" />

          {/* Verification rows */}
          {!verifyResult?.verified ? (
            <>
              <span className={labelClass}>Verify</span>
              <div>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="badge-verify-btn inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:animate-none"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-2.5 animate-spin" />
                      checking...
                    </>
                  ) : (
                    "Verify Badge"
                  )}
                </button>
                {verifyResult && !verifyResult.verified && (
                  <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                    {verifyResult.error}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <span className={labelClass}>Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                VERIFIED
              </span>

              <span className={labelClass}>Signed&nbsp;by</span>
              <div>
                <div className="text-card-foreground truncate">
                  {verifyResult.issuerHandle
                    ? `@${verifyResult.issuerHandle}`
                    : verifyResult.issuerDisplayName || verifyResult.issuerDid}
                </div>
                {verifyResult.issuerDid &&
                  (verifyResult.issuerHandle ||
                    verifyResult.issuerDisplayName) && (
                    <div className="text-muted-foreground truncate text-[9px]">
                      {verifyResult.issuerDid}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-border/60 flex items-center gap-3 border-t px-3 py-1.5 text-[10px]">
        {badgeAward?.uri && (
          <a
            href={`https://pdsls.dev/${badgeAward.uri}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink aria-hidden="true" className="size-2.5" />
            View on PDSls
          </a>
        )}
        {canUnclaim && (
          <button
            onClick={handleUnclaim}
            disabled={unclaiming}
            className="ml-auto inline-flex items-center gap-1 text-red-300 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-red-500/40 dark:hover:text-red-300"
          >
            {unclaiming ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <>
                <Trash2 className="size-2.5" />
                Remove
              </>
            )}
          </button>
        )}
      </div>
      {unclaimError && (
        <p className="px-3 pb-1.5 text-[10px] font-medium text-red-600 dark:text-red-400">
          {unclaimError}
        </p>
      )}
    </div>
  );
}
