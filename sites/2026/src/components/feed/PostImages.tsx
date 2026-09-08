import type { AppBskyEmbedImages } from "@atproto/api";

export function PostImages({
  images,
}: {
  images: AppBskyEmbedImages.ViewImage[];
}) {
  return (
    <div
      className={`mt-2 grid gap-1 overflow-hidden rounded-lg ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
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
            className="h-full w-full object-cover"
            style={{ maxHeight: images.length === 1 ? 400 : 200 }}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
