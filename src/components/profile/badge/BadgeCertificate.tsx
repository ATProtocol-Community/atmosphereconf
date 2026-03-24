import { useState } from "react";
import { actions } from "astro:actions";
import { CircleCheck, ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { BadgeAwardInfo } from "@/lib/profile";

interface BadgeCertificateProps {
  did: string;
  handle: string;
  badgeAward: BadgeAwardInfo | null;
  canUnclaim: boolean;
}

interface VerifyResult {
  verified: boolean;
  error?: string;
  issuerDid?: string;
  issuerHandle?: string;
  issuerDisplayName?: string;
}

export function BadgeCertificate({
  did,
  handle,
  badgeAward,
  canUnclaim,
}: BadgeCertificateProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [unclaiming, setUnclaiming] = useState(false);
  const [unclaimError, setUnclaimError] = useState<string | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await actions.verifyBadge({ did });
      if (result.error) {
        setVerifyResult({ verified: false, error: result.error.message });
        return;
      }
      setVerifyResult(result.data);
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
      const result = await actions.unclaimBadge();
      if (result.error) {
        setUnclaimError(`Failed to remove badge: ${result.error.message}`);
        return;
      }
      window.location.reload();
    } catch {
      setUnclaimError("Failed to remove badge");
    } finally {
      setUnclaiming(false);
    }
  };

  return (
    <div className="w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      {/* Certificate */}
      <div className="badge-certificate relative rounded-sm">
        <div className="badge-tape badge-tape-left" />
        <div className="badge-tape badge-tape-right" />

        <div className="badge-cert-inner">
          {/* Header */}
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800/60 dark:text-amber-300/50">
            ATmosphereConf
          </div>
          <div className="my-2 border-t border-amber-800/15 dark:border-amber-300/15" />
          <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {badgeAward?.badgeName || "Attendee Badge"}
          </div>

          {/* Awarded to */}
          <div className="mt-3 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Awarded to
          </div>
          <div className="mt-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            @{handle}
          </div>

          {badgeAward?.badgeDescription && (
            <p className="mt-2 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
              {badgeAward.badgeDescription}
            </p>
          )}

          <div className="my-3 border-t border-dashed border-amber-800/10 dark:border-amber-300/10" />

          {/* Seal + Verification */}
          <div className="flex items-start gap-3 text-left">
            {/* Seal */}
            <div
              className={`badge-seal shrink-0${verifyResult?.verified ? " badge-seal-verified" : ""}`}
            >
              <svg
                aria-hidden="true"
                width="52"
                height="52"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <polygon points="50,4 59.3,15.2 73,10.2 75.5,24.5 89.8,27 84.8,40.7 96,50 84.8,59.3 89.8,73 75.5,75.5 73,89.8 59.3,84.8 50,96 40.7,84.8 27,89.8 24.5,75.5 10.2,73 15.2,59.3 4,50 15.2,40.7 10.2,27 24.5,24.5 27,10.2 40.7,15.2" />
                <circle
                  cx="50"
                  cy="50"
                  r="26"
                  fill={verifyResult?.verified ? "#f0fdf4" : "#fefcf3"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="dark:!fill-transparent"
                />
                <polygon
                  points="50,35 54.1,44.3 64.3,45.4 56.7,52.2 58.8,62.1 50,57 41.2,62.1 43.3,52.2 35.7,45.4 45.9,44.3"
                  fill="currentColor"
                  opacity={verifyResult?.verified ? "1" : "0.5"}
                />
              </svg>
            </div>

            {/* Verification content */}
            <div className="min-w-0 flex-1 pt-1">
              {!verifyResult?.verified ? (
                <>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    Signed by:{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      ATmosphereConf
                    </span>
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="mt-1.5 inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CircleCheck className="size-2.5" />
                        Verify signature
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="rounded bg-emerald-50/80 px-2 py-1.5 dark:bg-emerald-900/20">
                  <span className="inline-flex rounded-full bg-emerald-500 px-1.5 py-px text-[9px] font-bold tracking-wide text-white dark:bg-emerald-600">
                    VERIFIED
                  </span>
                  <div className="mt-1 truncate text-[10px] font-medium text-gray-600 dark:text-gray-300">
                    {verifyResult.issuerHandle
                      ? `@${verifyResult.issuerHandle}`
                      : verifyResult.issuerDisplayName ||
                        verifyResult.issuerDid}
                  </div>
                  {verifyResult.issuerDid &&
                    (verifyResult.issuerHandle ||
                      verifyResult.issuerDisplayName) && (
                      <div className="mt-0.5 truncate font-mono text-[9px] text-gray-400 dark:text-gray-500">
                        {verifyResult.issuerDid}
                      </div>
                    )}
                  <p className="mt-1 text-[9px] text-gray-400 dark:text-gray-500">
                    Verified on the open web
                  </p>
                </div>
              )}
              {verifyResult && !verifyResult.verified && (
                <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                  {verifyResult.error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-2 flex items-center gap-2">
        {badgeAward?.pdsUrl && (
          <a
            href={badgeAward.pdsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 hover:underline dark:text-gray-500 dark:hover:text-gray-300"
          >
            <ExternalLink aria-hidden="true" className="size-2.5" />
            View on PDS
          </a>
        )}
        {canUnclaim && (
          <button
            onClick={handleUnclaim}
            disabled={unclaiming}
            className="ml-auto inline-flex items-center gap-1 text-[10px] text-red-300 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-red-500/40 dark:hover:text-red-300"
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
        <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">
          {unclaimError}
        </p>
      )}
    </div>
  );
}
