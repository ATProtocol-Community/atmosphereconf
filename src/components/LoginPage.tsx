import { useState } from "react";
import { login } from "../lib/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActorAutocomplete, type Actor } from "@/components/ActorAutocomplete";

export function LoginPage() {
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
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Sign In
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Sign in with your AT Protocol account
        </p>

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

        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an AT Protocol account?{" "}
          <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener"
            className="text-[#667eea] font-medium hover:underline"
          >
            Sign up
          </a>
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}
