import type { BlobRef } from "@/actions/index";
import type { LocationData } from "./LocationInput";

export type ActiveIcon = {
  label: string;
  html: string;
  href?: string;
};

export interface ProfileEditData {
  initialDisplayName: string;
  initialDescription: string;
  initialBio: string;
  initialInterests: string;
  initialPronouns: string;
  initialWebsite: string;
  initialLocation: { name: string; h3Index: string } | null;
  currentAvatarUrl: string | null;
  existingAvatarBlob: BlobRef | null;
}

export interface ProfileViewProps {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  description?: string | null;
  bio?: string | null;
  homeTown?: { name?: string | null; value?: string } | null;
  interests?: readonly string[] | null;
  pronouns?: string | null;
  website?: string | null;
  germMessageMeUrl?: string | null;
  isOwnProfile?: boolean;
  activeIcons: ActiveIcon[];
  editData?: ProfileEditData;
}

export interface EditSaveData {
  displayName: string;
  description: string;
  bio: string;
  pronouns: string;
  website: string;
  interests: string;
  location: LocationData | null;
  avatarFile: File | null;
}
