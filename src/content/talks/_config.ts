import { defineCollection, z } from "astro:content";
import { csvTalksLoader } from "./csv-loader";

const speakerSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

const scheduleSchema = z.object({
  title: z.string(),
  type: z.enum([
    "presentation",
    "lightning-talk",
    "panel",
    "workshop",
    "info",
    "activity",
  ]),
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
});

export const talkCollections = {
  schedule: defineCollection({
    loader: csvTalksLoader("src/content/talks"),
    schema: scheduleSchema,
  }),
};
