import { useState } from "react";
import { actions } from "astro:actions";
import { Loader2, Star } from "lucide-react";

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
            <Loader2 className="size-3.5 animate-spin" />
            Claiming your spot...
          </>
        ) : (
          <>
            <Star className="size-3.5" fill="currentColor" stroke="none" />
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
