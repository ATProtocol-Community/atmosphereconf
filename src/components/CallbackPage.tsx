import { useEffect, useState } from "react";
import { handleCallback } from "../lib/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function CallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      const errorDesc = params.get("error_description");

      if (urlError) {
        setError(errorDesc || urlError);
        return;
      }

      if (!params.has("code")) {
        setError("No authorization code received");
        return;
      }

      try {
        await handleCallback();
        window.history.replaceState({}, document.title, "/callback");
        window.location.href = "/profile";
      } catch (err: any) {
        console.error("Callback error:", err);
        setError(err.message || "Authentication failed");
      }
    }

    processCallback();
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 text-center">
        {error ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button asChild>
              <a href="/login">Try Again</a>
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <Spinner />
            </div>
            <p className="text-gray-600">Completing sign in...</p>
          </>
        )}
      </Card>
    </div>
  );
}
