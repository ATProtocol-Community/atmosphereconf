import { useState } from "react";
import { actions } from "astro:actions";

interface BadgeClaimProps {
  onSuccess: () => void;
}

export function BadgeClaim({ onSuccess }: BadgeClaimProps) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const result = await actions.claimBadge();
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm transition-colors hover:border-amber-400 hover:from-amber-200/80 hover:via-yellow-100 hover:to-amber-200/80 disabled:opacity-60 dark:border-amber-600/60 dark:from-amber-900/25 dark:via-yellow-900/15 dark:to-amber-900/25 dark:text-amber-200 dark:hover:border-amber-500"
      >
        {claiming ? (
          <>
            <svg
              className="size-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Claiming your spot...
          </>
        ) : (
          <>
            <svg
              className="size-3.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Join the flock
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
