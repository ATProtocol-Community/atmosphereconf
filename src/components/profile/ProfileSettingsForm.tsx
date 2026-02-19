import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { graphql } from "@/lib/graphql";
import { query, mutate } from "@/lib/client";
import type { ProfileSettingsFormQuery } from "./__generated__/ProfileSettingsFormQuery.graphql";
import type { ProfileSettingsFormUploadBlobMutation } from "./__generated__/ProfileSettingsFormUploadBlobMutation.graphql";
import { Spinner } from "@/components/ui/Spinner";
import { AvatarInput } from "./AvatarInput";
import { LocationInput, type LocationData } from "./LocationInput";

const SETTINGS_QUERY = graphql`
  query ProfileSettingsFormQuery {
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
        description
        homeTown {
          name
          value
        }
        interests
        avatar {
          ref
          mimeType
          size
          url(preset: "avatar")
        }
      }
    }
  }
`;

const UPLOAD_BLOB_MUTATION = graphql`
  mutation ProfileSettingsFormUploadBlobMutation(
    $data: String!
    $mimeType: String!
  ) {
    uploadBlob(data: $data, mimeType: $mimeType) {
      ref
      mimeType
      size
    }
  }
`;

const CREATE_PROFILE_MUTATION = graphql`
  mutation ProfileSettingsFormCreateProfileMutation(
    $input: OrgAtmosphereconfProfileInput!
  ) {
    createOrgAtmosphereconfProfile(input: $input, rkey: "self") {
      uri
    }
  }
`;

const UPDATE_PROFILE_MUTATION = graphql`
  mutation ProfileSettingsFormUpdateProfileMutation(
    $input: OrgAtmosphereconfProfileInput!
  ) {
    updateOrgAtmosphereconfProfile(rkey: "self", input: $input) {
      uri
    }
  }
`;

const profileFormSchema = z.object({
  displayName: z
    .string()
    .max(64, "Display name must be 64 characters or less")
    .optional(),
  description: z
    .string()
    .max(256, "Bio must be 256 characters or less")
    .optional(),
  interests: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type ViewerData = ProfileSettingsFormQuery["response"];

export function ProfileSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  // Non-form state (not easily handled by react-hook-form)
  const [location, setLocation] = useState<LocationData | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [existingAvatarBlob, setExistingAvatarBlob] = useState<{
    ref: string;
    mimeType: string;
    size: number;
  } | null>(null);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      description: "",
      interests: "",
    },
  });

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const data = await query<ViewerData>(SETTINGS_QUERY);
        if (!isActive) return;
        if (!data.viewer) {
          setError("Not authenticated");
          return;
        }

        const confProfile = data.viewer.orgAtmosphereconfProfileByDid;
        const bskyProfile = data.viewer.appBskyActorProfileByDid;

        setHasExistingProfile(!!confProfile);

        // Pre-populate form
        const name = confProfile?.displayName || bskyProfile?.displayName || "";

        reset({
          displayName: name,
          description: confProfile?.description || "",
          interests: confProfile?.interests?.join(", ") || "",
        });

        if (confProfile?.homeTown) {
          setLocation({
            name: confProfile.homeTown.name || "",
            lat: 0,
            lon: 0,
            h3Index: confProfile.homeTown.value,
          });
        }

        setCurrentAvatarUrl(
          confProfile?.avatar?.url || bskyProfile?.avatar?.url || null,
        );

        // Store existing avatar blob so we can preserve it on submit
        if (confProfile?.avatar) {
          setExistingAvatarBlob({
            ref: confProfile.avatar.ref,
            mimeType: confProfile.avatar.mimeType,
            size: confProfile.avatar.size,
          });
        }
      } catch (err: unknown) {
        if (!isActive) return;
        console.error("Profile load error:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isActive = false;
    };
  }, [reset]);

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    setError(null);

    try {
      let avatarBlob = undefined;

      // Upload avatar if changed
      if (avatarFile) {
        const base64 = await fileToBase64(avatarFile);
        const blobResult = await mutate<
          ProfileSettingsFormUploadBlobMutation["response"]
        >(UPLOAD_BLOB_MUTATION, { data: base64, mimeType: avatarFile.type });
        avatarBlob = {
          ref: blobResult.uploadBlob.ref,
          mimeType: blobResult.uploadBlob.mimeType,
          size: blobResult.uploadBlob.size,
        };
      }

      // Parse interests
      const interestsArray = (values.interests || "")
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      // Build input
      const input: Record<string, unknown> = {
        displayName: values.displayName || undefined,
        description: values.description || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        createdAt: new Date().toISOString(),
      };

      if (location) {
        input.homeTown = {
          name: location.name,
          value: location.h3Index,
        };
      }

      if (avatarBlob) {
        input.avatar = avatarBlob;
      } else if (existingAvatarBlob) {
        // Preserve existing avatar if no new file was uploaded
        input.avatar = existingAvatarBlob;
      }

      // Create or update
      if (hasExistingProfile) {
        await mutate(UPDATE_PROFILE_MUTATION, { input });
      } else {
        await mutate(CREATE_PROFILE_MUTATION, { input });
      }

      window.location.href = "/profile";
    } catch (err: unknown) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Spinner />
        </div>
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (error && !saving) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <a
          href="/profile"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
        >
          Back to Profile
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <a
          href="/profile"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-9"
          aria-label="Back to profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Avatar</label>
          <AvatarInput
            currentAvatarUrl={currentAvatarUrl}
            onChange={setAvatarFile}
          />
          <p className="text-sm text-muted-foreground">PNG or JPEG, max 1MB</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="displayName">
            Display Name
          </label>
          <input
            id="displayName"
            placeholder="Your name"
            maxLength={64}
            className="ui-input"
            aria-invalid={!!errors.displayName}
            {...register("displayName")}
          />
          {errors.displayName?.message && (
            <p className="text-destructive text-sm">
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="description">
            Bio
          </label>
          <textarea
            id="description"
            placeholder="Tell others about yourself..."
            maxLength={256}
            rows={3}
            className="ui-textarea"
            aria-invalid={!!errors.description}
            {...register("description")}
          />
          {errors.description?.message && (
            <p className="text-destructive text-sm">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Home Town</label>
          <LocationInput
            key={location?.h3Index || "empty"}
            value={location}
            onChange={setLocation}
            placeholder="Search for your city..."
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="interests">
            Interests
          </label>
          <input
            id="interests"
            placeholder="e.g. rust, atproto, distributed systems"
            className="ui-input"
            aria-invalid={!!errors.interests}
            {...register("interests")}
          />
          <p className="text-sm text-muted-foreground">Separate with commas</p>
          {errors.interests?.message && (
            <p className="text-destructive text-sm">
              {errors.interests.message}
            </p>
          )}
        </div>

        {error && <div className="text-destructive text-sm">{error}</div>}

        <div className="flex justify-end gap-3">
          <a
            href="/profile"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
