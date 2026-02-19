import { file } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { parse, parseInline } from "marked";

const faqSchema = z.object({
  question: z.string().transform((q) => parseInline(q) as string),
  answer: z.string().transform((a) => parse(a) as string),
});

export const faqCollections = {
  "faqs-hotel": defineCollection({
    loader: file("src/content/faqs/hotel.yaml"),
    schema: faqSchema.extend({
      category: z.literal("hotel").default("hotel"),
      categoryName: z.literal("Hotel & Venue").default("Hotel & Venue"),
    }),
  }),
  "faqs-remote": defineCollection({
    loader: file("src/content/faqs/remote.yaml"),
    schema: faqSchema.extend({
      category: z.literal("remote").default("remote"),
      categoryName: z.literal("Remote").default("Remote"),
    }),
  }),
};
