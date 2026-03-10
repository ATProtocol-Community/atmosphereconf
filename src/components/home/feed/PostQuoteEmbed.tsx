import type { AppBskyEmbedRecord } from "@atproto/api";
import { formatRelativeTime } from "@/utils/date";

export function PostQuoteEmbed({
  record,
}: {
  record: AppBskyEmbedRecord.View["record"];
}) {
  const type = record.$type as string;

  if (type !== "app.bsky.embed.record#viewRecord") {
    return (
      <div className="border border-border rounded-lg p-3 mt-2 text-sm text-muted-foreground">
        {type === "app.bsky.embed.record#viewNotFound"
          ? "Post not found"
          : type === "app.bsky.embed.record#viewBlocked"
            ? "Blocked post"
            : "Unavailable post"}
      </div>
    );
  }

  const viewRecord = record as AppBskyEmbedRecord.ViewRecord;
  const value = viewRecord.value as { text?: string; createdAt?: string };
  const author = viewRecord.author;
  const bskyUrl = `https://bsky.app/profile/${author.did}/post/${viewRecord.uri.split("/").pop()}`;

  return (
    <a
      href={bskyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-border rounded-lg p-3 mt-2 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.displayName || author.handle}
            className="w-4 h-4 rounded-full"
            width={16}
            height={16}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="font-semibold text-xs truncate">
          {author.displayName || author.handle}
        </span>
        <span className="text-xs text-muted-foreground">@{author.handle}</span>
        {value.createdAt && (
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
            {formatRelativeTime(value.createdAt)}
          </span>
        )}
      </div>
      {value.text && (
        <p className="text-sm mt-1 whitespace-pre-wrap break-words line-clamp-4">
          {value.text}
        </p>
      )}
    </a>
  );
}
