import { z } from "astro/zod";
import { defineAtProtoLiveCollection } from "@fujocoded/astro-atproto-loader";
import { getBlobCDNUrl } from "./bsky";

interface StandardSiteLoaderOptions {
  /** DID or handle of the repo owner */
  repo: string;
  /** AT URI of the publication to filter by */
  publication?: string;
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

function isStandardSiteDocument(
  value: unknown,
): value is StandardSiteDocumentValue {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" &&
    typeof record.description === "string" &&
    typeof record.publishedAt === "string"
  );
}

interface PublicationValue {
  base_path?: string;
  url?: string;
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

export function standardSiteLiveLoader(options: StandardSiteLoaderOptions) {
  const { repo, publication: sourcePublication } = options;

  return defineAtProtoLiveCollection({
    source: {
      repo,
      collection: "site.standard.document",
      limit: "all",
    },
    filter: ({ value }) => {
      if (!isStandardSiteDocument(value)) return false;
      if (!sourcePublication) return true;
      const document = value;
      return document.site?.split("/").pop() === sourcePublication.split("/").pop();
    },
    transform: async ({ repo: resolvedRepo, rkey, value: document, fetchRecord }) => {
      if (!isStandardSiteDocument(document)) return undefined;
      let basePath = "";

      if (document.site) {
        const publicationRecord = await fetchRecord({ atUri: document.site });
        const publicationValue = publicationRecord?.value as
          | PublicationValue
          | undefined;
        if (publicationValue?.base_path) {
          basePath = publicationValue.base_path;
        } else if (publicationValue?.url) {
          try {
            basePath = new URL(publicationValue.url).hostname;
          } catch {
            basePath = "";
          }
        }
      }

      return {
        id: rkey,
        data: {
          rkey,
          title: document.title,
          description: document.description,
          publishedAt: document.publishedAt,
          publication: document.site ?? "",
          basePath,
          imageUrl: extractFirstImageUrl(document, resolvedRepo.did),
        },
      };
    },
    outputSchema: z.object({
      rkey: z.string(),
      title: z.string(),
      description: z.string(),
      publishedAt: z.string(),
      publication: z.string(),
      basePath: z.string(),
      imageUrl: z.string().nullable(),
    }),
  });
}
