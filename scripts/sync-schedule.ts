import { AtpAgent, AtpBaseClient } from "@atproto/api";
import { IdResolver } from "@atproto/identity";
import * as p from "@clack/prompts";
import { readFileSync, writeFileSync } from "node:fs";
import Papa from "papaparse";
import slugify from "slugify";
import {
  eventDataToCalendarRecord,
  type EventData,
  type Speaker,
} from "../src/lib/calendar-event";
import { promptPullDid, promptPushCredentials } from "./lib/auth";
import {
  parseScheduleDate,
  formatScheduleDate,
  formatTimeslot,
} from "./lib/timezone";

const COLLECTION = "community.lexicon.calendar.event";
const DRY_RUN = process.argv.includes("--dry-run");

type CsvRow = Record<string, string>;
type ScheduleEntry = EventData & { sourceId: string };

const TYPE_MAP: Record<string, string> = {
  "Discussion / Panel": "panel",
  "Lightning Talk": "lightning-talk",
  Presentation: "presentation",
  Workshop: "workshop",
  Activity: "activity",
  Info: "info",
};

const TYPE_LABELS = Object.fromEntries(
  Object.entries(TYPE_MAP).map(([label, key]) => [key, label]),
);


// --- CSV parsing ---

function getScheduleType(row: CsvRow): string {
  const sessionType = row["Session Type"]?.trim();
  if (sessionType) {
    return TYPE_MAP[sessionType] ?? sessionType.toLowerCase();
  }
  const t = row.Type?.trim() ?? "";
  return t === "Activity" ? "activity" : "info";
}

function parseCsvEvent(row: CsvRow): ScheduleEntry | null {
  const title = row.Title?.trim();
  if (!title) {
    return null;
  }

  const speakerPairs = [
    [row["1st speaker name"], row["1st speaker handle"]],
    [row["2nd speaker name"], row["2nd speaker handle"]],
    [row["3rd speaker name"], row["3rd speaker handle"]],
    [row["4th speaker name"], row["4th speaker handle"]],
  ] as const;

  const speakers: Speaker[] = [];
  for (const [rawName, rawId] of speakerPairs) {
    const name = rawName?.trim() || undefined;
    const id = rawId?.replace(/^@/, "").trim() || undefined;
    if (name) {
      speakers.push({ name, id });
    }
  }

  const talkId = row["talk id"]?.trim();
  const start = parseScheduleDate(row.Start);

  return {
    sourceId:
      talkId ||
      slugify(title, { lower: true, strict: true }) +
        "-" +
        (start ?? "unscheduled").replace(/:/g, "-"),
    title,
    type: getScheduleType(row),
    speakers: speakers.length > 0 ? speakers : undefined,
    start,
    end: parseScheduleDate(row.End),
    room: row.Location?.trim() || undefined,
    description: row.Description?.trim() || undefined,
    category: row.Track?.trim() || undefined,
    link_url: row["Link URL"]?.trim() || undefined,
    link_text: row["Link Text"]?.trim() || undefined,
  };
}

function loadScheduleFromCsv(path: string): ScheduleEntry[] {
  const { data } = Papa.parse<CsvRow>(readFileSync(path, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  const seen = new Set<string>();
  const entries: ScheduleEntry[] = [];

  for (const row of data) {
    const entry = parseCsvEvent(row);
    if (!entry) {
      continue;
    }
    if (seen.has(entry.sourceId)) {
      throw new Error(`Duplicate schedule sourceId: ${entry.sourceId}`);
    }
    seen.add(entry.sourceId);
    entries.push(entry);
  }

  return entries;
}

function buildRecord(entry: ScheduleEntry, createdAt: string) {
  const record = eventDataToCalendarRecord(entry, createdAt);
  record.additionalData!.sourceId = entry.sourceId;
  return record;
}

function sortedStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        )
      : v,
  );
}

// --- PDS operations ---

const resolver = new IdResolver();

async function resolveIdentifierToDid(identifier: string): Promise<string> {
  if (identifier.startsWith("did:")) {
    return identifier;
  }
  const did = await resolver.handle.resolve(identifier);
  if (!did) {
    throw new Error(`Could not resolve handle: ${identifier}`);
  }
  return did;
}

async function resolvePds(identifier: string): Promise<string> {
  const did = await resolveIdentifierToDid(identifier);
  const data = await resolver.did.resolveAtprotoData(did);
  return data.pds;
}

