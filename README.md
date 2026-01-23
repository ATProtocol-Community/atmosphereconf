# ATmosphereConf

Main website: https://atmosphereconf.org (currently redirects to our ticketing landing page powered by Tito)

News & Updates: <https://news.atprotocol.org> (powered by Leaflet!)
Save the Date with an RSVP on [Smoke Signal](https://smokesignal.events/did:plc:lehcqqkwzcwvjvw66uthu5oq/3lte3c7x43l2e)

We will be building out a conference website with a handful of ATProto specific features.

For open discussion, and for those who are joining as active volunteers, please visit the [community forum](https://discourse.atprotocol.community/c/atmosphereconf/25/none).

## Conference Profile
For starters, we're going to have a custom conference profile. Attendees and speakers (and anyone else!) can login and create an extended profile. Inspired by [Discover Toronto](https://discover.toronto.inc/), we had an [initial discussion in the forum](https://discourse.atprotocol.community/t/conference-profiles/186) and are going to work on fleshing this out here with detailed issues.

> [!NOTE]
> There is a tangled repo at <https://tangled.org/@atprotocol.dev/ATmosphereConf.org> that was another start to this. We are using Railway for hosting, and it has Github integration for deploys, so we're going to use this for now and then figure out how to sync both, and primarily use tangled for issues and development.

# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

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
