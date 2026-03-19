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
    sourceId?: string;
    isAtmosphereconf: true;
  };
};

export function eventDataToCalendarRecord(
  event: EventData,
  createdAt: string,
  submissionId?: string,
): CalendarEventRecord {
  const record: CalendarEventRecord = {
    $type: "community.lexicon.calendar.event",
    name: event.title,
    createdAt,
    mode: ["workshop", "info", "activity"].includes(event.type)
      ? "community.lexicon.calendar.event#inperson"
      : "community.lexicon.calendar.event#hybrid",
    status: "community.lexicon.calendar.event#scheduled",
    additionalData: {
      type: event.type,
      isAtmosphereconf: true,
      ...(submissionId && { submissionId }),
    },
  };

  if (event.start) {
    record.startsAt = event.start;
  }
  if (event.end) {
    record.endsAt = event.end;
  }
  if (event.description) {
    record.description = event.description;
  }

  if (event.speakers && event.speakers.length > 0) {
    record.additionalData!.speakers = event.speakers;
  }
  if (event.category) {
    record.additionalData!.category = event.category;
  }
  if (event.room) {
    record.additionalData!.room = event.room;
  }

  if (event.link_url) {
    record.uris = [{ uri: event.link_url, name: event.link_text }];
  }

  return record;
}

export function calendarRecordToEventData(
  value: Record<string, unknown>,
): EventData {
  const ad = (value.additionalData as Record<string, unknown>) ?? {};

  const event: EventData = {
    title: value.name as string,
    type: (ad.type as string) ?? "presentation",
  };

  if (ad.speakers) {
    event.speakers = ad.speakers as Speaker[];
  }
  if (value.startsAt) {
    event.start = value.startsAt as string;
  }
  if (value.endsAt) {
    event.end = value.endsAt as string;
  }
  if (value.description) {
    event.description = value.description as string;
  }
  if (ad.category) {
    event.category = ad.category as string;
  }
  if (ad.room) {
    event.room = ad.room as string;
  }

  const uris = value.uris as { uri: string; name?: string }[] | undefined;
  const externalUri = uris?.find(
    (u) => !u.uri.startsWith("https://atmosphereconf.org/event/"),
  );
  if (externalUri) {
    event.link_url = externalUri.uri;
    event.link_text = externalUri.name;
  }

  return event;
}
