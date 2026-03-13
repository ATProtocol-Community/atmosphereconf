import type { Loader } from "astro/loaders";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import Papa from "papaparse";
import { z } from "astro/zod";

const TYPE_MAP = {
  "Discussion / Panel": "panel",
  "Lightning Talk": "lightning-talk",
  Presentation: "presentation",
  Workshop: "workshop",
} as const;

const emptyToUndefined = z.string().transform((s) => s.trim() || undefined);

const csvRowSchema = z
  .object({
    "Submission ID": z.string().min(1),
    "Speaker ID": z
      .string()
      .transform((s) => s.replace(/^@/, "").trim() || undefined),
    "Speaker Name": emptyToUndefined,
    Type: z
      .string()
      .transform(
        (t) => TYPE_MAP[t as keyof typeof TYPE_MAP] ?? t.toLowerCase(),
      ),
    "Start Time": emptyToUndefined,
    "Talk Title": z
      .string()
      .min(1)
      .transform((t) => t.replace(/~~(.+?)~~/g, "<del>$1</del>")),
    "Proposal Description": emptyToUndefined,
  })
  .transform((row) => ({
    id: row["Submission ID"],
    title: row["Talk Title"],
    type: row["Type"],
    // CSV has one speaker per row; wrap in array to match the schema
    // we had (seems like some could have multiple but not in the current CSV)
    speakers: [row["Speaker Name"]]
      .filter(Boolean)
      .map((name) => ({ name, id: row["Speaker ID"] })),
    start: row["Start Time"],
    description: row["Proposal Description"],
  }));

export function csvTalksLoader(dir: string): Loader {
  return {
    name: "csv-talks-loader",
    load: async ({ store, parseData, logger }) => {
      const files = await readdir(dir);
      const csvFile = files
        .filter((f) => f.endsWith(".csv"))
        .sort()
        .at(-1);
      if (!csvFile) {
        logger.warn("No CSV file found in " + dir);
        return;
      }

      const raw = await readFile(join(dir, csvFile), "utf-8");
      const { data: records } = Papa.parse<Record<string, string>>(raw, {
        header: true,
        skipEmptyLines: true,
      });

      for (const record of records) {
        const parsed = csvRowSchema.safeParse(record);
        if (!parsed.success) {
          throw new Error("Couldn't parse record", { cause: record });
        }

        const { id, ...entry } = parsed.data;
        const data = await parseData({ id, data: entry });
        store.set({ id, data });
      }

      logger.info(`Loaded ${records.length} talks from ${csvFile}`);
    },
  };
}
