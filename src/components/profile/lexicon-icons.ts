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
  // Add more here, e.g.:
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
