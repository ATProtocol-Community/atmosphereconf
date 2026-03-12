import { useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FeedPage } from "@/lib/bsky";
import { PostCard } from "@/components/feed/PostCard";
import { useAuthorFeedPagination } from "@/components/feed/useAuthorFeedPagination";

const SCROLL_THRESHOLD = 200;

interface AuthorFeedProps {
  actor: string;
  initialData: FeedPage;
}

export function AuthorFeed({ actor, initialData }: AuthorFeedProps) {
  const { posts, loading, error, loadMore } = useAuthorFeedPagination(
    actor,
    initialData,
  );
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 3,
    gap: 8,
  });

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < SCROLL_THRESHOLD) {
      loadMore();
    }
  }, [loadMore]);

  if (posts.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No posts yet.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="overflow-auto rounded-md"
        style={{ height: "clamp(400px, 50vh, 700px)" }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={posts[virtualItem.index].uri}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <PostCard post={posts[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
      {loading && (
        <div className="py-3 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      )}
      {error && (
        <div className="py-3 text-center text-sm text-muted-foreground">
          {error}{" "}
          <button
            onClick={loadMore}
            className="text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
