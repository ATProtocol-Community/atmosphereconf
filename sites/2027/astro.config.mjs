// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import authproto from "@fujocoded/authproto";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
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
    driver: sessionDrivers.lruCache({
      max: 800,
    }),
  },
  integrations: [
    authproto({
      applicationName: "ATmosphere Conference 2027",
      applicationDomain: "https://atmosphereconf.org",
      externalDomain:
        process.env.NODE_ENV === "development"
          ? undefined
          : "https://atmosphereconf.org",
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
    host: process.env.NODE_ENV === "development" ? "127.0.0.1" : "0.0.0.0",
  },
});
