export type ClientTheme = "bluesky" | "blacksky" | "reddwarf" | "pckt" | "germ" | "northsky" | "plyr.fm";

const CLIENT_THEME_DOMAINS: Record<
  Exclude<ClientTheme, "bluesky" | "plyr.fm">,
  string[]
> = {
  blacksky: [".blacksky.", ".myatproto.social", ".cryptoanarchy.network"],
  reddwarf: [".reddwarf."],
  pckt: [".pckt."],
  germ: [".germnetwork."],
  northsky: [".northsky.social", ".northsky.team"],
  // your-server: [".yourdomain."]
  // To add a new theme:
  // 1. Copy src/styles/themes/_template.css → src/styles/themes/<name>.css
  // 2. Import it in src/styles/global.css
  // 3. Add handle domains here
  // 4. Add to THEMES array in Header.astro and VALID in Layout.astro
  // 5. Add to the ClientTheme type above
};

export function detectClientTheme(handle: string): ClientTheme {
  const h = `.${handle.toLowerCase()}`;
  for (const [theme, domains] of Object.entries(CLIENT_THEME_DOMAINS)) {
    if (domains.some((d) => h.includes(d))) return theme as ClientTheme;
  }
  return "bluesky";
}
