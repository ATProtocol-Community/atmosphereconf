import { ExternalLink } from "lucide-react";

const MAX_HEIGHT_PX = 480;

export function PostVideo({
  thumbnail,
  alt,
  aspectRatio,
  bskyUrl,
}: {
  thumbnail?: string;
  alt?: string;
  aspectRatio?: { width: number; height: number };
  bskyUrl: string;
}) {
  const DEFAULT_ASPECT_RATIO = { width: 16, height: 9 };
  const { width, height } = aspectRatio ?? DEFAULT_ASPECT_RATIO;
  const isPortrait = height > width;

  return (
    <div
      className={`mt-2 overflow-hidden rounded-lg bg-black ${isPortrait ? "flex justify-center" : ""}`}
      style={{ maxHeight: MAX_HEIGHT_PX }}
    >
      <a
        href={bskyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block"
        style={{
          aspectRatio: `${width}/${height}`,
          maxHeight: MAX_HEIGHT_PX,
        }}
      >
        {thumbnail && (
          <img
            src={thumbnail}
            alt={alt || "Video thumbnail"}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            <ExternalLink className="h-4 w-4" />
            Watch on Bluesky
          </div>
        </div>
      </a>
    </div>
  );
}
