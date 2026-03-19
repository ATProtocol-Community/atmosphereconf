import { format, parse } from "date-fns";

export const TIMEZONE = "America/Vancouver";
export const CSV_DATE_FORMAT = "MMMM do, yyyy h:mmaaa";
export const TIMESLOT_FORMAT = "MMMM d, yyyy hh:mm aa";
export const TIMESLOT_END_FORMAT = "hh:mm aa";

/** Return the UTC offset in minutes for a given IANA timezone at a specific instant. */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const utcParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);

  const utcMin =
    Date.UTC(get(utcParts, "year"), get(utcParts, "month") - 1, get(utcParts, "day"),
      get(utcParts, "hour"), get(utcParts, "minute"), get(utcParts, "second"));
  const tzMin =
    Date.UTC(get(tzParts, "year"), get(tzParts, "month") - 1, get(tzParts, "day"),
      get(tzParts, "hour"), get(tzParts, "minute"), get(tzParts, "second"));

  return (tzMin - utcMin) / 60_000;
}

/**
 * Reinterpret a Date (whose local-time components represent wall-clock time
 * in the given timezone) as a proper UTC Date.
 *
 * date-fns/parse produces a Date using the *system* timezone. We extract the
 * year/month/day/hour/minute components and treat them as belonging to `tz`.
 */
export function wallClockToUtc(date: Date, tz: string): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  const s = date.getSeconds();
  const ms = date.getMilliseconds();

  // First approximation: assume UTC, then correct for the timezone offset.
  const approx = new Date(Date.UTC(y, m, d, h, min, s, ms));
  const offset = tzOffsetMinutes(approx, tz);
  const corrected = new Date(approx.getTime() - offset * 60_000);

  // Re-check offset at the corrected time (handles DST edge cases).
  const offset2 = tzOffsetMinutes(corrected, tz);
  if (offset2 !== offset) {
    return new Date(approx.getTime() - offset2 * 60_000);
  }
  return corrected;
}

/**
 * Convert a UTC Date to a Date whose *local-time* getters (getFullYear, getHours, …)
 * return the wall-clock values in the given timezone.
 * This lets date-fns `format()` (which reads local-time components) produce the
 * correct output for the target timezone regardless of the system timezone.
 */
export function utcToLocalDate(date: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);

  return new Date(get("year"), get("month") - 1, get("day"),
    get("hour"), get("minute"), get("second"));
}

const REF = new Date();

export function parseScheduleDate(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const date = parse(trimmed, CSV_DATE_FORMAT, REF);
  if (isNaN(date.getTime())) {
    return trimmed;
  }
  return wallClockToUtc(date, TIMEZONE).toISOString();
}

export function formatScheduleDate(value?: string): string {
  if (!value) {
    return "";
  }
  const isoDate = new Date(value);
  if (!isNaN(isoDate.getTime())) {
    const local = utcToLocalDate(isoDate, TIMEZONE);
    return format(local, CSV_DATE_FORMAT);
  }
  return value;
}

export function formatTimeslot(start?: string, end?: string): string {
  if (!start || !end) {
    return "";
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime())) {
    return start;
  }
  const localStart = utcToLocalDate(startDate, TIMEZONE);
  if (isNaN(endDate.getTime())) {
    return `${format(localStart, TIMESLOT_FORMAT)} - ${end}`;
  }
  const localEnd = utcToLocalDate(endDate, TIMEZONE);
  return `${format(localStart, TIMESLOT_FORMAT)} - ${format(localEnd, TIMESLOT_END_FORMAT)}`;
}
