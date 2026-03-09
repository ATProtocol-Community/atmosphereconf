export interface LexiconIconDef {
  label: string;
  svgName: string; // filename in icons/ dir (without .svg)
  match: (collection: string) => boolean;
  url?: (handle: string, did: string) => string;
}

export const LEXICON_ICONS: LexiconIconDef[] = [
  {
    label: "Bluesky",
    svgName: "bluesky",
    match: (col) => col.startsWith("app.bsky."),
    url: (handle) => `https://bsky.app/profile/${handle}`,
  },
  {
    label: "Blento",
    svgName: "blento",
    match: (col) => col.startsWith("app.blento."),
    url: (handle) => `https://blento.app/${handle}`,
  },
  {
    label: "Tangled",
    svgName: "tangled",
    match: (col) => col.startsWith("sh.tangled."),
    url: (handle) => `https://tangled.org/${handle}`,
  },
  {
    label: "Npmx",
    svgName: "npmx",
    match: (col) => col.startsWith("dev.npmx."),
    url: (handle) => `https://npmx.dev/profile/${handle}`,
  },
  // {
  //   label: "stream.place",
  //   svgName: "streamplace",
  //   match: (col) => col.startsWith("place.stream."),
  //   url: (handle) => `https://stream.place/${handle}`,
  // },
  // {
  //   label: "Popfeed",
  //   svgName: "popfeed",
  //   match: (col) => col.startsWith("social.popfeed."),
  //   url: (handle) => `https://popfeed.social/profile/${handle}`,
  // }
  // {
  //   label: "Atmosphere",
  //   svgName: "atmosphere",
  //   match: (col) => col.startsWith("org.atmosphereconf."),
  // },
];

/** Returns deduplicated icon defs that match any collection in the list. */
export function getActiveIcons(
  collections: string[],
  icons: LexiconIconDef[] = LEXICON_ICONS,
): LexiconIconDef[] {
  const seen = new Set<string>();
  return icons.filter((def) => {
    if (seen.has(def.svgName)) return false;
    if (collections.some((col) => def.match(col))) {
      seen.add(def.svgName);
      return true;
    }
    return false;
  });
}
