import { file } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { parse, parseInline } from "marked";

const faqSchema = z.object({
  question: z.string().transform((q) => parseInline(q) as string),
  answer: z.string().transform((a) => parse(a) as string),
});

export const faqCollections = {
  "faqs-info": defineCollection({
    loader: file("src/content/faqs/info.yaml"),
    schema: faqSchema.extend({
      category: z.literal("info").default("info"),
      categoryName: z.literal("Conference Info").default("Conference Info"),
    }),
  }),
  "faqs-hotel": defineCollection({
    loader: file("src/content/faqs/hotel.yaml"),
    schema: faqSchema.extend({
      category: z.literal("hotel").default("hotel"),
      categoryName: z
        .literal("Hotel & Accomodation")
        .default("Hotel & Accomodation"),
    }),
  }),
  "faqs-remote": defineCollection({
    loader: file("src/content/faqs/remote.yaml"),
    schema: faqSchema.extend({
      category: z.literal("remote").default("remote"),
      categoryName: z.literal("Remote Attendance").default("Remote Attendance"),
    }),
  }),

  "faqs-coc": defineCollection({
    loader: file("src/content/faqs/coc.yaml"),
    schema: faqSchema.extend({
      category: z.literal("coc").default("coc"),
      categoryName: z.literal("Code of Conduct").default("Code of Conduct"),
    }),
  }),
};
