import { Pencil } from "lucide-react";
import { Avatar } from "../Avatar";
import { RichText } from "./RichText";
import { GermButton } from "./GermButton";
import type { ActiveIcon, ProfileViewProps } from "../profile-types";

export function RenderedProfile({
  did,
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
  viewerDid,
  isOwnProfile,
  activeIcons,
  onEdit,
}: Omit<ProfileViewProps, "editData"> & { onEdit: () => void }) {
  const germDmUrl =
    germMessageMeUrl && viewerDid
      ? `${germMessageMeUrl}/web#${did}+${viewerDid}`
      : undefined;
  const showLinksRow = !!pronouns || !!website || !!germDmUrl;

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar + name row */}
      <div className="flex items-center gap-4">
        <Avatar size="lg" src={avatarUrl ?? ""} alt={displayName} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-gray-500">@{handle}</p>
        </div>
        {isOwnProfile && (
          <div className="flex shrink-0 gap-2 self-start">
            <button
              onClick={onEdit}
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
          </div>
        )}
      </div>

      {/* Pronouns + website + germ */}
      {showLinksRow && (
        <div className="flex flex-col gap-2">
          {(pronouns || website) && (
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          )}
          {germDmUrl && (
            <div className="mt-1">
              <GermButton href={germDmUrl} />
            </div>
          )}
        </div>
      )}

      {/* About */}
      {description && (
        <div>
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            About
          </div>
          <RichText text={description} className="mt-1 block text-gray-900" />
        </div>
      )}

      {/* Location */}
      {homeTown?.name && (
        <div>
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Location
          </div>
          <div className="mt-1 text-gray-900">{homeTown.name}</div>
        </div>
      )}

      {/* Interests */}
      {interests && interests.length > 0 && (
        <div>
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Interests
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span
                key={interest}
                className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active On */}
      {activeIcons.length > 0 && (
        <div>
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

      {/* Bio */}
      {bio && (
        <div>
          <div className="text-xs tracking-wide text-gray-500 uppercase">
            Bio
          </div>
          <RichText
            text={bio}
            className="mt-1 block whitespace-pre-wrap text-gray-900"
          />
        </div>
      )}
    </div>
  );
}
