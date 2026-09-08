export const CONFERENCE_TIMEZONE = "America/Vancouver";

type DateInput = string | Date | null | undefined;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function asValidDate(input: DateInput): Date | undefined {
  if (!input) {
    return undefined;
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function getFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cacheKey = JSON.stringify([locale, options]);
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function formatDate(
  input: DateInput,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
  locale = "en-US",
): string {
  const date = asValidDate(input);
  if (!date) {
    return "";
  }

  return getFormatter(
    locale,
    timeZone ? { ...options, timeZone } : options,
  ).format(date);
}

export function formatConferenceDate(
  input: DateInput,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  return formatDate(input, options, CONFERENCE_TIMEZONE, locale);
}

export function formatLocalDate(
  input: DateInput,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  return formatDate(input, options, undefined, locale);
}

export function formatConferenceTime(input: DateInput): string {
  return formatConferenceDate(input, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatConferenceDay(input: DateInput): string {
  return formatConferenceDate(input, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getConferenceDateTimeParts(input: DateInput) {
  const date = asValidDate(input);
  if (!date) {
    return undefined;
  }

  const parts = getFormatter("en-US", {
    timeZone: CONFERENCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "", 10);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

export function getConferenceDateKey(input: DateInput): string {
  const parts = getConferenceDateTimeParts(input);
  if (!parts) {
    return "";
  }

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
