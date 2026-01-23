import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { graphql } from "@/lib/graphql";
import { isAuthenticated, query, mutate } from "@/lib/client";
import type { ProfileSettingsPageQuery } from "./__generated__/ProfileSettingsPageQuery.graphql";
import type { ProfileSettingsPageUploadBlobMutation } from "./__generated__/ProfileSettingsPageUploadBlobMutation.graphql";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { AvatarInput } from "./AvatarInput";
import { LocationInput, type LocationData } from "./LocationInput";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const SETTINGS_QUERY = graphql`
  query ProfileSettingsPageQuery {
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
  mutation ProfileSettingsPageUploadBlobMutation($data: String!, $mimeType: String!) {
    uploadBlob(data: $data, mimeType: $mimeType) {
      ref
      mimeType
      size
    }
  }
`;

const CREATE_PROFILE_MUTATION = graphql`
  mutation ProfileSettingsPageCreateProfileMutation($input: OrgAtmosphereconfProfileInput!) {
    createOrgAtmosphereconfProfile(input: $input, rkey: "self") {
      uri
    }
  }
`;

const UPDATE_PROFILE_MUTATION = graphql`
  mutation ProfileSettingsPageUpdateProfileMutation($input: OrgAtmosphereconfProfileInput!) {
    updateOrgAtmosphereconfProfile(rkey: "self", input: $input) {
      uri
    }
  }
`;

const profileFormSchema = z.object({
  displayName: z.string().max(64, "Display name must be 64 characters or less").optional(),
  description: z.string().max(256, "Bio must be 256 characters or less").optional(),
  interests: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type ViewerData = ProfileSettingsPageQuery["response"];

export function ProfileSettingsPage() {
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
  const [fallbackChar, setFallbackChar] = useState("U");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      description: "",
      interests: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
          window.location.href = "/login";
          return;
        }

        const data = await query<ViewerData>(SETTINGS_QUERY);
        if (!data.viewer) {
          setError("Not authenticated");
          return;
        }

        const confProfile = data.viewer.orgAtmosphereconfProfileByDid;
        const bskyProfile = data.viewer.appBskyActorProfileByDid;

        setHasExistingProfile(!!confProfile);

        // Pre-populate form
        const name = confProfile?.displayName || bskyProfile?.displayName || "";
        setFallbackChar(name.charAt(0).toUpperCase() || "U");

        form.reset({
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

        setCurrentAvatarUrl(confProfile?.avatar?.url || bskyProfile?.avatar?.url || null);

        // Store existing avatar blob so we can preserve it on submit
        if (confProfile?.avatar) {
          setExistingAvatarBlob({
            ref: confProfile.avatar.ref,
            mimeType: confProfile.avatar.mimeType,
            size: confProfile.avatar.size,
          });
        }
      } catch (err: any) {
        console.error("Profile load error:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [form]);

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    setError(null);

    try {
      let avatarBlob = undefined;

      // Upload avatar if changed
      if (avatarFile) {
        const base64 = await fileToBase64(avatarFile);
        const blobResult = await mutate<ProfileSettingsPageUploadBlobMutation["response"]>(
          UPLOAD_BLOB_MUTATION,
          { data: base64, mimeType: avatarFile.type }
        );
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
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save profile");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full px-4">
        <Card className="max-w-2xl mx-auto mt-8 p-8 text-center">
          <div className="flex justify-center mb-4">
            <Spinner />
          </div>
          <p className="text-gray-600">Loading settings...</p>
        </Card>
      </div>
    );
  }

  if (error && !saving) {
    return (
      <div className="w-full px-4">
        <Card className="max-w-2xl mx-auto mt-8 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button asChild>
            <a href="/profile">Back to Profile</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <Card className="max-w-2xl mx-auto mt-8 p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <a href="/profile">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <AvatarInput
                  currentAvatarUrl={currentAvatarUrl}
                  fallback={fallbackChar}
                  onChange={setAvatarFile}
                />
              </FormControl>
              <FormDescription>PNG or JPEG, max 1MB</FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" maxLength={64} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell others about yourself..."
                      maxLength={256}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Home Town</FormLabel>
              <FormControl>
                <LocationInput
                  value={location}
                  onChange={setLocation}
                  placeholder="Search for your city..."
                />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interests</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. rust, atproto, distributed systems"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Separate with commas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" asChild>
                <a href="/profile">Cancel</a>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
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