async function loadExisting(
  client: { com: { atproto: { repo: { listRecords: Function } } } },
  did: string,
) {
  const existing = new Map<string, Record<string, unknown>>();
  let cursor: string | undefined;

  do {
    const { data } = await client.com.atproto.repo.listRecords({
      repo: did,
      collection: COLLECTION,
      limit: 100,
      cursor,
    });

    for (const rec of data.records) {
      const value = rec.value as Record<string, unknown>;
      const ad = value.additionalData as Record<string, unknown> | undefined;
      if (!ad?.isAtmosphereconf) {
        continue;
      }
      existing.set(rec.uri.split("/").pop()!, value);
    }

    cursor = data.cursor;
  } while (cursor);

  return existing;
}

function diffEntries(
  entries: ScheduleEntry[],
  existing: Map<string, Record<string, unknown>>,
) {
  const toCreate: ScheduleEntry[] = [];
  const toUpdate: ScheduleEntry[] = [];
  const unchanged: ScheduleEntry[] = [];

  for (const entry of entries) {
    const previous = existing.get(entry.sourceId);
    if (!previous) {
      toCreate.push(entry);
      continue;
    }
    const createdAt =
      (previous.createdAt as string | undefined) ?? new Date().toISOString();
    const record = buildRecord(entry, createdAt);
    // Compare only the keys present in the built record to ignore extra upstream fields
    const previousSubset = Object.fromEntries(
      Object.keys(record).map((k) => [
        k,
        (previous as Record<string, unknown>)[k],
      ]),
    );
    if (sortedStringify(previousSubset) === sortedStringify(record)) {
      unchanged.push(entry);
    } else {
      toUpdate.push(entry);
    }
  }

  const csvIds = new Set(entries.map((e) => e.sourceId));
  const orphanedKeys = [...existing.keys()].filter((k) => !csvIds.has(k));

  return { toCreate, toUpdate, unchanged, orphanedKeys };
}

async function upsertSchedule(
  entries: ScheduleEntry[],
  agent: AtpAgent,
  did: string,
  orphanKeysToDelete: string[],
) {
  const existing = await loadExisting(agent, did);

  const createdEntries: string[] = [];
  const updatedEntries: string[] = [];
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    const previous = existing.get(entry.sourceId);
    const createdAt =
      (previous?.createdAt as string | undefined) ?? new Date().toISOString();
    const record = buildRecord(entry, createdAt);

    const previousSubset = previous
      ? Object.fromEntries(
          Object.keys(record).map((k) => [
            k,
            (previous as Record<string, unknown>)[k],
          ]),
        )
      : null;
    if (
      previousSubset &&
      sortedStringify(previousSubset) === sortedStringify(record)
    ) {
      skipped++;
      continue;
    }

    try {
      await agent.com.atproto.repo.putRecord({
        repo: did,
        collection: COLLECTION,
        rkey: entry.sourceId,
        record,
      });
      if (previous) {
        updatedEntries.push(entry.title);
      } else {
        createdEntries.push(entry.title);
      }
    } catch (error) {
      p.log.error(
        `Error upserting ${entry.sourceId} (${entry.title}): ${error}`,
      );
      errors++;
    }
  }

  // Delete orphaned records
  const deletedEntries: string[] = [];
  for (const rkey of orphanKeysToDelete) {
    try {
      await agent.com.atproto.repo.deleteRecord({
        repo: did,
        collection: COLLECTION,
        rkey,
      });
      deletedEntries.push(rkey);
    } catch (error) {
      p.log.error(`Error deleting ${rkey}: ${error}`);
      errors++;
    }
  }

  const lines: string[] = [];
  if (createdEntries.length) {
    lines.push(`Created (${createdEntries.length}):`);
    for (const t of createdEntries) lines.push(`  + ${t}`);
  }
  if (updatedEntries.length) {
    lines.push(`Updated (${updatedEntries.length}):`);
    for (const t of updatedEntries) lines.push(`  ~ ${t}`);
  }
  if (deletedEntries.length) {
    lines.push(`Deleted (${deletedEntries.length}):`);
    for (const k of deletedEntries) lines.push(`  - ${k}`);
  }
  if (skipped) lines.push(`Skipped (unchanged): ${skipped}`);
  if (errors) lines.push(`Errors: ${errors}`);
  lines.push(`Total: ${entries.length}`);
  lines.push("");
  lines.push(`Browse: https://pdsls.dev/at/${did}/${COLLECTION}`);

  p.note(lines.join("\n"), "Sync summary");
}

