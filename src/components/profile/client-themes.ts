export const CLIENT_THEMES = [
  "bluesky",
  "blacksky",
  "reddwarf",
  "pckt",
  "germ",
  "northsky",
  "plyr.fm",
  "teal.fm",
  "semble",
  "spark",
  "ngerakines",
  "kandake",
  "fujocoded",
] as const;

export type ClientTheme = (typeof CLIENT_THEMES)[number];

export const DEFAULT_CLIENT_THEME: ClientTheme = "bluesky";
export const THEME_STORAGE_KEY = "atmosphereconf:theme";
export const THEME_SESSION_KEY = "atmosphereconf:theme-override";

export function isClientTheme(
  value: string | null | undefined,
): value is ClientTheme {
  return (
    typeof value === "string" && CLIENT_THEMES.includes(value as ClientTheme)
  );
}

const CLIENT_THEME_DOMAINS: Record<
  Exclude<ClientTheme, "bluesky" | "plyr.fm">,
  string[]
> = {
  blacksky: [".blacksky.", ".myatproto.social", ".cryptoanarchy.network"],
  reddwarf: [".reddwarf."],
  pckt: [".pckt."],
  germ: [".germnetwork."],
  northsky: [".northsky.social", ".northsky.team"],
  "teal.fm": [".teal.fm", ".teal.town"],
  semble: [".semble."],
  spark: [".sprk.so"],
  ngerakines: [".ngerakines."],
  kandake: [".kandake."],
  fujocoded: [".fujocoded."],
  // your-server: [".yourdomain."]
  // To add a new theme:
  // 1. Copy src/styles/themes/_template.css → src/styles/themes/<name>.css
  // 2. Import it in src/styles/global.css
  // 3. Add handle domains here
  // 4. Add it to CLIENT_THEMES in this file
};

export function detectClientTheme(handle: string): ClientTheme {
  const h = `.${handle.toLowerCase()}`;
  for (const [theme, domains] of Object.entries(CLIENT_THEME_DOMAINS)) {
    if (domains.some((d) => h.includes(d))) return theme as ClientTheme;
  }
  return DEFAULT_CLIENT_THEME;
}
