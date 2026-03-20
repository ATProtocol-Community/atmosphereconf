import { getLiveCollection } from "astro:content";

const visibleTypes = new Set([
  "presentation",
  "lightning-talk",
  "panel",
  "workshop",
  "info",
  "activity",
]);

const roomPriority = [
  "2301 Classroom",
  "2311 Classroom",
  "Performance Theatre",
  "Bukhman Lounge",
  "Great Hall South",
  "Great Hall North",
  "Performance Theater",
  "Room 2301",
];

const workshopTypes = new Set(["workshop", "activity"]);
const talkTypes = new Set(["presentation", "lightning-talk", "panel"]);
const workshopDates = ["2026-03-26", "2026-03-27"];
const talkDates = ["2026-03-28", "2026-03-29"];
const allDates = [...workshopDates, ...talkDates];

const spotlightTypeNames: Record<string, string> = {
  presentation: "Presentation",
  "lightning-talk": "Lightning Talk",
  panel: "Discussion / Panel",
  workshop: "Workshop",
  activity: "Activity",
  info: "Info",
};

type EventEntry = {
  id: string;
  data: {
    title: string;
    type: string;
    speakers?: ProgramSpeaker[];
    start?: string;
    end?: string;
    room?: string;
    description?: string;
    link_url?: string;
    link_text?: string;
  };
};

export interface ProgramSpeaker {
  name: string;
  id?: string;
}

export interface ProgramEvent {
  id: string;
  title: string;
  type: string;
  speakers?: ProgramSpeaker[];
  start?: string;
  end?: string;
  room?: string;
  description?: string;
  link_url?: string;
  link_text?: string;
  typeName: string;
}

export interface ProgramDay {
  date: string;
  dayLabel: string;
  dateLabel: string;
  seriesLabel: string;
  anchorId: string;
  heading: string;
  subheading: string;
  rooms: string[];
  events: Omit<ProgramEvent, "typeName">[];
  accentClass: string;
  spotlightPool: ProgramEvent[];
}

export interface ProgramRailOtherDay {
  date: string;
  dayLabel: string;
  dateLabel: string;
  seriesLabel: string;
  anchorId: string;
  heading: string;
  picks: ProgramEvent[];
}

export interface ProgramRail {
  dayLabel: string;
  spotlight?: ProgramEvent;
  suggestions: ProgramEvent[];
  otherDays: ProgramRailOtherDay[];
}

function getDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function getOrdinal(day: number) {
  const remainder = day % 10;
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) return `${day}th`;
  if (remainder === 1) return `${day}st`;
  if (remainder === 2) return `${day}nd`;
  if (remainder === 3) return `${day}rd`;
  return `${day}th`;
}

function formatDayLabel(date: string) {
  return getDateParts(date).toLocaleDateString("en-US", { weekday: "long" });
}

function formatDayHeading(date: string) {
  const parsed = getDateParts(date);
  const month = parsed.toLocaleDateString("en-US", { month: "long" });
  return `${formatDayLabel(date)}, ${month} ${getOrdinal(parsed.getDate())}`;
}

function formatDateLabel(date: string) {
  const parsed = getDateParts(date);
  const month = parsed.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${getOrdinal(parsed.getDate())}`;
}

function getSeriesLabel(date: string) {
  const workshopIndex = workshopDates.indexOf(date);
  if (workshopIndex !== -1) return `Workshop Day #${workshopIndex + 1}`;

  const talkIndex = talkDates.indexOf(date);
  if (talkIndex !== -1) return `Conference Day #${talkIndex + 1}`;

  return "Program Day";
}

function getAnchorId(date: string) {
  const workshopIndex = workshopDates.indexOf(date);
  if (workshopIndex !== -1) return `schedule-preshow${workshopIndex + 1}`;

  const talkIndex = talkDates.indexOf(date);
  if (talkIndex !== -1) return `schedule-conf${talkIndex + 1}`;

  return `schedule-${date}`;
}

export function formatMiniTime(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDaySubheading(events: EventEntry[], roomCount: number) {
  const hasTalks = events.some((event) => talkTypes.has(event.data.type));
  const hasWorkshops = events.some((event) =>
    workshopTypes.has(event.data.type),
  );

  if (hasTalks && hasWorkshops) return `${roomCount} rooms, full program`;
  if (hasTalks) return `${roomCount} rooms, conference schedule`;
  if (hasWorkshops) return `${roomCount} rooms, workshops and activities`;
  return `${roomCount} rooms, shared events`;
}

function sortRooms(rooms: string[]) {
  return [...rooms].sort((left, right) => {
    const leftIndex = roomPriority.indexOf(left);
    const rightIndex = roomPriority.indexOf(right);

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right);
  });
}

const TZ = "America/Vancouver";
function localDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function getProgramDays() {
  const { entries: schedule = [], error } =
    await getLiveCollection("events");
  if (error) {
    throw error;
  }

  const timedEntries = schedule
    .filter((entry) => entry.data.start && visibleTypes.has(entry.data.type))
    .sort((left, right) => {
      const startCompare = (left.data.start ?? "").localeCompare(
        right.data.start ?? "",
      );
      if (startCompare !== 0) return startCompare;
      return left.data.title.localeCompare(right.data.title);
    });

  return allDates
    .map((date, index) => {
      const dayEntries = timedEntries.filter(
        (entry) => entry.data.start && localDate(entry.data.start) === date,
      );
      const events = dayEntries.map((entry) => ({
        id: entry.id,
        ...entry.data,
      }));
      const spotlightPool = events.filter((event) => event.type !== "info");
      const spotlightItems = shuffleItems(
        spotlightPool.length ? spotlightPool : events,
      ).map((event) => ({
        ...event,
        typeName: spotlightTypeNames[event.type] ?? "Session",
      }));
      const rooms = sortRooms([
        ...new Set(
          events.map((event) => event.room).filter(Boolean) as string[],
        ),
      ]);

      return {
        date,
        dayLabel: formatDayLabel(date),
        dateLabel: formatDateLabel(date),
        seriesLabel: getSeriesLabel(date),
        anchorId: getAnchorId(date),
        heading: formatDayHeading(date),
        subheading: getDaySubheading(dayEntries, rooms.length || 1),
        rooms: rooms.length ? rooms : ["Program"],
        events,
        accentClass: index % 2 === 0 ? "program-paper-a" : "program-paper-b",
        spotlightPool: spotlightItems,
      };
    })
    .filter((day) => day.events.length > 0);
}

export function getRandomProgramRail(
  selectedDate: string,
  days: ProgramDay[],
): ProgramRail | null {
  const selectedDay = days.find((day) => day.date === selectedDate);
  if (!selectedDay) return null;

  const spotlightPool = shuffleItems(selectedDay.spotlightPool);
  const spotlight = spotlightPool[0];
  const suggestions = spotlightPool.slice(1, 4);
  const otherDays = days
    .filter((day) => day.date !== selectedDate)
    .map((day) => ({
      date: day.date,
      dayLabel: day.dayLabel,
      dateLabel: day.dateLabel,
      seriesLabel: day.seriesLabel,
      anchorId: day.anchorId,
      heading: day.heading,
      picks: shuffleItems(day.spotlightPool).slice(0, 2),
    }));

  return {
    dayLabel: selectedDay.dayLabel,
    spotlight,
    suggestions,
    otherDays,
  };
}
