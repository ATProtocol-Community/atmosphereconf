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
  const paddingBottom = aspectRatio
    ? `${(aspectRatio.height / aspectRatio.width) * 100}%`
    : "56.25%";

  return (
    <a
      href={bskyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative mt-2 rounded-lg overflow-hidden bg-muted group"
      style={{ paddingBottom }}
    >
      {thumbnail && (
        <img
          src={thumbnail}
          alt={alt || "Video thumbnail"}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-7 h-7 ml-1"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </a>
  );
}
