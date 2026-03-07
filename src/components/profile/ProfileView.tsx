import { useState } from "react";
import { actions } from "astro:actions";
import { Pencil } from "lucide-react";
import { AvatarInput } from "./AvatarInput";
import { Avatar } from "./Avatar";
import { LocationInput, type LocationData } from "./LocationInput";
import { tokenize, type Token } from "@atcute/bluesky-richtext-parser";
import type { BlobRef } from "@/actions/index";

// --- RichText rendering ---
type Segment =
  | { kind: "text"; content: string }
  | { kind: "br" }
  | { kind: "link"; href: string; text: string };

function flattenTokens(tokens: Token[]): Segment[] {
  return tokens.flatMap((token): Segment[] => {
    switch (token.type) {
      case "mention":
        return [
          {
            kind: "link",
            href: `https://bsky.app/profile/${token.handle}`,
            text: token.raw,
          },
        ];
      case "topic":
        return [
          {
            kind: "link",
            href: `https://bsky.app/search?q=${encodeURIComponent("#" + token.name)}`,
            text: token.raw,
          },
        ];
      case "autolink":
        return [{ kind: "link", href: token.url, text: token.raw }];
      case "link":
        return [
          {
            kind: "link",
            href: token.url,
            text: token.children.map((c) => c.raw).join(""),
          },
        ];
      case "escape":
        return [{ kind: "text", content: token.escaped }];
      default: {
        const parts = token.raw.split("\n");
        return parts.flatMap((part, i): Segment[] =>
          i < parts.length - 1
            ? [{ kind: "text", content: part }, { kind: "br" }]
            : [{ kind: "text", content: part }],
        );
      }
    }
  });
}

function RichText({ text, className }: { text: string; className?: string }) {
  const segments = flattenTokens(tokenize(text));
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {seg.text}
          </a>
        ) : seg.kind === "br" ? (
          <br key={i} />
        ) : (
          <span key={i}>{seg.content}</span>
        ),
      )}
    </span>
  );
}

// --- Germ button ---
function GermButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-1.5 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200/70"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7EE35A]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-3.5"
        >
          <g clipPath="url(#germ-clip)">
            <path
              d="M9.97852 2.31976C10.9816 4.81045 13.9828 5.28448 15.4834 3.19552C15.6921 2.89824 15.9489 2.6572 16.0371 2.6572C16.3501 2.6572 18.2841 4.7301 18.6933 5.50945C19.2791 6.62624 19.247 6.65838 18.1476 6.32093C15.018 5.34876 12.4742 6.21648 11.1742 8.69111C10.2112 10.539 11.1822 13.4475 13.0841 14.3956C14.1674 14.9339 14.7933 14.8054 16.2378 13.7207C18.0513 12.3629 19.0303 13.1342 17.626 14.8134C15.652 17.1836 12.3378 18.2039 9.32852 17.3764C8.21309 17.0711 8.11679 16.9506 8.20506 15.9623C8.35753 14.3956 7.77173 12.7405 6.63223 11.5112C5.68532 10.4908 5.75754 10.2739 7.2421 9.7838C10.797 8.59469 10.8933 4.15162 7.38655 3.17945C6.99334 3.06696 6.6884 2.92234 6.71247 2.85807C6.79272 2.62507 9.08778 1.50024 9.56926 1.46007C9.60136 1.46007 9.78592 1.84572 9.97852 2.31976Z"
              fill="#4183FF"
            />
            <path
              d="M18.1316 7.74304C19.7445 8.54648 19.9773 9.14104 19.4958 11.1979L19.4935 11.2075C19.255 12.2183 19.2534 12.2252 18.7415 11.8728C17.8587 11.2782 17.0563 11.463 15.5316 12.6039C14.2637 13.56 13.8625 13.568 12.9797 12.6441C10.1791 9.71149 14.2637 5.83083 18.1316 7.74304Z"
              fill="#22F137"
            />
            <path
              d="M6.50383 4.35248C8.08469 4.64976 8.71864 5.3809 8.55012 6.71462C8.42975 7.65466 8.03654 8.05638 6.6563 8.62683C4.30507 9.599 4.04026 10.5631 5.62914 12.3789C6.45568 13.327 6.82482 14.1706 6.89704 15.2714C6.96926 16.4122 6.88902 16.4122 5.66927 15.1589C3.20569 12.6521 2.61989 9.15711 4.13655 5.96741C4.96309 4.24 5.15569 4.10341 6.50383 4.35248Z"
              fill="#22F137"
            />
            <path
              d="M13.7581 1.58862C14.7371 1.89393 14.681 1.83769 14.4483 2.28762C13.6618 3.80614 11.1341 3.15534 11.1341 1.43596C11.1341 1.10655 12.4341 1.18689 13.7581 1.58862Z"
              fill="#22F137"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9.40876 0.19865C2.66804 1.65289 -0.260969 9.79987 3.97606 15.3115C8.39765 21.0723 17.6983 19.7867 20.3143 13.0378C23.1069 5.83083 16.952 -1.41628 9.40876 0.19865ZM14.4483 2.28762C14.681 1.83769 14.7371 1.89393 13.7581 1.58862C12.4341 1.18689 11.1341 1.10655 11.1341 1.43596C11.1341 3.15534 13.6618 3.80614 14.4483 2.28762ZM15.4834 3.19552C13.9828 5.28448 10.9816 4.81045 9.97852 2.31976C9.78592 1.84572 9.60136 1.46007 9.56926 1.46007C9.08778 1.50024 6.79272 2.62507 6.71247 2.85807C6.6884 2.92234 6.99334 3.06696 7.38655 3.17945C10.8933 4.15162 10.797 8.59469 7.2421 9.7838C5.75754 10.2739 5.68532 10.4908 6.63223 11.5112C7.77173 12.7405 8.35753 14.3956 8.20506 15.9623C8.11679 16.9506 8.21309 17.0711 9.32852 17.3764C12.3378 18.2039 15.652 17.1836 17.626 14.8134C19.0303 13.1342 18.0513 12.3629 16.2378 13.7207C14.7933 14.8054 14.1674 14.9339 13.0841 14.3956C11.1822 13.4475 10.2112 10.539 11.1742 8.69111C12.4742 6.21648 15.018 5.34876 18.1476 6.32093C19.247 6.65838 19.2791 6.62624 18.6933 5.50945C18.2841 4.7301 16.3501 2.6572 16.0371 2.6572C15.9489 2.6572 15.6921 2.89824 15.4834 3.19552ZM8.55012 6.71462C8.71864 5.3809 8.08469 4.64976 6.50383 4.35248C5.15569 4.10341 4.96309 4.24 4.13655 5.96741C2.61989 9.15711 3.20569 12.6521 5.66927 15.1589C6.88902 16.4122 6.96926 16.4122 6.89704 15.2714C6.82482 14.1706 6.45568 13.327 5.62914 12.3789C4.04026 10.5631 4.30507 9.599 6.6563 8.62683C8.03654 8.05638 8.42975 7.65466 8.55012 6.71462ZM19.4958 11.1979C19.9773 9.14104 19.7445 8.54648 18.1316 7.74304C14.2637 5.83083 10.1791 9.71149 12.9797 12.6441C13.8625 13.568 14.2637 13.56 15.5316 12.6039C17.0563 11.463 17.8587 11.2782 18.7415 11.8728C19.2534 12.2252 19.255 12.2183 19.4935 11.2075L19.4958 11.1979Z"
              fill="black"
            />
            <path
              d="M11.11 21.3936C11.0939 21.4097 10.5402 21.4579 9.89025 21.4981C7.15383 21.6668 5.5489 22.5586 6.71247 23.2657C8.25321 24.2057 14.7371 24.2057 16.2779 23.2657C17.3853 22.5988 15.9248 21.707 13.4211 21.5222C11.4711 21.3776 11.1501 21.3615 11.11 21.3936Z"
              fill="black"
            />
          </g>
          <defs>
            <clipPath id="germ-clip">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </span>
      Germ DM
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </svg>
    </a>
  );
}

