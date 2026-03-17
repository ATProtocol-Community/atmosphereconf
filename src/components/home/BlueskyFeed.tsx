import { useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FeedPage } from "@/lib/bsky";
import { PostCard } from "@/components/feed/PostCard";
import { useFeedPagination } from "@/components/feed/useFeedPagination";

const SCROLL_THRESHOLD = 200;

interface BlueskyFeedProps {
  initialData: FeedPage;
  height?: number | string;
  emptyMessage?: string;
  loadingMessage?: string;
}

export function BlueskyFeed({
  initialData,
  height = 600,
  emptyMessage = "No posts yet. Be the first to post!",
  loadingMessage = "Loading...",
}: BlueskyFeedProps) {
  const { posts, loading, error, loadMore } = useFeedPagination(initialData);
  const parentRef = useRef<HTMLDivElement>(null);
  const resolvedHeight =
    typeof height === "number" ? `${height}px` : height;

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
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < SCROLL_THRESHOLD) {
      loadMore();
    }
  }, [loadMore]);

  if (posts.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-col"
      style={{ height: resolvedHeight }}
    >
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="feed-scroll-area min-h-0 flex-1 overflow-auto rounded-md"
      >
        <div
          className="feed-scroll-content"
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
                paddingRight: "0.85rem",
                boxSizing: "border-box",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <PostCard post={posts[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
      {loading && (
        <div className="text-muted-foreground py-3 text-center text-sm">
          {loadingMessage}
        </div>
      )}
      {error && (
        <div className="text-muted-foreground py-3 text-center text-sm">
          {error}
          <button
            onClick={loadMore}
            className="text-primary ml-1 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
