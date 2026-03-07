import { useState } from "react";
import {
  ActorAutocomplete,
  type Actor,
} from "@/components/profile/ActorAutocomplete";

export function LoginForm({ error: serverError }: { error?: string | null }) {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(serverError || null);

  function handleActorSelect(actor: Actor) {
    setHandle(actor.handle);
  }

  return (
    <>
      <form className="flex flex-col gap-4" method="POST" action="/oauth/login">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="handle"
            className="flex items-center gap-2 text-sm leading-none font-medium select-none"
          >
            Handle
          </label>
          <ActorAutocomplete
            id="handle"
            name="atproto-id"
            placeholder="you.bsky.social"
            value={handle}
            onChange={setHandle}
            onSelect={handleActorSelect}
          />
        </div>
        <button
          type="submit"
          disabled={!handle?.length}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-6"
        >
          Sign In
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
}