// --- Types ---
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

interface ProfileViewProps {
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

  // Edit form state — initialized from editData or current display values
  const [editDisplayName, setEditDisplayName] = useState(
    editData?.initialDisplayName ?? displayName,
  );
  const [editDescription, setEditDescription] = useState(
    editData?.initialDescription ?? description ?? "",
  );
  const [editBio, setEditBio] = useState(editData?.initialBio ?? bio ?? "");
  const [editInterests, setEditInterests] = useState(
    editData?.initialInterests ?? interests?.join(", ") ?? "",
  );
  const [editPronouns, setEditPronouns] = useState(
    editData?.initialPronouns ?? pronouns ?? "",
  );
  const [editWebsite, setEditWebsite] = useState(
    editData?.initialWebsite ?? website ?? "",
  );
  const [location, setLocation] = useState<LocationData | null>(
    editData?.initialLocation
      ? {
          name: editData.initialLocation.name,
          lat: 0,
          lon: 0,
          h3Index: editData.initialLocation.h3Index,
        }
      : null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  async function handleSave() {
    if (!editData) return;
    setSaving(true);
    setError(null);

    try {
      let avatarBlob: BlobRef | undefined =
        editData.existingAvatarBlob ?? undefined;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const { data, error } = await actions.uploadAvatar(formData);
        if (error) throw new Error(error.message);
        avatarBlob = data;
      }

      const interestsArray = editInterests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const { error: profileError } = await actions.saveProfile({
        displayName: editDisplayName || undefined,
        description: editDescription || undefined,
        bio: editBio || undefined,
        pronouns: editPronouns || undefined,
        website: editWebsite || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        homeTown: location
          ? { name: location.name, value: location.h3Index }
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

  function handleCancel() {
    setEditDisplayName(editData?.initialDisplayName ?? displayName);
    setEditDescription(editData?.initialDescription ?? description ?? "");
    setEditBio(editData?.initialBio ?? bio ?? "");
    setEditInterests(editData?.initialInterests ?? interests?.join(", ") ?? "");
    setEditPronouns(editData?.initialPronouns ?? pronouns ?? "");
    setEditWebsite(editData?.initialWebsite ?? website ?? "");
    setLocation(
      editData?.initialLocation
        ? {
            name: editData.initialLocation.name,
            lat: 0,
            lon: 0,
            h3Index: editData.initialLocation.h3Index,
          }
        : null,
    );
    setAvatarFile(null);
    setError(null);
    setIsEditing(false);
  }

  const showPronouns = isEditing || !!pronouns;
  const showWebsite = isEditing || !!website;
  const showLinksRow = showPronouns || showWebsite || !!germMessageMeUrl;
  const showAbout = isEditing || !!description;
  const showBio = isEditing || !!bio;
  const showLocation = isEditing || !!homeTown?.name;
  const showInterests = isEditing || (!!interests && interests.length > 0);

  return (
    <div className="flex flex-col gap-0">
      {/* Avatar + name row */}

      {/* Error */}
      {error && (
        <div className="text-destructive mb-2 text-right text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="mb-3 flex items-center gap-4">
        {isEditing ? (
          <AvatarInput
            currentAvatarUrl={editData?.currentAvatarUrl}
            onChange={setAvatarFile}
          />
        ) : (
          <Avatar size="lg" src={avatarUrl ?? ""} alt={displayName} />
        )}

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              maxLength={64}
              placeholder="Your name"
              className="ui-input w-full text-xl font-bold"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          )}
          <p className="text-gray-500">@{handle}</p>
        </div>

        <div className="flex shrink-0 gap-2 self-start">
          {isOwnProfile && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md text-sm font-semibold transition-all"
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <form method="POST" action="/oauth/logout">
                <button
                  type="submit"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap transition-all"
                >
                  Logout
                </button>
              </form>
            </>
          )}
          {isOwnProfile && isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold whitespace-nowrap transition-all"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pronouns + website + germ */}
      {showLinksRow && (
        <div className="mb-2 flex flex-col gap-2">
          {(showPronouns || showWebsite) && (
            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <>
                  <input
                    value={editPronouns}
                    onChange={(e) => setEditPronouns(e.target.value)}
                    placeholder="Pronouns (e.g. they/them)"
                    maxLength={64}
                    className="ui-input w-40 text-xs"
                  />
                  <input
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="Website URL"
                    maxLength={256}
                    className="ui-input flex-1 text-xs"
                  />
                </>
              ) : (
                <>
                  {pronouns && (
                    <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {pronouns}
                    </span>
                  )}
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-45 items-center gap-1 truncate rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                      {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </>
              )}
            </div>
          )}
          {!isEditing && germMessageMeUrl && (
            <div>
              <GermButton href={germMessageMeUrl} />
            </div>
          )}
        </div>
      )}

      {/* About */}
      {showAbout && (
        <div className="mt-2 mb-3">
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            About
          </div>
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Tell others about yourself..."
              maxLength={256}
              rows={3}
              className="ui-textarea mt-0.5 w-full"
            />
          ) : description ? (
            <RichText
              text={description}
              className="mt-0.5 block text-gray-900"
            />
          ) : null}
        </div>
      )}

      {/* Bio */}
      {showBio && (
        <div className="mb-3">
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Bio
          </div>
          {isEditing ? (
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Write a longer bio..."
              maxLength={10000}
              rows={6}
              className="ui-textarea mt-0.5 w-full"
            />
          ) : bio ? (
            <RichText
              text={bio}
              className="mt-0.5 block whitespace-pre-wrap text-gray-900"
            />
          ) : null}
        </div>
      )}

      {/* Location */}
      {showLocation && (
        <div className="mb-3">
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Location
          </div>
          {isEditing ? (
            <LocationInput
              key={location?.h3Index || "empty"}
              value={location}
              onChange={setLocation}
              placeholder="Search for your city..."
            />
          ) : (
            <div className="mt-0.5 text-gray-900">{homeTown?.name}</div>
          )}
        </div>
      )}

      {/* Interests */}
      {showInterests && (
        <div className="mb-3">
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Interests
          </div>
          {isEditing ? (
            <>
              <input
                value={editInterests}
                onChange={(e) => setEditInterests(e.target.value)}
                placeholder="e.g. rust, atproto, distributed systems"
                className="ui-input mt-0.5 w-full"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Separate with commas
              </p>
            </>
          ) : interests && interests.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Active On */}
      {activeIcons.length > 0 && (
        <div className="mb-3">
          <div className="mb-2 text-xs tracking-wide text-gray-500 uppercase">
            Active On
          </div>
          <div className="flex flex-wrap gap-3">
            {activeIcons.map((icon) => {
              const el = (
                <span
                  title={icon.label}
                  className="block size-5"
                  dangerouslySetInnerHTML={{ __html: icon.html }}
                />
              );
              return icon.href ? (
                <a
                  key={icon.label}
                  href={icon.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={icon.label}
                  className="size-5"
                >
                  {el}
                </a>
              ) : (
                <span key={icon.label}>{el}</span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
