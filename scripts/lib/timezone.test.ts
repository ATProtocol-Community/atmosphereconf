import { describe, expect, it } from "vitest";
import {
  tzOffsetMinutes,
  wallClockToUtc,
  utcToLocalDate,
  parseScheduleDate,
  formatScheduleDate,
  formatTimeslot,
} from "./timezone";

describe("tzOffsetMinutes", () => {
  it("returns -7 hours (PDT) for Vancouver in late March", () => {
    // March 28, 2026 is after DST spring-forward (March 8)
    const date = new Date("2026-03-28T12:00:00Z");
    expect(tzOffsetMinutes(date, "America/Vancouver")).toBe(-7 * 60);
  });

  it("returns -8 hours (PST) for Vancouver in January", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    expect(tzOffsetMinutes(date, "America/Vancouver")).toBe(-8 * 60);
  });

  it("returns 0 for UTC", () => {
    const date = new Date("2026-03-28T12:00:00Z");
    expect(tzOffsetMinutes(date, "UTC")).toBe(0);
  });
});

describe("wallClockToUtc", () => {
  it("converts PDT wall-clock time to UTC (March, UTC-7)", () => {
    // A Date whose local-time components are 1:30pm on March 28
    const localDate = new Date(2026, 2, 28, 13, 30, 0, 0);
    const utc = wallClockToUtc(localDate, "America/Vancouver");
    expect(utc.toISOString()).toBe("2026-03-28T20:30:00.000Z");
  });

  it("converts PST wall-clock time to UTC (January, UTC-8)", () => {
    const localDate = new Date(2026, 0, 15, 10, 0, 0, 0);
    const utc = wallClockToUtc(localDate, "America/Vancouver");
    expect(utc.toISOString()).toBe("2026-01-15T18:00:00.000Z");
  });

  it("converts morning time correctly", () => {
    const localDate = new Date(2026, 2, 28, 8, 0, 0, 0);
    const utc = wallClockToUtc(localDate, "America/Vancouver");
    expect(utc.toISOString()).toBe("2026-03-28T15:00:00.000Z");
  });

  it("converts late evening time that crosses midnight UTC", () => {
    // 11pm PDT = 6am next day UTC
    const localDate = new Date(2026, 2, 28, 23, 0, 0, 0);
    const utc = wallClockToUtc(localDate, "America/Vancouver");
    expect(utc.toISOString()).toBe("2026-03-29T06:00:00.000Z");
  });
});

describe("utcToLocalDate", () => {
  it("converts UTC to PDT local-time components", () => {
    const utc = new Date("2026-03-28T20:30:00.000Z");
    const local = utcToLocalDate(utc, "America/Vancouver");
    expect(local.getFullYear()).toBe(2026);
    expect(local.getMonth()).toBe(2); // March = 2
    expect(local.getDate()).toBe(28);
    expect(local.getHours()).toBe(13);
    expect(local.getMinutes()).toBe(30);
  });

  it("converts UTC to PST local-time components", () => {
    const utc = new Date("2026-01-15T18:00:00.000Z");
    const local = utcToLocalDate(utc, "America/Vancouver");
    expect(local.getHours()).toBe(10);
    expect(local.getMinutes()).toBe(0);
  });

  it("handles UTC midnight correctly (previous day in Vancouver)", () => {
    const utc = new Date("2026-03-29T06:00:00.000Z");
    const local = utcToLocalDate(utc, "America/Vancouver");
    expect(local.getDate()).toBe(28);
    expect(local.getHours()).toBe(23);
  });
});

describe("wallClockToUtc / utcToLocalDate round-trip", () => {
  const times = [
    [2026, 2, 28, 8, 0],
    [2026, 2, 28, 10, 30],
    [2026, 2, 28, 13, 30],
    [2026, 2, 28, 17, 0],
    [2026, 2, 28, 23, 0],
    [2026, 0, 15, 9, 0], // PST period
  ] as const;

  for (const [y, m, d, h, min] of times) {
    it(`round-trips ${y}-${m + 1}-${d} ${h}:${String(min).padStart(2, "0")}`, () => {
      const original = new Date(y, m, d, h, min, 0, 0);
      const utc = wallClockToUtc(original, "America/Vancouver");
      const recovered = utcToLocalDate(utc, "America/Vancouver");
      expect(recovered.getFullYear()).toBe(y);
      expect(recovered.getMonth()).toBe(m);
      expect(recovered.getDate()).toBe(d);
      expect(recovered.getHours()).toBe(h);
      expect(recovered.getMinutes()).toBe(min);
    });
  }
});

