import { useState } from "react";
import { AvatarInput } from "./AvatarInput";
import { LocationInput, type LocationData } from "./LocationInput";
import { CharCount } from "./CharCount";
import type { ProfileEditData, EditSaveData } from "../profile-types";

export function EditingProfile({
  displayName,
  description,
  bio,
  interests,
  pronouns,
  website,
  editData,
  saving = false,
  onSave,
  onCancel,
}: {
  displayName: string;
  description?: string | null;
  bio?: string | null;
  interests?: readonly string[] | null;
  pronouns?: string | null;
  website?: string | null;
  editData: ProfileEditData;
  saving?: boolean;
  onSave: (data: EditSaveData) => void;
  onCancel: () => void;
}) {
  const [editDisplayName, setEditDisplayName] = useState(
    editData.initialDisplayName ?? displayName,
  );
  const [editDescription, setEditDescription] = useState(
    editData.initialDescription ?? description ?? "",
  );
  const [editBio, setEditBio] = useState(editData.initialBio ?? bio ?? "");
  const [editInterests, setEditInterests] = useState(
    editData.initialInterests ?? interests?.join(", ") ?? "",
  );
  const [editPronouns, setEditPronouns] = useState(
    editData.initialPronouns ?? pronouns ?? "",
  );
  const [editWebsite, setEditWebsite] = useState(
    editData.initialWebsite ?? website ?? "",
  );
  const [location, setLocation] = useState<LocationData | null>(
    editData.initialLocation
      ? {
          name: editData.initialLocation.name,
          lat: 0,
          lon: 0,
          h3Index: editData.initialLocation.h3Index,
        }
      : null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPronounsField, setShowPronounsField] = useState(
    !!pronouns || !!editData.initialPronouns,
  );
  const [showWebsiteField, setShowWebsiteField] = useState(
    !!website || !!editData.initialWebsite,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Save / Cancel */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() =>
            onSave({
              displayName: editDisplayName,
              description: editDescription,
              bio: editBio,
              pronouns: editPronouns,
              website: editWebsite,
              interests: editInterests,
              location,
              avatarFile,
            })
          }
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {/* Headshot */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <div className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
            Headshot
          </div>
          <AvatarInput
            currentAvatarUrl={editData.currentAvatarUrl}
            onChange={setAvatarFile}
          />
        </div>
        <p className="text-muted-foreground text-xs sm:mt-5">
          This image will be used as your speaker headshot image, or more
          generally for anyone that wants to have a more readable version of
          their real face for finding people at the conference. This is only
          shown to logged in users, but is of course publicly available from
          your PDS under the org.atmosphereconf.profile lexicon.
        </p>
      </div>

      {/* Name */}
      <div>
        <div className="text-xs tracking-wide text-gray-500 uppercase">
          Name
        </div>
        <input
          value={editDisplayName}
          onChange={(e) => setEditDisplayName(e.target.value)}
          maxLength={64}
          placeholder="Your name"
          className="ui-input mt-1 w-full text-xl font-bold"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          This is your display name copied from your bsky profile field. For
          speakers, this will be used as your display name e.g. 'Alice Smith',
          and others may want to use it to list how you want to be called in
          person at the conference.
        </p>
      </div>

      {/* Pronouns */}
      <div>
        {showPronounsField ? (
          <>
            <div className="text-xs tracking-wide text-gray-500 uppercase">
              Pronouns
            </div>
            <input
              value={editPronouns}
              onChange={(e) => setEditPronouns(e.target.value)}
              placeholder="e.g. they/them"
              maxLength={64}
              className="ui-input mt-1 w-full"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowPronounsField(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Add pronouns
          </button>
        )}
      </div>

      {/* Website */}
      <div>
        {showWebsiteField ? (
          <>
            <div className="text-xs tracking-wide text-gray-500 uppercase">
              Website
            </div>
            <input
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
              placeholder="https://example.com"
              maxLength={256}
              className="ui-input mt-1 w-full"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowWebsiteField(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Add website
          </button>
        )}
      </div>

      {/* About */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            About
          </div>
          <CharCount value={editDescription} max={256} />
        </div>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Tell others about yourself..."
          maxLength={256}
          rows={3}
          className="ui-textarea mt-1 w-full"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          This is imported from your bsky profile description field. For
          speakers, this is your short bio that would be displayed in overview
          contexts. You can put a full bio in the bio field below.
        </p>
      </div>

      {/* Location */}
      <div>
        <div className="text-xs tracking-wide text-gray-500 uppercase">
          Location
        </div>
        <div className="mt-1">
          <LocationInput
            key={location?.h3Index || "empty"}
            value={location}
            onChange={setLocation}
            placeholder="Search for your city..."
          />
        </div>
      </div>

      {/* Interests */}
      <div>
        <div className="text-xs tracking-wide text-gray-500 uppercase">
          Interests
        </div>
        <input
          value={editInterests}
          onChange={(e) => setEditInterests(e.target.value)}
          placeholder="e.g. rust, atproto, distributed systems"
          className="ui-input mt-1 w-full"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Separate with commas
        </p>
      </div>

      {/* Bio */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Bio
          </div>
          <CharCount value={editBio} max={2000} />
        </div>
        <textarea
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
          placeholder="Write a longer bio..."
          maxLength={2000}
          rows={10}
          className="ui-textarea mt-1 w-full"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Speakers and others can put an extended bio here, up to 2000
          characters. @-mentions, #tags, and links are supported for rich text.
        </p>
      </div>
    </div>
  );
}
