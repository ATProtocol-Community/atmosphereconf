import { AtpAgent, AtpBaseClient } from "@atproto/api";
import { IdResolver } from "@atproto/identity";
import * as p from "@clack/prompts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import satori from "satori";
import sharp from "sharp";
import slugify from "slugify";
import { promptPullDid, promptPushCredentials } from "./lib/auth";

const COLLECTION = "community.lexicon.calendar.event";
const DRY_RUN = process.argv.includes("--dry-run");
const PREVIEW = process.argv.includes("--preview");
const LIMIT = (() => {
  const idx = process.argv.findIndex((a) => a === "--limit");
  if (idx !== -1 && process.argv[idx + 1]) return parseInt(process.argv[idx + 1], 10);
  return Infinity;
})();
const THUMBNAIL_SIZE = 1024;
const PRESET_PATH = "public/preset.png";
const PREVIEW_DIR = "thumbnail-preview";

// Badge colors per event type — converted from oklch to hex (bluesky/default theme)
const BADGE_STYLES: Record<string, { bg: string; fg: string; label: string }> =
  {
    presentation: {
      bg: "#dbe8fc",
      fg: "#3b5998",
      label: "Presentation",
    },
    "lightning-talk": {
      bg: "#fef3c7",
      fg: "#92600a",
      label: "Lightning Talk",
    },
    panel: {
      bg: "#ede5f9",
      fg: "#6b3fa0",
      label: "Discussion / Panel",
    },
    workshop: {
      bg: "#d5f5e8",
      fg: "#1a7a5a",
      label: "Workshop",
    },
  };

async function fetchFontFromGoogleCSS(
  family: string,
  weight: number,
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  // Use a non-browser user-agent so Google Fonts serves ttf (satori doesn't support woff2)
  const cssRes = await fetch(cssUrl);
  const css = await cssRes.text();
  const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!match) {
    throw new Error(`Could not find font URL in CSS for ${family} ${weight}`);
  }
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

async function loadFonts() {
  const [regular, bold] = await Promise.all([
    fetchFontFromGoogleCSS("IBM Plex Mono", 400),
    fetchFontFromGoogleCSS("IBM Plex Mono", 700),
  ]);
  return { regular, bold };
}

const resolver = new IdResolver();

async function resolveIdentifierToDid(identifier: string): Promise<string> {
  if (identifier.startsWith("did:")) {
    return identifier;
  }
  const did = await resolver.handle.resolve(identifier);
  if (!did) {
    throw new Error(`Could not resolve handle: ${identifier}`);
  }
  return did;
}

async function resolvePds(identifier: string): Promise<string> {
  const did = await resolveIdentifierToDid(identifier);
  const data = await resolver.did.resolveAtprotoData(did);
  return data.pds;
}

type EventRecord = {
  uri: string;
  rkey: string;
  value: Record<string, unknown>;
};

type SpeakerInfo = {
  name: string;
  handle?: string;
  avatarDataUri?: string;
};

// Event types that should get thumbnails (talks, not breaks/logistics)
const TALK_TYPES = new Set([
  "presentation",
  "lightning-talk",
  "panel",
  "workshop",
]);

async function loadTalkEvents(
  client: { com: { atproto: { repo: { listRecords: Function } } } },
  did: string,
): Promise<EventRecord[]> {
  const events: EventRecord[] = [];
  let cursor: string | undefined;

  do {
    const { data } = await client.com.atproto.repo.listRecords({
      repo: did,
      collection: COLLECTION,
      limit: 100,
      cursor,
    });

    for (const rec of data.records) {
      const value = rec.value as Record<string, unknown>;
      const ad = value.additionalData as Record<string, unknown> | undefined;

      // Only include talk-type events (skip info, activity, breaks, etc.)
      const type = ad?.type as string | undefined;
      if (!type || !TALK_TYPES.has(type)) {
        continue;
      }

      events.push({
        uri: rec.uri,
        rkey: rec.uri.split("/").pop()!,
        value,
      });
    }

    cursor = data.cursor;
  } while (cursor);

  return events;
}

function hasThumbnail(event: EventRecord): boolean {
  const media = event.value.media as
    | Array<Record<string, unknown>>
    | undefined;
  if (!Array.isArray(media)) return false;
  return media.some((m) => m.role === "thumbnail");
}

function getEventType(event: EventRecord): string {
  const ad = event.value.additionalData as Record<string, unknown> | undefined;
  return (ad?.type as string) ?? "presentation";
}

function getRawSpeakers(
  event: EventRecord,
): Array<{ name: string; id?: string }> {
  const ad = event.value.additionalData as Record<string, unknown> | undefined;
  if (ad?.speakers && Array.isArray(ad.speakers)) {
    return ad.speakers as Array<{ name: string; id?: string }>;
  }
  return [];
}

