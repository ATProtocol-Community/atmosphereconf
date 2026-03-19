import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { atprotoLiveLoader } from "./lib/atproto-live-loader";
import { calendarRecordToEventData } from "./lib/calendar-event";

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
    transform: (value, rkey) => {
      const ad = value.additionalData as Record<string, unknown> | undefined;
      return {
        id: (ad?.sourceId as string) || (ad?.submissionId as string) || rkey,
        data: calendarRecordToEventData(value),
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
  }),
});

export const collections = { events };
