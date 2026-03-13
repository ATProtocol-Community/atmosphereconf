import type { Loader } from "astro/loaders";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import Papa from "papaparse";
import { z } from "astro/zod";
import yaml from "js-yaml";

const TYPE_MAP = {
  "Discussion / Panel": "panel",
  "Lightning Talk": "lightning-talk",
  Presentation: "presentation",
  Workshop: "workshop",
} as const;

const emptyToUndefined = z.string().transform((s) => s.trim() || undefined);

const speakerName = emptyToUndefined;
const speakerId = z
  .string()
  .transform((s) => s.replace(/^@/, "").trim() || undefined);

const csvRowSchema = z
  .object({
    "Submission ID": z.string().min(1),
    "1st Speaker Name": speakerName,
    "1st Speaker ID": speakerId,
    "2nd Speaker Name": speakerName,
    "2nd Speaker ID": speakerId,
    "3rd Speaker Name": speakerName,
    "3rd Speaker ID": speakerId,
    "4th Speaker Name": speakerName,
    "4th Speaker ID": speakerId,
    "Proposal Status": emptyToUndefined,
    Type: z
      .string()
      .transform(
        (t) => TYPE_MAP[t as keyof typeof TYPE_MAP] ?? t.toLowerCase(),
      ),
    "Start Time": emptyToUndefined,
    "End Time": emptyToUndefined,
    "Talk Title": z
      .string()
      .min(1)
      .transform((t) => t.replace(/~~(.+?)~~/g, "<del>$1</del>")),
    "Proposal Description": emptyToUndefined,
    Category: emptyToUndefined,
  })
  .transform((row) => {
    const speakers = (
      [
        [row["1st Speaker Name"], row["1st Speaker ID"]],
        [row["2nd Speaker Name"], row["2nd Speaker ID"]],
        [row["3rd Speaker Name"], row["3rd Speaker ID"]],
        [row["4th Speaker Name"], row["4th Speaker ID"]],
      ] as const
    )
      .filter(([name]) => name)
      .map(([name, id]) => ({ name: name!, id }));

    return {
      id: row["Submission ID"],
      title: row["Talk Title"],
      type: row["Type"],
      speakers,
      start: row["Start Time"],
      end: row["End Time"],
      description: row["Proposal Description"],
      category: row["Category"],
    };
  });

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

      // Load YAML entries that don't already exist in the store (workshops, info, activities)
      const yamlFile = files.find((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
      if (yamlFile) {
        const yamlRaw = await readFile(join(dir, yamlFile), "utf-8");
        const yamlEntries = yaml.load(yamlRaw) as Array<Record<string, unknown>>;
        let added = 0;
        for (const entry of yamlEntries) {
          const id = entry.id as string;
          if (store.has(id)) continue;
          const { id: _, ...rest } = entry;
          const data = await parseData({ id, data: rest });
          store.set({ id, data });
          added++;
        }
        logger.info(`Loaded ${added} extra entries from ${yamlFile}`);
      }
    },
  };
}
