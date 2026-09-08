import { useCallback, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { ProfileView } from "./ProfileView";
import { BackFace } from "./BackFace";
import { TalkCard } from "./TalkCard";
import { useReducedMotion } from "./useReducedMotion";
import type { Talk } from "./TalkCard";
import type { ProfileViewProps } from "./profile-types";
import type { FeedPage } from "@/lib/bsky";

const DRAG_THRESHOLD = 60;

export interface FlippableProfileCardProps extends ProfileViewProps {
  talks: Talk[];
  authorFeedInitialData: FeedPage;
}

export function FlippableProfileCard({
  talks,
  authorFeedInitialData,
  ...profileProps
}: FlippableProfileCardProps) {
  const { handle, bskyDisplayName, bskyAvatarUrl, bskyDescription } =
    profileProps;

  const hasBsky = !!(bskyDisplayName || bskyAvatarUrl || bskyDescription);
  const prefersReducedMotion = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [dragRotation, setDragRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!hasBsky || prefersReducedMotion) return;
      const target = e.target as HTMLElement;
      if (target.closest("a, button, form")) return;
      dragStartX.current = e.clientX;
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [hasBsky, prefersReducedMotion],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartX.current;
      const rotation = Math.max(-180, Math.min(180, (deltaX / 250) * 180));
      setDragRotation(rotation);
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragRotation) > DRAG_THRESHOLD) {
      setFlipped((prev) => !prev);
    }
    setDragRotation(0);
  }, [isDragging, dragRotation]);

  const baseRotation = flipped ? 180 : 0;
  const effectiveRotation = isDragging
    ? baseRotation + dragRotation
    : baseRotation;
  const showingBack =
    Math.abs(effectiveRotation % 360) > 90 &&
    Math.abs(effectiveRotation % 360) < 270;

  const cardClasses =
    "rounded-xl border px-4 py-6 shadow-sm sm:px-8 md:px-12 md:py-8";

  const dragHandleProps =
    hasBsky && !prefersReducedMotion
      ? {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: handlePointerUp,
          style: {
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "pan-y",
          } as React.CSSProperties,
        }
      : {};

  const frontFaceContent = (
    <>
      {hasBsky && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setFlipped(true)}
            className="border-border inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs backdrop-blur-md transition-colors"
            style={{
              backgroundColor: "var(--atproto-profile-pill-bg)",
              color: "var(--atproto-profile-pill-fg)",
            }}
            aria-label="Show atproto profile"
          >
            <RotateCcw className="h-3 w-3" />
            atproto
          </button>
        </div>
      )}
      <div className="my-auto">
        <div className="pt-6" />
        <div {...dragHandleProps}>
          <ProfileView {...profileProps} />
        </div>
        {talks.length > 0 && (
          <div className="mt-4">
            <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
              Talk
            </div>
            <div className="flex flex-col gap-2">
              {talks.map((talk) => (
                <TalkCard key={talk.id} talk={talk} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Reduced motion: skip 3D flip, just swap faces instantly
  if (prefersReducedMotion) {
    return (
      <div className="mx-auto my-auto max-w-2xl">
        {!flipped ? (
          <div
            className={`bg-card text-card-foreground relative flex max-h-[78dvh] flex-col overflow-auto sm:max-h-[85dvh] sm:min-h-[75dvh] ${cardClasses}`}
          >
            {frontFaceContent}
          </div>
        ) : (
          <BackFace
            cardClasses={cardClasses}
            profileProps={profileProps}
            authorFeedInitialData={authorFeedInitialData}
            onFlipBack={() => setFlipped(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="mx-auto my-auto max-w-2xl"
      style={{ perspective: "1200px" }}
    >
      <div
        className={`relative w-full ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${effectiveRotation}deg)`,
        }}
      >
        {/* Front face — conference profile */}
        <div
          className={`bg-card text-card-foreground relative flex max-h-[78dvh] flex-col overflow-auto sm:max-h-[85dvh] sm:min-h-[75dvh] ${cardClasses}`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            pointerEvents: showingBack ? "none" : "auto",
            visibility: showingBack ? "hidden" : "visible",
          }}
        >
          {frontFaceContent}
        </div>

        {/* Back face — atproto identity + feed */}
        {hasBsky && (
          <BackFace
            cardClasses={cardClasses}
            profileProps={profileProps}
            authorFeedInitialData={authorFeedInitialData}
            onFlipBack={() => setFlipped(false)}
            dragHandleProps={dragHandleProps}
            isBackFace
            showingBack={showingBack}
          />
        )}
      </div>
    </div>
  );
}
