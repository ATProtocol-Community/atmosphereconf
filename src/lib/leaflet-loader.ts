import type { LiveLoader } from "astro/loaders";
import { getDid, getPdsAgent } from "@fujocoded/authproto/helpers";
import { getBlobCDNUrl } from "./bsky";

interface StandardSiteLoaderOptions {
  /** DID or handle of the repo owner */
  repo: string;
  /** AT URI of the publication to filter by */
  publication?: string;
}

interface StandardSiteDocumentView {
  rkey: string;
  title: string;
  description: string;
  publishedAt: string;
  publication: string;
  basePath: string;
  imageUrl: string | null;
}

interface StandardSiteDocumentValue {
  title: string;
  description: string;
  publishedAt: string;
  site?: string;
  path?: string;
  content?: {
    pages?:
      | Array<{
          blocks?: Array<{
            block?: { $type?: string; image?: { ref: unknown } };
          }>;
        }>
      | Record<
          string,
          {
            blocks?: Array<{
              block?: { $type?: string; image?: { ref: unknown } };
            }>;
          }
        >;
  };
  coverImage?: { ref: unknown };
}

interface PublicationValue {
  base_path?: string;
  url?: string;
}

interface CollectionFilter {
  reverse?: boolean;
}

interface EntryFilter {
  id?: string;
}

class StandardSiteLoaderError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "StandardSiteLoaderError";
  }
}

function extractFirstImageUrl(
  value: StandardSiteDocumentValue,
  did: string,
): string | null {
  if (value.coverImage?.ref) {
    return getBlobCDNUrl(did, value.coverImage, "jpeg") || null;
  }
  const pages = value.content?.pages;
  const firstPage = Array.isArray(pages)
    ? pages[0]
    : pages?.[Object.keys(pages)[0]];
  for (const b of firstPage?.blocks ?? []) {
    const block = b?.block;
    if (block?.["$type"] === "pub.leaflet.blocks.image" && block.image?.ref) {
      return getBlobCDNUrl(did, block.image, "jpeg") || null;
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
      collection: "site.standard.publication",
      rkey: pubRkey,
    });
    const pub = data.value as PublicationValue;
    if (pub.base_path) return pub.base_path;
    if (pub.url) {
      try {
        return new URL(pub.url).hostname;
      } catch {
        return "";
      }
    }
    return "";
  } catch {
    return "";
  }
}

export function standardSiteLiveLoader(
  options: StandardSiteLoaderOptions,
): LiveLoader<
  StandardSiteDocumentView,
  EntryFilter,
  CollectionFilter,
  StandardSiteLoaderError
> {
  const { repo, publication } = options;

  return {
    name: "standard-site-live-loader",

    loadCollection: async ({ filter }) => {
      try {
        const agent = await getPdsAgent({ didOrHandle: repo });
        const did = await getDid({ didOrHandle: repo });
        if (!agent || !did) {
          return {
            error: new StandardSiteLoaderError(
              "Could not resolve repo",
              "RESOLVE_ERROR",
            ),
          };
        }

        const reverse = filter?.reverse ?? false;

        let records: Awaited<
          ReturnType<typeof agent.com.atproto.repo.listRecords>
        >["data"]["records"] = [];
        let cursor: string | undefined;
        do {
          const { data } = await agent.com.atproto.repo.listRecords({
            repo: did,
            collection: "site.standard.document",
            limit: 100,
            reverse,
            cursor,
          });
          records.push(...(data.records ?? []));
          cursor = data.cursor;
        } while (cursor);

        if (publication) {
          const pubRkey = publication.split("/").pop();
          records = records.filter((r) => {
            const value = r.value as StandardSiteDocumentValue;
            return value.site?.split("/").pop() === pubRkey;
          });
        }

        const basePath = publication
          ? await resolveBasePath(agent, did, publication)
          : "";

        return {
          entries: records.map((record) => {
            const rkey = record.uri.split("/").pop()!;
            const value = record.value as StandardSiteDocumentValue;
            return {
              id: rkey,
              data: {
                rkey,
                title: value.title,
                description: value.description,
                publishedAt: value.publishedAt,
                publication: value.site ?? "",
                basePath,
                imageUrl: extractFirstImageUrl(value, did),
              },
            };
          }),
        };
      } catch {
        return {
          error: new StandardSiteLoaderError(
            "Could not load documents",
            "UNRECOVERABLE_ERROR",
          ),
        };
      }
    },

    loadEntry: async ({ filter }) => {
      if (!filter.id) {
        return {
          error: new StandardSiteLoaderError(
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
            error: new StandardSiteLoaderError(
              "Could not resolve repo",
              "RESOLVE_ERROR",
            ),
          };
        }

        const { data } = await agent.com.atproto.repo.getRecord({
          repo: did,
          collection: "site.standard.document",
          rkey: filter.id,
        });

        const value = data.value as StandardSiteDocumentValue;
        const basePath = value.site
          ? await resolveBasePath(agent, did, value.site)
          : "";

        return {
          id: filter.id,
          data: {
            rkey: filter.id,
            title: value.title,
            description: value.description,
            publishedAt: value.publishedAt,
            publication: value.site ?? "",
            basePath,
            imageUrl: extractFirstImageUrl(value, did),
          },
        };
      } catch {
        return {
          error: new StandardSiteLoaderError(
            "Could not load document",
            "UNRECOVERABLE_ERROR",
          ),
        };
      }
    },
  };
}
