import { RotateCcw } from "lucide-react";
import { Avatar } from "./Avatar";
import { AuthorFeed } from "./view/AuthorFeed";
import { RichText } from "./view/RichText";
import { GermButton } from "./view/GermButton";
import { ThemeToggle } from "./ThemeToggle";
import type { ProfileViewProps } from "./profile-types";
import type { ClientTheme } from "./client-themes";
import type { FeedPage } from "@/lib/bsky";

interface BackFaceProps {
  cardClasses: string;
  profileProps: ProfileViewProps;
  authorFeedInitialData: FeedPage;
  theme: ClientTheme;
  setTheme: (t: ClientTheme) => void;
  onFlipBack: () => void;
  dragHandleProps?: Record<string, unknown>;
  isBackFace?: boolean;
  showingBack?: boolean;
}

export function BackFace({
  cardClasses,
  profileProps,
  authorFeedInitialData,
  theme,
  setTheme,
  onFlipBack,
  dragHandleProps = {},
  isBackFace = false,
  showingBack = true,
}: BackFaceProps) {
  const {
    did,
    handle,
    bskyDisplayName,
    bskyAvatarUrl,
    bskyBannerUrl,
    bskyDescription,
    bskyDescriptionSegments,
    germMessageMeUrl,
    viewerDid,
  } = profileProps;

  const bk = theme === "blacksky";

  const containerStyle: React.CSSProperties = isBackFace
    ? {
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        pointerEvents: showingBack ? "auto" : "none",
        visibility: showingBack ? "visible" : "hidden",
      }
    : {};

  return (
    <div
      data-theme={theme}
      className={`${isBackFace ? "absolute inset-0" : "relative max-h-[78dvh] sm:max-h-[85dvh]"} bg-card text-card-foreground flex flex-col overflow-auto sm:overflow-hidden ${cardClasses}`}
      style={containerStyle}
    >
      <div
        className="-mx-4 -mt-6 sm:-mx-8 md:-mx-12 md:-mt-8"
        {...dragHandleProps}
      >
        {bskyBannerUrl ? (
          <img
            src={bskyBannerUrl}
            alt=""
            className="h-36 w-full rounded-t-xl object-cover"
          />
        ) : (
          <div
            className="h-24 w-full rounded-t-xl"
            style={{ background: "var(--back-face-banner)" }}
          />
        )}
        <div className="-mt-10 flex flex-col items-start gap-2 px-4 sm:flex-row sm:items-end sm:gap-4 sm:px-6 md:px-12">
          <Avatar
            size="xl"
            src={bskyAvatarUrl ?? ""}
            alt={bskyDisplayName ?? handle}
            className="shrink-0 ring-4"
            style={{ ["--tw-ring-color" as string]: "var(--back-face-ring)" }}
          />
          <div className="flex min-w-0 flex-1 items-end justify-between gap-2 sm:pb-1">
            <div className="min-w-0">
              {bskyDisplayName && (
                <h2 className="text-card-foreground text-xl font-bold sm:text-2xl">
                  {bskyDisplayName}
                </h2>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://bsky.app/profile/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline sm:text-base"
                >
                  @{handle}
                </a>
                {profileProps.pronouns && (
                  <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {profileProps.pronouns}
                  </span>
                )}
              </div>
            </div>
            {germMessageMeUrl && (
              <div className="shrink-0">
                <GermButton
                  href={
                    viewerDid
                      ? `${germMessageMeUrl}/web#${did}+${viewerDid}`
                      : germMessageMeUrl
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {bskyDescription && (
        <div className="mt-3 pb-4" {...dragHandleProps}>
          {bskyDescriptionSegments?.some((s) => s.link) ? (
            <span className="text-muted-foreground line-clamp-3 block text-sm break-words">
              {bskyDescriptionSegments.map((seg, i) => {
                const parts = seg.text.split("\n");
                const content = parts.map((part, j) => (
                  <span key={`${i}-${j}`}>
                    {part}
                    {j < parts.length - 1 && <br />}
                  </span>
                ));
                return seg.link ? (
                  <a
                    key={i}
                    href={seg.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: "var(--back-face-link)" }}
                  >
                    {content}
                  </a>
                ) : (
                  <span key={i}>{content}</span>
                );
              })}
            </span>
          ) : (
            <RichText
              text={bskyDescription}
              className="text-muted-foreground line-clamp-3 block text-sm break-words"
              linkClassName="hover:underline"
              linkStyle={{ color: "var(--back-face-link)" }}
            />
          )}
        </div>
      )}

      <div className="border-border min-h-0 flex-1 border-t pt-4">
        <AuthorFeed actor={did} initialData={authorFeedInitialData} />
      </div>

      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme(bk ? "bluesky" : "blacksky")}
      />

      <button
        onClick={onFlipBack}
        className="border-border absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs backdrop-blur-md transition-colors"
        style={{
          backgroundColor: "var(--back-face-pill-bg)",
          color: "var(--back-face-pill-fg)",
        }}
        aria-label="Show conference profile"
      >
        <RotateCcw className="h-3 w-3" />
        Conference
      </button>
    </div>
  );
}