// Fetch avatar via Bluesky public API, returns a data URI or undefined
async function fetchAvatarDataUri(
  handle: string,
): Promise<string | undefined> {
  try {
    const profileRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    );
    if (!profileRes.ok) return undefined;
    const profile = (await profileRes.json()) as { avatar?: string };
    if (!profile.avatar) return undefined;

    const imgRes = await fetch(profile.avatar);
    if (!imgRes.ok) return undefined;
    const buf = await imgRes.arrayBuffer();
    const resized = await sharp(Buffer.from(buf))
      .resize(128, 128, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${resized.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function resolveSpeakers(
  rawSpeakers: Array<{ name: string; id?: string }>,
  avatarCache: Map<string, string | undefined>,
): Promise<SpeakerInfo[]> {
  const speakers: SpeakerInfo[] = [];
  for (const s of rawSpeakers) {
    let avatarDataUri: string | undefined;
    if (s.id) {
      if (avatarCache.has(s.id)) {
        avatarDataUri = avatarCache.get(s.id);
      } else {
        avatarDataUri = await fetchAvatarDataUri(s.id);
        avatarCache.set(s.id, avatarDataUri);
      }
    }
    speakers.push({ name: s.name, handle: s.id, avatarDataUri });
  }
  return speakers;
}

// Parse ~~text~~ into satori elements with strikethrough
function parseTitle(text: string): unknown[] {
  const parts: unknown[] = [];
  const regex = /~~(.+?)~~/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push({
      type: "span",
      props: {
        style: { textDecoration: "line-through" },
        children: match[1],
      },
    });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

async function generateThumbnail(
  title: string,
  eventType: string,
  speakers: SpeakerInfo[],
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer },
): Promise<Buffer> {
  const presetBuffer = readFileSync(PRESET_PATH);
  const presetBase64 = presetBuffer.toString("base64");
  const presetDataUri = `data:image/png;base64,${presetBase64}`;

  const badge = BADGE_STYLES[eventType] ?? BADGE_STYLES.presentation;

  const speakerElements = speakers.map((s) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
      },
      children: [
        // Avatar circle
        ...(s.avatarDataUri
          ? [
              {
                type: "img",
                props: {
                  src: s.avatarDataUri,
                  style: {
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.5)",
                  },
                },
              },
            ]
          : []),
        // Name
        {
          type: "div",
          props: {
            style: {
              color: "rgba(255,255,255,0.9)",
              fontSize: 32,
              fontFamily: "IBM Plex Mono",
              fontWeight: 400,
              lineHeight: 1.3,
            },
            children: s.name,
          },
        },
      ],
    },
  }));

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          display: "flex",
          backgroundImage: `url(${presetDataUri})`,
          backgroundSize: `${THUMBNAIL_SIZE}px ${THUMBNAIL_SIZE}px`,
          flexDirection: "column",
          padding: "60px",
          paddingRight: "200px",
        },
        children: [
          // Badge
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                marginBottom: "24px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      backgroundColor: badge.bg,
                      color: badge.fg,
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: "IBM Plex Mono",
                      borderRadius: "9999px",
                      paddingLeft: "20px",
                      paddingRight: "20px",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                    },
                    children: badge.label,
                  },
                },
              ],
            },
          },
          // Title
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexWrap: "wrap",
                color: "white",
                fontSize:
                  title.replace(/~~/g, "").length > 80
                    ? 48
                    : title.replace(/~~/g, "").length > 50
                      ? 56
                      : 64,
                fontWeight: 700,
                fontFamily: "IBM Plex Mono",
                lineHeight: 1.15,
                marginBottom: speakers.length > 0 ? "28px" : "0",
              },
              children: parseTitle(title),
            },
          },
          // Speakers
          ...(speakers.length > 0
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column" as const,
                      gap: "12px",
                    },
                    children: speakerElements,
                  },
                },
              ]
            : []),
        ],
      },
    },
    {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      fonts: [
        {
          name: "IBM Plex Mono",
          data: fonts.regular,
          weight: 400,
          style: "normal" as const,
        },
        {
          name: "IBM Plex Mono",
          data: fonts.bold,
          weight: 700,
          style: "normal" as const,
        },
      ],
    },
  );

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// --- Preview mode: generate all thumbnails to disk, no auth needed ---

