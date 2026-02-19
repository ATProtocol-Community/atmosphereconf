import type { profileRegularQuery as HeaderQuery } from "./__generated__/profileRegularQuery.graphql";
import type { profileFullQuery as ProfilePageQuery } from "./__generated__/profileFullQuery.graphql";

import { graphql } from "./graphql";
import type { AstroCookies } from "astro";

const VIEWER_QUERY = graphql`
  query profileRegularQuery {
    viewer {
      did
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

const VIEWER_PROFILE_QUERY = graphql`
  query profileFullQuery {
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

type ViewerRegular = NonNullable<HeaderQuery["response"]["viewer"]>;
type ViewerFull = NonNullable<ProfilePageQuery["response"]["viewer"]>;

type Profile<T extends "regular" | "full" = "regular"> = {
  did: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string;
  bskyProfile: (T extends "full"
    ? ViewerFull
    : ViewerRegular)["appBskyActorProfileByDid"];
  confProfile: (T extends "full"
    ? ViewerFull
    : ViewerRegular)["orgAtmosphereconfProfileByDid"];
};

export const maybeGetLoggedInProfile = async <
  T extends "regular" | "full" = "regular",
>({
  request,
  cookies,
  type = "regular" as T,
}: {
  request: Request;
  cookies: AstroCookies;
  type?: T;
}): Promise<Profile<T> | null> => {
  if (!cookies?.get("access_token")?.value) {
    return null;
  }

  try {
    const response = await fetch(
      new URL("/api/graphql", new URL(request.url)),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: we cannot get this from Astro cookies somehow
          cookie: request.headers.get("cookie")?.toString() ?? "",
        },
        body: JSON.stringify({
          query: type == "full" ? VIEWER_PROFILE_QUERY : VIEWER_QUERY,
        }),
      },
    );

    if (response.ok) {
      const { data } = await response.json();

      const viewer = data.viewer as ViewerRegular | ViewerFull | undefined;
      if (!viewer) {
        return null;
      }

      const { orgAtmosphereconfProfileByDid, appBskyActorProfileByDid } =
        viewer;

      return {
        did: viewer.did,
        handle: viewer.handle ?? null,
        displayName:
          orgAtmosphereconfProfileByDid?.displayName ||
          appBskyActorProfileByDid?.displayName ||
          viewer.handle ||
          "?",
        avatarUrl:
          viewer.orgAtmosphereconfProfileByDid?.avatar?.url ||
          viewer.appBskyActorProfileByDid?.avatar?.url ||
          "",
        bskyProfile: viewer.appBskyActorProfileByDid,
        confProfile: viewer.orgAtmosphereconfProfileByDid,
      };
    }
  } catch (error: unknown) {
    console.error("Error getting logged in profile:", error);
  }
  return null;
};
