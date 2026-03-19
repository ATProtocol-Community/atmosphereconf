// @ts-check
import { defineConfig } from "astro/config";
import authproto from "@fujocoded/authproto";

import react from "@astrojs/react";
import node from "@astrojs/node";

import tailwindcss from "@tailwindcss/vite";

import { envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  env: {
    schema: {
      EVENTS_OWNER_DID_OR_HANDLE: envField.string({
        context: "server",
        access: "public",
        default: "atmosphereconf.org",
      }),
    },
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    react(),
    authproto({
      applicationName: "ATmosphere Conference 2026",
      applicationDomain: "https://atmosphereconf.org",
      externalDomain:
        process.env.NODE_ENV === "development"
          ? "http://localhost:4321"
          : "https://atmosphereconf.org",
      driver: {
        name: "memory",
      },
      scopes: {
        additionalScopes: [
          "repo:org.atmosphereconf.profile?action=create",
          "repo:org.atmosphereconf.profile?action=update",
          "blob:image/*",
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  experimental: {
    liveContentCollections: true,
  },
});
