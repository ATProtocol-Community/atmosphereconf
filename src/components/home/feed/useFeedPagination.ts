import { useState, useCallback, useEffect, useRef } from "react";
import { actions } from "astro:actions";
import type { FeedPage, SerializedPost } from "@/lib/bsky";

export function useFeedPagination(initialData: FeedPage) {
  const [posts, setPosts] = useState<SerializedPost[]>(initialData.posts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(!!initialData.cursor);

  const cursorRef = useRef<string | undefined>(initialData.cursor);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const seenUris = useRef(new Set(initialData.posts.map((p) => p.uri)));

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursorRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data, error: actionError } = await actions.getFeedPage({
        cursor: cursorRef.current,
      });

      if (controller.signal.aborted) return;

      if (actionError) {
        setError("Failed to load more posts");
        return;
      }

      const newPosts = data.posts.filter((p) => {
        if (seenUris.current.has(p.uri)) return false;
        seenUris.current.add(p.uri);
        return true;
      });

      setPosts((prev) => [...prev, ...newPosts]);
      cursorRef.current = data.cursor;
      if (!data.cursor) setHasMore(false);
    } catch {
      if (!controller.signal.aborted) {
        setError("Failed to load more posts");
      }
    } finally {
      if (!controller.signal.aborted) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  return { posts, loading, error, hasMore, loadMore };
}
