import type { AppBskyEmbedImages } from "@atproto/api";

export function PostImages({
  images,
}: {
  images: AppBskyEmbedImages.ViewImage[];
}) {
  return (
    <div
      className={`grid gap-1 mt-2 rounded-lg overflow-hidden ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
    >
      {images.map((img, i) => (
        <a
          key={i}
          href={img.fullsize}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={img.thumb}
            alt={img.alt || ""}
            className="w-full h-full object-cover"
            style={{ maxHeight: images.length === 1 ? 400 : 200 }}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
