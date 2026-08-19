import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import {
  defineAtProtoLiveCollection,
  isAtBlob,
  toHostedBlob,
} from "@fujocoded/astro-atproto-loader";
import {
  calendarRecordToEventData,
  EVENT_CATEGORIES,
  extractMedia,
} from "./lib/calendar-event";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";
import { standardSiteLiveLoader } from "@/lib/leaflet-loader";
import { parseInline } from "marked";

import { EVENTS_OWNER_DID_OR_HANDLE, TITO_API_TOKEN } from "astro:env/server";
import { titoAnswerLoader } from "./lib/tito-live-loader";

const speakerSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

const events = defineAtProtoLiveCollection({
  source: {
    repo: EVENTS_OWNER_DID_OR_HANDLE,
    collection: "community.lexicon.calendar.event",
    limit: "all",
  },
  cacheTtl: 60_000,
  filter: ({ value }) => {
    return Boolean(value.additionalData && (value.additionalData as Record<string, unknown>).isAtmosphereconf);
  },
  transform: ({ repo, rkey, value }) => {
    const additionalData = value.additionalData as Record<string, unknown> | undefined;
    const data = calendarRecordToEventData(value);
    const { headerUrl } = extractMedia(value, { did: repo.did, pds: repo.pds });
    data.headerUrl = headerUrl ?? undefined;

    return {
      id: (additionalData?.sourceId as string) ?? (additionalData?.submissionId as string) ?? rkey,
      data,
    };
  },
  outputSchema: z.object({
    title: z.string().transform((val) => parseInline(val) as string),
    type: z.string(),
    mode: z.enum(["inperson", "remote", "hybrid"]).optional(),
    speakers: z.array(speakerSchema).optional(),
    start: z.coerce.string().optional(),
    end: z.coerce.string().optional(),
    room: z.string().optional(),
    category: z.enum(EVENT_CATEGORIES).optional().catch(undefined),
    description: z.string().optional(),
    link_url: z.string().optional(),
    link_text: z.string().optional(),
    headerUrl: z.string().optional(),
    vodAtUri: z.string().optional(),
  }),
});

const blueskyPosts = defineLiveCollection({
  loader: liveBlueskyLoader({ identifier: "atprotocol.dev" }),
});

const leafletPosts = standardSiteLiveLoader({
  repo: "did:plc:lehcqqkwzcwvjvw66uthu5oq",
  publication:
    "at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i",
});

const titoHandles = defineLiveCollection({
  loader: titoAnswerLoader({
    accountSlug: "atmosphereconf",
    eventSlug: "atmosphereconf2026",
    questionId: 1211204,
    apiToken: TITO_API_TOKEN,
  }),
  schema: z.object({
    ticketReference: z.string(),
    ticketSlug: z.string(),
    ticketEmail: z.string(),
    ticketName: z.string(),
    handle: z.string(),
    releaseTitle: z.string(),
  }),
});

export const collections = { events, blueskyPosts, leafletPosts, titoHandles };
