# ATmosphereConf

Main website: <https://atmosphereconf.org>

News & Updates: <https://news.atprotocol.org> (powered by Leaflet!)
RSVP on [Smoke Signal](https://smokesignal.events/did:plc:lehcqqkwzcwvjvw66uthu5oq/3lte3c7x43l2e)

Suggestions, code, and design contributions welcome! Join the [ATProto Touchers Discord chat](https://discord.com/channels/1097580399187738645/1479753137479745617)

> [!NOTE]
> There is a tangled repo at <https://tangled.org/@atprotocol.dev/ATmosphereConf.org> that was another start to this. We are using Railway for hosting, and it has Github integration for deploys, so we're going to use this for now and then figure out how to sync both, and primarily use tangled for issues and development.

## Adding a new theme

The site supports multiple themes (blacksky, germ, reddwarf, pckt, bluesky). To add a new one:

1. **Copy the template** — `src/styles/themes/_template.css` → `src/styles/themes/<name>.css`, fill in your colors
2. **Import it** — add `@import "./themes/<name>.css";` in `src/styles/global.css`
3. **Register handle domains** — add a `<name>: [".yourdomain."]` entry in `src/components/profile/client-themes.ts`. This is used to auto-apply your theme for logged-in users with matching handles and for speaker profile pages.
4. **Add to the type** — add `"<name>"` to `ClientTheme` in `src/components/profile/client-themes.ts`
5. **Add to the toggle** — add `"<name>"` to the `THEMES` array in `src/components/shared/Header.astro`
6. **Add to the valid themes list** — add `"<name>"` to the `VALID` array in `src/layouts/Layout.astro` (this is the inline script that applies the saved theme before paint)
7. **Add event-type colors** — if it's a dark theme, add `--event-*` overrides in your theme CSS (see `_template.css` for the full list)

# Astro Starter Kit: Basics

> 🧑‍🚀 **Seasoned astronaut?** this will seem familiar!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
