import type { LiveLoader } from "astro/loaders";
import { getDid, getPdsAgent } from "@fujocoded/authproto/helpers";
import { getBlobCDNUrl } from "./bsky";

interface LeafletLoaderOptions {
  /** DID or handle of the repo owner */
  repo: string;
  /** AT URI of the publication to filter by */
  publication?: string;
}

interface LeafletDocumentView {
  rkey: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  publication: string;
  basePath: string;
  imageUrl: string | null;
}

interface LeafletBlock {
  block?: {
    $type?: string;
    image?: { ref: string };
  };
}

interface LeafletPage {
  blocks?: LeafletBlock[];
}

interface LeafletDocumentValue {
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  publication?: string;
  pages?: LeafletPage[] | Record<string, LeafletPage>;
}

interface LeafletPublicationValue {
  base_path?: string;
}

interface CollectionFilter {
  limit?: number;
  reverse?: boolean;
}

interface EntryFilter {
  id?: string;
}

class LeafletLoaderError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "LeafletLoaderError";
  }
}

function extractFirstImageUrl(value: LeafletDocumentValue, did: string): string | null {
  const pages = value.pages;
  const firstPage = Array.isArray(pages)
    ? pages[0]
    : pages?.[Object.keys(pages)[0]];
  for (const b of firstPage?.blocks ?? []) {
    const block = b?.block;
    if (block?.["$type"] === "pub.leaflet.blocks.image" && block.image?.ref) {
      return getBlobCDNUrl(did, block.image, "jpeg");
    }
  }
  return null;
}

async function resolveBasePath(
  agent: NonNullable<Awaited<ReturnType<typeof getPdsAgent>>>,
  did: string,
  publicationUri: string,
): Promise<string> {
  const pubRkey = publicationUri.split("/").pop();
  if (!pubRkey) return "";
  try {
    const { data } = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: "pub.leaflet.publication",
      rkey: pubRkey,
    });
    return (data.value as LeafletPublicationValue).base_path ?? "";
  } catch {
    return "";
  }
}

export function leafletLiveLoader(
  options: LeafletLoaderOptions,
): LiveLoader<
  LeafletDocumentView,
  EntryFilter,
  CollectionFilter,
  LeafletLoaderError
> {
  const { repo, publication } = options;

  return {
    name: "leaflet-live-loader",

    loadCollection: async ({ filter }) => {
      try {
        const agent = await getPdsAgent({ didOrHandle: repo });
        const did = await getDid({ didOrHandle: repo });
        if (!agent || !did) {
          return {
            error: new LeafletLoaderError(
              "Could not resolve repo",
              "RESOLVE_ERROR",
            ),
          };
        }

        const { data } = await agent.com.atproto.repo.listRecords({
          repo: did,
          collection: "pub.leaflet.document",
          limit: filter?.limit ?? 50,
          reverse: filter?.reverse ?? true,
        });

        let records = data.records ?? [];

        if (publication) {
          records = records.filter(
            (r) =>
              (r.value as LeafletDocumentValue).publication === publication,
          );
        }

        const basePath = publication
          ? await resolveBasePath(agent, did, publication)
          : "";

        return {
          entries: records.map((record) => {
            const rkey = record.uri.split("/").pop()!;
            const value = record.value as LeafletDocumentValue;
            return {
              id: rkey,
              data: {
                rkey,
                title: value.title,
                description: value.description,
                author: value.author,
                publishedAt: value.publishedAt,
                publication: value.publication,
                basePath,
                imageUrl: extractFirstImageUrl(value, did),
              },
            };
          }),
        };
      } catch {
        return {
          error: new LeafletLoaderError(
            "Could not load leaflet documents",
            "UNRECOVERABLE_ERROR",
          ),
        };
      }
    },

    loadEntry: async ({ filter }) => {
      if (!filter.id) {
        return {
          error: new LeafletLoaderError(
            "Must provide an id",
            "MISSING_DOCUMENT_ID",
          ),
        };
      }

      try {
        const agent = await getPdsAgent({ didOrHandle: repo });
        const did = await getDid({ didOrHandle: repo });
        if (!agent || !did) {
          return {
            error: new LeafletLoaderError(
              "Could not resolve repo",
              "RESOLVE_ERROR",
            ),
          };
        }

        const { data } = await agent.com.atproto.repo.getRecord({
          repo: did,
          collection: "pub.leaflet.document",
          rkey: filter.id,
        });

        const value = data.value as LeafletDocumentValue;
        const basePath = value.publication
          ? await resolveBasePath(agent, did, value.publication)
          : "";

        return {
          id: filter.id,
          data: {
            rkey: filter.id,
            title: value.title,
            description: value.description,
            author: value.author,
            publishedAt: value.publishedAt,
            publication: value.publication ?? "",
            basePath,
            imageUrl: extractFirstImageUrl(value, did),
          },
        };
      } catch {
        return {
          error: new LeafletLoaderError(
            "Could not load leaflet document",
            "UNRECOVERABLE_ERROR",
          ),
        };
      }
    },
  };
}
