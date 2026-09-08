import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ActorAutocomplete, type Actor } from "./ActorAutocomplete";

export function LoginForm({ error: serverError }: { error?: string | null }) {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(serverError || null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleActorSelect(actor: Actor) {
    flushSync(() => {
      setHandle(actor.handle);
      setLoading(true);
    });
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        className="flex flex-col gap-4"
        method="POST"
        action="/oauth/login"
      >
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
          disabled={!handle?.length || loading}
          className="focus-visible:border-ring focus-visible:ring-ring/50 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        >
          Sign In
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </>
  );
}
