import { useEffect, useState } from "react";
import { graphql } from "../lib/graphql";
import { isAuthenticated, query } from "../lib/client";
import type { HeaderQuery } from "./__generated__/HeaderQuery.graphql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const VIEWER_QUERY = graphql`
  query HeaderQuery {
    viewer {
      handle
      appBskyActorProfileByDid {
        displayName
        avatar {
          url(preset: "avatar")
        }
      }
      orgAtmosphereconfProfileByDid {
        displayName
        avatar {
          url(preset: "avatar")
        }
      }
    }
  }
`;

type Viewer = NonNullable<HeaderQuery["response"]["viewer"]>;

export function Header() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          const data = await query<HeaderQuery["response"]>(VIEWER_QUERY);
          if (data.viewer) {
            setViewer(data.viewer);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const avatarUrl = viewer?.orgAtmosphereconfProfileByDid?.avatar?.url ||
    viewer?.appBskyActorProfileByDid?.avatar?.url;
  const displayName = viewer?.orgAtmosphereconfProfileByDid?.displayName ||
    viewer?.appBskyActorProfileByDid?.displayName ||
    viewer?.handle || "U";

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-white/10 h-14">
      <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
        <a href="/" className="font-semibold text-white">Atmosphere Conf 2026</a>
        <div className="h-8 flex items-center">
          {!loading && viewer ? (
            <a href="/profile">
              <Avatar className="cursor-pointer ring-2 ring-white/50 hover:ring-white">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </a>
          ) : !loading && (
            <Button asChild variant="secondary" size="sm">
              <a href="/login">Sign In</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
