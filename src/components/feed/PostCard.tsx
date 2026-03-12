import { Repeat2 } from "lucide-react";
import type { SerializedPost, RichTextSegment } from "@/lib/bsky";
import { buildPostUrl } from "@/utils/bsky";
import { formatRelativeTime } from "@/utils/date";
import { PostEmbed } from "./PostEmbed";

function RichTextContent({ segments }: { segments: RichTextSegment[] }) {
  return (
    <p className="break-words whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.link) {
          return (
            <a
              key={i}
              href={seg.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {seg.text}
            </a>
          );
        }
        if (seg.tag) {
          return (
            <span key={i} className="text-primary">
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </p>
  );
}

export function PostCard({ post }: { post: SerializedPost }) {
  const bskyUrl = buildPostUrl(post.authorDid, post.uri);

  return (
    <div className="border-border rounded-lg border p-3 sm:p-4">
      {post.repostedBy && (
        <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
          <Repeat2 className="h-3.5 w-3.5" />
          Reposted by {post.repostedBy}
        </div>
      )}
      <div className="flex items-start gap-2 sm:gap-3">
        <a
          href={`https://bsky.app/profile/${post.authorDid}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={post.authorAvatar}
            alt={post.authorDisplayName || post.authorHandle}
            className="bg-muted h-8 w-8 rounded-full sm:h-10 sm:w-10"
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1">
            <a
              href={`https://bsky.app/profile/${post.authorDid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm font-semibold hover:underline"
            >
              {post.authorDisplayName || post.authorHandle}
            </a>
            <span className="text-muted-foreground truncate text-xs">
              @{post.authorHandle}
            </span>
          </div>
        </div>
        <a
          href={bskyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground text-xs whitespace-nowrap"
        >
          {formatRelativeTime(post.createdAt)}
        </a>
      </div>

      <div className="mt-1 text-sm">
        <RichTextContent segments={post.segments} />
      </div>

      <PostEmbed embed={post.embed} bskyUrl={bskyUrl} />

      <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
        <span>{post.replyCount} replies</span>
        <span>{post.repostCount} reposts</span>
        <span>{post.likeCount} likes</span>
      </div>
    </div>
  );
}
