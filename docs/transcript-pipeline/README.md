# atmosphereconf Transcript Pipeline — Full Report

End-to-end write-up of the pipeline that:

1. Downloads AtmosphereConf 2026 talk audio from `stream.place` HLS.
2. Transcribes each talk with **Parakeet** (NVIDIA `parakeet-tdt-0.6b-v3`) by
   driving the **Hyperaudio Lite Editor** headlessly via Playwright.
3. Emits canonical `TranscriptJson` JSON files that the atmosphereconf Astro
   site's local-first transcript loader picks up automatically.
4. Post-processes those JSON files to fix Parakeet mistranscriptions
   (brand-name normalization, DID acronym vs. verb disambiguation, speaker
   name corrections, etc.).

The pipeline replaces the previous approach of pulling transcripts live from
the ionosphere PDS, which suffered from a linear timing drift (~0.22 s/min)
inherent to the vanilla-Whisper pipeline ionosphere uses.

---

## 1. Background and rationale

The atmosphereconf site's `feature/transcripts-live-pds` branch loads
transcripts on the event page via `src/lib/transcript-loader.ts`:

```
1. Local JSON in src/content/transcripts/{rkey}.json   (wins if present)
2. Live fetch from the ionosphere PDS
```

We verified via word-level Parakeet-vs-ionosphere alignment (using difflib on
4403 matched words for `QK9Ae6Y`) that ionosphere's stored timings drift
monotonically earlier than reality — the classic signature of vanilla
Whisper's imprecise time-token prediction, uncorrected by forced alignment.
Median per-minute drift:

```
min  0:  0.02 s   min 15:  3.81 s
min  5:  0.87 s   min 20:  4.33 s
min 10:  2.07 s   min 25:  8.72 s
                   min 29:  6.40 s
```