describe("parseScheduleDate", () => {
  it("returns undefined for empty/undefined input", () => {
    expect(parseScheduleDate(undefined)).toBeUndefined();
    expect(parseScheduleDate("")).toBeUndefined();
    expect(parseScheduleDate("  ")).toBeUndefined();
  });

  it("converts CSV date to full ISO 8601 UTC string (PDT)", () => {
    const result = parseScheduleDate("March 28th, 2026 1:30pm");
    expect(result).toBe("2026-03-28T20:30:00.000Z");
  });

  it("converts morning CSV date correctly", () => {
    const result = parseScheduleDate("March 28th, 2026 10:30am");
    expect(result).toBe("2026-03-28T17:30:00.000Z");
  });

  it("produces a string ending in Z", () => {
    const result = parseScheduleDate("March 28th, 2026 2:00pm");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("returns unparseable input unchanged", () => {
    expect(parseScheduleDate("not a date")).toBe("not a date");
  });

  it("trims whitespace", () => {
    const result = parseScheduleDate("  March 28th, 2026 1:30pm  ");
    expect(result).toBe("2026-03-28T20:30:00.000Z");
  });
});

describe("formatScheduleDate", () => {
  it("returns empty string for empty/undefined input", () => {
    expect(formatScheduleDate(undefined)).toBe("");
    expect(formatScheduleDate("")).toBe("");
  });

  it("converts ISO UTC string back to CSV format in Pacific time", () => {
    const result = formatScheduleDate("2026-03-28T20:30:00.000Z");
    expect(result).toBe("March 28th, 2026 1:30pm");
  });

  it("converts morning UTC time back correctly", () => {
    const result = formatScheduleDate("2026-03-28T17:30:00.000Z");
    expect(result).toBe("March 28th, 2026 10:30am");
  });

  it("round-trips with parseScheduleDate", () => {
    const original = "March 28th, 2026 1:30pm";
    const iso = parseScheduleDate(original)!;
    const roundTripped = formatScheduleDate(iso);
    expect(roundTripped).toBe(original);
  });

  it("round-trips multiple times", () => {
    const inputs = [
      "March 28th, 2026 8:00am",
      "March 28th, 2026 10:30am",
      "March 28th, 2026 1:30pm",
      "March 28th, 2026 5:00pm",
    ];
    for (const input of inputs) {
      const iso = parseScheduleDate(input)!;
      expect(formatScheduleDate(iso)).toBe(input);
    }
  });
});

describe("formatTimeslot", () => {
  it("returns empty string when start or end is missing", () => {
    expect(formatTimeslot(undefined, undefined)).toBe("");
    expect(formatTimeslot("2026-03-28T17:30:00.000Z", undefined)).toBe("");
    expect(formatTimeslot(undefined, "2026-03-28T18:00:00.000Z")).toBe("");
  });

  it("formats a timeslot with start and end in Pacific time", () => {
    const result = formatTimeslot(
      "2026-03-28T17:30:00.000Z",
      "2026-03-28T18:00:00.000Z",
    );
    expect(result).toBe("March 28, 2026 10:30 AM - 11:00 AM");
  });

  it("formats a timeslot spanning afternoon", () => {
    const result = formatTimeslot(
      "2026-03-28T20:30:00.000Z",
      "2026-03-28T21:00:00.000Z",
    );
    expect(result).toBe("March 28, 2026 01:30 PM - 02:00 PM");
  });

  it("returns start string for invalid start date", () => {
    expect(formatTimeslot("not-a-date", "2026-03-28T18:00:00.000Z")).toBe(
      "not-a-date",
    );
  });
});

describe("ISO 8601 compliance", () => {
  it("output matches AT Protocol datetime format", () => {
    const result = parseScheduleDate("March 28th, 2026 1:30pm");
    // AT Protocol requires: Full-precision date and time, with timezone information
    // Format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(result).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("output is parseable by native Date constructor", () => {
    const result = parseScheduleDate("March 28th, 2026 1:30pm")!;
    const parsed = new Date(result);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it("output preserves correct UTC hour/minute", () => {
    const result = parseScheduleDate("March 28th, 2026 1:30pm")!;
    const parsed = new Date(result);
    expect(parsed.getUTCHours()).toBe(20);
    expect(parsed.getUTCMinutes()).toBe(30);
  });
});
