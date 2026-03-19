import type { LiveLoader } from "astro/loaders";
import type { LiveDataCollection, LiveDataEntry } from "astro";
import { getPdsAgent } from "@fujocoded/authproto/helpers";

interface AtprotoLiveLoaderOptions<
  LexiconType extends Record<string, unknown>,
> {
  did: string;
  collection: string;
  filter?: (value: Record<string, unknown>) => boolean;
  transform: (
    value: Record<string, unknown>,
    rkey: string,
  ) => { id: string; data: LexiconType };
  cacheTtl?: number;
}

async function getAgent(did: string) {
  const agent = await getPdsAgent({ didOrHandle: did });
  if (!agent) {
    throw new Error(`Could not connect to PDS for ${did}`);
  }
  return agent;
}

async function fetchAllFromPds<TData extends Record<string, unknown>>(
  did: string,
  collection: string,
  filter: ((value: Record<string, unknown>) => boolean) | undefined,
  transform: (
    value: Record<string, unknown>,
    rkey: string,
  ) => { id: string; data: TData },
): Promise<LiveDataEntry<TData>[]> {
  const agent = await getAgent(did);
  const entries: LiveDataEntry<TData>[] = [];
  let cursor: string | undefined;

  do {
    const { data } = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection,
      limit: 100,
      cursor,
    });
    for (const rec of data.records) {
      const value = rec.value as Record<string, unknown>;
      if (filter && !filter(value)) {
        continue;
      }

      const rkey = rec.uri.split("/").pop()!;
      entries.push(transform(value, rkey));
    }
    cursor = data.cursor;
  } while (cursor);

  return entries;
}

async function fetchSingleFromPds<TData extends Record<string, unknown>>(
  did: string,
  collection: string,
  rkey: string,
  transform: (
    value: Record<string, unknown>,
    rkey: string,
  ) => { id: string; data: TData },
): Promise<LiveDataEntry<TData>> {
  const agent = await getAgent(did);
  const { data } = await agent.com.atproto.repo.getRecord({
    repo: did,
    collection,
    rkey,
  });

  return transform(data.value as Record<string, unknown>, rkey);
}

export function atprotoLiveLoader<TData extends Record<string, unknown>>(
  options: AtprotoLiveLoaderOptions<TData>,
): LiveLoader<TData> {
  const { did, collection, filter, transform, cacheTtl = 60_000 } = options;

  let cachedEntries: LiveDataEntry<TData>[] = [];
  let cacheTime = 0;
  let refreshing = false;

  const triggerRefresh = async () => {
    if (refreshing) {
      return;
    }
    refreshing = true;
    try {
      cachedEntries = await fetchAllFromPds(did, collection, filter, transform);
      cacheTime = Date.now();
    } catch (err) {
      console.error(`[atproto-loader:${collection}] refresh failed:`, err);
    } finally {
      refreshing = false;
    }
  };

  const getEntries = async (): Promise<LiveDataEntry<TData>[]> => {
    if (cacheTime === 0) {
      cachedEntries = await fetchAllFromPds(did, collection, filter, transform);
      cacheTime = Date.now();
      return cachedEntries;
    }
    if (Date.now() - cacheTime > cacheTtl) {
      triggerRefresh();
    }
    return cachedEntries;
  };

  return {
    name: `atproto-live-loader:${collection}`,

    async loadCollection(): Promise<LiveDataCollection<TData>> {
      return { entries: await getEntries() };
    },

    async loadEntry({ filter: entryFilter }) {
      const id =
        typeof entryFilter === "string"
          ? entryFilter
          : (entryFilter as { id: string }).id;

      // id === rkey in our data, so fetch the single record directly
      try {
        return await fetchSingleFromPds(did, collection, id, transform);
      } catch {
        // Fall back to full fetch if single record fails
        const entries = await getEntries();
        return entries.find((e) => e.id === id);
      }
    },
  };
}
