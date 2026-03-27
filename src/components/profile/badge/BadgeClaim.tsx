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
        className="inline-flex cursor-pointer items-center gap-1.5 rounded border-2 border-dashed border-amber-500/30 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:border-amber-500/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
      >
        {claiming ? (
          <>
            <Loader2 aria-hidden="true" size={12} className="animate-spin" />
            Claiming...
          </>
        ) : (
          <>
            <Star aria-hidden="true" size={12} />
            Claim badge
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
