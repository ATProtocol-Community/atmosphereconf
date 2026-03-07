// @ts-check
import { defineConfig } from "astro/config";
import authproto from "@fujocoded/authproto";

import react from "@astrojs/react";
import node from "@astrojs/node";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    react(),
    authproto({
      applicationName: "ATmosphere Conference 2026",
      applicationDomain: "https://atmosphereconf.org/",
      driver: {
        name: "memory",
      },
      scopes: {
        additionalScopes: [
          "repo:org.atmosphereconf.profile?action=create",
          "repo:org.atmosphereconf.profile?action=update",
          "blob:image/png",
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
});
