import { useEffect, useState } from "react";
import { graphql } from "../lib/graphql";
import { isAuthenticated, logout, query } from "../lib/client";
import type { ProfilePageQuery } from "./__generated__/ProfilePageQuery.graphql";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProfileField } from "./ProfileField";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const VIEWER_PROFILE_QUERY = graphql`
  query ProfilePageQuery {
    viewer {
      did
      handle
      appBskyActorProfileByDid {
        displayName
        description
        avatar {
          url(preset: "avatar")
        }
      }
      orgAtmosphereconfProfileByDid {
        displayName
        description
        homeTown {
          name
          value
        }
        interests
        avatar {
          url(preset: "avatar")
        }
        createdAt
      }
    }
  }
`;

type Viewer = NonNullable<ProfilePageQuery["response"]["viewer"]>;

export function ProfileContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
          window.location.href = "/login";
          return;
        }

        const data = await query<ProfilePageQuery["response"]>(VIEWER_PROFILE_QUERY);
        if (!data.viewer) {
          setError("Not authenticated");
        } else {
          setViewer(data.viewer);
        }
      } catch (err: any) {
        console.error("Profile load error:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    try {
      await logout();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/";
    }
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Spinner />
        </div>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (error || !viewer) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error || "Not authenticated"}</p>
        <Button asChild>
          <a href="/login">Sign In</a>
        </Button>
      </div>
    );
  }

  const confProfile = viewer.orgAtmosphereconfProfileByDid;
  const bskyProfile = viewer.appBskyActorProfileByDid;
  const displayName = confProfile?.displayName || bskyProfile?.displayName ||
    viewer.handle || "User";
  const avatarUrl = confProfile?.avatar?.url || bskyProfile?.avatar?.url;

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="size-16">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-xl">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-gray-500">
            {viewer.handle ? `@${viewer.handle}` : viewer.did}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" asChild>
            <a href="/profile/settings">
              <Settings className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="secondary" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </div>

      {confProfile
        ? (
          <>
            {confProfile.description && (
              <ProfileField label="Bio">
                {confProfile.description}
              </ProfileField>
            )}
            {confProfile.homeTown?.name && (
              <ProfileField label="Location">
                {confProfile.homeTown.name}
              </ProfileField>
            )}
            {confProfile.interests && confProfile.interests.length > 0 && (
              <ProfileField label="Interests">
                <div className="flex flex-wrap gap-2">
                  {confProfile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </ProfileField>
            )}
            {!confProfile.description && !confProfile.homeTown?.name &&
              (!confProfile.interests ||
                confProfile.interests.length === 0) &&
              <p className="text-gray-400 italic">No conference profile details yet.</p>}
          </>
        )
        : <p className="text-gray-400 italic">No conference profile yet.</p>}
    </>
  );
}
