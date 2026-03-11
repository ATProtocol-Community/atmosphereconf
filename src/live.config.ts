import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { atprotoLiveLoader } from "./lib/atproto-live-loader";
import { calendarRecordToEventData } from "./lib/calendar-event";
import { liveBlueskyLoader } from "@ascorbic/bluesky-loader";
import { leafletLiveLoader } from "@/lib/leaflet-loader";

import { EVENTS_OWNER_DID_OR_HANDLE } from "astro:env/server";

const speakerSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

const events = defineLiveCollection({
  loader: atprotoLiveLoader({
    did: EVENTS_OWNER_DID_OR_HANDLE,
    collection: "community.lexicon.calendar.event",
    filter: (value) => {
      const ad = value.additionalData as Record<string, unknown> | undefined;
      return !!ad?.isAtmosphereconf;
    },
    transform: (value, rkey, did) => {
      const ad = value.additionalData as Record<string, unknown> | undefined;
      const data = calendarRecordToEventData(value);

      // Extract header image CDN URL from media array
      const media = value.media as
        | Array<{
            role: string;
            content: { ref: { $link: string } };
          }>
        | undefined;
      const header = media?.find((m) => m.role === "header");
      if (header?.content?.ref?.$link) {
        (data as Record<string, unknown>).headerUrl =
          `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${header.content.ref.$link}@jpeg`;
      }

      return {
        id: (ad?.sourceId as string) || (ad?.submissionId as string) || rkey,
        data,
      };
    },
  }),
  schema: z.object({
    title: z.string(),
    type: z.string(),
    speakers: z.array(speakerSchema).optional(),
    start: z.coerce.string().optional(),
    end: z.coerce.string().optional(),
    room: z.string().optional(),
    category: z
      .enum(["Community", "Development and Protocol", "Media and Civics"])
      .optional(),
    description: z.string().optional(),
    link_url: z.string().optional(),
    link_text: z.string().optional(),
    headerUrl: z.string().optional(),
  }),
});

const blueskyPosts = defineLiveCollection({
  loader: liveBlueskyLoader({ identifier: "atprotocol.dev" }),
});

const leafletPosts = defineLiveCollection({
  loader: leafletLiveLoader({
    repo: "did:plc:lehcqqkwzcwvjvw66uthu5oq",
    publication:
      "at://did:plc:lehcqqkwzcwvjvw66uthu5oq/pub.leaflet.publication/3m367bemk3c2i",
  }),
});

export const collections = { events, blueskyPosts, leafletPosts };
