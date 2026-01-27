import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { parseInline } from "marked";

export const collections = {
  faqs: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/faqs" }),
    schema: z.object({
      Q: z.string().transform((question) => parseInline(question)),
      position: z.number(),
    }),
  }),
};
