import { getCollection } from "astro:content";

const MAX_CARDS = 8;

const typeNames: Record<string, string> = {
  presentation: "Presentation",
  "lightning-talk": "Lightning Talk",
  panel: "Discussion / Panel",
  workshop: "Workshop",
};

export async function getTalksByHandle(handle: string) {
  const schedule = await getCollection("events");

  return schedule
    .filter((t) => {
      const type = t.data.type;
      if (!(type in typeNames)) return false;
      return t.data.speakers?.some((s) => s.id === handle);
    })
    .map((t) => ({
      id: t.id,
      ...t.data,
      typeName: typeNames[t.data.type],
    }));
}

export async function getRandomTalks() {
  const schedule = await getCollection("events");

  const talks = schedule
    .filter((t) => t.data.type in typeNames)
    .map((t) => ({
      id: t.id,
      ...t.data,
      typeName: typeNames[t.data.type],
    }));

  const shuffled = talks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MAX_CARDS);
}