// --- Pull ---

async function loadRecordsForPull(did: string) {
  const pds = await resolvePds(did);
  const agent = new AtpBaseClient(pds);
  const entries: ScheduleEntry[] = [];
  let cursor: string | undefined;

  do {
    const { data } = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: COLLECTION,
      limit: 100,
      cursor,
    });

    for (const rec of data.records) {
      const value = rec.value as Record<string, unknown>;
      const ad = value.additionalData as Record<string, unknown> | undefined;
      if (!ad?.isAtmosphereconf) {
        continue;
      }

      const uris = Array.isArray(value.uris)
        ? (value.uris as Array<{ uri: string; name?: string }>)
        : [];
      const externalUri = uris.find(
        (u) => !u.uri.startsWith("https://atmosphereconf.org/event/"),
      );

      entries.push({
        sourceId:
          (ad?.sourceId as string | undefined) ?? rec.uri.split("/").pop()!,
        title: String(value.name ?? ""),
        type: String(ad?.type ?? "presentation"),
        speakers: Array.isArray(ad?.speakers)
          ? (ad.speakers as Speaker[])
          : undefined,
        start: typeof value.startsAt === "string" ? value.startsAt : undefined,
        end: typeof value.endsAt === "string" ? value.endsAt : undefined,
        room: typeof ad?.room === "string" ? ad.room : undefined,
        category: typeof ad?.category === "string" ? ad.category : undefined,
        description:
          typeof value.description === "string" ? value.description : undefined,
        link_url: externalUri?.uri,
        link_text: externalUri?.name,
      });
    }

    cursor = data.cursor;
  } while (cursor);

  return entries.sort((a, b) => {
    const byStart = (a.start ?? "").localeCompare(b.start ?? "");
    if (byStart !== 0) {
      return byStart;
    }
    const byRoom = (a.room ?? "").localeCompare(b.room ?? "");
    if (byRoom !== 0) {
      return byRoom;
    }
    return a.title.localeCompare(b.title);
  });
}

function buildPullRow(entry: ScheduleEntry) {
  const speakers = entry.speakers ?? [];
  const isFoodInfo =
    entry.type === "info" && /breakfast|lunch|coffee/i.test(entry.title);

  return {
    Timeslot: formatTimeslot(entry.start, entry.end),
    "1st speaker name": speakers[0]?.name ?? "",
    "1st speaker handle": speakers[0]?.id ?? "",
    "2nd speaker name": speakers[1]?.name ?? "",
    "2nd speaker handle": speakers[1]?.id ?? "",
    "3rd speaker name": speakers[2]?.name ?? "",
    "3rd speaker handle": speakers[2]?.id ?? "",
    "4th speaker name": speakers[3]?.name ?? "",
    "4th speaker handle": speakers[3]?.id ?? "",
    "talk id": entry.sourceId,
    "Linked Sessions": entry.title,
    "Conference Events": entry.title,
    Title: entry.title,
    Description: entry.description ?? "",
    Location: entry.room ?? "",
    "Session Type": TYPE_LABELS[entry.type] ?? "",
    Type: isFoodInfo
      ? "Food"
      : entry.type === "activity"
        ? "Activity"
        : entry.type === "info"
          ? "Info"
          : "Session",
    Start: formatScheduleDate(entry.start),
    End: formatScheduleDate(entry.end),
    "Location Description": "",
    Track: entry.category ?? "",
    "Link URL": entry.link_url ?? "",
    "Link Text": entry.link_text ?? "",
  };
}

// --- CLI flow ---