Rather than wait for ionosphere to fix its pipeline, we re-transcribe all VOD
audio ourselves using Parakeet with forced alignment (as bundled in HAL
Editor's local worker), producing timings that track playback cleanly.

---

## 2. Data sources

### `stream.place` HLS

Each event page's `VodPlayer.astro` builds a master playlist URL of the form:

```
https://stream.place/xrpc/place.stream.playback.getVideoPlaylist?uri=<vodAtUri>
```

where `vodAtUri` is `at://did:plc:rbvrr34edl5ddpuwcubjiost/place.stream.video/<rkey>`
from the calendar event's `vodAtUri` field.

The response is an HLS master `.m3u8` referencing:

- One video variant (1080p @ ~5 Mbps, AVC + AAC).
- One audio variant on a separate track (`&track=2&…`, AAC 128 kbps stereo,
  48 kHz).

### Audio playlist structure

The audio sub-playlist lists byte-ranged segments (fragmented MP4) that all
point at a single large `.m4s` blob:

```
#EXT-X-MAP:URI="/xrpc/…?…&cid=<init-cid>.m4s"
#EXTINF:2.005333,
#EXT-X-BYTERANGE:102986@28697520438
/xrpc/…?…&cid=<big-blob-cid>.m4s
#EXTINF:2.004667,
#EXT-X-BYTERANGE:102987@28700921802
/xrpc/…?…&cid=<big-blob-cid>.m4s
…
```

A 30-minute talk has ~800 audio segments (each ~2 s) plus one init segment.

### Ionosphere talk records

Not used for transcription content anymore, but scanned during QA (Section
7.3) to extract canonical speaker metadata for spot-checking.

---

## 3. HLS audio download

Implementation: **[`hls-to-m4a.mjs`](./scripts/hls-to-m4a.mjs)** +
**[`hls-to-mp4.mjs`](./scripts/hls-to-mp4.mjs)**
(Node ESM, scratchpad).

### Why not `ffmpeg -i <master> -c copy out.mp4`?

Tried first. Hung well past 10 minutes on a single talk. Suspect: ffmpeg's
HLS demuxer issues per-segment HTTP Range requests sequentially and does
not multiplex over HTTP/2 connection pooling, so wall-time was dominated by
round-trip latency at ~2 s per range GET × 800 segments.

### What worked: manual HLS parse + parallel ranged fetch

[`hls-to-m4a.mjs`](./scripts/hls-to-m4a.mjs):

- Parses master playlist → audio sub-playlist URL.
- Parses audio sub-playlist for the init segment (`#EXT-X-MAP`) plus each
  media segment's `#EXT-X-BYTERANGE`.
- Fetches the init segment (~620 bytes, unranged).
- Fetches each media segment via a `Range: bytes=<start>-<end>` header, at
  **16-way concurrency** via a promise pool.
- Concatenates: `initSegment ++ mediaSegments[i…]` into a single output file.

Because all media segments share the same big-blob URL (differing only in
byte range), HTTP/2 keep-alive dominates and the wall-clock is throughput-
bound, not latency-bound: ~40–50 s for a 30-min talk (82 MB audio at ~1.5–2
MB/s effective from CloudFront).

### Why the fMP4 concat has a broken container header

Simple concatenation of init+segments produces a valid fMP4 byte sequence,
but its `mvhd` duration is left at whatever the init segment carried (in
practice: an absurd value like ~24 000 s reported by ffprobe on a 27-min
talk). The samples in the concatenated `mdat`s are correct; only the
container's global metadata is off.

**Fix**:
[`hls-to-mp4.mjs`](./scripts/hls-to-mp4.mjs)
wraps
[`hls-to-m4a.mjs`](./scripts/hls-to-m4a.mjs)
and runs

```
ffmpeg -y -i <raw.fmp4> -c copy <clean.mp4>
```

as a post-step. This remuxes the fMP4 into a plain MP4 with a correctly
computed `moov` in a single pass, with no re-encode.

Verified on `rjQ96kl`: raw concat reported `duration=23953.9`, remuxed MP4
reported `duration=1612.17` (matches actual talk length, 26:52).

### Where the audio files live

Temporary intermediate MP4s during the batch run:

```
/private/tmp/claude-501/.../scratchpad/transcribe/audio-tmp/<eid>.mp4
```

Deleted after each talk is transcribed (see Section 4). A one-off run for
`rjQ96kl` also produced `/Users/markb/Sites/atproto-conf/local-streamplace/rjQ96kl.mp4`
which stays around as a canary/reference file.

---

## 3½. End-to-end HLS transcription flow

The full chain each talk travels through:

```
stream.place HLS master playlist (.m3u8)
        │
        │  1. GET master via fetch()
        ▼
audio sub-playlist URL (also .m3u8)
        │
        │  2. GET sub-playlist; parse #EXT-X-MAP and each
        │     #EXT-X-BYTERANGE:len@offset line
        ▼
(one init segment ref) + (~800 byte-ranged media segment refs, all
                          pointing at the same big-blob URL)
        │
        │  3. Parallel HTTP/2 GETs with Range: bytes=off-end headers,
        │     16-way concurrency
        ▼
Buffer[]  =  [init bytes, seg0 bytes, seg1 bytes, …]
        │
        │  4. writeFile(concat(...))
        ▼
raw fragmented-MP4 file      (samples are correct, container
   <eid>.mp4.raw-fmp4         duration metadata is bogus)
        │
        │  5. ffmpeg -i raw.fmp4 -c copy clean.mp4
        │     (stream-copy remux, no re-encode, ~2 s)
        ▼
clean MP4                    (moov rewritten with correct duration,
   <eid>.mp4                   AAC audio unchanged bit-for-bit)
        │
        │  6. Playwright setInputFiles('#parakeet-file-input',
        │     <eid>.mp4) — hands the browser a File object
        ▼
HAL Editor picks up the file change
        │
        │  7. HAL Editor's Parakeet worker
        │     (js/parakeet.worker.js) does:
        │       a. new Audio(URL.createObjectURL(file)) → HTMLMediaElement
        │       b. AudioContext.decodeAudioData(arrayBuffer)
        │          → Float32Array PCM @ 48 kHz
        │       c. Resample to 16 kHz mono (model rate)
        │       d. Chunked ONNX inference:
        │            - mel spectrogram (nemo128.onnx)
        │            - encoder (encoder.fp16.onnx on WebGPU,
        │              encoder-model.int8.onnx on WASM fallback)
        │            - decoder-joint (decoder_joint-model.int8.onnx)
        │            - CTC greedy decode against vocab.txt
        ▼
Word list with per-word ms-precision start/duration,
posted back to the main thread as a "result" message
        │
        │  8. HAL Editor's UI code writes into
        │     <p><span data-m="ms_start" data-d="ms_dur">word</span>...</p>
        │     within #hypertranscript
        ▼
        │  9. Playwright evaluate() walks the DOM, converts to
        │     TranscriptJson  { words: [], paragraphs: [] }
        ▼
        │ 10. writeFile latest/src/content/transcripts/<eid>.json
        ▼
Astro loader picks it up on next request (local-first wins over
ionosphere), rendering with correct playback-aligned timings.
```

### Why not shortcut this chain?

**Why not stream HLS directly into Parakeet?**  The Parakeet worker uses
`AudioContext.decodeAudioData(ArrayBuffer)`, which requires the *entire*
audio to be in a browser-decodable single-container format up-front. HLS
is a segmented streaming format — you can play it via MediaSource
Extensions, but you can't hand it to `decodeAudioData` in one go. The
cleanest bridge is to reassemble the segments into a plain MP4 file and
hand that to the file input, which is what HAL Editor's UI already
supports.

**Why not skip the ffmpeg remux and hand the raw fMP4 concat straight to
the browser?**  Browsers CAN play the raw fMP4 (they use MSE-style byte-
range playback under the hood) but `decodeAudioData` reads the container's
`moov` box for duration and sample-rate metadata. The concatenated
init+segments has a bogus `mvhd` duration, and some browsers reject the
buffer outright or report the wrong duration to the audio graph. The
`ffmpeg -c copy` remux fixes only the metadata (rewrites `moov` in
place) — audio bytes pass through unchanged — and takes about 2 seconds
per talk.

**Why not download the video track too?**  Parakeet only needs audio.
Adding the 1080p video would multiply download bandwidth by ~10× and the
Parakeet worker would immediately discard it during `decodeAudioData`
(which only decodes audio streams anyway). Audio-only download is
~40–50 MB/talk at 128 kbps AAC.

**Why the file input at all?  Couldn't we just POST the buffer to the
worker via `postMessage`?**  You could, if you were building the harness
from scratch. But HAL Editor already ships a UI wired to
`<input type="file">` → decoded audio → Parakeet worker; using that path
means zero HAL Editor code changes. This is the whole reason we drove
HAL Editor headlessly instead of running NeMo/onnxruntime-node directly.

### File format at each stage (formats that appear on disk or in memory)

| Stage | Container | Codec | Notes |
|---|---|---|---|
| HLS master playlist | `.m3u8` text | — | ~500 B; refs two variants (audio-only, 1080p+audio) |
| Audio sub-playlist | `.m3u8` text | — | ~50 KB; ~800 EXT-X-BYTERANGE entries |
| Init segment | fMP4 (`.m4s`) | AAC-LC track defn | 620 B; contains `ftyp` + `moov` (no `mdat`) |
| Media segment (each) | fMP4 (`.m4s`) fragment | AAC-LC | ~100 KB; contains `moof` + `mdat` |
| Raw concat file | fMP4 | AAC-LC | ~80 MB; playable but with bogus duration |
| Post-ffmpeg | MP4 | AAC-LC | ~80 MB; clean; readable by `decodeAudioData` |
| In-browser after `decodeAudioData` | `AudioBuffer` | 32-bit float PCM | ~500 MB expanded; 48 kHz stereo |
| After resample | `Float32Array` | 32-bit float PCM | ~170 MB; 16 kHz mono (Parakeet input rate) |
| Parakeet output | JSON | — | `{ words, paragraphs }`, ~400 KB written to disk |

Sizes above are for a ~27-minute talk. Lightning talks are proportionally
smaller.

### Bandwidth accounting (one talk)

- HLS master + audio sub-playlist:  ~50 KB
- Init segment: ~620 B (one unranged GET)
- Audio media segments: ~800 × ~100 KB = ~80 MB (one Range GET each,
  16-way concurrent)
- Round trips for the sub-playlist audio download: ceil(800 / 16) = 50 (worst
  case), typically finishes in ~40–50 s wall-clock end to end.

For the whole 91-talk batch: ~7.5 GB of audio downloaded and discarded
after transcription. Nothing but the JSON is kept.

---

## 4. Parakeet transcription via headless Hyperaudio Lite Editor

### Why not run NeMo Parakeet directly?

- HAL Editor already integrates the same model (`istupakov/parakeet-tdt-0.6b-v3-onnx`)
  via `onnxruntime-web` with a proven pipeline that emits our exact JSON shape.
- NeMo requires a heavy Python environment (`nemo_toolkit[asr]`, PyTorch, ~5 GB).
- HAL Editor's WebGPU path is fast: ~30× realtime on M4 Pro (53 s for a 27-min
  talk, first-run downloads ~600 MB of ONNX shards which then cache).
