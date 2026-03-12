export type ClientTheme = "bluesky" | "blacksky";

const CLIENT_THEME_DOMAINS: Record<Exclude<ClientTheme, "bluesky">, string[]> =
  {
    blacksky: [".blacksky.", ".myatproto.social", ".cryptoanarchy.network"],
    // To add a new theme, add its CSS vars in global.css under [data-theme="name"]
    // then add an entry here, e.g.:
    // whitewind: [".whitewind."],
  };

export function detectClientTheme(handle: string): ClientTheme {
  const h = `.${handle.toLowerCase()}`;
  for (const [theme, domains] of Object.entries(CLIENT_THEME_DOMAINS)) {
    if (domains.some((d) => h.includes(d))) return theme as ClientTheme;
  }
  return "bluesky";
}
