# Interactive transcripts

When a file matching `src/content/transcripts/{event-slug}.json` exists, the
event page at `/event/{slug}` renders an interactive transcript pane below the
video and turns on captions in the Plyr player. Clicking a word seeks playback;
scrubbing the player advances the highlighted word. Talks without a transcript
file render exactly as before.

This feature is built on
[Hyperaudio Lite (HAL)](https://github.com/hyperaudio/hyperaudio-lite) —
a small open-source JavaScript library for word-level interactive transcripts.
HAL is referenced throughout the rest of this document.

## Transcript JSON format

Each transcript is a JSON file in this shape:

```json
{
  "words": [
    { "start": 1.44, "end": 2.00, "text": "Hello" },
    { "start": 2.00, "end": 2.30, "text": "world." }
  ],
  "paragraphs": [
    { "start": 1.44, "end": 2.30, "speaker": "SPEAKER_S1" }
  ]
}
```

- `words[]` — every word, in order. `start` and `end` are seconds (decimal).
  `text` is the word as it should render; punctuation stays attached, but
  surrounding whitespace is trimmed.
- `paragraphs[]` — paragraph boundaries with optional `speaker`. Each word is
  placed in the first paragraph whose `[start, end]` range contains it.
  Words that fall outside every paragraph are dropped with a build-time warning.
- `speaker` is optional per paragraph. When present it renders as a small
  bold inline label at the start of the paragraph; when absent, the paragraph
  renders normally with no label. Speaker IDs are free-form strings — use
  `SPEAKER_S1` / `SPEAKER_S2` placeholders, real names, or AT handles, your
  call.

The JSON is the canonical storage format. At SSR, `src/lib/transcript-json.ts`
converts it to HAL-compatible HTML (paragraphs of `<span data-m data-d>` word
spans) and the component injects that via `set:html`. We keep JSON because
it's portable to AT Proto records, [Standard.site](https://standard.site)
renderers, and any future tooling — see Phase 2 in the main brief.

## Adding a transcript for a talk

1. Produce the JSON for the talk. Word-timed JSON is what most speech-to-text
   services (Whisper, Deepgram, AssemblyAI, etc.) return natively; the
   Hyperaudio Lite Editor will also gain a JSON export. The shape only needs
   to match the schema above.
2. Save as `src/content/transcripts/{event-slug}.json`. The slug is the `id`
   segment from the event URL — e.g. `rjQ96kl` for `/event/rjQ96kl`.
3. `npm run dev` and open `/event/{slug}` to confirm the transcript renders
   and tracks playback.

See `rjQ96kl.json` for a worked example.

## Architecture

Four pieces work together:

- **`src/lib/transcript-json.ts`** — TypeScript types for the JSON shape plus
  the SSR helper that converts JSON to HAL-compatible HTML.
- **`src/components/InteractiveTranscript.astro`** — renders the transcript
  pane and wires up HAL + caption.js on the client. It does not own the video
  element; it finds the sibling `<video class="vod-video">` rendered by
  `VodPlayer` and operates on it directly.
- **`src/pages/event/[id].astro`** — discovers transcript files with
  `import.meta.glob('*.json')`, runs `transcriptJsonToHtml()` on a match, and
  conditionally renders `<InteractiveTranscript>` with the resulting HTML.
- **`src/components/ui/VodPlayer.astro`** — unchanged structurally; Plyr's
  config gained captions controls and `update: true` so it picks up the
  `<track>` element that InteractiveTranscript injects.

The transcript JSON files are imported at build time and inlined into the SSR
output. They are not Astro content-collection entries (no schema), they just
live under `src/content/` alongside other build-time data.

## How playback sync works

The HAL runtime (`src/lib/hyperaudio-lite.js`) does two things:

1. **Word-click → seek.** Clicking a `<span data-m="...">` calls
   `video.currentTime = data-m / 1000` and `video.play()` (because
   `playOnClick=true` is passed to the constructor). Plyr's UI listens to
   `timeupdate` / `play` on the underlying `<video>` and updates accordingly.

2. **Playback → highlight.** When the video is playing, HAL runs a
   self-driven `setTimeout` loop that re-reads `video.currentTime` each tick
   and applies the `.active` class to the matching word and its parent
   paragraph.

Words HAL has passed get a `.read` class; words still ahead get `.unread`.
Styling is in `InteractiveTranscript.astro`:

- `.read` → full `--foreground` contrast
- `.unread` → muted `--muted-foreground`
- `.active > .active` → accent-tinted underline (no bold — avoids
  width-instability layout shift as the highlight advances)

## Two workarounds in the wiring

These are non-obvious behaviors in HAL v2.4.2 that the component bridges in
the JS layer (no upstream changes needed):

1. **HAL stops polling when paused.** It listens for `play`/`pause` on the
   video but not for `seeked`. If the user scrubs Plyr while the video is
   paused, HAL doesn't notice the new time. The component adds a `seeked`
   listener that calls `hal.updateTranscriptVisualState(currentTime)` to
   manually refresh.

2. **HAL skips word-level `.active` when paused.** Internally,
   `updateTranscriptVisualState` only adds `.active` to the current word
   if `myPlayer.paused === false`. The parent paragraph still gets `.active`,
   but our CSS only highlights the inner word — so without intervention,
   scrubbing while paused would visually do nothing. The component reads the
   `currentWordIndex` from the returned object and reapplies `.active` to the
   correct `wordArr[index - 1].n` itself.

Both workarounds live next to the HAL constructor call in
`InteractiveTranscript.astro` and total ~10 lines.

## Deeplinks

The component supports word-range deeplinks of the form
`/event/{slug}#clip=START,END`, where `START` and `END` are seconds
(e.g. `/event/rjQ96kl#clip=29.32,31.24`). The transcript element's DOM id is
intentionally `clip` so HAL's hash-parser produces a short share URL.

**Receiving a deeplink** is mostly HAL's job:

- `setupTranscriptHash` parses the hash into `[start, end]`.
- `setupInitialPlayHead` calls `updateTranscriptVisualState(start)` to position
  the transcript highlight at the start, autoscrolls to that paragraph, and
  applies a `.share-match` class to every word in the `[start, end]` range.
- `checkStatus` auto-pauses playback when `currentTime` exceeds `end`.

HAL does **not** seek the player on load, so the component reads
`hal.hashArray[0]` after init and sets `video.currentTime` itself (deferring
to a `loadedmetadata` listener if metadata isn't ready yet). Visited words
in the range are styled via CSS — see `span.share-match`.

**Creating a deeplink** is wired in the component, not in HAL. HAL's built-in
`setupPopover` is gated behind `if (typeof popover !== 'undefined')` and
expects five host-supplied DOM nodes; instead, the component listens for
`mouseup` / `touchend` (not `selectionchange`, which fires mid-drag and
makes the popover flicker), and when the user finishes selecting text inside
the transcript, shows a small floating popover with two buttons:

- **Copy link** — writes `${origin}${pathname}#clip=START,END` to the
  clipboard.
- **Copy with quote** — writes `"selected text"\n\n${url}` to the clipboard,
  whitespace-collapsed.

Both buttons preventDefault on mousedown so clicking them doesn't collapse
the document selection before the click handler reads it. If the Clipboard
API isn't available, both fall back to writing the fragment to
`location.hash` so the user can copy from the URL bar.

## How captions work

`src/lib/caption.js` (HAL's caption generator, vendored from the same repo)
walks the `data-m` / `data-d` spans and produces a WebVTT string. It looks
for an existing `<track id="${playerId}-vtt">` and populates its `src` with
a `data:text/vtt,...` URL once the video fires `loadedmetadata`.

The component:

1. Appends a `<track>` element to the `<video>` (kind=captions, label="English",
   srclang="en", default=true) after HAL initializes.
2. Calls `caption().init(transcriptId, video.id, undefined, undefined, "English", "en")`.

`VodPlayer`'s Plyr config sets:

- `controls: [... "captions", "settings", ...]` — adds the CC button.
- `settings: ["captions", "speed"]` — adds caption selection in the gear menu.
- `captions: { active: true, language: "auto", update: true }` — `update: true`
  is the key: it tells Plyr to re-detect `<track>` elements added after Plyr
  initialization, which is what our component does.

Plyr auto-hides the CC button on videos that have no `<track>`, so this is
safe for talks without a transcript file.

## Vendored dependencies

Hyperaudio Lite isn't published to npm. Both files have an MIT license. They
are vendored under `src/lib/`:

- `src/lib/hyperaudio-lite.js` — the HAL runtime, [v2.4.2](https://github.com/hyperaudio/hyperaudio-lite/blob/v2.4.2/js/hyperaudio-lite.js).
- `src/lib/caption.js` — HAL's caption.js, [v2.4.2 tag](https://github.com/hyperaudio/hyperaudio-lite/blob/v2.4.2/js/caption.js)
  (file's own version comment says 2.1.4 — that's an upstream maintenance
  quirk, not a packaging mistake).

The **only modification** from upstream in each file is a single appended
ESM export line:

```js
export { HyperaudioLite };   // in hyperaudio-lite.js
export { caption };          // in caption.js
```

This is needed because upstream's CommonJS export is gated behind
`if (typeof module !== 'undefined' && module.exports)`, which Vite's static
analyzer doesn't pick up. The shim is labeled with a `TEMPORARY` comment.

### Upgrade path

The plan is to ship a sibling `hyperaudio-lite.mjs` (and `caption.mjs`) in
the upstream HAL repo so this codebase can swap the vendored files for a
direct GitHub deep-path import or, eventually, an npm package. When that
lands, delete both files under `src/lib/` and update the imports in
`InteractiveTranscript.astro`.

## Refreshing the vendored files

```sh
curl -fsSL https://raw.githubusercontent.com/hyperaudio/hyperaudio-lite/v2.4.2/js/hyperaudio-lite.js \
  -o src/lib/hyperaudio-lite.js
curl -fsSL https://raw.githubusercontent.com/hyperaudio/hyperaudio-lite/v2.4.2/js/caption.js \
  -o src/lib/caption.js
# then re-add `export { HyperaudioLite };` / `export { caption };` at the
# bottom of each file (look at the previous git history if you forget).
```
