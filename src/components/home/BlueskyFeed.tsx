import { useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FeedPage } from "@/lib/bsky";
import { PostCard } from "./feed/PostCard";
import { useFeedPagination } from "./feed/useFeedPagination";

const SCROLL_THRESHOLD = 200;

interface BlueskyFeedProps {
  initialData: FeedPage;
}

export default function BlueskyFeed({ initialData }: BlueskyFeedProps) {
  const { posts, loading, error, loadMore } = useFeedPagination(initialData);
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
      <div className="text-center py-8 text-muted-foreground text-sm">
        No posts yet. Be the first to post!
      </div>
    );
  }

  return (
    <div>
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="overflow-auto rounded-md"
        style={{ height: 600 }}
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
        <div className="text-center py-3 text-muted-foreground text-sm">
          Loading...
        </div>
      )}
      {error && (
        <div className="text-center py-3 text-muted-foreground text-sm">
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
