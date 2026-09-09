// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import authproto from "@fujocoded/authproto";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }), session: {
    driver: sessionDrivers.lruCache({
      max: 800,
    }),
  },
  integrations: [
    authproto({
      applicationName: "ATmosphere Conference 2026",
      applicationDomain: "https://2026.atmosphereconf.org",
      externalDomain:
        process.env.NODE_ENV === "development"
          ? "http://localhost:4321"
          : "https://2026.atmosphereconf.org",
      driver: {
        name: "memory",
      },
      scopes: {
        additionalScopes: [
          "repo:site.standard.graph.subscription?action=create",
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
  },
});
