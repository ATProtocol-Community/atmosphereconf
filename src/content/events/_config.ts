import { defineCollection, z } from "astro:content";
import { atprotoEventLoader } from "./atproto-loader";

const ADMIN_DID = import.meta.env.ADMIN_DID || "did:plc:257wekqxg4hyapkq6k47igmp";

const speakerSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

const eventSchema = z.object({
  title: z.string(),
  type: z.string(),
  speakers: z.array(speakerSchema).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  room: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  link_url: z.string().optional(),
  link_text: z.string().optional(),
});

export const eventCollections = {
  events: defineCollection({
    loader: atprotoEventLoader(ADMIN_DID),
    schema: eventSchema,
  }),
};
