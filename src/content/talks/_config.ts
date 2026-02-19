import { file } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const talkSchema = z.object({
  title: z.string().transform((t) => t.replace(/~~(.+?)~~/g, "<del>$1</del>")),
  speaker_name: z.string(),
  speaker_id: z.string(),
  category: z
    .enum(["Community", "Development and Protocol", "Media and Civics"])
    .optional(),
});

export const talkCollections = {
  presentations: defineCollection({
    loader: file("src/content/talks/presentations.yaml"),
    schema: talkSchema.extend({
      type: z.literal("presentation").default("presentation"),
      typeName: z.literal("Presentation").default("Presentation"),
    }),
  }),
  "lightning-talks": defineCollection({
    loader: file("src/content/talks/lightning-talks.yaml"),
    schema: talkSchema.extend({
      type: z.literal("lightning").default("lightning"),
      typeName: z.literal("Lightning Talk").default("Lightning Talk"),
    }),
  }),
  panels: defineCollection({
    loader: file("src/content/talks/panels.yaml"),
    schema: talkSchema.extend({
      type: z.literal("panel").default("panel"),
      typeName: z.literal("Discussion / Panel").default("Discussion / Panel"),
    }),
  }),
  workshops: defineCollection({
    loader: file("src/content/talks/workshops.yaml"),
    schema: talkSchema.extend({
      type: z.literal("workshop").default("workshop"),
      typeName: z.literal("Workshop").default("Workshop"),
    }),
  }),
};
