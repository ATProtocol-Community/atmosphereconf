import { useState } from "react";
import { actions } from "astro:actions";
import type { BlobRef } from "@/actions/index";
import { RenderedProfile } from "./RenderedProfile";
import { EditingProfile } from "./EditingProfile";
import type { EditSaveData } from "./profile-types";

// Re-export types for existing consumers
export type { ActiveIcon, ProfileEditData } from "./profile-types";
export type { ProfileViewProps } from "./profile-types";

import type { ProfileViewProps } from "./profile-types";

export function ProfileView({
  handle,
  displayName,
  avatarUrl,
  description,
  bio,
  homeTown,
  interests,
  pronouns,
  website,
  germMessageMeUrl,
  isOwnProfile = false,
  activeIcons,
  editData,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(data: EditSaveData) {
    if (!editData) return;
    setSaving(true);
    setError(null);

    try {
      const existingBlob = editData.existingAvatarBlob;
      let avatarBlob: BlobRef | undefined = existingBlob
        ? {
            $type: "blob" as const,
            ref: {
              $link:
                typeof existingBlob.ref === "object" &&
                "$link" in existingBlob.ref
                  ? existingBlob.ref.$link
                  : String(existingBlob.ref),
            },
            mimeType: existingBlob.mimeType,
            size: existingBlob.size,
          }
        : undefined;
      if (data.avatarFile) {
        const formData = new FormData();
        formData.append("avatar", data.avatarFile);
        const { data: uploadData, error } =
          await actions.uploadAvatar(formData);
        if (error) throw new Error(error.message);
        avatarBlob = uploadData;
      }

      const interestsArray = data.interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const { error: profileError } = await actions.saveProfile({
        displayName: data.displayName || undefined,
        description: data.description || undefined,
        bio: data.bio || undefined,
        pronouns: data.pronouns || undefined,
        website: data.website || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        homeTown: data.location
          ? { name: data.location.name, value: data.location.h3Index }
          : undefined,
        avatar: avatarBlob,
      });

      if (profileError) throw new Error(profileError.message);

      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
  }

  if (isEditing && editData) {
    return (
      <div className="flex flex-col">
        {error && (
          <div className="text-destructive mb-4 text-right text-sm font-semibold">
            {error}
          </div>
        )}
        {saving && (
          <div className="text-muted-foreground mb-4 text-right text-sm">
            Saving...
          </div>
        )}
        <EditingProfile
          displayName={displayName}
          description={description}
          bio={bio}
          interests={interests}
          pronouns={pronouns}
          website={website}
          editData={editData}
          onSave={handleSave}
          onCancel={() => {
            setError(null);
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <RenderedProfile
      did=""
      handle={handle}
      displayName={displayName}
      avatarUrl={avatarUrl}
      description={description}
      bio={bio}
      homeTown={homeTown}
      interests={interests}
      pronouns={pronouns}
      website={website}
      germMessageMeUrl={germMessageMeUrl}
      isOwnProfile={isOwnProfile}
      activeIcons={activeIcons}
      onEdit={() => setIsEditing(true)}
    />
  );
}
