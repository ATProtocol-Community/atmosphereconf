import { getLiveCollection } from "astro:content";

const MAX_CARDS = 8;

const typeNames: Record<string, string> = {
  presentation: "Presentation",
  "lightning-talk": "Lightning Talk",
  panel: "Discussion / Panel",
  workshop: "Workshop",
};

export async function getTalksByHandle(handle: string) {
  const { entries: events, error } = await getLiveCollection("events");
  if (error) {
    throw error;
  }

  return (events ?? [])
    .filter((t) => {
      const type = t.data.type;
      if (!(type in typeNames)) {
        return false;
      }
      return t.data.speakers?.some((s) => s.id === handle);
    })
    .map((t) => ({
      id: t.id,
      ...t.data,
      typeName: typeNames[t.data.type],
    }));
}

export async function getRandomTalks() {
  const { entries: events, error } = await getLiveCollection("events");
  if (error) {
    throw error;
  }

  const talks = (events ?? [])
    .filter((t) => t.data.type in typeNames)
    .map((t) => ({
      id: t.id,
      ...t.data,
      typeName: typeNames[t.data.type],
    }));

  const shuffled = talks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MAX_CARDS);
}
