import { getCollection } from "astro:content";

const MAX_CARDS = 8;

export async function getTalksByHandle(handle: string) {
  const [presentations, lightning, panels, workshops] = await Promise.all([
    getCollection("presentations"),
    getCollection("lightning-talks"),
    getCollection("panels"),
    getCollection("workshops"),
  ]);

  const allTalks = [
    ...presentations.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Presentation" as const,
    })),
    ...lightning.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Lightning Talk" as const,
    })),
    ...panels.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Discussion / Panel" as const,
    })),
    ...workshops.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Workshop" as const,
    })),
  ];

  return allTalks.filter((t) => t.speaker_id.replace(/^@/, "") === handle);
}

export async function getRandomTalks() {
  const [presentations, lightning, panels, workshops] = await Promise.all([
    getCollection("presentations"),
    getCollection("lightning-talks"),
    getCollection("panels"),
    getCollection("workshops"),
  ]);

  const allTalks = [
    ...presentations.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Presentation",
    })),
    ...lightning.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Lightning Talk",
    })),
    ...panels.map((t) => ({
      id: t.id,
      ...t.data,
      typeName: "Discussion / Panel",
    })),
    ...workshops.map((t) => ({ id: t.id, ...t.data, typeName: "Workshop" })),
  ];

  const shuffled = allTalks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MAX_CARDS);
}