async function handlePush(csvPath?: string) {
  const path =
    csvPath ?? "src/content/talks/Atmosphere Conference 2026 Schedule.csv";

  const s = p.spinner();
  s.start("Loading CSV");
  const entries = loadScheduleFromCsv(path);
  s.stop(`Loaded ${entries.length} records from ${path}`);

  const { identifier, password } = await promptPushCredentials();

  const s2 = p.spinner();
  s2.start("Fetching existing records from PDS");
  const pds = await resolvePds(identifier);
  const unauthClient = new AtpBaseClient(pds);
  const did = await resolveIdentifierToDid(identifier);
  const existing = await loadExisting(unauthClient, did);
  s2.stop(`Found ${existing.size} existing records on PDS`);

  const { toCreate, toUpdate, unchanged, orphanedKeys } = diffEntries(
    entries,
    existing,
  );

  // Show diff summary
  const diffLines: string[] = [
    `Source: ${path}`,
    "",
    `  + Create: ${toCreate.length}`,
    `  ~ Update: ${toUpdate.length}`,
    `  = Unchanged: ${unchanged.length}`,
    `  ? Orphaned (upstream only): ${orphanedKeys.length}`,
  ];
  if (toCreate.length) {
    diffLines.push("", "New:");
    for (const e of toCreate) diffLines.push(`  + ${e.sourceId} — ${e.title}`);
  }
  if (toUpdate.length) {
    diffLines.push("", "Changed:");
    for (const e of toUpdate) diffLines.push(`  ~ ${e.sourceId} — ${e.title}`);
  }
  if (orphanedKeys.length) {
    diffLines.push("", "Orphaned (exist upstream but not in CSV):");
    for (const k of orphanedKeys) {
      const rec = existing.get(k)!;
      diffLines.push(`  ? ${k} — ${rec.name ?? "(untitled)"}`);
    }
  }
  p.note(diffLines.join("\n"), "Diff preview");

  if (
    toCreate.length === 0 &&
    toUpdate.length === 0 &&
    orphanedKeys.length === 0
  ) {
    p.log.info("Everything is in sync. Nothing to do.");
    return;
  }

  if (DRY_RUN) {
    p.log.info("Dry run — skipping PDS sync.");
    return;
  }

  // Handle orphaned records
  let orphanKeysToDelete: string[] = [];
  if (orphanedKeys.length > 0) {
    const orphanAction = await p.select({
      message: `${orphanedKeys.length} record(s) exist upstream but not in CSV. What to do?`,
      options: [
        { value: "keep", label: "Keep them (do nothing)" },
        { value: "delete", label: "Delete them from PDS" },
        { value: "pick", label: "Choose individually" },
      ],
    });
    if (p.isCancel(orphanAction)) {
      p.cancel("Aborted.");
      return;
    }

    if (orphanAction === "delete") {
      orphanKeysToDelete = orphanedKeys;
    } else if (orphanAction === "pick") {
      const selected = await p.multiselect({
        message: "Select records to delete:",
        options: orphanedKeys.map((k) => {
          const rec = existing.get(k)!;
          return { value: k, label: `${k} — ${rec.name ?? "(untitled)"}` };
        }),
        required: false,
      });
      if (p.isCancel(selected)) {
        p.cancel("Aborted.");
        return;
      }
      orphanKeysToDelete = selected as string[];
    }
  }

  const ok = await p.confirm({
    message: `Push ${toCreate.length + toUpdate.length} change(s) and delete ${orphanKeysToDelete.length} record(s)?`,
  });
  if (p.isCancel(ok) || !ok) {
    p.cancel("Aborted.");
    return;
  }

  const agent = new AtpAgent({ service: pds });
  await agent.login({ identifier, password });

  const s3 = p.spinner();
  s3.start("Syncing records");
  await upsertSchedule(entries, agent, did, orphanKeysToDelete);
  s3.stop("Done");
}

async function handlePull() {
  const did = await promptPullDid();

  const s = p.spinner();
  s.start("Fetching records");
  const entries = await loadRecordsForPull(did);
  s.stop(`Fetched ${entries.length} records`);

  const rows = entries.map(buildPullRow);
  const csv = Papa.unparse(rows);

  const outputPath = await p.text({
    message: "Output CSV path",
    initialValue: "schedule-pull.csv",
  });
  if (p.isCancel(outputPath)) {
    p.cancel("Cancelled.");
    return;
  }

  writeFileSync(outputPath, csv, "utf8");
  p.log.success(`Wrote ${rows.length} rows to ${outputPath}`);
}

try {
  p.intro("ATmosphereConf Schedule Sync");

  const command = await p.select({
    message: "What would you like to do?",
    options: [
      { value: "push", label: "Push CSV to PDS" },
      { value: "pull", label: "Pull records from PDS to CSV" },
    ],
  });
  if (p.isCancel(command)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  if (command === "push") {
    const csvPath = await p.text({
      message: "Path to CSV file",
      placeholder: "src/content/talks/Atmosphere Conference 2026 Schedule.csv",
      defaultValue: "src/content/talks/Atmosphere Conference 2026 Schedule.csv",
    });
    if (p.isCancel(csvPath)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    await handlePush(csvPath);
  } else {
    await handlePull();
  }

  p.outro("Done!");
} catch (error) {
  p.log.error(String(error));
  process.exit(1);
}
