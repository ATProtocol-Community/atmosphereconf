import { glob } from "astro/loaders";
import { defineCollection, reference, z } from "astro:content";
import { faqCollections } from "./faqs/_config";
import { talkCollections } from "./talks/_config";

export const collections = {
  ...faqCollections,
  agenda: defineCollection({
    loader: async () => [
      {
        id: "1",
        time: "9:00 AM",
        title: "Registration & Breadcrumbs",
        speaker: null,
      },
      {
        id: "2",
        time: "10:00 AM",
        title: "Opening Keynote: The Future of Honking",
        speaker: "honker-mcwaddle",
      },
      {
        id: "3",
        time: "11:00 AM",
        title: "Building on the Gaggle Protocol",
        speaker: "gander-featherton",
      },
      { id: "4", time: "12:00 PM", title: "Pond Break", speaker: null },
      {
        id: "5",
        time: "1:30 PM",
        title: "Identity and Authentication in Goose Networks",
        speaker: "gosling-rivers",
      },
      {
        id: "6",
        time: "2:30 PM",
        title: "Scaling V-Formation Networks",
        speaker: "migratus-wingsworth",
      },
      {
        id: "7",
        time: "3:30 PM",
        title: "Closing Honks & Waddling",
        speaker: null,
      },
    ],
    schema: z.object({
      time: z.string(),
      title: z.string(),
      speaker: reference("speakers").nullable(),
    }),
  }),
  speakers: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/speakers" }),
    schema: z.object({
      name: z.string(),
      title: z.string(),
      company: z.string(),
      bio: z.string(),
    }),
  }),
  ...talkCollections,
  sponsors: defineCollection({
    loader: glob({ pattern: "**/*.yaml", base: "./src/content/sponsors" }),
    schema: ({ image }) =>
      z.object({
        name: z.string(),
        level: z.string(),
        url: z.string(),
        handle: z.string(),
        logo: image(),
      }),
  }),
};
