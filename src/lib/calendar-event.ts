/**
 * Conversion functions between CSV rows / internal event data
 * and community.lexicon.calendar.event atproto records.
 */

const ROOM_MAP: Record<string, string> = {
  "Room 2301": "2301 Classroom",
  "Room 2311": "2311 Classroom",
  "Performance Theater": "Performance Theatre",
  "Great Hall South": "Bukhman Lounge",
};

const TYPE_MAP: Record<string, string> = {
  "Discussion / Panel": "panel",
  "Lightning Talk": "lightning-talk",
  Presentation: "presentation",
  Workshop: "workshop",
};

export type Speaker = { name: string; id?: string };

export type EventData = {
  title: string;
  type: string;
  speakers?: Speaker[];
  start?: string;
  end?: string;
  description?: string;
  category?: string;
  room?: string;
  link_url?: string;
  link_text?: string;
};

export type CalendarEventRecord = {
  $type: "community.lexicon.calendar.event";
  name: string;
  createdAt: string;
  mode: string;
  status: string;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  uris?: { uri: string; name?: string }[];
  additionalData?: {
    type: string;
    speakers?: Speaker[];
    category?: string;
    room?: string;
    submissionId?: string;
    isAtmosphereconf: true;
  };
};

// Conference timezone: America/Vancouver (PDT = UTC-7)
const TIMEZONE_OFFSET = "-07:00";

/**
 * Normalize date strings like "2026-03-26 9:30am" to RFC 3339 format
 * "2026-03-26T09:30:00-07:00". Passes through values that are already
 * fully qualified or empty.
 */
function normalizeDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Already has timezone offset or Z
  if (/[Z+-]\d{2}:\d{2}$/.test(value) || value.endsWith("Z")) return value;
  // Already ISO but missing timezone — append it
  if (value.includes("T")) return value + TIMEZONE_OFFSET;
  // Match "2026-03-26 9:30am" or "2026-03-26 12:30pm"
  const m = value.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(am|pm)$/i,
  );
  if (!m) return value;
  const [, date, hourStr, min, ampm] = m;
  let hour = parseInt(hourStr);
  if (ampm.toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;
  return `${date}T${String(hour).padStart(2, "0")}:${min}:00${TIMEZONE_OFFSET}`;
}

/**
 * Parse a CSV row into our internal EventData shape.
 */
export function csvRowToEventData(row: Record<string, string>): EventData | null {
  const title = row["Talk Title"]?.trim();
  if (!title) return null;

  const typeRaw = row["Type"]?.trim() ?? "";
  const type = TYPE_MAP[typeRaw] ?? typeRaw.toLowerCase();

  const speakers: Speaker[] = [];
  for (const n of ["1st", "2nd", "3rd", "4th"]) {
    const name = row[`${n} Speaker Name`]?.trim();
    if (name) {
      const id =
        row[`${n} Speaker ID`]?.replace(/^@/, "").trim() || undefined;
      speakers.push({ name, id });
    }
  }

  const event: EventData = { title, type };
  if (speakers.length > 0) event.speakers = speakers;

  const start = normalizeDateTime(row["Start Time"]?.trim());
  const end = normalizeDateTime(row["End Time"]?.trim());
  const description = row["Proposal Description"]?.trim();
  const category = row["Category"]?.trim();
  const roomRaw = row["Room"]?.trim();
  const room = roomRaw ? (ROOM_MAP[roomRaw] ?? roomRaw) : undefined;

  if (start) event.start = start;
  if (end) event.end = end;
  if (description) event.description = description;
  if (category) event.category = category;
  if (room) event.room = room;

  return event;
}

/**
 * Convert internal EventData to a community.lexicon.calendar.event record.
 */
export function eventDataToCalendarRecord(
  event: EventData,
  createdAt: string,
  submissionId?: string,
): CalendarEventRecord {
  const record: CalendarEventRecord = {
    $type: "community.lexicon.calendar.event",
    name: event.title,
    createdAt,
    mode:
      event.type === "workshop"
        ? "community.lexicon.calendar.event#inperson"
        : "community.lexicon.calendar.event#hybrid",
    status: "community.lexicon.calendar.event#scheduled",
    additionalData: {
      type: event.type,
      isAtmosphereconf: true,
      ...(submissionId && { submissionId }),
    },
  };

  if (event.start) record.startsAt = event.start;
  if (event.end) record.endsAt = event.end;
  if (event.description) record.description = event.description;

  if (event.speakers && event.speakers.length > 0) {
    record.additionalData!.speakers = event.speakers;
  }
  if (event.category) record.additionalData!.category = event.category;
  if (event.room) record.additionalData!.room = event.room;

  const uris: { uri: string; name?: string }[] = [];
  if (submissionId) {
    uris.push({
      uri: `https://atmosphereconf.org/event/${submissionId}`,
      name: "Event Page",
    });
  }
  if (event.link_url) {
    uris.push({ uri: event.link_url, name: event.link_text });
  }
  if (uris.length > 0) record.uris = uris;

  return record;
}

/**
 * Convert a community.lexicon.calendar.event record back to internal EventData.
 */
export function calendarRecordToEventData(
  value: Record<string, unknown>,
): EventData {
  const ad = (value.additionalData as Record<string, unknown>) ?? {};

  const event: EventData = {
    title: value.name as string,
    type: (ad.type as string) ?? "presentation",
  };

  if (ad.speakers) event.speakers = ad.speakers as Speaker[];
  if (value.startsAt) event.start = value.startsAt as string;
  if (value.endsAt) event.end = value.endsAt as string;
  if (value.description) event.description = value.description as string;
  if (ad.category) event.category = ad.category as string;
  if (ad.room) event.room = ad.room as string;

  const uris = value.uris as { uri: string; name?: string }[] | undefined;
  if (uris?.length) {
    event.link_url = uris[0].uri;
    event.link_text = uris[0].name;
  }

  return event;
}