async function handlePreview() {
  const identifier = await p.text({
    message: "AT Protocol identifier (handle or DID)",
    initialValue: "atmosphereconf.org",
    validate: (v) => (v?.trim() ? undefined : "Identifier is required"),
  });
  if (p.isCancel(identifier)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const s = p.spinner();
  s.start("Fetching talk events");
  const pds = await resolvePds(identifier.trim());
  const did = await resolveIdentifierToDid(identifier.trim());
  const client = new AtpBaseClient(pds);
  const events = await loadTalkEvents(client, did);
  s.stop(`Found ${events.length} talk event(s)`);

  if (events.length === 0) {
    p.log.info("No talk events found.");
    process.exit(0);
  }

  const s2 = p.spinner();
  s2.start("Loading fonts");
  const fonts = await loadFonts();
  s2.stop("Fonts loaded");

  mkdirSync(PREVIEW_DIR, { recursive: true });

  const eventsToProcess = events.slice(0, LIMIT);
  if (LIMIT < events.length) {
    p.log.info(`Limiting to first ${eventsToProcess.length} of ${events.length} events`);
  }

  const s3 = p.spinner();
  s3.start("Generating thumbnails (fetching speaker avatars...)");

  const avatarCache = new Map<string, string | undefined>();

  for (const event of eventsToProcess) {
    const title = String(event.value.name ?? "");
    const eventType = getEventType(event);
    const rawSpeakers = getRawSpeakers(event);
    const speakers = await resolveSpeakers(rawSpeakers, avatarCache);
    const filename = slugify(title, { lower: true, strict: true }).slice(0, 80);
    const outPath = `${PREVIEW_DIR}/${filename}.png`;

    try {
      const pngBuffer = await generateThumbnail(
        title,
        eventType,
        speakers,
        fonts,
      );
      writeFileSync(outPath, pngBuffer);
      const has = hasThumbnail(event) ? " (already has thumbnail)" : "";
      const spk =
        speakers.length > 0
          ? ` [${speakers.map((s) => s.name).join(", ")}]`
          : "";
      p.log.step(`${outPath}${spk}${has}`);
    } catch (error) {
      p.log.error(`Error generating ${title}: ${error}`);
    }
  }

  s3.stop("Done");
  p.log.success(`Thumbnails saved to ${PREVIEW_DIR}/`);
}

// --- Upload mode: generate + upload + attach to events ---

async function handleUpload() {
  const { identifier, password } = await promptPushCredentials();

  const s = p.spinner();
  s.start("Fetching talk events from PDS");
  const pds = await resolvePds(identifier);
  const did = await resolveIdentifierToDid(identifier);
  const unauthClient = new AtpBaseClient(pds);
  const events = await loadTalkEvents(unauthClient, did);
  s.stop(`Found ${events.length} talk event(s)`);

  const allNeedsThumbnail = events.filter((e) => !hasThumbnail(e));
  const needsThumbnail = allNeedsThumbnail.slice(0, LIMIT);
  const alreadyHas = events.length - allNeedsThumbnail.length;

  if (needsThumbnail.length === 0) {
    p.log.info("All talk events already have thumbnails. Nothing to do.");
    process.exit(0);
  }

  const lines = [
    `Total talk events: ${events.length}`,
    `Already have thumbnail: ${alreadyHas}`,
    `Need thumbnail: ${needsThumbnail.length}`,
    "",
    ...needsThumbnail.map(
      (e) => `  + ${e.rkey} — ${e.value.name ?? "(untitled)"}`,
    ),
  ];
  p.note(lines.join("\n"), "Preview");

  if (DRY_RUN) {
    p.log.info("Dry run — skipping updates.");
    process.exit(0);
  }

  const ok = await p.confirm({
    message: `Generate and upload thumbnails for ${needsThumbnail.length} event(s)?`,
  });
  if (p.isCancel(ok) || !ok) {
    p.cancel("Aborted.");
    process.exit(0);
  }

  const agent = new AtpAgent({ service: pds });
  await agent.login({ identifier, password });

  const s2 = p.spinner();
  s2.start("Loading fonts");
  const fonts = await loadFonts();
  s2.stop("Fonts loaded");

  const s3 = p.spinner();
  s3.start("Generating thumbnails and updating events");

  let updated = 0;
  let errors = 0;
  const avatarCache = new Map<string, string | undefined>();

  for (const event of needsThumbnail) {
    const title = String(event.value.name ?? "");
    const eventType = getEventType(event);
    const rawSpeakers = getRawSpeakers(event);
    const speakers = await resolveSpeakers(rawSpeakers, avatarCache);

    try {
      const pngBuffer = await generateThumbnail(
        title,
        eventType,
        speakers,
        fonts,
      );

      const { data: blobData } = await agent.com.atproto.repo.uploadBlob(
        new Uint8Array(pngBuffer),
        { encoding: "image/png" },
      );

      const thumbnailMedia = {
        alt: "",
        role: "thumbnail",
        $type: "community.lexicon.calendar.event#media",
        content: {
          $type: "blob",
          ref: { $link: blobData.blob.ref.toString() },
          mimeType: "image/png",
          size: pngBuffer.length,
        },
        aspect_ratio: {
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
        },
      };

      const media = Array.isArray(event.value.media)
        ? [...(event.value.media as Array<Record<string, unknown>>)]
        : [];
      media.push(thumbnailMedia);

      const record = { ...event.value, media };

      await agent.com.atproto.repo.putRecord({
        repo: did,
        collection: COLLECTION,
        rkey: event.rkey,
        record,
      });
      updated++;
      p.log.step(`${title}`);
    } catch (error) {
      p.log.error(`Error updating ${event.rkey} (${title}): ${error}`);
      errors++;
    }
  }

  s3.stop("Done");

  const summary = [`Updated: ${updated}`];
  if (errors) summary.push(`Errors: ${errors}`);
  summary.push(`Browse: https://pdsls.dev/at/${did}/${COLLECTION}`);
  p.note(summary.join("\n"), "Summary");
}

// --- CLI entry ---

try {
  p.intro("ATmosphereConf Thumbnail Tool");

  if (PREVIEW) {
    await handlePreview();
  } else {
    await handleUpload();
  }

  p.outro("Done!");
} catch (error) {
  p.log.error(String(error));
  process.exit(1);
}
