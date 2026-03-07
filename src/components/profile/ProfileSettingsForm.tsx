import { useState } from "react";
import { actions } from "astro:actions";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AvatarInput } from "./AvatarInput";
import { LocationInput, type LocationData } from "./LocationInput";
import type { BlobRef } from "@/actions/index";

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

interface ProfileSettingsProps {
  initialValues: {
    displayName: string;
    description: string;
    interests: string;
  };
  initialLocation: { name: string; h3Index: string } | null;
  currentAvatarUrl: string | null;
  existingAvatarBlob: BlobRef | null;
}

export function ProfileSettingsForm({
  initialValues,
  initialLocation,
  currentAvatarUrl,
  existingAvatarBlob,
}: ProfileSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [location, setLocation] = useState<LocationData | null>(
    initialLocation
      ? {
          name: initialLocation.name,
          lat: 0,
          lon: 0,
          h3Index: initialLocation.h3Index,
        }
      : null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    setError(null);

    try {
      let avatarBlob: BlobRef | undefined = existingAvatarBlob ?? undefined;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const { data, error } = await actions.uploadAvatar(formData);
        if (error) throw new Error(error.message);
        avatarBlob = data;
      }

      const interestsArray = (values.interests || "")
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const { error: saveError } = await actions.saveProfile({
        displayName: values.displayName || undefined,
        description: values.description || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        homeTown: location
          ? { name: location.name, value: location.h3Index }
          : undefined,
        avatar: avatarBlob,
      });
      if (saveError) throw new Error(saveError.message);

      window.location.href = "/profile";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
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
