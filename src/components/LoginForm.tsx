import { useState } from "react";
import { login } from "../lib/client";
import { ActorAutocomplete, type Actor } from "@/components/ActorAutocomplete";

export function LoginForm({ error: serverError }: { error?: string | null }) {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(serverError || null);
  const [submitting, setSubmitting] = useState(false);

  function handleLogin(handleValue: string) {
    const trimmedHandle = handleValue.trim();
    if (!trimmedHandle) {
      setError("Please enter your Bluesky handle");
      return;
    }

    setError(null);
    setSubmitting(true);
    login(trimmedHandle);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleLogin(handle);
  }

  function handleActorSelect(actor: Actor) {
    setHandle(actor.handle);
    handleLogin(actor.handle);
  }

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="handle"
            className="flex items-center gap-2 text-sm leading-none font-medium select-none"
          >
            Handle
          </label>
          <ActorAutocomplete
            id="handle"
            name="handle"
            placeholder="you.bsky.social"
            value={handle}
            onChange={setHandle}
            onSelect={handleActorSelect}
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-6"
        >
          {submitting ? "Redirecting..." : "Sign In"}
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
