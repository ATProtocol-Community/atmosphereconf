import { useState } from "react";
import { login } from "../lib/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActorAutocomplete, type Actor } from "@/components/ActorAutocomplete";

export function LoginForm() {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(handleValue: string) {
    const trimmedHandle = handleValue.trim();
    if (!trimmedHandle) {
      setError("Please enter your Bluesky handle");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(trimmedHandle);
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Login failed: " + (err.message || "Unknown error"));
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleLogin(handle);
  }

  function handleActorSelect(actor: Actor) {
    setHandle(actor.handle);
    handleLogin(actor.handle);
  }

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="handle">Handle</Label>
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
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Redirecting..." : "Sign In"}
        </Button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
}
