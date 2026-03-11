import type { SerializedPost, RichTextSegment } from "@/lib/bsky";
import { buildPostUrl } from "@/utils/bsky";
import { formatRelativeTime } from "@/utils/date";
import { PostEmbed } from "./PostEmbed";

function RichTextContent({ segments }: { segments: RichTextSegment[] }) {
  return (
    <p className="whitespace-pre-wrap break-words">
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
    <div className="border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <a
          href={`https://bsky.app/profile/${post.authorDid}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={post.authorAvatar}
            alt={post.authorDisplayName || post.authorHandle}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted"
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 flex-wrap">
            <a
              href={`https://bsky.app/profile/${post.authorDid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm hover:underline truncate"
            >
              {post.authorDisplayName || post.authorHandle}
            </a>
            <span className="text-xs text-muted-foreground truncate">
              @{post.authorHandle}
            </span>
          </div>
        </div>
        <a
          href={bskyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          {formatRelativeTime(post.createdAt)}
        </a>
      </div>

      <div className="mt-1 text-sm">
        <RichTextContent segments={post.segments} />
      </div>

      <PostEmbed embed={post.embed} bskyUrl={bskyUrl} />

      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span>{post.replyCount} replies</span>
        <span>{post.repostCount} reposts</span>
        <span>{post.likeCount} likes</span>
      </div>
    </div>
  );
}
