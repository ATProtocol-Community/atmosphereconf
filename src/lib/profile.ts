import { getBlueskyAgent, getPdsAgent } from "@fujocoded/authproto/helpers";

type BskyProfile = {
  displayName?: string;
  description?: string;
  avatar?: string;
};

type ConfProfile = {
  displayName?: string;
  description?: string;
  homeTown?: { name: string; value: string };
  interests?: string[];
  avatar?: { ref: { $link: string }; mimeType: string; size: number };
  createdAt?: string;
};

type Profile<T extends "regular" | "full" = "regular"> = {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  bskyProfile: BskyProfile | null;
  confProfile: T extends "full" ? ConfProfile | null : null;
};

export const maybeGetLoggedInProfile = async <
  T extends "regular" | "full" = "regular",
>({
  locals,
  type = "regular" as T,
}: {
  locals: App.Locals;
  type?: T;
}): Promise<Profile<T> | null> => {
  const { loggedInUser } = locals;
  if (!loggedInUser) return null;

  try {
    // Use public API — no auth scope needed for reading profiles
    const bskyAgent = await getBlueskyAgent();
    if (!bskyAgent) return null;

    const { data: bskyProfile } = await bskyAgent.app.bsky.actor.getProfile({
      actor: loggedInUser.did,
    });

    let confProfile: ConfProfile | null = null;
    if (type === "full") {
      const pdsAgent = await getPdsAgent({ loggedInUser });
      if (pdsAgent) {
        try {
          const { data } = await pdsAgent.com.atproto.repo.getRecord({
            repo: loggedInUser.did,
            collection: "org.atmosphereconf.profile",
            rkey: "self",
          });
          confProfile = data.value as ConfProfile;
        } catch {
          // No conf profile record yet
        }
      }
    }

    return {
      did: loggedInUser.did,
      handle: loggedInUser.handle,
      displayName:
        confProfile?.displayName ||
        bskyProfile.displayName ||
        loggedInUser.handle ||
        "?",
      avatarUrl: bskyProfile.avatar || "",
      bskyProfile,
      confProfile: (type === "full" ? confProfile : null) as Profile<T>["confProfile"],
    };
  } catch (error) {
    console.error("Error getting logged in profile:", error);
    return null;
  }
};
