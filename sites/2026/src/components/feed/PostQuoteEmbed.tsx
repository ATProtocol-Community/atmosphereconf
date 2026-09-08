import type {
  AppBskyEmbedRecord,
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
  AppBskyEmbedExternal,
} from "@atproto/api";
import { buildPostUrl } from "@/utils/bsky";
import { formatRelativeTime } from "@/utils/date";
import { PostImages } from "./PostImages";
import { PostVideo } from "./PostVideo";
import { PostExternalEmbed } from "./PostExternalEmbed";

export function PostQuoteEmbed({
  record,
}: {
  record: AppBskyEmbedRecord.View["record"];
}) {
  const type = record.$type as string;

  const unavailableLabels: Record<string, string> = {
    "app.bsky.embed.record#viewNotFound": "Post not found",
    "app.bsky.embed.record#viewBlocked": "Blocked post",
  };

  if (type !== "app.bsky.embed.record#viewRecord") {
    return (
      <div className="border-border text-muted-foreground mt-2 rounded-lg border p-3 text-sm">
        {unavailableLabels[type] ?? "Unavailable post"}
      </div>
    );
  }

  const viewRecord = record as AppBskyEmbedRecord.ViewRecord;
  const value = viewRecord.value as { text?: string; createdAt?: string };
  const author = viewRecord.author;
  const bskyUrl = buildPostUrl(author.did, viewRecord.uri);

  return (
    <a
      href={bskyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border hover:bg-muted/50 mt-2 block rounded-lg border p-3 transition-colors"
    >
      <div className="flex items-center gap-2">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.displayName || author.handle}
            className="h-4 w-4 rounded-full"
            width={16}
            height={16}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="truncate text-xs font-semibold">
          {author.displayName || author.handle}
        </span>
        <span className="text-muted-foreground text-xs">@{author.handle}</span>
        {value.createdAt && (
          <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
            {formatRelativeTime(value.createdAt)}
          </span>
        )}
      </div>
      {value.text && (
        <p className="mt-1 line-clamp-4 text-sm break-words whitespace-pre-wrap">
          {value.text}
        </p>
      )}
      {viewRecord.embeds?.map((embed, i) => {
        const type = (embed as { $type?: string }).$type;
        if (type === "app.bsky.embed.images#view") {
          return (
            <PostImages
              key={i}
              images={(embed as AppBskyEmbedImages.View).images}
            />
          );
        }
        if (type === "app.bsky.embed.video#view") {
          const v = embed as AppBskyEmbedVideo.View;
          return (
            <PostVideo
              key={i}
              thumbnail={v.thumbnail}
              alt={v.alt}
              aspectRatio={v.aspectRatio}
              bskyUrl={bskyUrl}
            />
          );
        }
        if (type === "app.bsky.embed.external#view") {
          return (
            <PostExternalEmbed
              key={i}
              external={(embed as AppBskyEmbedExternal.View).external}
            />
          );
        }
        return null;
      })}
    </a>
  );
}
