import { getCollection } from "astro:content";

const MAX_CARDS = 8;

export async function getRandomTalks() {
  const [presentations, lightning, panels, workshops] = await Promise.all([
    getCollection("presentations"),
    getCollection("lightning-talks"),
    getCollection("panels"),
    getCollection("workshops"),
  ]);

  const allTalks = [
    ...presentations.map((t) => ({ id: t.id, ...t.data, typeName: "Presentation" })),
    ...lightning.map((t) => ({ id: t.id, ...t.data, typeName: "Lightning Talk" })),
    ...panels.map((t) => ({ id: t.id, ...t.data, typeName: "Discussion / Panel" })),
    ...workshops.map((t) => ({ id: t.id, ...t.data, typeName: "Workshop" })),
  ];

  const shuffled = allTalks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, MAX_CARDS);
}
