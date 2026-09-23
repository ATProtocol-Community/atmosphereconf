// @ts-check
import { defineConfig, envField, sessionDrivers } from 'astro/config';
import { loadEnv } from "vite";
import authproto from "@fujocoded/authproto";
import node from "@astrojs/node";

// Set SESSION_DIR to a folder on the Railway volume (e.g. /data/sessions) so
// logins survive deploys. Without it, logins live in memory. It's read at build
// time, so it must be a service variable, not RAILWAY_VOLUME_MOUNT_PATH.
// Astro doesn't load .env into the config, so do it here.
const { SESSION_DIR: sessionDir } = loadEnv(
  process.env.NODE_ENV ?? "production",
  process.cwd(),
  "",
);

// https://astro.build/config
export default defineConfig({
  output: "server",
  env: {
    schema: {
      // Secrets are read at runtime, so they never end up in the build.
      LIBSQL_URL: envField.string({ context: "server", access: "secret", optional: true }),
      LIBSQL_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
  adapter: node({
    mode: "standalone",
  }),
  security: {
    allowedDomains: [
      { hostname: "atmosphereconf.org", protocol: "https" },
      { hostname: "*.up.railway.app", protocol: "https" },
    ],
  },
  session: {
    driver: sessionDir
      ? sessionDrivers.fsLite({ base: `${sessionDir}/astro` })
      : sessionDrivers.lruCache({ max: 800 }),
  },
  integrations: [
    authproto({
      applicationName: "ATmosphere Conference 2027",
      applicationDomain: "https://atmosphereconf.org",
      externalDomain:
        process.env.NODE_ENV === "development"
          ? undefined
          : "https://atmosphereconf.org",
      driver: sessionDir
        ? { name: "fs-lite", options: { base: `${sessionDir}/authproto` } }
        : { name: "memory" },
      // The RSVP page asks for a subset of these per request (see
      // src/components/lib/rsvp.ts); everything else logs in with the defaults.
      scopes: {
        additionalScopes: [
          "repo:site.standard.graph.subscription?action=create",
          "repo:site.standard.graph.subscription?action=delete",
          "repo:community.lexicon.calendar.rsvp?action=create",
          "account:email",
        ],
      },
      defaultScopes: {
        additionalScopes: [
          "repo:site.standard.graph.subscription?action=create",
        ],
      },
    }),
  ],
  server: {
    host: process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0",
  },
});