- Emitted JSON is already the canonical `TranscriptJson` shape our loader
  reads: `{ words: [{start, end, text}], paragraphs: [{start, end}] }`.

### Architecture of the harness ([`batch.mjs`](./scripts/batch.mjs))

Serves HAL Editor via a minimal Node HTTP static file server on a random
localhost port (needed because `navigator.gpu` requires a secure context —
`file://` won't work).

Launches Playwright with `channel: 'chrome'` (system Chrome, not the
Playwright-bundled headless-shell binary — the shell build strips
WebGPU/GPU features). Persistent context in
`.../scratchpad/transcribe/chrome-profile/` so the ONNX model cache
(Chromium's Cache Storage) persists across runs.

Per talk:

1. Open the transcribe modal (`label[for="transcribe-modal"]`).
2. `setInputFiles('#parakeet-file-input', <mp4-path>)`.
3. Wait for the `TRANSCRIBE` button (`#parakeet-form-submit-btn`) to enable
   (its class `btn-disabled` clears once the file is loaded).
4. Click TRANSCRIBE.
5. Wait for `#hypertranscript span[data-m]` to appear (Parakeet completion
   populates the hypertranscript with per-word `<span data-m="ms" data-d="ms">`
   markup).
6. `page.evaluate(...)` walks the transcript DOM and converts to
   `TranscriptJson`:

   ```
   for (const p of root.querySelectorAll('p')) {
     const spans = [...p.querySelectorAll('span[data-m]')];
     for (const s of spans) {
       words.push({
         start: +s.dataset.m / 1000,
         end:   (+s.dataset.m + +s.dataset.d) / 1000,
         text:  s.textContent.trim(),
       });
     }
     paragraphs.push({
       start: +spans[0].dataset.m / 1000,
       end:   (+spans.at(-1).dataset.m + +spans.at(-1).dataset.d) / 1000,
     });
   }
   ```

   (Inline reimplementation of HAL Editor's own `htmlToJson`, because it
   isn't exposed on `window`.)

7. Write `latest/src/content/transcripts/<eid>.json`.

### Pipelining

The batch runs a 1-deep download/transcribe pipeline: while talk N is
transcribing on the GPU, talk N+1's HLS audio downloads in parallel on the
network. Steady-state per-talk wall time was ~60–90 s (short lightning
talks 20–30 s, full 30-min talks 75–90 s).

### Resumability

[`batch.mjs`](./scripts/batch.mjs) skips any talk whose `<eid>.json` already exists in the
transcripts dir. Combined with per-talk logging to a status JSONL, this lets
you re-run the batch to mop up transient failures without redoing anything.

### Results

122 event ids scanned → 94 with a `vodAtUri` → **91 successful transcripts**.
Three permanent failures — `ats26-commons`, `ats26-seams`, `ats26-skysquare` —
where `stream.place` returns `VideoNotFound` (the upstream simply doesn't
have those recordings uploaded yet).

Total wall clock for the batch: ~90 minutes on M4 Pro (WebGPU FP16).

---

## 5. Post-transcription correction sweeps

Every sweep was implemented as a small Python script over `latest/src/content/transcripts/*.json`.
Each token has `{start, end, text}`; edits preserve `start`/`end` and only
mutate `text`. Trailing punctuation is preserved via a small helper:

```python
def trail(s):
    m = re.search(r'[^A-Za-z0-9]+$', s)
    return m.group() if m else ''
def core(s):
    return re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', s).lower()
```

Two-word merges collapse `words[i]` + `words[i+1]` into a single token that
spans both original time ranges.

### 5.1 Brand-name normalization (first pass)

| pattern | canonical | count | notes |
|---|---|---|---|
| `blue` + `sky*` | `Bluesky` + trailing punct | 605 | 2-word merge |
| `black` + `sky*` | `BlackSky` + trailing punct | 68 | 2-word merge |
| `at` + `proto` | `atproto` + trailing punct | 235 | 2-word merge |
| `at` + `protocol(s)` | `AT` `Protocol(s)` | 52 | case-fix only, keep two tokens |
| `AtProto` / `atProto` (single) | `atproto` | 3 | single-token |
| `atmosphere*` (lc, excl. `atmospheric`) | `Atmosphere*` | 275 | single-token case fix |

**Total: 1238 edits across 91 files.**

Note on `atproto` capitalisation: this pass initially produced `ATProto`
(as a proper-noun compound). Confirmed with Head of Protocol at Bluesky
that lowercase is canonical, matching the atproto.com domain, the
`bluesky-social/atproto` GitHub repo, and the `@atproto/*` npm packages.
A later sweep (§5.5) folded all `ATProto` variants back to `atproto`.
`AT Protocol` (two words, capitalised) is retained as the formal name
when spelled out — same pattern as `npm` / `JavaScript` or `git` / `Git`.

### 5.2 Rare-word corrections identified via a "suspect scan"

A survey script flagged tokens that appeared only once across the corpus and
had unusual shape (mixed case in middle, digit-letter adjacency, ≥5
consecutive consonants). Cross-referenced against web search:

| found | canonical | source |
|---|---|---|
| `NechMAG`, `NecMAC` | `NCMEC` | National Center for Missing & Exploited Children (bsky.social 2025 Transparency Report) |
| `W2C` | `W3C` | Web standards body |
| `HTDPS` | `HTTPS` | phonetic |
| `Quen3` | `Qwen3` | Alibaba's open-source LLM |
| `GraphL.org` | `GraphQL.org` | domain typo |
| `Xhtml` | `XHTML` | capitalization |
| `Swift2i` | `SwiftUI` | Apple UI framework, "UI" misheard as "2i" |
| `G10` | `GTIN` | Global Trade Item Number (context: song product IDs) |
| `streamplace` | `Streamplace` | 19 instances |
| `pds`, `github` | `PDS`, `GitHub` | 2 instances |

User-provided fixes:

- `QuickSplice` → `quickslice` (lowercase)
- `AshX` → `Ashex`
- `FireStat` → kept as-is (real name)

### 5.3 DID acronym vs. `did` verb disambiguation

The verb "did" and the atproto `DID` acronym are homographs. A blind
case-swap would corrupt 265+ real verb usages.

The classifier ([`did-classify.py`](./scripts/did-classify.py)) looks at each `did`/`Did` token and:

- Checks the immediate predecessor. If it's a firm subject pronoun (`I`,
  `we`, `you`, `they`, `he`, `she`, `who`, `what`, question words, etc.) →
  **verb**.
- Checks the follower for `VERB_FOLLOWERS` (`not`, `n't`, subject pronouns,
  `something`, `anything`, `nothing`) → **verb**.
- Otherwise scans ±5 words for tech context tokens (`plc`, `web`, `key`,
  `document`, `identifier`, `handle`, `pds`, `repo`, `atproto`, `lexicon`,
  `namespace`, etc.) → **acronym**.
- Determiner-style predecessors (`the`, `your`, `my`, `their`, `a`,
  `this`, `each`, `every`) with no tech context: **acronym** (matches
  patterns like "the DID document").
- Weak-verb predecessors (`that`, `which`, `it`, `one`, `and`, `but`)
  without tech context: lean **verb**.
- Anything left over: **ambiguous** — defer to human review.

Final distribution:

```
verb:      228   (unchanged)
acronym:   100   (57 auto-applied as DID + trailing punct;
                  43 were already 'DID,' from earlier sweeps → no-ops)
ambiguous:  53   (routed to the DID review UI, see §6)
```

Plural `dids` was safe to auto-capitalize as `DIDs` uniformly (26 instances
across 8 files, no ambiguity — "dids" is not English).

### 5.4 Speaker name corrections

For each transcript, pulled the canonical speaker name(s) from the calendar
event via `getRecord` on `community.lexicon.calendar.event` at `atmosphereconf.org`'s
PDS (parallelized across 20 workers). Then:

1. Scanned the first 60 s of each transcript for self-introduction patterns
   (`my name is`, `i'm`, `i am`, `this is`).
2. Fuzzy-matched (`difflib.SequenceMatcher`) the 1–2 words after the intro
   phrase against the canonical name.
3. Filtered out false positives (intros where Parakeet caught "I'm gonna"
   instead of a real name).
4. For confirmed mistranscriptions, applied the intro fix in place, then
   swept the distinctive misspelled surname across the rest of that
   transcript. First-name sweeps were conditioned on being adjacent to the
   canonical surname (so "John" wouldn't be swept globally to "Jan" just
   because one speaker was Jan).

Confirmed via web search where the transcribed host name was itself
ambiguous — this turned up the atmosphereconf host **Chad Kohalyk**
("Protocols for Publishers"), Parakeet-transcribed as `Chad Gahlick` /
`Chad Gaholik` across two sessions.

Names actually corrected:

| event | canonical | Parakeet said | applied |
|---|---|---|---|
| `9q8ZX5Q` | Dan Abramov | "the Nebramov" | intro + 2× surname sweep |
| `000WSocial` | Jan Lindblad | "John Lindblod" | intro + surname sweep |
| `EkGROKB` | Joe Germuska | "Joe Chermuska" / "Joe Gramiska" | 2× surname sweep |
| `ODxNLMM` | Laurens Hof | "Laurence Hoff" | intro + surname sweep |
| `2EGLPML` | Stephan Noel | "Stefan Noel" | first-name swap (adjacent to Noel) |
| `000Syverson` | Paul Syverson | "Paul Siverson" | surname sweep |
| `J9yOpYz` | Chad Kohalyk (host) | "Chad Gahlick" | surname sweep |
| `VLXBbzJ` | Chad Kohalyk (host) | "Chad Gaholik" | surname sweep |
| `Mej2N5X` | Meri Leeworthy | "Mary" | intro + 2 sweep |
| `OD6Gd0A` | Ronen Tamari | "Ronan" | intro |
| `VLerG2y` | Leijie Wang | "Lawrence" | intro |
| `ZjL74D0` | Orual | "Oral" | intro |
| `gDP6A8N` | Kobi Gurkan | "Kobe" | intro |
| `9qP16Kp` | Jessie Rushing | "Jesse" | intro (spelling) |
| `GxEe0Vz` | Darrin Loeliger | "Darren" | intro (spelling) |

Deliberately **not** changed:

- `2EG4YMj` "I'm Tori" — Victoria White introduces as Tori. Intentional.
- `zxRkxk8` "I'm Stan" — Stanislas Signoud introduces as Stan. Intentional.
- Various events where the fuzzy matcher latched on to a non-name intro
  ("I'm gonna talk about…") with sim < 0.4 — dropped as false positives.

### 5.5 `ATProto` mistranscription sweep (second pass)

After the review UI (§6) found more ATProto-adjacent mistranscriptions, a
second sweep normalized these single-token variants:

| variant | count |
|---|---|
| `approto` | 20 |
| `approto.` | 6 |
| `approto,` | 4 |
| `approto?` | 1 |
| `appro` | 4 |
| `Approto` | 1 |
| `approdo` | 1 |

Plus 4 two-token merges of `a` + `proto` (regex-guarded to not touch
`a protocol`, `a prototype`, etc.).

**Total: 41 ATProto normalizations** — all canonicalized as single-token
`ATProto` in this sweep. Later folded to lowercase `atproto` per §5.7.

Whitelist for the ATProto sweep (words we did NOT touch): `approach`,
`approaches`, `approaching`, `approachable`, `approach.`, `approach,`,
`approaches.`, `approaches,`, `approval`, `approve`, `approved`, `approvals`,
`appropriate`, `appropriately`, `prototype`, `prototypes`, `prototyping`,
`protocol`, `protocols`.

### 5.6 One-off manual corrections found by browsing the preview

Discovered by opening `/event/…` pages on the Railway preview deploy and
spot-checking against the video/slides:

- `QK9Ae6Y` #0–#3: `Mike Chuck, Mike Chuck.` → `Mic check. Mic check.`
  (talk opens with the speaker doing a mic check).
- `obaP26x` #19: `appro-enthusiast.` → `atproto-enthusiast.`
  (a hyphenated compound the earlier ATProto sweeps' token-level regex
  didn't catch).
- `obaP26x` #1451: `EeroSky,` → `Eurosky,`.
- `obaP26x` × 5 pairs: `open` `social.community` → single-token
  `open.social.community` (domain name mis-split into two tokens).
- `EkGROKB` × 3: `Night Lab` → `Knight Lab` (Northwestern University's
  Knight Lab).
- `EkGROKB` #245: `Wardmuller.` → `Werdmuller.` — Ben Werdmuller was
  listed as a co-speaker in the calendar; missed by the initial speaker
  sweep because it only checked the primary speaker (see §5.7).

### 5.7 Follow-up sweeps

- **`atproto` lowercase pass** (279 substitutions across 67 files) —
  reverted the compound `ATProto` casing from §5.1 and §5.5 to the
  canonical lowercase form per atproto.com / the `bluesky-social/atproto`
  repo / Head of Protocol at Bluesky. `AT Protocol` (two-word formal
  name) was kept capitalised.
- **2dp float-artifact clean-up** (101,792 substitutions across all 91
  files) — HAL Editor's JS computes each word's `end` as
  `start + duration`, which introduces IEEE 754 rounding errors
  (`8.88 + 0.24 = 9.120000000000001`). Parakeet's underlying time
  resolution is 10ms, so `round(x, 2)` on every `start` and `end` is
  lossless and produces a clean file for humans and diffs alike.
- **Co-speaker surname sweep**. §5.4's original pass only checked the
  *first* canonical speaker per event and so missed co-presenters. A
  rerun over multi-speaker events landed 2 genuine surname fixes
  (`Rinensland` → `Rininsland`, `Frazy` → `Frazee`) and 3 false
  positives that had to be reverted (fuzzy matches at sim ≥ 0.70 for
  common English substrings — e.g. `Along` matched surname `Capilongo`;
  `Skylight` matched surname `Lighty`). Lesson: for a next iteration,
  either raise the auto-apply threshold to ≥ 0.80 or require the
  matched token to have no dictionary-word core.

---

## 6. Review UI — `did-review.html`

### Purpose

The DID acronym classifier's `ambiguous` bucket (53 cases) needs human eyes.
The review UI produces a single self-contained HTML page with a card per
case, letting the user quickly triage.

### Contents of each card

- Event id, timestamp, word index within the transcript.
- Deeplink to `http://localhost:4321/event/<id>#clip=<start>,<end>` that
  opens the running dev-server event page at the exact word (HAL Lite's
  clip-fragment convention).
- **Paragraph context** with the target word highlighted (originally shown
  as full paragraph, later narrowed to ±10 words on user request).
- **Frame screenshot** grabbed from the stream.place HLS via
  `ffmpeg -ss <t> -i <master.m3u8> -frames:v 1 -q:v 5 -vf scale=480:-1`.
  All 53 grabs succeeded except one; each ~30 KB JPEG is base64-encoded
  inline so the whole HTML is self-contained (~1.4 MB).
- **▶ play button** that uses hls.js to stream the audio from stream.place,
  seeks to `paragraph_start - 3 s`, and stops via a `timeupdate` listener at
  `paragraph_end + 0.5 s`. (Note: this proved fiddly in Chrome due to
  autoplay policy invalidating the user-gesture context after any async
  await — the fix pattern was to set `pendingSeek` before yielding and let
  a `canplay` listener apply it. In practice the user found it easier to
  use the "open in dev →" deeplink and let HAL play the clip natively.)
- **Buttons**: `DID` (one-click canonical fix), `reset`, plus a free-text
  override input for anything else (e.g. `DIDs`, `DID's`).
- **Keyboard shortcuts**: `Space` = play, `d` = DID, `r` = reset. Requires
  focusing a card by click first.

### Sticky top toolbar

- Marked count (updates live as cards are changed).
- **Submit changes** button — POSTs the diff to a local server endpoint.
- **Next unmarked ↓** — focuses the next unchanged card and scrolls to it.

### Submission server ([`review-server.py`](./scripts/review-server.py))

Because `file://` origins are treated as unique security origins, hls.js
can't fetch cross-origin from stream.place if you double-click the HTML.
The review file has to be served over HTTP. A ~30-line Python
`SimpleHTTPRequestHandler` subclass:

- Serves everything under `~/Desktop/` via GET (so `did-review.html` and
  any adjacent assets work).
- Adds an `Access-Control-Allow-Origin: *` header so the browser accepts
  cross-origin fetches to stream.place from the same page.
- Accepts POST `/submit` — writes the JSON body to
  `.../scratchpad/transcribe/did-submitted.json` for later application.

Run with:

```
python3 <scratchpad>/transcribe/review-server.py
```

Then open **http://127.0.0.1:8765/did-review.html** in Chrome.

### Applying the submission

After the user finishes reviewing and hits Submit, the JSON blob at
`did-submitted.json` has shape:

```
{
  "changes": [
    { "eid": "…", "idx": 847, "orig": "did,", "new": "DID" },
    …
  ]
}
```

A small applier reads this, edits each `words[idx].text` in place preserving
trailing punctuation, and re-writes the transcript JSON. The exact same
harness applies clipboard-pasted lists of the shape `eid<TAB>idx<TAB>orig →
new` for cases where the browser Submit path fails.

### Generalization opportunity

The same UI shape (context + screenshot + audio + one-click fix + free-text
override + submit) is applicable to any transcript-QA workflow: brand-name
sweeps, disfluency cleanup, speaker attribution, etc. A future version
could take a JSON manifest of `(eid, idx, suggested_change)` tuples and
render the review card set generically. Currently the UI is DID-specific
because the ambiguous class was hardcoded, but generalizing it is a
one-afternoon lift.

---

## 7. Code

All scripts written for this pipeline are attached to this gist as
individual files so the report and the source live together. One row per
script:

All scripts live in the [`scripts/`](./scripts/) subdirectory:

| File | Purpose | Lines |
|---|---|---|
| [`hls-to-m4a.mjs`](./scripts/hls-to-m4a.mjs) | Parses HLS master + audio sub-playlist; parallel Range-GET of ~800 byte-ranged fMP4 segments (16-way concurrency); concatenates init + segments. | 108 |
| [`hls-to-mp4.mjs`](./scripts/hls-to-mp4.mjs) | Wraps `hls-to-m4a.mjs`; post-remuxes the raw fMP4 through `ffmpeg -c copy` to fix the bogus `mvhd` duration. | 30 |
| [`transcribe-one.mjs`](./scripts/transcribe-one.mjs) | Single-talk Playwright harness. Launches Chrome, drives HAL Editor's Parakeet workflow, writes one JSON. Used as the canary before the batch. | 108 |
| [`batch.mjs`](./scripts/batch.mjs) | Full-batch harness. Long-lived Chrome instance, 1-deep download/transcribe pipeline, resumable (skips talks with existing JSON), per-talk status log. | 172 |
| [`review-server.py`](./scripts/review-server.py) | Minimal Python `SimpleHTTPRequestHandler` subclass — serves `~/Desktop` for the review UI to load, and accepts POST `/submit` for the review UI to push its diff back. | 37 |
| [`did-classify.py`](./scripts/did-classify.py) | The `did` acronym-vs-verb classifier. Importable as a module (used by `apply-fixes.py` and the review-UI builder). | 112 |
| [`apply-fixes.py`](./scripts/apply-fixes.py) | Applies the high-confidence single-token/domain fixes + the classifier's `acronym` verdicts; dumps the `ambiguous` cases to a review file. | 103 |
| [`fix-transcripts.py`](./scripts/fix-transcripts.py) | First-pass brand-name sweep — Bluesky / BlackSky / ATProto (word-pair merges) + Atmosphere capitalisation + a few common single-token fixes. | 96 |
| [`suspect-scan.py`](./scripts/suspect-scan.py) | Surveys the corpus for rare / weird-shape tokens, triple-repeat runs, and miscapitalized ecosystem terms. Output feeds the manual/web-search review step. | 105 |
| [`build-did-review.py`](./scripts/build-did-review.py) | Builds the self-contained `did-review.html` from the ambiguous-cases TSV + pre-grabbed video frames + transcript JSONs. Emits ~1.4 MB single file (frames base64-inlined) to `~/Desktop`. | ~230 |

Host-specific paths (`/private/tmp/…`, `/Users/markb/…`) have been rewritten
to placeholders (`./work`, `./atmosphereconf-site`, `./hyperaudio-lite-editor`)
so the scripts are portable. Adjust to your own layout.

### Rough shell dance to run the pipeline end to end

```
mkdir work
# 1. Build work/events-to-transcribe.jsonl (one JSON per line, keys "id"
#    and "vodAtUri") — scrape the /talks index of a running dev server or
#    query the calendar PDS directly. Small ad-hoc script.

node batch.mjs                                          # runs the whole batch
python3 fix-transcripts.py --apply                      # first-pass sweep
python3 suspect-scan.py > suspect-report.txt            # inspect + web-check
python3 apply-fixes.py --apply                          # brand + DID acronym; dumps ambiguous
python3 build-did-review.py                             # builds ~/Desktop/did-review.html
python3 review-server.py                                # http://127.0.0.1:8765/did-review.html
# ...user submits; server writes work/did-submitted.json
# ...a small applier reads it and edits the JSONs (trivial, ~20 lines)
```

Everything except `batch.mjs` is idempotent — safe to re-run.

---

## 8. Temp files, workspace layout

### Workspace root

```
/private/tmp/claude-501/-Users-markb-Sites-atproto-conf/<sess-id>/scratchpad/transcribe/
```

This is the ephemeral session scratchpad; nothing here needs to be
preserved across sessions, but during the work the layout was:

```
transcribe/
├── hls-to-m4a.mjs                Parallel HLS byte-range fetcher, produces raw fMP4 concat.
├── hls-to-mp4.mjs                Wrapper: hls-to-m4a.mjs + ffmpeg remux to clean MP4.
├── transcribe-one.mjs            One-off harness for a single MP4 (canary + debugging).
├── batch.mjs                     Full-batch harness (pipelined, resumable).
├── review-server.py              HTTP GET+POST server for did-review.html.
├── did-classify.py               DID vs verb classifier module (importable).
├── apply-fixes.py                Applies the high-confidence single-token/domain
│                                 fixes (§5.2) + the classifier's acronym subset,
│                                 dumps ambiguous cases to a review file.
├── fix-transcripts.py            First-pass brand-name sweep (§5.1).
├── suspect-scan.py               Rare-word surveyor (§5.2, precursor to web checks).
├── events-to-transcribe.jsonl    One JSON per event with vodAtUri.
├── ambiguous-grabs.tsv           Master list of ambiguous DID case coordinates
│                                 (tab-separated: eid, idx, start_sec, vodAtUri, ctx).
├── ambiguous-grabs.clean.tsv     Same, filtered against classifier noise.
├── name-proposals.json           Speaker-name diff candidates from §5.4.
├── speaker-name-check.json       Full speaker-name similarity report.
├── did-shots/<eid>_<start>.jpg   53 JPEG frames grabbed via ffmpeg for the review UI.
├── did-audio-clips/              Deleted — abandoned prefetch approach for review UI.
├── did-review.md                 Older Markdown review file (superseded by HTML).
├── did-submitted.json            Latest submission from the review UI, if any.
├── batch-status.jsonl            Append-only status log of the transcription batch.
├── audio-tmp/                    In-flight MP4s during batch (deleted per talk).
├── chrome-profile/               Playwright persistent context, holds the ONNX cache.
└── ambiguous-grabs.tsv (backup)
```

### `~/Desktop` artifacts

Files copied to Desktop for user access:

- `did-review.html` — self-contained review UI.
- `did-ambiguous-review.txt` — older plaintext version of the DID review
  file (superseded).
- `pr-preview.txt` — earlier PR-preview diff render (unrelated to this
  transcript work, artifact from PR #120 review).
- `transcript-pipeline-report.md` — this document.

### Media

Audio downloads land under:

```
~/Sites/atproto-conf/local-streamplace/
```

which currently contains `rjQ96kl.mp4` (the canary talk) and `rjQ96kl.json`
(the first successful Parakeet run, before the batch pipeline was built).

An earlier `~/Sites/atproto-conf/local-test/` directory holds the YouTube
mirror MP4s (34 files, ~4.1 GB) from an earlier pipeline iteration when the
`vod-beta.stream.place` endpoint was down. Kept as backup; nothing in the
codebase references them (the mirror map in `VodPlayer.astro` was removed).

### The Chrome persistent profile

`transcribe/chrome-profile/` holds Chromium's Cache Storage where HAL
Editor's Parakeet worker caches the ONNX model shards (~600 MB total):

- `nemo128.onnx` (mel spectrogram frontend)
- `decoder_joint-model.int8.onnx`
- `vocab.txt`
- `encoder.fp16.onnx` (WebGPU path)
- `encoder-model.int8.onnx` (WASM fallback path)

First run downloads these from
`https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx/resolve/main/…`.
Subsequent runs read them straight from Cache Storage. Keeping the profile
dir around means re-running the batch doesn't re-download.

---

## 9. Final result

`latest/src/content/transcripts/*.json` now holds **91 Parakeet-derived
transcripts**, one per event where stream.place has a VOD. Total ~28 MB
JSON, median 324 KB per talk.

The Astro loader (`src/lib/transcript-loader.ts`) serves these ahead of the
ionosphere PDS path automatically — no code change was needed to activate
them, only the JSON drop.

Correction totals across the whole corpus:

| pass | edits |
|---|---|
| First-pass brand sweep (Bluesky, BlackSky, ATProto, atmosphere) | 1238 |
| Rare-word corrections + user overrides | 32 |
| Plural `DIDs` | 17 |
| DID acronym singular (auto) | 57 |
| DID acronym (from review UI) | 10 |
| Speaker name intro fixes | 7 first + 12 sweep |
| Speaker name second-pass fixes | 7 intro + 2 sweep |
| ATProto second sweep | 41 |
| Follow-up: `ATProto` → `atproto` (canonical lowercase) | 279 |
| Follow-up: manual finds via preview browsing (Knight Lab, Werdmuller, EeroSky, atproto-enthusiast, open.social.community merges) | 13 |
| Follow-up: co-speaker surname sweep | 2 (+3 reverted false positives) |
| 2dp float-artifact clean-up (JS `start + duration` rounding noise) | 101,792 |
| Manual (`Mike Chuck` etc.) | 4 |

Rough total: **~1,720 semantic in-place word edits**, plus the ~102 K
float-precision clean-ups, plus ~15 word deletions from 2-word merges
(Bluesky, BlackSky, ATProto, `open.social.community`).

Three transcripts still missing (permanent VideoNotFound on stream.place):
`ats26-commons`, `ats26-seams`, `ats26-skysquare`. Event pages render
without a transcript pane, which is the correct fallback.

### Lessons for the next pass

- **Read the calendar's full speaker list before sweeping names.** The
  first-pass speaker-name check pulled `additionalData.speakers[0]`
  only — this missed every co-presenter. `Ben Wardmuller` was the
  clearest cost: he was in `additionalData.speakers[1]` for `EkGROKB`
  and I only picked up the mistranscription by opening the preview
  page manually.
- **Fuzzy surname matching at sim ≥ 0.70 is not safe to auto-apply.**
  Common English substrings match unrelated names (`Along`/`Capilongo`,
  `Skylight`/`Lighty`). Auto-apply threshold should be ≥ 0.80 AND the
  matched token must have no dictionary-word core; anything else goes
  to review.
- **Every arithmetic step in JS introduces float noise; round on
  serialize.** JS `+` on decimals produces `9.120000000000001`-style
  tails that json-serialize verbatim. Cleaning these up post-hoc costs
  nothing (`round(x, 2)` is lossless at Parakeet's 10ms resolution) but
  producing them in the first place makes every downstream diff noisy.
  Ideally HAL Editor's `htmlToJson` should round on emit.
- **Browsing the preview surfaces mistranscriptions no script will
  find.** `Knight Lab` (Northwestern journalism/media tech lab),
  `Werdmuller` (specific person), `Eurosky` (product name),
  `atproto-enthusiast` (hyphenated compound), and the
  `open.social.community` domain broken into two tokens are all
  things you spot with your eyes in 2 seconds and no fuzzy matcher
  finds. Preview-and-flag by humans is a first-class step, not just a
  QA safety net.
