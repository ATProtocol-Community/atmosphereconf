import { file } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const speakerSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

const scheduleSchema = z.object({
  title: z.string().transform((t) => t.replace(/~~(.+?)~~/g, "<del>$1</del>")),
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
    loader: file("src/content/talks/schedule.yaml"),
    schema: scheduleSchema,
  }),
};
